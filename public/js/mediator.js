var chs = {};

module.exports = {
  subscribe (ch, callback) {
    if(!chs[ch]) { 
      chs[ch] = []; 
    }

    chs[ch].push({
      context: this,
      callback: callback
    });
  },
  unsubscribe (ch, callback) {
    if(!chs[ch]) { return false; }

    for(var i=0, l=chs[ch].length; i<l; i++) {
      if(chs[ch][i].callback === callback) {
        chs[ch].splice(i, 1);
        return true;
      }
    }
  },
  publish (ch) {
    if(!chs[ch]) {
      chs[ch] = [];
      return false;
    }

    var args = Array.prototype.slice.call(arguments, 1);

    for(var i=0, l=chs[ch].length; i < l; i++) {
      var subscription = chs[ch][i];
      if(subscription === undefined) {
        return false;
      }
      subscription.callback.apply(subscription.context, args);
    }
  }
};