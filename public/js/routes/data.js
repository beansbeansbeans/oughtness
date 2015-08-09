var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

module.exports = {
  initialize() {

  },
  start() {
    api.get('/vectors', (error, result) => {
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

      var line = d3.svg.line();
      var axis = d3.svg.axis().orient("left").ticks([]).tickSize(0);

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

      var g = svg.selectAll(".dimension")
          .data(x.domain())
        .enter().append("g")
          .attr("class", "dimension")
          .attr("transform", (d) => { 
            return "translate(" + x(d) + ")"; 
          });

      g.append("g")
          .attr("class", "axis")
          .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
        .append("text")
          .style("text-anchor", "middle")
          .attr("y", -9)
          .text(_.identity);

      var foreground = svg.append("g")
          .attr("class", "foreground")
        .selectAll("path")
          .data(visData)
        .enter().append("path")
          .attr("d", path);

    });
  }
};