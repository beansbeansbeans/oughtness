var util = require('../shared/util');
var sw = require('../socket');
var auth = require('../shared/auth');
var messages = require('./messages');
var Immutable = require('immutable');
var chatters = Immutable.List();
var messages = Immutable.List();
var sharedStorage = require('../shared/sharedStorage');
var h = require('virtual-dom/h');
var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var createElement = require('virtual-dom/create-element');
var tree;
var rootNode;

var getUser = function() {
  var user = {name: "anonymous"};

  if(typeof sharedStorage.get("user") !== "undefined") {
    user = sharedStorage.get("user");
  }

  return user;
};

var sendMsg = function() {
  var msg = d.gbID("create-message-text").value;

  sw.socket.emit('my msg', {
    msg: msg,
    user: getUser()
  });

  d.gbID("create-message-text").value = "";
};

var updateState = function() {
  var newTree = render();
  var patches = diff(tree, newTree);
  rootNode = patch(rootNode, patches);
  tree = newTree;
};

var render = function() {
  return h('div.testing',
    [h('ul.users', {
      style: {
        textAlign: 'center'
      }
    }, chatters.toJS().map(function(chatter) {
      return h('li.user', {
        style: {
          backgroundImage: 'url(' + chatter.avatarURL + ')'
        }
      }, chatter.name);
    })),
    h('ul.messages', messages.toJS().map(function(msg) {
      return h('li.message', msg.message.msg);
    }))]
  );
};

module.exports.initialize = function() {
  tree = render();
  rootNode = createElement(tree);
  document.body.appendChild(rootNode); 

  sw.socket.on('user update', function(data) {
    chatters = chatters.merge(data);
    updateState();

    chatters.toJS().forEach(function(chatter, chatterIndex) {
      if(chatter.facebookId && !chatter.avatarURL) {
        auth.getAvatar(chatter.facebookId, function(result) {
          chatters = chatters.update(chatterIndex, x => x.set('avatarURL', result));
          updateState();
        });
      }
    });
  });

  sw.socket.on('new msg', function(msg) {
    messages = messages.push(msg);
    updateState();
  });

  sw.socket.on('seed messages', function(msgs) {
    if(msgs.length) {
      messages = messages.merge(msgs);
      updateState();
    }
  });

  d.gbID("send-message-button").addEventListener("click", sendMsg);
};