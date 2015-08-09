var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

module.exports = {
  initialize() {

  },
  start() {
    var vectors = api.get('/vectors', (error, result) => {
      var visData = new Array(state.get('causes').length);

      result.data.forEach((d, i) => {
        var total = 0;

        d.causes.forEach((row, rowIndex) => {
          if(typeof visData[rowIndex] === 'undefined') { visData[rowIndex] = []; }
          var sum = row.reduce((p, c) => { return p + c; }, 0);

          visData[rowIndex].push(sum);
          total += sum;
        });

        visData.forEach((_, causeIndex) => {
          visData[causeIndex][i] = visData[causeIndex][i] / total;
        });
      });

      console.log(visData);

      var line = d3.svg.line();

      function path(d) {
        return line(x.domain().map((p, i) => { 
          return [x(p), y[p](d[i])]; 
        }));
      }

      var visWidth = window.innerWidth - 200;
      var visHeight = visWidth * 0.5;

      var x = d3.scale.ordinal().domain(_.pluck(state.get('dimensions'), 'name')).rangePoints([0, visWidth]);
      var y = {};

      x.domain().forEach((d, i) => {
        y[d] = d3.scale.linear().domain(d3.extent(visData, (row) => {
          return row[i];
        })).range([visHeight, 0]);
      });

      var svg = d3.select("svg").attr("width", visWidth)
          .attr("height", visHeight);

      var foreground = svg.append("g")
          .attr("class", "foreground")
        .selectAll("path")
          .data(visData)
        .enter().append("path")
          .attr("d", path);

    });
  }
};