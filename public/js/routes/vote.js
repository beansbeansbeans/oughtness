var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');
var questionsInSet = 0;
var sets = [];
var currentSet = 0;
var currentQuestion = 0;
var interstitialMode = false;
var hasAgreedToContinue = false;

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

  if(!interstitialMode) {
    // only increment if we're not in interstitial mode
    incrementQuestions();  
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

  if(target.getAttribute("href")) {
    return;
  } else if(closestVote) {
    voteFor(closestVote.getAttribute("data-vote-for"));
  } else if(target.id === "continue-to-next-set") {
    hasAgreedToContinue = true;
    exports.template();
    incrementQuestions();
  }
}

var handleKeyDown = (e) => {
  if(e.keyCode === 37) {
    voteFor(0);
  } else if(e.keyCode === 39) {
    voteFor(1);
  }
}

var incrementQuestions = () => {
  currentQuestion++;
  if(typeof sets[currentSet][currentQuestion] === 'undefined') {
    currentSet++;
    currentQuestion = 0;
  }  
}

var buildSource = (prev, curr) => {
  var source = document.createElement("div");
  source.classList.add("source");
  var link = document.createElement("a");
  link.setAttribute("href", curr.link);
  link.setAttribute("target", "_blank");
  link.textContent = curr.display;
  var subtitle = document.createElement("div");
  subtitle.classList.add("subtitle");
  subtitle.textContent = typeof curr.subtitle === 'undefined' ? '' : curr.subtitle;
  source.appendChild(link);
  source.appendChild(subtitle);
  var wrapper = document.createElement("div");
  wrapper.appendChild(source);

  return prev + wrapper.innerHTML;
}

var exports = {
  initialize() {
    
  },
  stop() {
    mediator.unsubscribe("window_click", handleClick);
    mediator.unsubscribe("window_keydown", handleKeyDown);
    interstitialMode = false;
    hasAgreedToContinue = true;
  },
  subscribeAll() {
    mediator.subscribe("window_click", handleClick);
    mediator.subscribe("window_keydown", handleKeyDown);
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
        if(util.arrayEquals(d, indices) || util.arrayEquals(d, [indices[1], indices[0], indices[2]])) {
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
    if(typeof pair === 'undefined') { pair = state.get('pair'); }
    
    d.qs("[data-route='vote']").classList.remove("fade");
    d.qs("[data-route='vote']").removeAttribute("data-won");

    if(_.isEqual(pair, [-1, -1, -1])) {
      interstitialMode = true;
      d.qs('[data-route="vote"]').setAttribute("data-interstitial", true);
      d.qs('[data-route="vote"]').setAttribute("data-complete", true);
    } else {
      state.set('pair', pair);

      if(currentQuestion === 0 && currentSet > 0 && !hasAgreedToContinue) {
        interstitialMode = true;
        d.qs('[data-route="vote"]').setAttribute("data-interstitial", true);
        d.qs("#current-set").innerHTML = currentSet;
        d.qs("#set-total").innerHTML = sets.length;
        d.qs("#cause-total").innerHTML = state.get('causes').length;
        d.qs("#dimensions-total").innerHTML = state.get('dimensions').length;
      } else {
        interstitialMode = false;
        hasAgreedToContinue = false;

        var dimension = state.get('dimensions')[pair[2]],
          cause0 = state.get('causes')[pair[0]],
          cause1 = state.get('causes')[pair[1]];
        
        d.qs('[data-route="vote"]').setAttribute("data-interstitial", false);
        d.qs("#dimension .word").textContent = dimension.adjective;
        d.qs("#dimension .repeated-word").textContent = dimension.adjective;
        d.qs("#dimension .definition").textContent = dimension.definition.text;
        d.qs("#dimension .example").textContent = dimension.definition.example;
        d.qs("#dimension .source").textContent = dimension.definition.source;
        
        d.qs("#cause-0").setAttribute("data-cause-slug", cause0.slug);
        d.qs("#cause-0 .title").textContent = cause0.name;
        d.qs("#cause-0 .description").textContent = cause0.description;
        d.qs("#cause-0 .sources").innerHTML = cause0.moreInfoLink.reduce(buildSource, '');
        d.qs("#cause-0").innerHTML = d.qs("#cause-0").innerHTML;

        d.qs("#cause-1").setAttribute("data-cause-slug", cause1.slug);
        d.qs("#cause-1 .title").textContent = cause1.name;
        d.qs("#cause-1 .description").textContent = cause1.description;
        d.qs("#cause-1 .sources").innerHTML = cause1.moreInfoLink.reduce(buildSource, '');
        d.qs("#cause-1").innerHTML = d.qs("#cause-1").innerHTML;

        d.qs('.set-progress #current-question').textContent = currentQuestion + 1;
        d.qs('.set-progress #total-questions').textContent = sets[currentSet].length;
      }
    }
  }
};

module.exports = exports;