var util = require('../util');
var state = require('../state');
var mediator = require('../mediator');
var causes = require('../data/causes');
var dimensions = require("../data/dimensions");

var possibleCombinationCount = util.factorial(causes.length + dimensions.length) / (util.factorial(3) * util.factorial(causes.length + dimensions.length - 3));

var refreshStatePair = () => {
  var pair = (function getIndices() {
    if(state.get('pair_history').length === possibleCombinationCount) {
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
    state.set('pair_history', state.get('pair_history').concat([pair]));
    state.set('pair', pair);

    if(_.isEqual(pair, [-1, -1, -1])) {
      document.querySelector("#slug-display").innerHTML = "that's it. check out the data.";
    } else {
      document.querySelector("#slug-display").innerHTML = [
        causes[pair[0]], causes[pair[1]]
      ].map(x => x.name).join(" ");
    }
  }
};

module.exports = exports;