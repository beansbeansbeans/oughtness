var util = require('../util');
var state = require('../state');
var mediator = require('../mediator');
var causes = require('../data/causes');
var dimensions = require("../data/dimensions");

var refreshStatePair = () => {
  var pair = (function getIndices() {
    if(state.get('pair_history').length === causes.length * (causes.length - 1) * dimensions.length) {
      return [-1, -1, -1];
    }

    var attempt = [
      Math.round(Math.random() * (causes.length - 1)),
      Math.round(Math.random() * (causes.length - 1)),
      Math.round(Math.random() * (dimensions.length - 1))
    ];

    if(attempt[0] === attempt[1] || state.get('pair_history').some((x) => {
      return _.isEqual(x, attempt);
    })) {
      return getIndices();
    }
    return attempt;
  }());

  console.log(pair);

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
      return _.findIndex(causes, cause => cause.slug === x);
    }).concat(_.findIndex(dimensions, x => x.name === dimension)));
  },
  template(pair) {
    state.set('pair_history', state.get('pair_history').concat(pair));
    state.set('pair', pair);

    document.querySelector("#slug-display").innerHTML = [
      causes[pair[0]], causes[pair[1]]
    ].map(x => x.name).join(" ");
  }
};

module.exports = exports;