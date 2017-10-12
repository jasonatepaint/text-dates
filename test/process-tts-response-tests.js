'use strict'
const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const svc = require('../server/dateRangeService');
const utils = require('../server/utils');
const testUtils = require('./testUtils');

suite('Process Text-to-Speech Responses', function() {

  const daysAhead = 1;
  let dates;

  beforeEach(() => {
    dates = [ moment().add(daysAhead, 'days').format(utils.dateFormats.dateOnly) ];
  });

  test('Single day, single time as integer', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, 9));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "10:00"));
  });

  test('Single day, single time as string', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, "09:00"));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "10:00"));
  });

  test('Single day, single time as array', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["09:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "10:00"));
  });

  test('Single day, with timePeriod', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, "09:00/13:00", null, null, true));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "13:00"));
  });

  test('Single day, with consecutive times (between)', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["09:00", "13:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "13:00"));
  });

  test('Single day, with non-consecutive times (and)', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["09:00", "13:00"], "at", "and"));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 2);
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "10:00"));
    assert.equal(actual.result[1].startDate, e(dates[0], "13:00"));
    assert.equal(actual.result[1].endDate, e(dates[0], "14:00"));
  });

  test('Multiple consecutive days, with single time', () => {
    dates.push(moment().add(daysAhead + 2, 'days').format(utils.dateFormats.dateOnly));
    let expected = utils.getDateArrayByRange(dates);

    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, "through", ["09:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, expected.length);

    for(let i in expected) {
      let dt =  expected[i].format(utils.dateFormats.dateOnly);
      let dateBlock = actual.result[i];
      assert.equal(dateBlock.startDate, e(dt, "09:00"));
      assert.equal(dateBlock.endDate, e(dt, "10:00"));
    }
  });

  test('Multiple non-consecutive days, with single time', () => {
    dates.push(moment().add(daysAhead + 2, 'days').format(utils.dateFormats.dateOnly));
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, "and", ["09:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 2);
    for(let i in dates) {
      let expected =  dates[i];
      let dateBlock = actual.result[i];
      assert.equal(dateBlock.startDate, e(expected, "09:00"));
      assert.equal(dateBlock.endDate, e(expected, "10:00"));
    }
  });

  test('Multiple non-consecutive days, with timePeriod', () => {
    dates.push(moment().add(daysAhead + 2, 'days').format(utils.dateFormats.dateOnly));
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, "and", "09:00/10:00", "between", "and", true));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 2);
    for(let i in dates) {
      let expected =  dates[i];
      let dateBlock = actual.result[i];
      assert.equal(dateBlock.startDate, e(expected, "09:00"));
      assert.equal(dateBlock.endDate, e(expected, "10:00"));
    }
  });

  test('start time before business hours', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, "03:00"));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    //Should be PM
    assert.equal(actual.result[0].startDate, e(dates[0], "15:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "16:00"));
  });

  test('start and end time before business hours', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["03:00", "06:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    //Should be PM
    assert.equal(actual.result[0].startDate, e(dates[0], "15:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "18:00"));
  });

  test('start time after business hours', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["21:00", "23:00"]));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    //Should be AM
    assert.equal(actual.result[0].startDate, e(dates[0], "09:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "11:00"));
  });

  test('start time not adjusted and end time after business hours', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["10:00", "21:00"], "at"));
    assert.isTrue(actual.success);
    assert.equal(actual.result.length, 1);
    //End Date is after hours, but since startTime wasn't adjust, we shouldn't adjust end time
    assert.equal(actual.result[0].startDate, e(dates[0], "10:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "21:00"));
  });

  test('multiple hour blocks that are consecutive, should be collapsed', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["10:00", "11:00", "12:00"], "at", "and"));
    assert.isTrue(actual.success);

    //Should only be 1 date block - [10-11, 11-12, 12-13] === 10-13
    assert.equal(actual.result.length, 1);
    assert.equal(actual.result[0].startDate, e(dates[0], "10:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "13:00"));
  });

  test('multiple hour blocks that are both consecutive and nonconsecutive', () => {
    let actual = svc.processTtsResponse(testUtils.buildResponse(dates, null, ["10:00", "11:00", "12:00", "14:00", "16:00"], "at", "and"));
    assert.isTrue(actual.success);

    assert.equal(actual.result.length, 3);
    assert.equal(actual.result[0].startDate, e(dates[0], "10:00"));
    assert.equal(actual.result[0].endDate, e(dates[0], "13:00"));
    assert.equal(actual.result[1].startDate, e(dates[0], "14:00"));
    assert.equal(actual.result[1].endDate, e(dates[0], "15:00"));
    assert.equal(actual.result[2].startDate, e(dates[0], "16:00"));
    assert.equal(actual.result[2].endDate, e(dates[0], "17:00"));
  });

  const e = (dt, time) => {
    return `${dt}T${time}:00`;
  };
});