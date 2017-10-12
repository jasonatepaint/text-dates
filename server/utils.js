const Moment = require('moment');
const MomentRange = require('moment-range');
const moment = MomentRange.extendMoment(Moment);
const _ = require('lodash');

const DATE_TIME_FORMAT_NO_TZ="YYYY-MM-DDTHH:mm:ss";
const DATE_ONLY_FORMAT="YYYY-MM-DD";

const getDateArrayByRange = (dates) => {
  let range = moment.range(moment(dates[0]), moment(dates[1]));
  return Array.from(range.by('day', { exclusive: false }));
};


module.exports = {
  getDateArrayByRange,
  dateFormats: {
    dateTimeNoTz: DATE_TIME_FORMAT_NO_TZ,
    dateOnly: DATE_ONLY_FORMAT
  }
};