var routes = {
  vote: require('./routes/vote'),
  data: require('./routes/data'),
  about: require('./routes/about')
};

page.base('/');

page((ctx, next) => {
  if(routes[ctx.path]) {
    routes[ctx.path].start();
  }
  next();
});

page.exit((ctx, next) => {
  if(routes[ctx.path]) {
    routes[ctx.path].end();
  }
  next();
});

page('/', function() {
  page.redirect('vote');
});

page('vote', function() {

});

page('about', function() {

});

page('data', function() {

});

page();
