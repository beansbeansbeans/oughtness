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

module.exports = {
  initialize() {

  },
  start() {
    // TO BE MADE DYNAMIC
    var weights = state.get('dimensions').map((d) => {
      return {
        id: d._id,
        value: 1 / state.get('dimensions').length
      };
    });

    var colors = ['#77C4D3', '#EA2E49'];

    var causes = state.get("causes");
    var dimensions = state.get("dimensions");

    api.get('/vectors', (error, result) => {
      var visData = new Array(causes.length);

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

      // normalize according to weights of each dimension
      visData = normalize(visData, weights);

      var maxCombinedValue = visData.reduce((p, c) => {
        var currCombinedValue = c.results.reduce((np, nc) => {
          return np + nc.sum;
        }, 0);

        if(currCombinedValue > p) {
          return currCombinedValue;
        }
        return p;
      }, 0);

      var container = d3.select(".visualization");

      var rows = container.selectAll(".row").data(visData);

      var enteringRows = rows.enter().append("div").attr("class", "row");

      enteringRows.append("div").attr("class", "label");
      enteringRows.append("div").attr("class", "bar-container");

      var bars = rows.select(".bar-container").selectAll(".bar").data((d, i) => { return d.results; });

      rows.select(".label").text((d) => {
        return _.findWhere(causes, { _id: d.cause }).name;
      });

      bars.enter().append("div").attr("class", "bar")
        .style("background-color", (d, i) => {
          return colors[i];
        });
      
      bars.style("width", (d) => {
          return (100 * d.sum / maxCombinedValue) + '%';
        });

    }, false);
  }
};