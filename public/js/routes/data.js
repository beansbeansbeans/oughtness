var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

module.exports = {
  initialize() {

  },
  start() {
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

      var container = d3.select(".visualization");

      var rows = container.selectAll(".row").data(visData);
      
      rows.enter().append("div").attr("class", "row")
        .append("div").attr("class", "label");

      var bars = rows.selectAll(".bar").data((d, i) => { return d.results; });

      rows.select(".label").text((d) => {
        return _.findWhere(causes, { _id: d.cause }).name;
      });

      bars.enter().append("div").attr("class", "bar")
        .text((d) => { return d.sum; });

    });
  }
};