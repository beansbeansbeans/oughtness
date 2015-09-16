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
      var cause1Match, cause2Match;
      cause1Match = x[0] === attempt[0] || x[0] === attempt[1];
      cause2Match = x[1] === attempt[1] || x[1] === attempt[0];
      return x[2] === attempt[2] && cause1Match && cause2Match;
    })) {
      return getIndices();
    }
    return attempt;
  }());

  exports.template(pair);
  exports.toggleLoader(false);

  if(!_.isEqual(pair, [-1, -1, -1])) {
    mediator.publish("pair_updated");
  }
};

var voteFor = (selection) => {
  util.async([
    (done) => {
      var selectionTransitionEndHandler = () => {
        done();
        d.qs('#cause-0').removeEventListener(util.prefixedTransitionEnd[util.prefixedProperties.transition.js], selectionTransitionEndHandler);
      };

      d.qs('#cause-0').addEventListener(util.prefixedTransitionEnd[util.prefixedProperties.transition.js], selectionTransitionEndHandler);
    },
    (done) => {
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
      }, done);
    }
  ], () => {
    refreshStatePair();
  });

  d.qs('[data-route="vote"]').setAttribute("data-won", selection);
};

var exports = {
  initialize() {
    mediator.subscribe("window_click", (e) => {
      var target = e.target,
        closestVote = target.closest('[data-vote-for]');
      if(closestVote) {
        voteFor(closestVote.getAttribute("data-vote-for"));
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
  toggleLoader(show) {
    d.qs('[data-route="vote"]').setAttribute("data-loading", show);
  },
  template(pair) {
    state.set('pair_history', state.get('pair_history').concat([pair]));
    d.qs("[data-route='vote']").removeAttribute("data-won");

    if(_.isEqual(pair, [-1, -1, -1])) {
      d.qs("#question").innerHTML = "that's it. check out the data.";
      d.qs("#cause-container").innerHTML = '';
      d.qs("#choose-both").innerHTML = '';
    } else {
      state.set('pair', pair);
      d.qs("#question ")
      d.qs("#dimension").textContent = state.get('dimensions')[pair[2]].adjective;
      d.qs("#cause-0 .title").textContent = state.get('causes')[pair[0]].name;
      d.qs("#cause-0 .description").textContent = state.get('causes')[pair[0]].description;
      d.qs("#cause-1 .title").textContent = state.get('causes')[pair[1]].name;
      d.qs("#cause-1 .description").textContent = state.get('causes')[pair[1]].description;
    }
  }
};

module.exports = exports;