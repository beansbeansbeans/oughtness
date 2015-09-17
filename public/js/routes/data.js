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

var rowHeight = 50;
var r = 0;

module.exports = {
  initialize() {

  },
  start() {
    var causes = state.get("causes");
    var dimensions = state.get("dimensions");

    var handleInput = () => {
      var value = d.qs('.slider input').value / 100;

      var t0, t1 = value * 2 * Math.PI;
      if (value > 0 && value < 1) {
        t1 = Math.pow(12 * value * Math.PI, 1 / 3);
        for (var i = 0; i < 10; ++i) {
          t0 = t1;
          t1 = (Math.sin(t0) - t0 * Math.cos(t0) + 2 * value * Math.PI) / (1 - Math.cos(t0));
        }
        value = (1 - Math.cos(t1 / 2)) / 2;
      }

      var h = 2 * r * value;

      d.qs('.section').style.width = h + 'px';
      d.qs('.section:last-of-type').style.left = h + 'px';
      d.qs('.section:last-of-type').style.width = ((r * 2) - h) + 'px';

      weights[0].value = value;
      weights[1].value = 1 - value;
      update();
    }

    d.qs(".slider input").addEventListener("input", handleInput);

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
      normalizedVisData = normalize(visData, weights).sort((a, b) => {
        var aSum = a.results.reduce((p, c) => { return p + c.sum; }, 0),
          bSum = b.results.reduce((p, c) => { return p + c.sum; }, 0);

        if(aSum > bSum) { return -1;
        } else if(aSum < bSum) { return 1; }
        return 0;
      });

      var maxCombinedValue = normalizedVisData.reduce((p, c) => {
        var currCombinedValue = c.results.reduce((np, nc) => {
          return np + nc.sum;
        }, 0);

        if(currCombinedValue > p) { return currCombinedValue; }
        return p;
      }, 0);

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

      var scale = d3.scale.linear().domain([minSingleSum / maxCombinedValue, maxSingleSum / maxCombinedValue]).range([0, 50]);

      var container = d3.select(".visualization").style("height", rowHeight * causes.length + 'px');

      var rows = container.selectAll(".row").data(normalizedVisData, (d) => { return d.cause; });

      var enteringRows = rows.enter().append("div").attr("class", "row");

      enteringRows.append("div").attr("class", "bar-container");
      enteringRows.append("div").attr("class", "label");

      var bars = rows.select(".bar-container").selectAll(".bar").data((d, i) => { return d.results; });

      enteringRows.select(".label").text((d) => {
        return _.findWhere(causes, { _id: d.cause }).name;
      });

      rows.style("top", (d, i) => { return i * rowHeight + 'px'; });

      bars.enter().append("div").attr("class", "bar")
        .style("background-color", (d, i) => { return colors[i]; });
      
      bars.style("width", (d) => { return scale(d.sum / maxCombinedValue) + '%'; });
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
      r = d.qs(".circle").getBoundingClientRect().width / 2;
      handleInput();
    }, false);
  }
};