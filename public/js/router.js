var state = require('./state');
var mediator = require('./mediator');
var routes = {
  vote: require('./routes/vote'),
  data: require('./routes/data'),
  about: require('./routes/about')
};

module.exports = {
  initialize() {
    Object.keys(routes).forEach(key => routes[key].initialize());

    mediator.subscribe("pair_updated", () => {
      var pair = state.get('pair');
      _.defer(() => {
        page.show('vote/' + state.get('dimensions')[pair[2]].name + "-of-" + state.get('causes')[pair[0]].slug + "-vs-" + state.get('causes')[pair[1]].slug, null, false);
      });
    });

    mediator.subscribe("loaded", () => {
      page.base('/');

      page((context, next) => {
        mediator.publish("route_updated", context);
        next();
      });

      page('/', (context) => {
        if(context.pathname.indexOf("#!") !== -1) {
          page.redirect(context.pathname.slice(3));
        } else {
          page.redirect('vote');
        }
      });

      page('vote', routes.vote.start);

      page('vote/:pairing', routes.vote.inflate);

      page('about', routes.about.start);

      page('data', routes.data.start);

      page();
    });

  }
};
