'use strict'
process.env.DIALOG_FLOW_API_KEY = "3f67512e425849569ebf4ca2990245a1";

const Promise = require('bluebird');
const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const svc = require('../server/dateRangeService');
const utils = require('../server/utils');

suite('Validate DialogFlow [date-parser] agent', function() {
  this.timeout(1000 * 120);

  const dtTomorrow = moment().add(1, 'day');
  const tomorrow = dtTomorrow.format('dddd');

  test('Single day, single time variations', () => {
    let expected = [
      getDateBlock(dtTomorrow, 11, 12)
    ];

    return Promise.all([
      testPhrase(`${tomorrow} at 11am`, expected),
      testPhrase(`${tomorrow} at 11`, expected),
      testPhrase(`${tomorrow} at 11a`, expected),
      testPhrase(`${tomorrow} at 11 a.m.`, expected),
      testPhrase(`${tomorrow} at 11 in the morning`, expected),
    ]);
  });

  test('Single day, with time range variations', () => {
    let expected = [
      getDateBlock(dtTomorrow, 11, 15)
    ];

    return Promise.all([
      testPhrase(`${tomorrow} between 11 and 3pm`, expected),
      testPhrase(`${tomorrow} at 11 - 3p`, expected),
      testPhrase(`${tomorrow} at 11 through 3pm`, expected),
      testPhrase(`${tomorrow} 11 thru 3`, expected),
      testPhrase(`${tomorrow} at 11 until 3pm`, expected),
      testPhrase(`${tomorrow} from 11 until 3pm`, expected)
    ]);
  });

  test('Single day, with and/or time variations', () => {
    let expected = [
      getDateBlock(dtTomorrow, 11, 12),
      getDateBlock(dtTomorrow, 15, 16),
    ];

    return Promise.all([
      testPhrase(`${tomorrow} at 11 and 3pm`, expected),
      testPhrase(`${tomorrow} at 11 or 3p`, expected),
      testPhrase(`${tomorrow} at 11 & 3pm`, expected),
      testPhrase(`${tomorrow} 11 + 3`, expected),
      testPhrase(`${tomorrow} at 11 or 3pm`, expected),
    ]);
  });

  test('Multiple days, single time variations', () => {
    const dtNext = moment(dtTomorrow).add(1, 'day');
    const nextDay = dtNext.format('dddd');

    let expected = [
      getDateBlock(dtTomorrow, 11, 12),
      getDateBlock(dtNext, 11, 12)
    ];

    return Promise.all([
      testPhrase(`${tomorrow} and ${nextDay} at 11am`, expected),
      testPhrase(`${tomorrow} or ${nextDay} at 11am`, expected),
      testPhrase(`${tomorrow} and ${nextDay} at 11`, expected),
      testPhrase(`${tomorrow} or ${nextDay} at 11`, expected),
      testPhrase(`${tomorrow} and ${nextDay} at 11a`, expected)
    ]);
  });

  test('Multiple days (e.g. day, day, and day), single time variations', () => {
    const dt2 = moment(dtTomorrow).add(1, 'day');
    const dt3 = moment(dtTomorrow).add(2, 'day');

    let expected = [
      getDateBlock(dtTomorrow, 11, 12),
      getDateBlock(dt2, 11, 12),
      getDateBlock(dt3, 11, 12)
    ];

    return Promise.all([
      testPhrase(`${tomorrow}, ${dt2.format('dddd')}, and ${dt3.format('dddd')} at 11am`, expected),
      testPhrase(`${tomorrow}, ${dt2.format('dddd')} and ${dt3.format('dddd')} at 11am`, expected),
      testPhrase(`${tomorrow} ${dt2.format('dddd')} and ${dt3.format('dddd')} at 11am`, expected),
      testPhrase(`${tomorrow} or ${dt2.format('dddd')} and ${dt3.format('dddd')} at 11am`, expected),
    ]);
  });

  test('Multiple days range, with time range variations', () => {
    const dt2 = moment(dtTomorrow).add(1, 'day');
    const dt3 = moment(dtTomorrow).add(2, 'day');
    const dt3Day = dt3.format('dddd');

    let expected = [
      getDateBlock(dtTomorrow, 11, 15),
      getDateBlock(dt2, 11, 15),
      getDateBlock(dt3, 11, 15),
    ];

    return Promise.all([
      testPhrase(`${tomorrow} - ${dt3Day} between 11 and 3pm`, expected),
      testPhrase(`${tomorrow} thru ${dt3Day} at 11 - 3p`, expected),
      testPhrase(`${tomorrow} through ${dt3Day} at 11 through 3pm`, expected),
    ]);
  });

  test('Context of day with Next', () => {
    //If user says (e.g. "next monday" when it's Monday), should resolve to same day 1 week ahead.
    const date = moment(dtTomorrow).add(1, 'week');
    let expected = [
      getDateBlock(date, 11, 12)
    ];

    return Promise.all([
      testPhrase(`next ${tomorrow} at 11am`, expected),
    ]);
  });

  test('Context of time with Next', () => {
    //If user says (e.g. "Monday at 3pm" on Monday at 11am), should resolve to same day
    const date = moment();
    const today = date.format('dddd');
    const start = parseInt(date.format("H")) + 4;
    const end = start + 1;
    let expected = [
      getDateBlock(date, start, end)
    ];

    return Promise.all([
      testPhrase(`${today} at ${start}`, expected),
    ]);
  });

  test('Single date (e.g. March 13th), with single time', () => {
    const date = dtTomorrow.format("MMMM Do");
    let expected = [
      getDateBlock(dtTomorrow, 13, 14)
    ];

    return Promise.all([
      testPhrase(`${date} at 1`, expected),
    ]);
  });

  test('Multiple dates (e.g. March 13th and/or March 14th), with single time', () => {
    const date = dtTomorrow.format("MMMM Do");
    const dt2 = moment(dtTomorrow).add(1, 'day');
    const dtDate = dt2.format("MMMM Do");
    let expected = [
      getDateBlock(dtTomorrow, 13, 14),
      getDateBlock(dt2, 13, 14)
    ];

    return Promise.all([
      testPhrase(`${date} and ${dtDate} at 1`, expected),           //e.g. October 5th and October 6th
      testPhrase(`${date} and ${dt2.format("Do")} at 1`, expected), //e.g. October 5th and 6th
      testPhrase(`${date} or ${dtDate} at 1`, expected),
    ]);
  });

  test('Multiple dates range (e.g. March 13th through March 17th), with single time', () => {
    const date = dtTomorrow.format("MMMM Do");
    const dt2 = moment(dtTomorrow).add(3, 'day');
    const dtDate = dt2.format("MMMM Do");
    let expected = [
      getDateBlock(dtTomorrow, 13, 14),
      getDateBlock(moment(dtTomorrow).add(1, 'day'), 13, 14),
      getDateBlock(moment(dtTomorrow).add(2, 'day'), 13, 14),
      getDateBlock(dt2, 13, 14)
    ];

    return Promise.all([
      testPhrase(`${date} - ${dtDate} at 1`, expected),
      testPhrase(`${date} through ${dtDate} at 1`, expected),
      testPhrase(`${date} thru ${dtDate} at 1`, expected),
    ]);
  });


  const testPhrase = (phrase, expected) => {
    return svc.parseDates(phrase)
      .then(actual => {
        assert.isTrue(actual.success, `success for phrase: '${phrase}'`);
        assert.equal(actual.result.length, expected.length, `for phrase: '${phrase}'`);
        for(let i in actual.result) {
          assert.equal(actual.result[i].startDate, expected[i].startDate, `for phrase: '${phrase}'`);
          assert.equal(actual.result[i].endDate, expected[i].endDate, `for phrase: '${phrase}'`);
        }
      });
  };

  const getDate = (date, time) => {
    let hour, min;
    if (_.isInteger(time)) {
      hour = time;
      min = 0;
    } else {
      let timeParts = time.split(':');
      hour = parseInt(timeParts[0]);
      min = timeParts.length === 1 ? 0 : parseInt(timeParts[1]);
    }

    let dt  = date.hour(hour).minutes(min).seconds(0);
    return dt.format(utils.dateFormats.dateTimeNoTz);
  };

  const getDateBlock = (day, startTime, endTime) => {
    return { startDate: getDate(day, startTime), endDate: getDate(day, endTime) }
  };

});