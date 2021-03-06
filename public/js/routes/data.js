var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

var normalize = (data, weights) => {
  return data.map((d) => {
    return {
      cause: d.cause,
      results: d.results.map((r) => {
        return {
          id: r.id,
          sum: r.sum * _.findWhere(weights, {id: r.id}).value
        }
      })
    };
  });
}

var formatEigenvalue = (num, max) => {
  var val = (100 * num / max).toFixed(1);
  if(+val[val.length - 1] === 0) { val = Math.round(val); }
  return val;
}

var getAbbreviation = (d) => {
  return d.split(' ').reduce((p, c) => { return p + c[0]; }, '');
}

var getCause = id => _.findWhere(causes, { _id: id }).name;
var getCauseSlug = id => _.findWhere(causes, { _id: id }).slug;
var getDimension = id => _.findWhere(dimensions, { _id: id }).name;

var rowHeight = 50;
var trackWidth = 0;
var control;
var controlWidth = 0;
var dragging = false;
var circleOffsetLeft = 0;
var detailWidth = 0;

var comparisonHighlight;
var detail;
var description;
var svgBuffer = 2;

var lastActiveCause = -1;
var activeDimensionID;

var overDetail = false;

var visData, normalizedVisData;
var weights = [];
var data;
var orderedCauses = [];
var causes = [], dimensions = [];
var disabledCauses = [];
var colors = ['#8E2800', '#DB9E36'];

var setDimensions = () => {
  var bounds = d.qs(".slider").getBoundingClientRect();
  trackWidth = bounds.width;
  controlWidth = control.getBoundingClientRect().width;
  circleOffsetLeft = bounds.left;
  detailWidth = d.qs(".detail .graph").getBoundingClientRect().width;
}

var handleResize = () => {
  setDimensions();
  drawMiniBarChart(lastActiveCause);
  update();
}

var getStats = (lastActiveCause, dimensionID) => {
  var won = 0, lost = 0;
  getEnabledVotes().forEach((d) => {
    if(d.dimension === dimensionID && Object.keys(d.causes).indexOf(lastActiveCause) !== -1) {
      Object.keys(d.causes).forEach((c) => {
        if(c === lastActiveCause) { won += d.causes[c];
        } else { lost += d.causes[c]; }
      });
    }
  });

  return { won, lost };
}

var getEnabledVotes = () => {
  return data.votes.filter((d) => {
    return Object.keys(d.causes).every(c => disabledCauses.indexOf(c) === -1);
  });
}

var maxHeight = 40;
var barWidth = 5;
var barBuffer;

var indexWithinNormalizedData;

var getMiniBarLeft = (cause) => {
  if(!cause) { return; }
  var index = _.findIndex(normalizedVisData, (d) => {
    return d.cause === cause._id;
  });
  if(index > indexWithinNormalizedData) {
    index--;
  }
  return svgBuffer + index * (barWidth + barBuffer); 
}

var relevantVotes;
var relevantVotesForDimension;
var otherCauses;

