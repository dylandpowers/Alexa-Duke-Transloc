'use strict';
const request = require('request');
const Alexa = require('ask-sdk');
const url = require('url');

// setup ===================================
const stopMap = new Map();
stopMap.set('west', 4146366); // Duke Chapel
stopMap.set('east', 4117202); // east campus bus stop

// const GET_URL = 'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call&stops=';

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
 * All intent request fall under this one because there is only one 
 * defined custom intent (the bus intent).
 * Occurs when the user speaks something like "Alexa, when is the next C1 coming to East?"
 */
const IntentRequestHandler = {
  canHandle(handlerInput) {
    // only intents of type 'BusIntent'
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'BusIntent';
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

    console.log(slots);

    // get actual arrival time with https request
    const message = await getArrivalTimes(busName, stopName);
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
      .speak(error.message)
      .reprompt(error.message)
      .getResponse();
  }
};

/**
 * Makes https request to Mashape in order to get next arrival time.
 * Time difference processing done in another function
 */
function getArrivalTimes(bus, stop) {
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
      message = processData(JSON.parse(body), stop);
      resolve(message);
    });
  });
};

/**
 * Processes https response object and does time math to calculate
 * next arrival time. Returns String that should be spoken
 */
function processData(res, stopName) {
  let nextArrival = res.data[0]['arrivals'][0];
  let now = new Date();
  let arrivalTime = new Date(nextArrival['arrival_at']);
  const minutes = arrivalTime.getMinutes() - now.getMinutes();
  let message;
  if (minutes === 0) {
    message = 'The bus is arriving now.';
  } else {
    message = 'The bus will arrive at ' + stopName + ' in ' + minutes + ' minutes.';
  }
  return message;
};

// Lambda handler
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    IntentRequestHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();