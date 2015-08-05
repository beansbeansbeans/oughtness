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
    pair = [ causes[firstIndex], causes[secondIndex], dimensions[Math.round(Math.random() * (dimensions.length - 1))] ];

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
    var pairing = data.params.pairing,
      dimension = pairing.slice(0, pairing.indexOf('-of-'));

    exports.template(pairing
      .slice(dimension.length + '-of-'.length)
      .split('-vs-').map((x) => {
      return _.findWhere(causes, { slug: x });
    }).concat(_.findWhere(dimensions, { name: dimension })));
  },
  template(pair) {
    state.set('pair', pair);

    document.querySelector("#slug-display").innerHTML = [pair[0], pair[1]].map(x => x.name).join(" ");
  }
};

module.exports = exports;