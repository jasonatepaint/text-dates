const apiai = require('apiai-promise');
const uuid = require('uuid/v1');
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const utils = require('./utils');
const _ = require('lodash');

const VALIDATION_MSGS = {
  invalid: "Could not parse",
  noDates: "No Dates found",
  noTimes: "No Times found"
};

const parseDates = (phrase) => {

  const app = apiai(process.env.DIALOG_FLOW_API_KEY);
  let options = {
    sessionId: uuid()
  };

  return app.textRequest(phrase, options)
    .then(processTtsResponse)
    .catch(error => {
        return createResponse(false, null, error.message)
    });
};

const processTtsResponse = (response) => {

  let validate = validateResponse(response);
  if (!validate.success)
    return validate;

  let result = response.result;
  let parameters = result.parameters;
  let dateBlocks = [];

  //Get all the Dates w/o times
  let dates = [];
  if (parameters.dates.length > 1) {
    switch(parameters.datesOperator) {
      case "through":
        dates = utils.getDateArrayByRange(parameters.dates);
        break;
      case "and":
      case "or":
      default:
        parameters.dates.forEach(dt => dates.push(moment(dt)));
        break;
    }
  } else {
    dates.push(moment(parameters.dates[0]));
  }

  //Build out the dates appending the time ranges.
  let ts = parameters.timeSpan;
  for (let i in dates) {
    let dt = dates[i].format(utils.dateFormats.dateOnly);

    //If the declaration is "between", we should treat the operation as a time-range
    let operator = ts.operator;
    if (ts.timeDeclaration === "between")
      operator = "through";

    //If the time-portion of the phrase is interpreted as a range,
    //we want to split this period and set the 'times' array so
    //the remaining logic works with the array of times
    //Note: If we have a timePeriod, we wouldn't have a 'times' property
    if (ts.timePeriod)
      ts.times = ts.timePeriod.split('/');

    switch(operator) {
      case "and":
      case "or":
        if (Array.isArray(ts.times)){
          //Add the date for each time since they aren't to be treated as a range
          ts.times.forEach(time => dateBlocks.push(createDateBlock(dt, [time])));
        } else {
          dateBlocks.push(createDateBlock(dt, ts.times));
        }
        break;
      case "through":
      default:
        dateBlocks.push(createDateBlock(dt, ts.times));
        break;
    }
  }

  //consolidate dates IF any time block intersect (e.g. 2p-3p and 3p-4p should resolve to 2pm-4pm)
  let sorted = _.sortBy(dateBlocks, [(block) => { return block.startDate; }]);
  dateBlocks = collapseDates(sorted);

  return createResponse(true, dateBlocks);
};

/***
 * Collapses blocks of dates (start/end) into smaller blocks if adjacent blocks times
 * are found.
 *
 * e.g. 2p-3p and 3p-4p should resolve to 2pm-4pm
 */
const collapseDates = (dates) => {
  if (!dates || dates.length < 2)
    return dates;

  let prevCombined = false;
  let count = 0;
  let ranges = [];
  for(let i =0; i < dates.length; i++) {

    if (prevCombined) {
      prevCombined = false;
      continue;
    }

    let range1 = moment.range(dates[i].startDate, dates[i].endDate);
    let range2 = i < dates.length - 1 ? moment.range(dates[i+1].startDate, dates[i+1].endDate) : null;
    if (range2 && range1.adjacent(range2)) {
      dates[i].endDate = dates[i+1].endDate;
      prevCombined = true;
      count++;
    } else {
      prevCombined = false;
    }

    ranges.push(dates[i]);
  }

  //recurse if we've collapsed during this iteration
  if (count > 0)
    ranges = collapseDates(ranges);

  return ranges;
};

const createDateBlock = (dt, timeRanges) => {

  const START_OF_BUSINESS = 8;  //8am
  const END_OF_BUSINESS = 19;  //8pm

  let isArray = Array.isArray(timeRanges);
  let startTime = isArray ? timeRanges[0] : timeRanges;

  //if time comes in as a single number, treat it as a time in whole hours
  if (_.isInteger(startTime))
    startTime = `${("0" + startTime).slice(-2)}:00:00`;

  let start = moment(`${dt}T${startTime}`);
  let end;

  if (!isArray || timeRanges.length < 2) {
    //We don't have a time-range, so default it to an hour
    end = moment(start).add(1, 'hour');
  } else {
    end = moment(`${dt}T${timeRanges[1]}`)
  }

  /***********************************************
  * Adjust Times based on start/end of business
  **********************************************/
  let startAdjusted;
  if (start.hour() < START_OF_BUSINESS) {
    startAdjusted = 12;
    start = start.add(startAdjusted, 'hours');
  } else if (start.hour() > END_OF_BUSINESS) {
    startAdjusted = -12;
    start = start.add(startAdjusted, 'hours');
  }

  if (startAdjusted)
    end = end.add(startAdjusted, 'hours');

  //StartDate already occurred. This probably happened because the day
  //requested is the current day and a/i hasn't moved a week ahead
  if (start < moment()) {
    start = start.add(1, "week");
    end = end.add(1, "week");
  }

  /*********************************************** */

  return {
    startDate: start.format(utils.dateFormats.dateTimeNoTz),
    endDate: end.format(utils.dateFormats.dateTimeNoTz)
  }
};

const validateResponse = (response) => {
  let result = response.result;

  //Bad result, could not parse phrase
  if (result.actionIncomplete) {
    return createResponse(false, null, result.fulfillment.messages[0].speech)
  }

  if (!result.parameters) {
    return createResponse(false, null, VALIDATION_MSGS.invalid);
  }

  let parameters = result.parameters;

  if (!parameters.dates || parameters.dates.length === 0) {
    return createResponse(false, null, VALIDATION_MSGS.noDates)
  }

  if (!parameters.timeSpan ||
    (!parameters.timeSpan.times || parameters.timeSpan.times.length === 0) && !parameters.timeSpan.timePeriod) {
    return createResponse(false, null, VALIDATION_MSGS.noTimes)
  }

  return createResponse(true);
};

const createResponse = (success, result, msg) => {
  return {
    success: success,
    msg: msg,
    result: result
  };
};

module.exports = {
  VALIDATION_MSGS,
  validateResponse,
  processTtsResponse,
  parseDates,
  createDateBlock
};