const buildResponse = (dates, dateOperator, times, timeDeclaration, timeOperator) => {
  let result = {
    actionIncomplete: false,
    parameters : {
    },
    fulfillment: {
      messages: [
        { speech: "" }
      ]
    }
  };

  if (dates) {
    result.parameters.date = {
      dates: dates
    };
    if (dateOperator)
      result.parameters.date.operator = dateOperator;
  }

  if (times) {
    result.parameters.time = {
      times: times
    }
    if (timeDeclaration)
      result.parameters.time.timeDeclaration = timeDeclaration;

    if (timeOperator)
      result.parameters.time.operator = timeOperator;
  }

  return {
    result: result
  }
};

module.exports = {
  buildResponse

};