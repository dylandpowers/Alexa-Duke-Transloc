'use strict';
const request = require('request');

// setup ===================================
const stopMap = new Map();
const busMap = new Map();

// stops ===================================
stopMap.set('west', process.env.westStopID); // Duke Chapel
stopMap.set('east', process.env.eastStopID); // east campus bus stop

// busses ==================================
busMap.set('c1', process.env.c1ID);
busMap.set('ccx', process.env.ccxID);

const ERROR_MESSAGE = 'There is no data currently available. Please ask again later. ';

/**
 * All application logic contained in this function. Chooses the appropriate response based
 * upon the bus and stop names, and will take into account the intent type.
 */
async function handleIntent(handlerInput, isMultipleTimes) {
  let slots = handlerInput.requestEnvelope.request.intent.slots;
  let busName = slots.bus.value.toLowerCase();
  let stopName = slots.stop.value.toLowerCase();
  if (!stopMap.has(stopName)) {
    // stop is not recognized. Tell the user, but do not exit
    let noStopMessage = stopName + ' is not a stop that I recognize. Please try again.';
    return handlerInput.responseBuilder
      .speak(noStopMessage)
      .withShouldEndSession(false)
      .getResponse();
  }

  // bus is not recognized
  if (!busMap.has(busName)) {
    let noBusMessage = busName + ' is not a bus that I recognize. Please try again.';
    return handlerInput.responseBuilder
      .speak(noBusMessage)
      .withShouldEndSession(false)
      .getResponse();
  }

  // get actual arrival time with https request
  let message;
  try {
    message = await getArrivalTimes(busName, stopName, isMultipleTimes);
  } catch (error) {
    message = ERROR_MESSAGE;
  }
  console.log(`MESSAGE: ${message}`);
  return handlerInput.responseBuilder
    .speak(message)
    .withShouldEndSession(true)
    .getResponse();
}
  
/**
 * Makes https request to Mashape in order to get next arrival time.
 * Time difference processing done in another function
 * This is a private function.
 */
function getArrivalTimes(bus, stop, isMultipleTimes) {
  return new Promise((resolve, reject) => {

    let message;
    const options = {
      url: buildURL(bus, stop),
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
      const res = JSON.parse(body);

      // if body has no data, return immediately
      if (!(res.data) || res.data.length === 0) {
        resolve(ERROR_MESSAGE);
      } else {
        message = processData(res, stop, bus);

        // check if the user wants multiple times reported. If so, call processDataMult
        if (isMultipleTimes) {
          message += processDataMult(res, stop, bus);
        }
        resolve(message);
      }
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
  if (res.data[0]['arrivals'].length === 1) {
    return '';
  }
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
  let difference = arrivalTime - now;
  return Math.floor((difference / 1000) / 60);
}

/**
 * Builds the URL for the request based on the stop # and the bus # requested.
 * @returns URL
 */
function buildURL(bus, stop) {
  var url = 'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call';
  url += `&routes=${busMap.get(bus)}&stops=${stopMap.get(stop)}`;
  return url;
}

function pluralize(numMinutes) {
  return numMinutes === 1 ? 'minute' : 'minutes';
}

// export only the handleIntent function
module.exports = {
  handleIntent: handleIntent
};