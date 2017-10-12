'use strict'
process.env.DIALOG_FLOW_API_KEY = "a88303ea82b84969b7edb4894d238045";

const Promise = require('bluebird');
const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const svc = require('../server/dateRangeService');
const utils = require('../server/utils');

suite('Validate DialogFlow [set-availability] agent', function() {
  this.timeout(1000 * 120);

  test('Single day, single time variations', () => {
    let expected = [
      getDateBlock("Tuesday", 11, 12)
    ];

    return Promise.all([
      testPhrase("Tuesday at 11am", expected),
      testPhrase("Tuesday at 11", expected),
      testPhrase("Tuesday at 11a", expected),
      testPhrase("Tuesday 11a", expected),
      testPhrase("Next Tuesday at 11 in the morning", expected),
    ]);
  });


  


  const testPhrase = (phrase, expected) => {
    return svc.parseDates(phrase)
      .then(actual => {
        assert.isTrue(actual.success, `for phrase: '${phrase}'`);
        assert.equal(actual.result.length, expected.length, `for phrase: '${phrase}'`);
        for(let i in actual.result) {
          assert.equal(actual.result[i].startDate, expected[i].startDate, `for phrase: '${phrase}'`);
          assert.equal(actual.result[i].endDate, expected[i].endDate, `for phrase: '${phrase}'`);
        }
      });
  };

  const getDate = (day, time) => {
    let hour, min;
    if (_.isInteger(time)) {
      hour = time;
      min = 0;
    } else {
      let timeParts = time.split(':');
      hour = parseInt(timeParts[0]);
      min = timeParts.length === 1 ? 0 : parseInt(timeParts[1]);
    }

    let dt  = moment().day(day).hour(hour).minutes(min).seconds(0);

    //Day of week resolved to a day this week and has already passed
    if (dt < moment())
      dt.add(1, 'week');

    return dt.format(utils.dateFormats.dateTimeNoTz);
  };

  const getDateBlock = (day, startTime, endTime) => {
    return { startDate: getDate(day, startTime), endDate: getDate(day, endTime) }
  };

});