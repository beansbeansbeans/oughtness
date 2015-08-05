var state = require('./state');
var dimensions = require('./data/dimensions');
var causes = require('./data/causes');
var mediator = require('./mediator');
var routes = {
  vote: require('./routes/vote'),
  data: require('./routes/data'),
  about: require('./routes/about')
};

Object.keys(routes).forEach(key => routes[key].initialize());

page.base('/');

page('/', function() {
  page.redirect('vote');
});

page('vote', routes.vote.start);

page('vote/:pairing', routes.vote.inflate);

page('about', routes.about.start);

page('data', routes.data.start);

mediator.subscribe("pair_updated", () => {
  var pair = state.get('pair');
  page.show('vote/' + dimensions[pair[2]].name + "-of-" + causes[pair[0]].slug + "-vs-" + causes[pair[1]].slug, null, false);
});

page();
