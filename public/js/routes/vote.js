var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');
var questionsInSet = 0;
var sets = [];
var currentSet = 0;
var currentQuestion = 0;

mediator.subscribe("loaded", () => {
  questionsInSet = state.get('causes').length - 1;
  
  var availableCombinations = [];
  for(var i=0; i<state.get('causes').length; i++) {
    for(var j=i + 1; j<state.get('causes').length; j++) {
      availableCombinations.push([i, j]);
    }
  }

  var combinationsForDimensions = [];
  for(var i=0; i<state.get('dimensions').length; i++) {
    combinationsForDimensions.push(JSON.parse(JSON.stringify(availableCombinations)));
  }

  var dimension;
  for(var i=0; i<(availableCombinations.length * state.get('dimensions').length / questionsInSet); i++) {
    var combinations = [];
    if(i === 0) {
      dimension = Math.round(Math.random() * (state.get('dimensions').length - 1));
    } else {
      dimension = (dimension + 1) % state.get('dimensions').length;
    }

    for(var j=0; j<questionsInSet; j++) {
      var pair = combinationsForDimensions[dimension].splice(Math.round(Math.random() * (combinationsForDimensions[dimension].length - 1)), 1);
      combinations.push(pair[0].concat(dimension));
    }
    sets.push(combinations);
  }
});

var refreshStatePair = () => {
  var pair = (function getIndices() {
    if(currentSet === sets.length - 1 && currentQuestion === sets[currentSet].length - 1) {
      return [-1, -1, -1];
    }

    return sets[currentSet][currentQuestion];
  }());

  exports.template(pair);

  currentQuestion++;
  if(typeof sets[currentSet][currentQuestion] === 'undefined') {
    currentSet++;
    currentQuestion = 0;
  }

  if(!_.isEqual(pair, [-1, -1, -1])) {
    mediator.publish("pair_updated");
  }
};

var voteFor = (selection) => {
  util.async([
    (done) => {
      var selectionTransitionEndHandler = () => {
        setTimeout(done, 1000); // for UI sake
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
    var fadeOutEndHandler = (e) => {
      d.qs('[data-route="vote"]').removeEventListener(util.prefixedTransitionEnd[util.prefixedProperties.transition.js], fadeOutEndHandler);
      refreshStatePair();
    };

    d.qs('[data-route="vote"]').classList.add("fade");
    d.qs('[data-route="vote"]').addEventListener(util.prefixedTransitionEnd[util.prefixedProperties.transition.js], fadeOutEndHandler);
  });

  d.qs('[data-route="vote"]').setAttribute("data-won", selection);
};

var handleClick = (e) => {
  var target = e.target,
    closestVote = target.closest('[data-vote-for]');
  if(closestVote) {
    voteFor(closestVote.getAttribute("data-vote-for"));
  }
}

var exports = {
  initialize() {
    
  },
  stop() {
    mediator.unsubscribe("window_click", handleClick);
  },
  subscribeAll() {
    mediator.subscribe("window_click", handleClick);
  },
  start() {
    refreshStatePair();
    this.subscribeAll();
  },
  inflate(data) {
    this.subscribeAll();

    var pairing = data.params.pairing,
      dimension = pairing.slice(0, pairing.indexOf('-of-')),
      indices = pairing.slice(dimension.length + '-of-'.length)
        .split('-vs-').map((x) => {
          return _.findIndex(state.get('causes'), cause => cause.slug === x);
        }).concat(_.findIndex(state.get('dimensions'), x => x.name === dimension));

    exports.template(indices);

    currentQuestion = 1;

    var indexOfSet = -1, setSearchIndex = 0, indexOfQuestion = -1;
    while(indexOfSet === -1) {
      if(sets[setSearchIndex].some((d, i) => {
        if(util.arrayEquals(d, indices)) {
          indexOfQuestion = i;
          return true;
        }
        return false;
      })) {
        indexOfSet = setSearchIndex;
      } else {
        setSearchIndex++;
      }
    }

    // rearranging things
    sets = sets.concat(sets.splice(0, indexOfSet));
    sets[0] = sets[0].concat(sets[0].splice(0, indexOfQuestion));
  },
  template(pair) {
    d.qs("[data-route='vote']").classList.remove("fade");
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

      d.qs('.set-progress').textContent = `Set ${currentSet + 1}: ${currentQuestion + 1} / ${sets[currentSet].length}`;
    }
  }
};

module.exports = exports;