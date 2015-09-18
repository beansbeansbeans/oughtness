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

var getCentralAngle = (seg, rad) => {
  return 2 * Math.acos(seg / rad);
}

var getCircularSegmentArea = (seg, rad) => {
  var a = getCentralAngle(seg, rad);
  return (Math.pow(rad, 2) / 2) * (a - Math.sin(a));
}

var rowHeight = 50;
var r = 0;
var dragging = false;
var circleOffsetLeft = 0;

var setDimensions = () => {
  var bounds = d.qs(".circle").getBoundingClientRect();
  r = bounds.width / 2;
  circleOffsetLeft = bounds.left;
}

module.exports = {
  initialize() {

  },
  start() {
    var causes = state.get("causes");
    var dimensions = state.get("dimensions");
    var control = d.qs(".circle-wrapper .controls");

    control.addEventListener("mousedown", () => { dragging = true; });

    window.addEventListener("mouseup", () => { dragging = false; });

    mediator.subscribe("resize", () => {
      setDimensions();
      update();
    });

    var handleDrag = (e) => {
      var x = typeof e === 'undefined' ? (circleOffsetLeft + (0.2 * 2 * r)) : e.clientX;
      var position = Math.min(Math.max((x - circleOffsetLeft), 0), r * 2);
      control.style.left = position + 'px';

      var h = Math.min(Math.max((x - circleOffsetLeft), 0), r * 2),
        circularArea = Math.PI * Math.pow(r, 2),
        area = getCircularSegmentArea(Math.abs(r - h), r);

      if(h > r) { area = circularArea - area; }

      var percentage = area / circularArea;

      d.qs('.section').style.width = (position) + 'px';
      d.qs('.section:last-of-type').style.left = (position) + 'px';
      d.qs('.section:last-of-type').style.width = ((r * 2) - (position)) + 'px';

      weights[0].value = percentage;
      weights[1].value = 1 - percentage;
      update();
    }

    window.addEventListener("mousemove", (e) => {
      if(!dragging) { return; }
      handleDrag(e);
    });

    var visData = new Array(causes.length);
    var normalizedVisData = new Array(causes.length);

    var weights = dimensions.map((d) => {
      return {
        id: d._id,
        value: 1 / dimensions.length
      };
    });

    var colors = ['#77C4D3', '#EA2E49'];

    var update = () => {

      // normalize according to weights of each dimension
      normalizedVisData = normalize(visData, weights).map((d) => {
        var metaSum = d.results.reduce((p, c) => { return p + c.sum; }, 0);
        var results = d.results.map((x) => {
          return {
            id: x.id,
            sum: x.sum,
            metaSum: metaSum
          };
        });
        return {
          cause: d.cause,
          results: results
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

      var container = d3.select(".visualization").style("height", rowHeight * causes.length + 'px');

      var rows = container.selectAll(".row").data(normalizedVisData, (d) => { return d.cause; });

      var enteringRows = rows.enter().append("div").attr("class", "row");

      enteringRows.append("div").attr("class", "label");
      enteringRows.append("div").attr("class", "bar-container");

      var bars = rows.select(".bar-container").selectAll(".bar").data((d, i) => { return d.results; });

      enteringRows.select(".label").text((d) => {
        return _.findWhere(causes, { _id: d.cause }).name;
      });

      rows.style("top", (d, i) => { return i * rowHeight + 'px'; });

      bars.enter().append("div").attr("class", "bar")
        .style("background-color", (d, i) => { return colors[i]; });
      
      bars.style("width", (d) => { 
        return ((d.sum / d.metaSum) * scale(d.metaSum)) + '%'; 
      });
    }

    api.get('/vectors', (error, result) => {
      result.data.forEach((d, i) => {
        var total = 0;

        d.causes.forEach((row, rowIndex) => {
          if(typeof visData[rowIndex] === 'undefined') { 
            visData[rowIndex] = {
              cause: causes[rowIndex]._id,
              results: []
            }; 
          }

          var sum = row.reduce((p, c) => { return p + c; }, 0);

          visData[rowIndex].results.push({
            id: dimensions[i]._id,
            sum: sum
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