var drawMiniBarChart = (causeID) => {
  if(causeID === -1 || typeof activeDimensionID === 'undefined') { return; }
  var graph = d3.select(".detail .graph");
  var graphSVG = graph.select("svg");
  var upperVotesContainer = d3.select(".detail .upper-vote-labels");
  var lowerVotesContainer = d3.select(".detail .lower-vote-labels");
  relevantVotes = getEnabledVotes().filter((d) => {
    return Object.keys(d.causes).indexOf(causeID) !== -1;
  });

  relevantVotesForDimension = relevantVotes.filter(d => d.dimension === activeDimensionID);
  otherCauses = causes.filter(d => d._id !== causeID);
  
  var graphLines = graphSVG.selectAll(".line").data(otherCauses, x => x._id);
  var upperVotes = upperVotesContainer.selectAll(".label").data(otherCauses, x => x._id);
  var lowerVotes = lowerVotesContainer.selectAll(".label").data(otherCauses, x => x._id);
  var bars = graphSVG.selectAll(".bar").data(otherCauses, x => x._id);
  var bottomBars = graphSVG.selectAll(".bottom-bar").data(otherCauses, x => x._id);

  barBuffer = (detailWidth - (svgBuffer * 2) - (barWidth * otherCauses.length)) / (otherCauses.length - 1);
  var barHeightScale = d3.scale.linear().domain([0, 1]).range([0, maxHeight]);
  var getBarHeight = (d) => {
    var vote = _.find(relevantVotesForDimension, (vote) => {
      return Object.keys(vote.causes).indexOf(d._id) !== -1;
    });

    if(!vote) { return 0; }

    return barHeightScale(vote.causes[d._id] / (vote.causes[d._id] + vote.causes[causeID]));
  }

  var dimensionIndex = _.findIndex(dimensions, x => x._id === activeDimensionID);

  indexWithinNormalizedData = _.findIndex(normalizedVisData, (d) => {
    return d.cause === causeID;
  });

  graphSVG.attr("width", (otherCauses.length * barWidth) + ((otherCauses.length - 1) * barBuffer) + (svgBuffer * 2)).attr("height", maxHeight * 2);

  graphLines.enter().append("line").attr("class", "line");
  graphLines.attr("x1", x => getMiniBarLeft(x) + 2.5)
    .attr("y1", 0).attr("x2", x => getMiniBarLeft(x) + 2.5)
    .attr("y2", maxHeight * 2);
  graphLines.exit().remove();

  upperVotes.enter().append("div").attr("class", "label");
  upperVotes.style("left", (cause) => { 
    return (getMiniBarLeft(cause) + 3) + 'px';
  }).text((d) => {
    var vote = _.find(relevantVotesForDimension, (vote) => {
      return Object.keys(vote.causes).indexOf(d._id) !== -1;
    });
    if(!vote) { return 0; }
    return Math.round(100 - 100 * vote.causes[d._id] / (vote.causes[d._id] + vote.causes[causeID]));
  });
  upperVotes.exit().remove();
  lowerVotes.enter().append("div").attr("class", "label");
  lowerVotes.style("left", (cause) => { 
    return (getMiniBarLeft(cause) + 3) + 'px';
  }).text((d) => {
    var vote = _.find(relevantVotesForDimension, (vote) => {
      return Object.keys(vote.causes).indexOf(d._id) !== -1;
    });
    if(!vote) { return 0; }
    return Math.round(100 * vote.causes[d._id] / (vote.causes[d._id] + vote.causes[causeID]));
  });
  lowerVotes.exit().remove();

  bars.enter().append("rect").attr("class", "bar");
  bars.attr("width", barWidth).attr("x", getMiniBarLeft).attr("y", 0)
    .attr("height", maxHeight)
    .attr("fill", colors[dimensionIndex])
    .attr("stroke", colors[dimensionIndex])
    .style(util.prefixedProperties.transform.dom, (d) => {
      return "translate3d(0, " + getBarHeight(d) + "px, 0) scale(1," + ((maxHeight - getBarHeight(d)) / maxHeight) + ")";
    });
  bars.exit().remove();

  bottomBars.enter().append("rect").attr("class", "bottom-bar");
  bottomBars.attr("width", barWidth).attr("x", getMiniBarLeft).attr("y", 0)
    .attr("height", getBarHeight)
    .attr("stroke", colors[dimensionIndex])
    .style(util.prefixedProperties.transform.dom, (d) => {
      return "translate3d(0, " + (maxHeight) + "px, 0)";
    });
  bottomBars.exit().remove();

  var labels = graph.select(".labels").selectAll(".label").data(otherCauses, (d) => {
    return d._id;
  });
  labels.enter().append("div").attr("class", "label").append("div").attr("class", "text");
  labels.attr("data-compared-cause", d => d._id)
    .style("left", (cause) => { 
      return (getMiniBarLeft(cause) + 4) + 'px';
    })
    .select(".text").text(d => getAbbreviation(d.name));
  labels.exit().remove();

  var stats = getStats(causeID, activeDimensionID);

  d.qs(".dimensions-detail .more-info").innerHTML = `With respect to ${getDimension(activeDimensionID)} ${getCause(causeID).toLowerCase()} won ${stats.won} out of ${stats.won + stats.lost} times. `;
  d.qs(".dimensions-detail .graph-explanation span").innerHTML = getCause(causeID).toLowerCase();

  var leftMostCause = otherCauses.reduce((prev, curr) => {
    if(!prev || getMiniBarLeft(curr) < getMiniBarLeft(prev)) {
      return curr;
    }
    return prev;
  }, 0);

  handleOverDescription(leftMostCause._id);
}

