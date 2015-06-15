var util = require('../shared/util');
var sw = require('../socket');
var auth = require('../shared/auth');
var mediator = require('../shared/mediator');
var sharedStorage = require('../shared/sharedStorage');
var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var chatters = [];
var messages = [];
var tree;
var rootNode;

var sendMsg = () => {
  var msg = d.gbID("create-message-text").value;

  sw.socket.emit('my msg', { msg: msg });

  d.gbID("create-message-text").value = "";
};

var authenticated = x => x.facebookId;

var getAvatar = (val) => {
  auth.getAvatar(val.facebookId, (result) => {
    if(_.findWhere(chatters, {_id: val._id})) {
      val.avatarURL = result;
      updateState();
    }
  });
};

var updateState = () => {
  var newTree = render();
  var patches = diff(tree, newTree);
  rootNode = patch(rootNode, patches);
  tree = newTree;
};

var render = () => {
  var anonymousNamer;

  if(!sharedStorage.get('user')) {
    anonymousNamer = h('div#create-name', [
        h('div.instruction', 'give yourself a name'),
        h('input', {
          type: "text",
          placeholder: "e.g. sprinkles"
        })
      ]);
  }

  return h('div.testing',
    [anonymousNamer,
    h('ul.users', {
      style: {
        textAlign: 'center'
      }
    }, chatters.filter(val => val.online === true ).map((val) => {
      return h('li.user', {
        style: {
          backgroundImage: 'url(' + val.avatarURL + ')'
        }
      }, val.name);
    })),
    h('ul.messages', messages.map((msg) => {
      var avatarURL, author = chatters.filter(x => x._id === msg.user._id)[0];

      if(author) { avatarURL = author.avatarURL; }

      return h('li.message', 
        [h('div.avatar', {
          style: {
            width: '40px',
            height: '40px',
            backgroundImage: 'url(' + avatarURL + ')'
          }
        }),
        h('div.contents', msg.message.msg)
      ]);
    }))]
  );
};

module.exports.initialize = () => {
  tree = render();
  rootNode = createElement(tree);
  document.body.appendChild(rootNode);

  mediator.subscribe("AUTH_STATUS_CHANGE", updateState);

  var gotSeedMessages, gotSeedChatters, authors;

  var postSeedHook = _.once(() => {
    var offlineAuthors = _.uniq(chatters.concat(authors), val => val._id)
      .filter(val => val.online !== true);

    chatters = chatters.concat(offlineAuthors);

    chatters.filter(authenticated).forEach(getAvatar);

    updateState();
  }); 

  var preload = () => {
    if(gotSeedChatters && gotSeedMessages) { postSeedHook(); }
  };

  sw.socket.on('user update', (data) => {
    chatters = _.uniq(chatters.concat(data), false, x => x._id)
      .map((val, index) => {
        if(_.findWhere(data, {_id: val._id})) {
          val.online = true;
        } else {
          val.online = false;
        }
        return val;
      });

    chatters.filter(authenticated).forEach(getAvatar);

    updateState();

    gotSeedChatters = true;
    preload();
  });

  sw.socket.on('new msg', (msg) => {
    messages.push(msg);
    updateState();
  });

  sw.socket.on('seed messages', (msgs) => {
    if(msgs.length) {
      messages = msgs;
      updateState();
    }

    authors = _.uniq(msgs.map(val => val.user), val => val._id);

    gotSeedMessages = true;
    preload();
  });

  d.gbID("send-message-button").addEventListener("click", sendMsg);
};