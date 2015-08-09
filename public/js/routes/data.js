var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

module.exports = {
  initialize() {

  },
  start() {
    var vectors = api.get('/vectors', (error, result) => {
      result.data.forEach((d, i) => {
        var dimension = _.find(state.get('dimensions'), x => x._id === d.dimension);

        console.log("====================");
        console.log(dimension.name);
        var priorities = d.causes.map((row) => {
          return row.reduce((prev, curr) => {
            return prev + curr;
          }, 0);
        });

        var total = priorities.reduce((prev, curr) => {
          return prev + curr;
        }, 0);

        priorities = priorities.map(x => x / total);

        console.log(priorities);
        console.log(_.pluck(state.get('causes'), 'name'));

        console.log("ORDER BY MAGNITUDE:");
        console.log(_.sortBy(_.pluck(state.get('causes'), 'name'), (name, i) => {
          return priorities[i];
        }).reverse());
      });
    });
  }
};