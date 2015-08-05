var state = require('../state');
var mediator = require('../mediator');
var causes = require('../data/causes');
var dimensions = require("../data/dimensions");

var refreshStatePair = () => {
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
};

module.exports = {
  initialize() {
    document.querySelector("#new-vote").addEventListener("click", refreshStatePair);
  },
  start() {
    refreshStatePair();
  },
  inflate() {
    console.log("inflating");
  }
};