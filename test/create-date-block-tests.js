'use strict'
const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const svc = require('../server/dateRangeService');
const utils = require('../server/utils');

suite('Create Date-Blocks', function() {

  const DT = moment().add(1, "day").format(utils.dateFormats.dateOnly);

  test('Time as single integer', () => {
    let actual = svc.createDateBlock(DT, 9);
    assert.equal(e("09:00"), actual.startDate);
    assert.equal(e("10:00"), actual.endDate);
  });

  test('Time as string', () => {
    let actual = svc.createDateBlock(DT, "09:00:00");
    assert.equal(e("09:00"), actual.startDate);
    assert.equal(e("10:00"), actual.endDate);
  });

  test('Time as string array', () => {
    let actual = svc.createDateBlock(DT, ["09:00:00", "12:30:00"]);
    assert.equal(e("09:00"), actual.startDate);
    assert.equal(e("12:30"), actual.endDate);
  });

  test('Implicit Time conversion [before business hours]', () => {
    let actual = svc.createDateBlock(DT, ["01:00:00", "02:30:00"]);
    assert.equal(e("13:00"), actual.startDate); //should be PM
    assert.equal(e("14:30"), actual.endDate);
  });

  test('Implicit Time conversion [after business hours]', () => {
    let actual = svc.createDateBlock(DT, ["20:00:00", "21:00:00"]);
    assert.equal(e("08:00"), actual.startDate); //should be AM
    assert.equal(e("09:00"), actual.endDate);
  });

  test('Date/Time has already elapsed', () => {

    //Today, 2 hours ago
    let dt = moment().format(utils.dateFormats.dateOnly);
    let time = moment().add(-2, "hour").format("HH:00");
    let timeEnd = moment().add(-1, "hour").format("HH:00");

    //Should push to next week, same day
    let expected = moment().add(1, "week").format(utils.dateFormats.dateOnly);

    let actual = svc.createDateBlock(dt, [ time, timeEnd ]);

    assert.equal(actual.startDate, e(time, expected));
    assert.equal(actual.endDate, e(timeEnd, expected));
  });

  const e = (time, dt) => {
    return dt === undefined ? `${DT}T${time}:00` : `${dt}T${time}:00`;
  };

});