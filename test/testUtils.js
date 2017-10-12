const buildResponse = (dates, datesOperator, times, timeDeclaration, timeOperator, asTimePeriod) => {
  let result = {
    actionIncomplete: false,
    parameters : {
      dates: dates,
      datesOperator: datesOperator,
      timeSpan: {}
    },
    fulfillment: {
      messages: [
        { speech: "" }
      ]
    }
  };

  if (times) {
    if (asTimePeriod)
      result.parameters.timeSpan.timePeriod = times;
    else
      result.parameters.timeSpan.times = times;
  }

  if (timeDeclaration)
    result.parameters.timeSpan.timeDeclaration = timeDeclaration;

  if (timeOperator)
    result.parameters.timeSpan.operator = timeOperator;

  return {
    result: result
  }
};

module.exports = {
  buildResponse

};