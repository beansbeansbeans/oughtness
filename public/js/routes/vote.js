var state = require('../state');
var mediator = require('../mediator');
var causes = require('../data/causes');
var dimensions = require("../data/dimensions");

module.exports = {
  start() {
    var firstIndex = Math.round(Math.random() * (causes.length - 1)),
      secondIndex = (function getSecondIndex() {
        var attempt = Math.round(Math.random() * (causes.length - 1));
        if(attempt === firstIndex) {
          return getSecondIndex();
        }
        return attempt;
      }()),
      pair = [ causes[firstIndex], causes[secondIndex] ];

    state.set('pair', pair);

    mediator.publish("pair_updated");

    console.log(pair[0].slug + "-vs-" + pair[1].slug);
    // fetch a new pair and tell the router to update its url
  }
};