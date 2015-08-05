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

page('vote/:pairing', function() {
  console.log("voting on stuff");
  routes.vote.start();
});

page('about', function() {
  routes.about.start();
});

page('data', function() {
  routes.data.start();
});

mediator.subscribe("pair_updated", () => {
  console.log("heard");
});

page();
