'use strict'
const mocha = require('mocha');
const chai = require('chai');
const assert = chai.assert;
const _ = require('lodash');
const moment = require('moment');
const svc = require('../server/dateRangeService');
const testUtils = require('./testUtils');

suite('Validate Text-to-Speech Responses', function() {

  test('is ActionIncomplete', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null, ["09:00:00"]);
    response.result.actionIncomplete = true;
    response.result.fulfillment.messages[0].speech = "This message should be returned";

    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(response.result.fulfillment.messages[0].speech, actual.msg);
  });

  test('Missing parameters', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null, ["09:00:00"]);
    delete response.result.parameters;  //wipe out the parameters
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.invalid, actual.msg);
  });

  test('Missing date array', () => {
    let response = testUtils.buildResponse(null, null, ["09:00:00"]);
    delete response.result.parameters.dates;  //wipe out date array
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.noDates, actual.msg);
  });

  test('No dates in array', () => {
    let response = testUtils.buildResponse([], null, "at", ["09:00:00"]);
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.noDates, actual.msg);
  });

  test('Missing timespan', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null);
    delete response.result.parameters.timeSpan;  //wipe out timeSpan property
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.noTimes, actual.msg);
  });

  test('Missing time properties (times & timePeriod)', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null);
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.noTimes, actual.msg);
  });

  test('No Times in array', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null, []);
    let actual = svc.validateResponse(response);
    assert.isFalse(actual.success);
    assert.equal(svc.VALIDATION_MSGS.noTimes, actual.msg);
  });

  test('valid', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null, ["09:00:00"]);
    let actual = svc.validateResponse(response);
    assert.isTrue(actual.success);
  });

  test('valid as timePeriod', () => {
    let response = testUtils.buildResponse([ "2017-03-13" ], null, "09:00/10:00", null, null, true);
    let actual = svc.validateResponse(response);
    assert.isTrue(actual.success);
  });

});