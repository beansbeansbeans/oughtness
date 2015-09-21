module.exports = {
  vendors: ['', 'webkit', 'Moz', 'O'],
  prefixedProperties: {
    transition: {
      js: "transition",
      dom: "transition"
    },
    transform: {
      js: "transform",
      dom: "transform"
    },
    transformOrigin: {
      js: "transformOrigin",
      dom: "transform-origin"
    },
    animation: {
      js: "animation",
      dom: "animation"
    }
  },
  prefixedKeyframe: {
    'animation': '@keyframes',
    'webkitAnimation': '@-webkit-keyframes'
  },
  prefixedTransitionEnd: {
    'transition':'transitionend',
    'webkitTransition':'webkitTransitionEnd'
  },
  prefixedAnimationEnd: {
    'animation': 'animationend',
    'webkitAnimation': 'webkitAnimationEnd'
  },
  factorial(num) {
    var result = 1, counter = 1;

    while(counter <= num) {
      result *= counter;
      counter++;
    }

    return result;
  },
  async(tasks, callback) {
    var count = 0, n = tasks.length;

    var complete = () => {
      count += 1;
      if (count === n) {
        callback();
      }
    }

    tasks.forEach( task => task(complete) );
  },
  arrayEquals(arr1, arr2) {
    return arr1.length == arr2.length && arr1.every((this_i,i) => { return this_i == arr2[i]; });
  },
  sum(arr) {
    return arr.reduce((p, c) => { return p + c; }, 0);
  },
  initialize() {
    this.vendors.every((prefix) => {
      var e = 'transform';

      if(prefix.length) { e = prefix + 'Transform'; }

      if(typeof document.body.style[e] !== 'undefined') {
        Object.keys(this.prefixedProperties).forEach((prop, index) => {
          if(prefix.length) {
            this.prefixedProperties[prop].js = prefix + this.capitalize(prop);
            this.prefixedProperties[prop].dom = "-" + prefix + "-" + prop;            
          } else {
            this.prefixedProperties[prop].js = prop;
            this.prefixedProperties[prop].dom = prop;
          }
        });
        return false;
      }
      return true;
    });
  }
}