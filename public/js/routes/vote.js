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

  exports.template(pair);

  mediator.publish("pair_updated");
};

var exports = {
  initialize() {
    document.querySelector("#new-vote").addEventListener("click", refreshStatePair);
  },
  start() {
    refreshStatePair();
  },
  inflate(data) {
    exports.template(data.params.pairing.split('-vs-').map((x) => {
      return _.findWhere(causes, { slug: x });
    }));
  },
  template(pair) {
    state.set('pair', pair);

    document.querySelector("#slug-display").innerHTML = pair.map(x => x.name).join(" ");
  }
};

module.exports = exports;