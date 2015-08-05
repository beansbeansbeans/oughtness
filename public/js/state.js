var state = {};

module.exports = {
  get(prop) {
    return state[prop];
  },
  set(prop, val) {
    state[prop] = val;
  }
};