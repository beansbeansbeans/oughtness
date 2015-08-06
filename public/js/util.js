module.exports = {
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
  }
}