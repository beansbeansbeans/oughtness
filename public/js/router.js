var state = require('./state');
var mediator = require('./mediator');
var routes = {
  vote: require('./routes/vote'),
  data: require('./routes/data'),
  about: require('./routes/about')
};

page.base('/');

page('/', function() {
  page.redirect('vote');
});

page('vote', routes.vote.start);

page('vote/:pairing', function() {
  console.log("voting on stuff");
  // routes.vote.start();
});

page('about', routes.about.start);

page('data', routes.data.start);

mediator.subscribe("pair_updated", () => {
  console.log("heard");
  console.log(state.get('pair'));
  var pair = state.get('pair');
  page('vote/' + pair[0].slug + "-vs-" + pair[1].slug);
});

page();
