var util = require('../util');
var state = require('../state');
var mediator = require('../mediator');
var possibleCombinationCount = 0;

mediator.subscribe("loaded", () => {
  possibleCombinationCount = util.factorial(state.get('causes').length + state.get('dimensions').length) / (util.factorial(3) * util.factorial(state.get('causes').length + state.get('dimensions').length - 3));
});

var refreshStatePair = () => {
  var pair = (function getIndices() {
    if(state.get('pair_history').length === possibleCombinationCount) {
      return [-1, -1, -1];
    }

    var attempt = [
      Math.round(Math.random() * (state.get('causes').length - 1)),
      Math.round(Math.random() * (state.get('causes').length - 1)),
      Math.round(Math.random() * (state.get('dimensions').length - 1))
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
    mediator.subscribe("window_click", (e) => {
      if(e.target.getAttribute("id") !== "new-vote") { return; }
      refreshStatePair();
    });
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
      return _.findIndex(state.get('causes'), cause => cause.slug === x);
    }).concat(_.findIndex(state.get('dimensions'), x => x.name === dimension)));
  },
  template(pair) {
    state.set('pair_history', state.get('pair_history').concat([pair]));
    state.set('pair', pair);

    if(_.isEqual(pair, [-1, -1, -1])) {
      document.querySelector("#slug-display").innerHTML = "that's it. check out the data.";
    } else {
      document.querySelector("#slug-display").innerHTML = [
        state.get('causes')[pair[0]], state.get('causes')[pair[1]]
      ].map(x => x.name).join(" ");
    }
  }
};

module.exports = exports;