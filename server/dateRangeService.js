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
    return createResponse(false, null, validate.msg);

  let result = response.result;
  let parameters = result.parameters;
  let dateBlocks = [];
  let dates = [];

  //If Date is not an array, it could be a single date (or a range in 'date1/date2' form)
  let isDateRange = false;
  if (!Array.isArray(parameters.date.dates)) {
    parameters.date.dates = parameters.date.dates.split('/');
    if (parameters.date.dates.length > 1)
      isDateRange = true;
  } else {
    if (parameters.date.operator === "through")
      isDateRange = true;
  }

  //Create dates w/o times attached
  if (isDateRange) {
    dates = utils.getDateArrayByRange(parameters.date.dates);
  } else {
    parameters.date.dates.forEach(dt => dates.push(moment(dt)));
  }

  //if times is not an array, it could be a single time (or a range in 'time1/time2' form)
  let isTimeRange = false;
  if (!Array.isArray(parameters.time.times)) {
    parameters.time.times = _.isInteger(parameters.time.times) ? [ parameters.time.times ] : parameters.time.times.split('/');
    if (parameters.time.times.length > 1)
      isTimeRange = true;
  } else {
    isTimeRange = (parameters.time.timeDeclaration === "between" | parameters.time.operator === "through") === 1
  }

  //Build out the dates appending the time ranges.
  for (let i in dates) {
    let dt = dates[i].format(utils.dateFormats.dateOnly);

    if (isTimeRange) {
      dateBlocks.push(createDateBlock(dt, parameters.time.times));
    } else {
      //Add the date for each time since they aren't to be treated as a range
      parameters.time.times.forEach(time => dateBlocks.push(createDateBlock(dt, [time])));
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

  //End time was interpreted as wrong time of day (AM vs PM)
  if (end < start)
    end = end.add(12, 'hours');

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
    return createValidationResult(result.fulfillment.messages[0].speech)
  }

  if (!result.parameters) {
    return createValidationResult(VALIDATION_MSGS.invalid);
  }

  let parameters = result.parameters;

  if (!_.isObject(parameters.date) || !parameters.date.dates || parameters.date.dates.length === 0) {
    return createValidationResult(VALIDATION_MSGS.noDates)
  }

  if (!_.isObject(parameters.time) || !parameters.time.times || (parameters.time.times.length === 0 & !_.isNumber(parameters.time.times))){
    return createValidationResult(VALIDATION_MSGS.noTimes);
  }

  return createValidationResult(null, true);
};

const createResponse = (success, result, msg) => {
  return {
    success: success,
    msg: msg,
    result: result
  };
};

const createValidationResult = (msg, success) => {
  return {
    success: success || false,
    msg: msg
  };
};

module.exports = {
  VALIDATION_MSGS,
  validateResponse,
  processTtsResponse,
  parseDates,
  createDateBlock
};