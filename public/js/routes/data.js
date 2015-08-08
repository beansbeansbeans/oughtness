var util = require('../util');
var state = require('../state');
var api = require('../api');
var mediator = require('../mediator');

module.exports = {
  initialize() {

  },
  start() {
    var vectors = api.get('/vectors', (error, result) => {
      console.log(result);
    });
  }
};