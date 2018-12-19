'use strict';
const Alexa = require('ask-sdk');
const transloc = require('./transloc');

// CONSTANTS (messages)
const ERROR_MESSAGE = 'There is no data currently available. Please ask again later. ';
const WELCOME_MESSAGE = 'Welcome to the Duke Bus Guide. Please say something like: what time is the C one coming to east?';

/**
 * This handler covers both the launch request and the built-in
 * HelpIntent, because they both speak the same message
 */
const LaunchAndHelpRequestHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest'
      || (handlerInput.requestEnvelope.request.type === 'IntentRequest'
        && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent');
  },

  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(WELCOME_MESSAGE)
      .withShouldEndSession(false)
      .getResponse();
  }
};

/**
 * Chosen when the user is only curious about the next arrival time, not any after that.
 * Occurs when the user speaks something like "Alexa, when is the next C1 coming to East?"
 */
const NextTimeIntentHandler = {
  canHandle(handlerInput) {
    // only intents of type 'BusIntent'
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'NextTimeIntent';
  },

  handle(handlerInput) {
    // false means only one time requested
    return transloc.handleIntent(handlerInput, false);
  }
};

/**
 * Chosen when the user is curious about the next two arrival times, mostly
 * in case the first one is too soon.
 * Occurs when the user speaks something like "Alexa, when is the C1 coming to east?"
 */
const TwoTimeIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'TwoTimeIntent';
  },

  handle(handlerInput) {
    // true means two times requested (implicitly)
    return transloc.handleIntent(handlerInput, true);
  }
};


/**
 * Must implement Amazon built-in intents - this covers the Cancel and Stop
 * Intents implemented by default by Amazon.
 */
const CancelAndStopIntentHandler = {

  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
     && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
      || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
  },

  handle(handlerInput) {
    const message = 'Goodbye, have a nice day. ';
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

// Lambda handler
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchAndHelpRequestHandler,
    CancelAndStopIntentHandler,
    NextTimeIntentHandler,
    TwoTimeIntentHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();