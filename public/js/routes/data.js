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

var formatEigenvalue = (num) => {
  var val = (100 * num).toFixed(1);
  if(+val[val.length - 1] === 0) { val = Math.round(val); }
  return val;
}

var getAbbreviation = (d) => {
  return d.split(' ').reduce((p, c) => { return p + c[0]; }, '');
}

var getCause = id => _.findWhere(causes, { _id: id }).name;
var getCauseSlug = id => _.findWhere(causes, { _id: id }).slug;
var getDimension = id => _.findWhere(dimensions, { _id: id }).name;

var cancelMouseOverCause = false;

var rowHeight = 50;
var trackWidth = 0;
var control;
var controlWidth = 0;
var dragging = false;
var circleOffsetLeft = 0;
var detailWidth = 0;

var lastActiveCause = -1;

var visData, normalizedVisData;
var weights = [];
var data;
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
  update();
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

  d.qs('.chart .scale .value').textContent = formatEigenvalue(maxCombinedValue);

  var scale = d3.scale.linear().domain([minCombinedValue, maxCombinedValue]).range([5, 100]);

  var container = d3.select(".visualization").style("height", rowHeight * (causes.length + 1) + 'px');

  var rows = container.selectAll(".row").data(normalizedVisData, d => d.cause);

  var enteringRows = rows.enter().append("div").attr("class", "row")
    .style("height", rowHeight + 'px')
    .attr("data-cause-id", d => d.cause );

  enteringRows.append("div").attr("class", "label").append("div").attr("class", "text");
  enteringRows.append("div").attr("class", "bar-container").append("div").attr("class", "values");
  enteringRows.select(".label").append("div").attr("class", "remove").text("remove");
  enteringRows.select(".label").select(".text").text(d => `${getCause(d.cause)} (${getAbbreviation(getCause(d.cause))})`);
  
  rows.style(util.prefixedProperties.transform.js, (d, i) => { return 'translate3d(0,' + i * rowHeight + 'px, 0)'; })
    .select(".values").text((d) => {
      return `${formatEigenvalue(d.results[0].sum)} : ${formatEigenvalue(d.results[1].sum)}`;
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
    .attr("data-cause-id", _.identity).text(getCause);

  disabledCauseEls.exit().remove();
}

var findArea = (k, r) => {
  var t0, t1 = k * 2 * Math.PI;

  if (k > 0 && k < 1) {
    t1 = Math.pow(12 * k * Math.PI, 1 / 3);
    for (var i = 0; i < 10; ++i) {
      t0 = t1;
      t1 = (Math.sin(t0) - t0 * Math.cos(t0) + 2 * k * Math.PI) / (1 - Math.cos(t0));
    }
    k = (1 - Math.cos(t1 / 2)) / 2;
  }

  var h = 2 * r * k;

  return h;
}

module.exports = {
  initialize() {

  },
  stop() {
    mediator.unsubscribe("resize", handleResize);
  },
  start() {
    causes = state.get("causes");
    dimensions = state.get("dimensions");
    control = d.qs(".slider .controls");
    var firstPercentLabel = d.qs('.input .criticalness .value');
    var secondPercentLabel = d.qs('.input .tractability .value');
    var description = d.qs('.detail .deep-dive');
    var chart = d.qs('.chart');
    var visualization = d.qs('.visualization-container');

    var getEnabledVotes = () => {
      return data.votes.filter((d) => {
        return Object.keys(d.causes).every(c => disabledCauses.indexOf(c) === -1);
      });
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

    control.addEventListener("mousedown", () => { dragging = true; });

    window.addEventListener("mouseup", () => { dragging = false; });

    var setActive = (lastActiveCause, activeDimensionID) => {
      description.querySelector('.dimensions-container').setAttribute("data-active-dimension", getDimension(activeDimensionID));
      drawMiniBarChart(lastActiveCause, activeDimensionID);
    }

    var drawMiniBarChart = (causeID, dimensionID) => {
      var relevantVotes = getEnabledVotes().filter((d) => {
        return Object.keys(d.causes).indexOf(causeID) !== -1;
      });

      var graph = d3.select(".detail .graph");
      var graphSVG = graph.select("svg");

      var relevantVotesForDimension = relevantVotes.filter(d => d.dimension === dimensionID);
      var otherCauses = causes.filter(d => d._id !== causeID);
      
      var bars = graphSVG.selectAll(".bar").data(otherCauses);
      var bottomBars = graphSVG.selectAll(".bottom-bar").data(otherCauses);
      var maxHeight = 40;
      var barWidth = 5;
      var barBuffer = (detailWidth - (barWidth * otherCauses.length)) / (otherCauses.length - 1);
      var barHeightScale = d3.scale.linear().domain([0, 1]).range([0, maxHeight]);
      var getBarHeight = (d) => {
        var vote = _.find(relevantVotesForDimension, (vote) => {
          return Object.keys(vote.causes).indexOf(d._id) !== -1;
        });

        if(!vote) { return 0; }

        return barHeightScale(vote.causes[d._id] / (vote.causes[d._id] + vote.causes[causeID]));
      }

      var dimensionIndex = _.findIndex(dimensions, x => x._id === dimensionID);

      graphSVG.attr("width", (otherCauses.length * barWidth) + ((otherCauses.length - 1) * barBuffer)).attr("height", maxHeight * 2);
      bars.enter().append("rect").attr("class", "bar");
      bars.attr("width", barWidth).attr("x", (_, i) => { return i * (barWidth + barBuffer); })
        .attr("y", 0)
        .attr("height", maxHeight)
        .attr("fill", colors[dimensionIndex])
        .style("transform", (d) => {
          return "translate3d(0, " + getBarHeight(d) + "px, 0) scale(1," + ((maxHeight - getBarHeight(d)) / maxHeight) + ")";
        });

      bottomBars.enter().append("rect").attr("class", "bottom-bar");
      bottomBars.attr("width", barWidth).attr("x", (_, i) => { return i * (barWidth + barBuffer); })
        .attr("y", (d) => { return maxHeight + 2; })
        .attr("height", getBarHeight)
        .attr("fill", colors[dimensionIndex])
        .attr("fill-opacity", 0.35);

      var labels = graph.select(".labels").selectAll(".label").data(otherCauses);
      labels.enter().append("div").attr("class", "label");
      labels.text(d => getAbbreviation(d.name))
        .style("left", (_, i) => { return (i * (barWidth + barBuffer) + 4) + 'px'; })
        .style("transform", (d) => { return "translateY(" + (getBarHeight(d) - 5) + 'px) rotate(-90deg)'; });

      var stats = getStats(causeID, dimensionID);

      d.qs(".dimensions-detail .more-info").innerHTML = `With respect to ${getDimension(dimensionID)} ${getCause(causeID).toLowerCase()} won ${Math.round(100 * stats.won / (stats.won + stats.lost))}% of the time. `;
    }

    chart.addEventListener("mouseover", _.debounce((e) => {
      if(cancelMouseOverCause) { return; }

      var row = e.target.closest('.row');
      var lastActive = chart.querySelector('.active');

      if(!row || row.getAttribute('data-cause-id') === lastActiveCause) { return; }

      description.style.opacity = 0;
      
      setTimeout(() => {
        if(lastActive) { lastActive.classList.remove('active'); }
        row.classList.add('active');

        visualization.classList.add("preview");

        lastActiveCause = row.getAttribute('data-cause-id');
        var causeName = getCause(lastActiveCause);
        var r = description.querySelector(".circle").offsetHeight / 2;
        var enabledVotes = getEnabledVotes();

        dimensions.forEach((dimension) => {
          var stats = getStats(lastActiveCause, dimension._id);

          description.querySelector('.' + dimension.name + ' .percent').style.height = findArea((stats.won / (stats.won + stats.lost)), r) + 'px';
          description.querySelector('.' + dimension.name + ' .numbers').textContent = `${stats.won} / ${stats.won + stats.lost}`;
        });

        description.querySelector('.image').setAttribute("data-cause-id", getCauseSlug(lastActiveCause));
        description.querySelector('.title').innerHTML = causeName;
        description.querySelector('.description').innerHTML = _.findWhere(causes, { _id: lastActiveCause }).description;

        setActive(lastActiveCause, dimensions[0]._id);
        description.style.opacity = 1;
      }, 200);
    }, 150));

    description.addEventListener("mouseover", () => {
      cancelMouseOverCause = true;
    });

    description.addEventListener("mouseleave", () => {
      cancelMouseOverCause = false;
    });

    chart.addEventListener("mouseleave", () => {
      var lastActive = chart.querySelector('.active');
      if(lastActive) { lastActive.classList.remove('active'); }
    });

    chart.addEventListener("click", (e) => {
      if(e.target.classList.contains('remove')) {
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

    window.addEventListener("mousemove", (e) => {
      if(!dragging) { return; }
      handleDrag(e);
    });

    visData = new Array(causes.length);
    normalizedVisData = new Array(causes.length);

    weights = dimensions.map((d) => {
      return {
        id: d._id,
        value: 1 / dimensions.length
      };
    });

    api.get('/vectors', (error, result) => {
      data = result.data;

      result.data.result.forEach((d, i) => {
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
    }, false);
  }
};