var handleOverDescription = (e) => {
  var comparedCause = e;
  if(typeof e === "object") {
    comparedCause = e.target.dataset.comparedCause;
  }
  if(comparedCause) {
    [].forEach.call(description.querySelectorAll('.label[data-compared-cause]'), function(d) {
      d.classList.remove("active");
    });
    description.querySelector('.label[data-compared-cause="' + comparedCause + '"]').classList.add("active");
    var vote = _.find(relevantVotesForDimension, (vote) => {
      return Object.keys(vote.causes).indexOf(comparedCause) !== -1;
    });
    comparisonHighlight.innerHTML = `When pitted against ${getCause(comparedCause).toLowerCase()}, ${getCause(lastActiveCause).toLowerCase()} won ${vote.causes[lastActiveCause]} out of ${vote.causes[lastActiveCause] + vote.causes[comparedCause]} times.`;
  }
}

var update = () => {
  // normalize according to weights of each dimension
  normalizedVisData = normalize(visData.filter(d => disabledCauses.indexOf(d.cause) === -1), weights).map((d) => {
    var metaSum = d.results.reduce((p, c) => { return p + c.sum; }, 0);
    return {
      cause: d.cause,
      results: d.results.map(({ id, sum }) => {
        return { id, sum, metaSum };
      })
    };
  }).sort((a, b) => {
    var aSum = a.results.reduce((p, c) => { return p + c.sum; }, 0),
      bSum = b.results.reduce((p, c) => { return p + c.sum; }, 0);

    if(aSum > bSum) { return -1;
    } else if(aSum < bSum) { return 1; }
    return 0;
  });

  var minCombinedValue = Infinity, maxCombinedValue = 0;

  normalizedVisData.forEach((d, i) => {
    var currCombinedValue = d.results.reduce((np, nc) => { return np + nc.sum; }, 0);

    if(currCombinedValue < minCombinedValue) { 
      minCombinedValue = currCombinedValue;
    }
    if(currCombinedValue > maxCombinedValue) {
      maxCombinedValue = currCombinedValue;
    }
  });

  var minSingleSum = normalizedVisData.reduce((p, c) => {
    var cSum = Math.min.apply(Math, c.results.map(d => d.sum));
    if(cSum < p) { return cSum; }
    return p;
  }, Infinity);

  var maxSingleSum = normalizedVisData.reduce((p, c) => {
    var cSum = Math.max.apply(Math, c.results.map(d => d.sum));
    if(cSum > p) { return cSum; }
    return p;
  }, 0);

  var scale = d3.scale.linear().domain([minCombinedValue, maxCombinedValue]).range([5, 100]);

  var container = d3.select(".visualization").style("height", rowHeight * (causes.length + 1) + 'px');

  var rows = container.selectAll(".row").data(normalizedVisData, d => d.cause);

  var enteringRows = rows.enter().append("div").attr("class", "row")
    .style("height", rowHeight + 'px')
    .attr("data-cause-slug", x => getCauseSlug(x.cause))
    .attr("data-cause-id", d => d.cause );

  enteringRows.append("div").attr("class", "label").append("div").attr("class", "text");
  enteringRows.append("div").attr("class", "bar-container").append("div").attr("class", "values");;
  enteringRows.select(".label").append("div").attr("class", "remove").text("remove");
  enteringRows.select(".label").select(".text").text(d => `${getCause(d.cause)} (${getAbbreviation(getCause(d.cause))})`);
  
  rows.style(util.prefixedProperties.transform.js, (d, i) => { return 'translate3d(0,' + i * rowHeight + 'px, 0)'; })
      .select(".values").text((d) => {
        return `${formatEigenvalue(d.results[0].sum, maxCombinedValue)} : ${formatEigenvalue(d.results[1].sum, maxCombinedValue)}`;
      }).style("left", d => scale(d.results[0].metaSum) + '%');

  rows.exit().remove();

  var bars = rows.select(".bar-container").selectAll(".bar").data(d => d.results);

  bars.enter().append("div").attr("class", "bar")
      .style("background-color", (d, i) => { return colors[i]; });
  
  bars.style("width", d => ((d.sum / d.metaSum) * scale(d.metaSum)) + '%');

  if(!d.qs('.visualization .disabled-causes')) {
    container.append("div").attr("class", "disabled-causes");
  }

  container.select(".disabled-causes").style("margin-top", (rowHeight * (causes.length - disabledCauses.length)) + 'px');

  var disabledCauseEls = container.select(".disabled-causes").selectAll(".disabled-cause").data(disabledCauses, _.identity);

  disabledCauseEls.enter().append("div").attr("class", "disabled-cause")
    .attr("data-cause-slug", x => getCauseSlug(x))
    .attr("data-cause-id", _.identity).text(getCause);

  disabledCauseEls.exit().remove();

  drawMiniBarChart(lastActiveCause);
}

