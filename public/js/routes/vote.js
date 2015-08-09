var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');
var possibleCombinationCount = 0;

mediator.subscribe("loaded", () => {
  possibleCombinationCount = util.factorial(state.get('causes').length + state.get('dimensions').length) / (util.factorial(3) * util.factorial(state.get('causes').length + state.get('dimensions').length - 3));
});

var refreshStatePair = () => {
  var pair = (function getIndices() {
    if(state.get('pair_history').length >= possibleCombinationCount) {
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

  if(!_.isEqual(pair, [-1, -1, -1])) {
    mediator.publish("pair_updated");
  }
};

var voteFor = (selection) => {
  var pair = state.get('pair');
  api.post('/vote', {
    dimension: state.get('dimensions')[pair[2]]._id,
    causes: [
      {
        id: state.get('causes')[pair[0]]._id,
        won: +selection === 0
      },
      {
        id: state.get('causes')[pair[1]]._id,
        won: +selection === 1
      }
    ]
  }, refreshStatePair);
};

var exports = {
  initialize() {
    mediator.subscribe("window_click", (e) => {
      var target = e.target;
      if(target.hasAttribute("data-vote-for")) {
        voteFor(target.getAttribute("data-vote-for"));
      }
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

    if(_.isEqual(pair, [-1, -1, -1])) {
      d.qs("#question").innerHTML = "that's it. check out the data.";
      d.qs("#cause-container").innerHTML = '';
      d.qs("#choose-both").innerHTML = '';
    } else {
      state.set('pair', pair);
      d.qs("#question ")
      d.qs("#dimension").textContent = state.get('dimensions')[pair[2]].adjective;
      d.qs("#cause-0").textContent = state.get('causes')[pair[0]].name;
      d.qs("#cause-1").textContent = state.get('causes')[pair[1]].name;
    }
  }
};

module.exports = exports;