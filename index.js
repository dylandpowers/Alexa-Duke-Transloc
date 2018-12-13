'use strict';
const request = require('request');
const Alexa = require('ask-sdk');

// setup ===================================
const stopMap = new Map();
stopMap.set('west', 4146366); // Duke Chapel
stopMap.set('east', 4117202); // east campus bus stop

// if the user speaks something like "Alexa, open Duke Transloc"
const LaunchRequestHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },

  handle(handlerInput) {
    const message = 'Welcome to the Duke Bus Guide. Please say something like: what time is the C one coming to east?';
    return handlerInput.responseBuilder
      .speak(message)
      .withShouldEndSession(false)
      .getResponse();
  }
};

/**
 * Chosen when the user is only curious about the next arrival time, not any after that.
 * Occurs when the user speaks something like "Alexa, when is the next C1 coming to East?"
 */
const NextTimeRequestHandler = {
  canHandle(handlerInput) {
    // only intents of type 'BusIntent'
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NextTimeIntent';
  },

  async handle(handlerInput) {
    let slots = handlerInput.requestEnvelope.request.intent.slots;
    let busName = slots.bus.value;
    let stopName = slots.stop.value.toLowerCase();
    if (!stopMap.has(stopName)) {
      // stop is not recognized. Tell the user, but do not exit
      let noStopMessage = stopName + ' is not a stop that I recognize. Please try again.';
      return handlerInput.responseBuilder
        .speak(noStopMessage)
        .withShouldEndSession(false)
        .getResponse();
    }

    // get actual arrival time with https request
    const message = await getArrivalTimes(busName, stopName, false);
    console.log(`MESSAGE: ${message}`);
    return handlerInput.responseBuilder
      .speak(message)
      .withShouldEndSession(true)
      .getResponse();
  }
};

/**
 * Chosen when the user is curious about the next two arrival times, mostly
 * in case the first one is too soon.
 * Occurs when the user speaks something like "Alexa, when is the C1 coming to east?"
 */
const TwoTimeRequestHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'TwoTimeIntent';
  },

  async handle(handlerInput) {
    let slots = handlerInput.requestEnvelope.request.intent.slots;
    let busName = slots.bus.value;
    let stopName = slots.stop.value.toLowerCase();
    if (!stopMap.has(stopName)) {
      // stop is not recognized. Tell the user, but do not exit
      let noStopMessage = stopName + ' is not a stop that I recognize. Please try again.';
      return handlerInput.responseBuilder
        .speak(noStopMessage)
        .withShouldEndSession(false)
        .getResponse();
    }

    // get actual arrival time with https request
    const message = await getArrivalTimes(busName, stopName, true);
    console.log(`MESSAGE: ${message}`);
    return handlerInput.responseBuilder
      .speak(message)
      .withShouldEndSession(true)
      .getResponse();
  }
};

const ErrorHandler = {

  canHandle() {
    return true;
  },

  handle(handlerInput, error) {
    let errorMessage = 'Sorry, I can\'t understand the command. Please try again.';
    console.log(error);

    return handlerInput.responseBuilder
      .speak(errorMessage)
      .reprompt(errorMessage)
      .getResponse();
  }
};

/**
 * Makes https request to Mashape in order to get next arrival time.
 * Time difference processing done in another function
 */
function getArrivalTimes(bus, stop, isMultipleTimes) {
  return new Promise((resolve, reject) => {

    let message;
    const options = {
      url: 'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call&stops=' + stopMap.get(stop),
      method: 'GET',
      headers: {
        'X-Mashape-Key': process.env.mashapeKey,
        'Accept': 'application/json'
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        console.log(error);
        reject(error);
      }
      const json = JSON.parse(body);
      message = processData(json, stop, bus);
      
      // check if the user wants multiple times reported. If so, call processDataMult
      if (isMultipleTimes) {
        message += processDataMult(json, stop, bus);
      }
      resolve(message);
    });
  });
}

/**
 * Processes https response object and does time math to calculate
 * next arrival time. Returns String that should be spoken
 */
function processData(res, stopName, busName) {
  let nextArrival = res.data[0]['arrivals'][0];
  const minutes = timeDifference(nextArrival['arrival_at']);
  let message;
  if (minutes === 0) {
    message = `The ${busName} is arriving at ${stopName} now. `;
  } else {
    message = `The ${busName} will arrive at ${stopName} in ${minutes} ${pluralize(minutes)}. `;
  }
  return message;
}

/**
 * Processes https response object and does math to calculate the next
 * two arrival times. Returns string that should be spoken
 */
function processDataMult(res, stopName, busName) {
  let afterNext = res.data[0]['arrivals'][1];
  const minutes = timeDifference(afterNext['arrival_at']);
  return `The next ${busName} after that will arrive at ${stopName} in ${minutes} ${pluralize(minutes)}.`;
}

/**
 * Given a date, calculate the number of minutes between then and now.
 */
function timeDifference(nextArrivalTime) {
  let now = new Date();
  let arrivalTime = new Date(nextArrivalTime);
  return arrivalTime.getMinutes() - now.getMinutes();
}

function pluralize(numMinutes) {
  return numMinutes === 1 ? 'minute' : 'minutes';
}

// Lambda handler
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    NextTimeRequestHandler,
    TwoTimeRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();