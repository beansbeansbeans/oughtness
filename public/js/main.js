var mediator = require("./mediator");
var util = require('./util');
var api = require('./api');
var router = require('./router');
var causes = require('./data/causes');
var dimensions = require('./data/dimensions');

if(window.location.hostname === "localhost") {
  api.setURL("http://localhost:4400");
} else {
  api.setURL("http://oughtness-49671.onmodulus.net");
}

window.addEventListener("click", (e) => {
  mediator.publish("window_click", e);
});

window.addEventListener("DOMContentLoaded", () => {
  mediator.subscribe("route_updated", (context) => {
    var path = context.path.split('/')[0];
    document.querySelector("#content").setAttribute("data-active-route", path);
    document.querySelector("#content").innerHTML = document.querySelector("#" + path + '-template').innerHTML;
  });

  router.initialize();
});


// document.querySelector("#vote-button").addEventListener("click", () => {
//   api.post('/vote', {
//     scenario_id: '55be756d248cacaee30bf3e5', 
//     data: 20
//   }, (data) => {

//   });
// });

// document.querySelector("#create-button").addEventListener("click", () => {
//   api.post('/create', {
//     identifier: "lifeboat",
//     text: "sacrifice lifeboaters for greater good?"
//   }, (data) => {

//   });
// });