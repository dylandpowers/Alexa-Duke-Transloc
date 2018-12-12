const request = require('request');


function getArrivalTimes(bus) {
  return new Promise((resolve, reject) => {

    let message;
    const options = {
      url: 'https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call&stops=4117202',
      method: 'GET',
      headers: {
        'X-Mashape-Key': 'wlyBjVu38qmshmB49UQNoiprReoUp17OfpEjsnlO8bq07vGFOh',
        'Accept': 'application/json'
      }
    };
    request(options, (error, response, body) => {
      if (error) {
        console.log('ERROR: ', error);
        reject(error);
      }
      // console.log('RES: ', body);
      message = processData(JSON.parse(body), 'east');
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
  console.log('nextArrival: ', nextArrival);
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

module.exports.run = async function() {
  let message = await getArrivalTimes('kleez');
  console.log(message);
};