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

var getCause = id => _.findWhere(causes, { _id: id }).name;
var getCauseSlug = id => _.findWhere(causes, { _id: id }).slug;

var rowHeight = 50;
var trackWidth = 0;
var control;
var controlWidth = 0;
var dragging = false;
var circleOffsetLeft = 0;

var visData, normalizedVisData;
var weights = [];
var data;
var causes = [], dimensions = [];
var disabledCauses = [];
var colors = ['#2B3A42', '#B9121B'];

var setDimensions = () => {
  var bounds = d.qs(".slider").getBoundingClientRect();
  trackWidth = bounds.width;
  controlWidth = control.getBoundingClientRect().width;
  circleOffsetLeft = bounds.left;
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

  var container = d3.select(".visualization").style("height", rowHeight * (causes.length + 2) + 'px');

  var rows = container.selectAll(".row").data(normalizedVisData, d => d.cause);

  var enteringRows = rows.enter().append("div").attr("class", "row")
    .style("height", rowHeight + 'px')
    .attr("data-cause-id", d => d.cause );

  enteringRows.append("div").attr("class", "label");
  enteringRows.append("div").attr("class", "bar-container");
  enteringRows.append("div").attr("class", "values");
  enteringRows.append("div").attr("class", "remove").text("remove");
  enteringRows.select(".label").text(d => getCause(d.cause));
  
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

  container.select(".disabled-causes").style("margin-top", (rowHeight * (causes.length - disabledCauses.length + 2)) + 'px');

  var disabledCauseEls = container.select(".disabled-causes").selectAll(".disabled-cause").data(disabledCauses, _.identity);

  disabledCauseEls.enter().append("div").attr("class", "disabled-cause")
    .attr("data-cause-id", _.identity).text(getCause);

  disabledCauseEls.exit().remove();
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
    var firstPercentLabel = d.qs('.input .urgency .value');
    var secondPercentLabel = d.qs('.input .tractability .value');
    var description = d.qs('.detail .description');
    var chart = d.qs('.chart');
    var visualization = d.qs('.visualization-container');

    control.addEventListener("mousedown", () => { dragging = true; });

    window.addEventListener("mouseup", () => { dragging = false; });
    chart.addEventListener('mouseover', (e) => {
      var row = e.target.closest('.row');
      if(row) {
        var template = '';
        var lastActive = chart.querySelector('.active');
        if(lastActive) { lastActive.classList.remove('active'); }
        row.classList.add('active');
        visualization.classList.add("preview");

        var causeID = row.getAttribute('data-cause-id');
        var causeName = getCause(causeID);

        dimensions.forEach((dimension) => {
          var won = 0, lost = 0;
          data.votes.filter((d) => {
            return Object.keys(d.causes).every(c => disabledCauses.indexOf(c) === -1);
          }).forEach((d) => {
            if(d.dimension === dimension._id && Object.keys(d.causes).indexOf(causeID) !== -1) {
              Object.keys(d.causes).forEach((c) => {
                if(c === causeID) { won += d.causes[c];
                } else { lost += d.causes[c]; }
              });
            }
          });

          template += `With respect to ${dimension.name} ${causeName} won ${won} out of ${won + lost} times. `;          
        });

        description.querySelector('.image').setAttribute("data-cause-id", getCauseSlug(causeID));
        description.querySelector('.title').innerHTML = template;
      }
    });
    chart.addEventListener('mouseleave', (e) => {
      visualization.classList.remove("preview");
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

    mediator.subscribe("resize", handleResize);

    var handleDrag = (e) => {
      var x = typeof e === 'undefined' ? (circleOffsetLeft + (0.6 * trackWidth)) : e.clientX;
      var position = Math.min(Math.max((x - circleOffsetLeft), 1), trackWidth - controlWidth);
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