const apiai = require('apiai-promise');
const uuid = require('uuid/v1');
const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);

const API_KEY = "a88303ea82b84969b7edb4894d238045";
const app = apiai(API_KEY);

const parseDates = (phrase) => {

  let options = {
    sessionId: uuid()
  };

  return app.textRequest(phrase, options)
    .then(response => {

      let validate = validateResult(response);
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
            let range = moment.range(moment(parameters.dates[0]), moment(parameters.dates[1]));
            dates = Array.from(range.by('day', { exclusive: false }));
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
        let dt = dates[i].format('YYYY-MM-DD');

        //If the declaration is "between", we should treat the operation as a time-range
        let operator = ts.operator;
        if (ts.timeDeclaration === "between")
            operator = "through";

        //If the time-portion of the phrase is interpreted as a range,
        //we want to split this period and set the 'times' array so
        //the remaining logic works with the array of times
        if (ts.timePeriod)
          ts.times = ts.timePeriod.split('/');

        switch(operator) {
          case "and":
          case "or":
            //Add the date for each time since they aren't to be treated as a range
            //TODO: Need to consolidate dates IF any time block intersect (e.g. 2p-3p and 3p-4p should resolve to 2pm-4pm)
            ts.times.forEach(time => dateBlocks.push(createDateBlock(dt, [time])));
            break;
          case "through":
          default:
            dateBlocks.push(createDateBlock(dt, ts.times));
            break;
        }
      }
      return createResponse(true, dateBlocks);
    })
    .catch(error => {
        return createResponse(false, null, error.message)
    });
};

const createDateBlock = (dt, timeRanges) => {

  let isArray = Array.isArray(timeRanges);
  let start = isArray ? moment(`${dt}T${timeRanges[0]}`) : moment(`${dt}T${timeRanges}`);
  let end;

  if (!isArray || timeRanges.length < 2) {
    //We don't have a time-range, so default it to an hour
    end = moment(start).add(1, 'hour');
  } else {
    end = moment(`${dt}T${timeRanges[1]}`)
  }

  return {
    startDate: start.format("YYYY-MM-DDTHH:mm:ss"),
    endDate: end.format("YYYY-MM-DDTHH:mm:ss")
  }
};

const validateResult = (response) => {
  let result = response.result;

  //Bad result, could not parse phrase
  if (result.actionIncomplete) {
    return createResponse(false, null, result.fulfillment.messages[0].speech)
  }

  if (!result.parameters) {
    return createResponse(false, null, "Could not parse");
  }

  let parameters = result.parameters;

  if (!parameters.dates || parameters.dates.length === 0) {
    return createResponse(false, null, "No Dates found")
  }



  if (!parameters.timeSpan ||
    (!parameters.timeSpan.times || !parameters.timeSpan.times.length === 0) & !parameters.timeSpan.timePeriod) {
    return createResponse(false, null, "No times found")
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
  parseDates
};