module.exports = {
  initialize() {

  },
  stop() {
    lastActiveCause = -1;
    mediator.unsubscribe("resize", handleResize);
  },
  start() {
    causes = state.get("causes");
    dimensions = state.get("dimensions");
    control = d.qs(".slider .controls");
    var firstPercentLabel = d.qs('.input .criticalness .value');
    var secondPercentLabel = d.qs('.input .tractability .value');
    detail = d.qs('.detail');
    description = d.qs('.detail .deep-dive');
    var chart = d.qs('.chart');
    var visualization = d.qs('.visualization-container');
    comparisonHighlight = description.querySelector(".highlight-comparison .text");

    var setActive = (lastActiveCause, dimension) => {
      activeDimensionID = dimension;
      description.querySelector('.dimensions-container').setAttribute("data-active-dimension", getDimension(activeDimensionID));
      drawMiniBarChart(lastActiveCause);
    }

    var handleOverCause = (e) => {
      if(overDetail) { return; }
      var row;

      if(e.target) {
        row = e.target.closest('.row');
      } else {
        row = e;
      }

      var lastActive = chart.querySelector('.active');

      if(!row || row.getAttribute('data-cause-id') === lastActiveCause) { return; }

      description.style.opacity = 0;
      
      setTimeout(() => {
        if(lastActive) { lastActive.classList.remove('active'); }
        row.classList.add('active');

        visualization.classList.add("preview");

        lastActiveCause = row.getAttribute('data-cause-id');
        visualization.setAttribute("data-active-cause-id", getCauseSlug(lastActiveCause));
        var causeName = getCause(lastActiveCause);
        var enabledVotes = getEnabledVotes();

        description.querySelector('.image').setAttribute("data-cause-id", getCauseSlug(lastActiveCause));
        description.querySelector('.title').innerHTML = causeName;
        description.querySelector('.description').innerHTML = _.findWhere(causes, { _id: lastActiveCause }).description;

        setActive(lastActiveCause, dimensions[0]._id);
        description.style.opacity = 1;
      }, 200);
    }

    var handleUp = (e) => {
      dragging = false;
    }

    var handleMove = (e) => {
      if(!dragging) { return; }
      handleDrag(e);
    }

    if(UserAgent.getBrowserInfo().desktop) {
      detail.addEventListener("mouseover", () => {
        overDetail = true;
      });
      detail.addEventListener("mouseout", () => {
        overDetail = false;
      });
      chart.addEventListener("mouseover", _.debounce(handleOverCause, 200));
      description.addEventListener("mouseover", handleOverDescription);
      window.addEventListener("mousedown", (e) => {
        if(e.target.classList.contains("controls")) { dragging = true; }
      });
      window.addEventListener("mouseup", handleUp);
      window.addEventListener("mousemove", handleMove);
    } else {
      chart.addEventListener("touchstart", handleOverCause);
      description.addEventListener("touchstart", handleOverDescription);
      window.addEventListener("touchstart", (e) => {
        if(e.target.classList.contains("controls") || e.target.closest(".input")) {
          dragging = true;
        }
      });
      window.addEventListener("touchend", handleUp);
      window.addEventListener("touchmove", handleMove);
    }

    chart.addEventListener("mouseleave", () => {
      var lastActive = chart.querySelector('.active');
      if(lastActive) { lastActive.classList.remove('active'); }
    });

    chart.addEventListener("click", (e) => {
      if(e.target.classList.contains('remove')) {
        return;
        if(disabledCauses.length < causes.length - 2) {
          disabledCauses.push(e.target.closest('.row').getAttribute("data-cause-id"));
          update();          
        }
      } else if(e.target.classList.contains('disabled-cause')) {
        disabledCauses.splice(disabledCauses.indexOf(e.target.getAttribute("data-cause-id")), 1);
        update();
      }
    });

    description.addEventListener("click", (e) => {
      if(e.target.closest(".dimension")) {
        var indexOfClosestDimension = [].slice.call(description.querySelectorAll(".dimension")).indexOf(e.target.closest(".dimension"));
        setActive(lastActiveCause, dimensions[indexOfClosestDimension]._id)
      }
    });

    mediator.subscribe("resize", handleResize);

    var handleDrag = (e) => {
      if(e && e.touches) {
        e = e.touches[0];
      }
      var x = typeof e === 'undefined' ? (circleOffsetLeft + (0.6 * trackWidth)) : e.clientX;
      var position = Math.min(Math.max((x - circleOffsetLeft - controlWidth / 2), 1), trackWidth - controlWidth);
      control.style.left = position + 'px';

      var percentage = position / (trackWidth - controlWidth);

      weights[0].value = percentage;
      weights[1].value = 1 - percentage;

      firstPercentLabel.textContent = Math.round(percentage * 100);
      secondPercentLabel.textContent = Math.round((1 - percentage) * 100);

      update();
    }

    visData = new Array(causes.length);
    normalizedVisData = new Array(causes.length);

    weights = dimensions.map((d) => {
      return {
        id: d._id,
        value: 1 / dimensions.length
      };
    });

    api.get('/vectors', (error, result) => {
      data = result;

      result.result.forEach((d, i) => {
        var total = 0;

        d.causes.forEach((row, rowIndex) => {
          if(typeof visData[rowIndex] === 'undefined') { 
            visData[rowIndex] = {
              cause: causes[rowIndex]._id,
              results: []
            }; 
          }

          var sum = util.sum(row);

          visData[rowIndex].results.push({
            id: dimensions[i]._id, sum
          });

          total += sum;
        });

        visData.forEach((_, causeIndex) => {
          visData[causeIndex].results[i].sum = visData[causeIndex].results[i].sum / total;
        });
      });

      d.qs('[data-route="data"]').setAttribute("data-loading", false);
      setDimensions();
      handleDrag();
      handleOverCause(d.qs('.row:nth-of-type(1)'));
    }, false);
  }
};