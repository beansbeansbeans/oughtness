var state = require('./state');
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
  page.show('vote/' + pair[2].name + "-of-" + pair[0].slug + "-vs-" + pair[1].slug, null, false);
});

page();
