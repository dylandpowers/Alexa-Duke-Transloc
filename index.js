'use strict';
const Alexa = require('alexa-sdk');
//const https = require('https');

let decrypted;

const stopMap = new Map();
const GET_URL = "https://transloc-api-1-2.p.mashape.com/arrival-estimates.json?agencies=176&callback=call&stops=";


exports.handler = (event, context, callback) => {
		stopMap.set("west", 4146366);
		stopMap.set("east", 4117202);
		const alexa = Alexa.handler(event, context);
		alexa.registerHandlers(handlers);
		alexa.execute();
};

const states = {
		BUS: "_BUS"
};

const handlers = {
		
		"LaunchRequest": function()
		{
				this.handler.state = states.BUS;
				this.emitWithState("Bus");
		},
		"BusIntent": function()
		{
				this.response.speak(buildResponse("Hello from Lambda", true));
				this.emit(":responseReady");
				// let busName = this.event.request.intent.slots.bus.value;
				// let stopName = this.event.request.intent.slots.stop.value.toLowerCase();
				// if (!stopMap.has(stopName)) {
				// 		const message = stopName + " is not a stop that I recognize. Please try again";
				// 		this.response.speak(message);
				// 		this.emit(":responseReady");
				// } else {
				// 		const options = {
				// 				"X-Mashape-Key": decrypted,
				// 				"Accept": "application/json"
				// 		};
				// 		let nextArrivalTime;
				// 		this.response.speak("keke sluze");
						// await https.get(GET_URL + stopMap.get(stopName),
						// 	options, (res) => {
						// 		const message = processData(res, stopName);
						// 		this.response.speak(message);
						// 		this.emit(":responseReady");
						// 	});
				
		}
};

const buildResponse = (toSay, shouldEndSession) => {
		return {
				outputSpeech: {
						type: "SSML",
						ssml: "<speak>" + toSay + "</speak>"
				},
				reprompt: {
						outputSpeech: {
								type: "SSML",
								ssml: "<speak> I'm sorry. I didn't get that. Please try again. " + toSay + "</speak>"
						}
				},
		shouldEndSession: shouldEndSession
	};
};

// const processData = (res, stopName) => {
// 	let nextArrival = res.data[0][0];
// 	let now = new Date();
// 	let arrivalTime = new Date(nextArrival['arrival_at']);
// 	const minutes = arrivalTime.getMinutes() - now.getMinutes();
// 	let message;
// 	if (minutes === 0) {
// 		message = "The bus is arriving now.";
// 	} else {
// 		message = "The bus will arrive at " + stopName + " in " + minutes + " minutes.";
// 	}
// 	return message;
// };