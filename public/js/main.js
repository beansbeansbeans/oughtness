var state = require('./state');
var mediator = require("./mediator");
var util = require('./util');
var api = require('./api');
var router = require('./router');

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
    var path = context.path.split('/')[0],
      partial = d.qs("#" + path + '-template');

    d.body.setAttribute("data-active-route", path);

    if(partial) {
      d.qs("#content").innerHTML = partial.innerHTML;
    }
  });

  util.async([
    (done) => {
      api.get('/causes', (err, results) => {
        state.set('causes', results.data);
        done();
      });
    },
    (done) => {
      api.get('/dimensions', (err, results) => {
        state.set('dimensions', results.data);
        done();
      });
    }
  ], () => {
    mediator.publish("loaded");
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