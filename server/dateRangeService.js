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
      let result = response.result;

      //Bad result, could not parse phrase
      if (result.actionIncomplete) {
        return {
          success: false,
          msg: result.fulfillment.messages[0].speech
        }
      }

      if (!result.parameters) {
        return {
          success: false,
          msg: "Invalid query"
        }
      }

      let parameters = result.parameters;
      let dateBlocks = [];

      //We expect to always have a startDate, but not the EndDate.
      //If we have a start and end date, we will create an array of all dates between start/end date
      let dates = [];
      if (parameters.startDate && parameters.endDate) {
        let range = moment.range(moment(parameters.startDate), moment(parameters.endDate));
        dates = Array.from(range.by('day', { exclusive: false }));
      } else {
        dates.push(moment(parameters.startDate));
      }

      //Build out the dates appending the time ranges. It's expected that we will always
      //have a time range (which is required by intent rules)
      let timeRange = parameters.between.split('/');
      for (let i in dates) {
        let dt = dates[i].format('YYYY-MM-DD');
        dateBlocks.push({
          startDate: moment(`${dt}T${timeRange[0]}`),
          endDate: moment(`${dt}T${timeRange[1]}`)
        })
      }

      return {
        success: dateBlocks.length > 0,
        msg: dateBlocks.length === 0 ? "Failed to parse dates" : null,
        result: dateBlocks
      };
    })
    .catch(error => {
        return { success: false, msg: error };
    });
};


module.exports = {
  parseDates
};