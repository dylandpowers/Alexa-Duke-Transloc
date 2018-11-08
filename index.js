'use strict';
const https = require('https');
const Alexa = require('ask-sdk-core');

const stopMap = new Map();
const GET_URL = "https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call&stops=";

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
    let slots = handlerIntent.requestEnvelope.request.intent.slots;
    let busName = slots.bus.value;
    let stopName = slots.stop.value.toLowerCase();

    // get actual arrival time with https request
    const message = await getArrivalTimes(bus, stop);
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

    return handlerInput.responseBuilder
      .speak('Sorry, I can\'t understand the command. Please say again.')
      .reprompt('Sorry, I can\'t understand the command. Please say again.')
      .getResponse();
  },
};

/**
 * Makes https request to Mashape in order to get next arrival time.
 * Time difference processing done in another function
 */
async function getArrivalTimes(bus, stop) {
  const message;
  if (!stopMap.has(stop)) {
   message = stopName + " is not a stop that I recognize. Please try again";
  } else {
    const options = {
      'X-Mashape-Key': 'wlyBjVu38qmshmB49UQNoiprReoUp17OfpEjsnlO8bq07vGFOh',
      'Accept': 'application/json'
    };
    await https.get(GET_URL + stopMap.get(stop),
      options, (res) => {
        message = processData(res, stop);
      });
  }
  return message;
};

/**
 * Processes https response object and does time math to calculate
 * next arrival time. Returns String that should be spoken
 */
const processData = (res, stopName) => {
  let nextArrival = res.data[0][0];
  let now = new Date();
  let arrivalTime = new Date(nextArrival['arrival_at']);
  const minutes = arrivalTime.getMinutes() - now.getMinutes();
  let message;
  if (minutes === 0) {
    message = "The bus is arriving now.";
  } else {
    message = "The bus will arrive at " + stopName + " in " + minutes + " minutes.";
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