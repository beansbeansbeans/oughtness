module.exports = {
  factorial(num) {
    var result = 1, counter = 1;

    while(counter <= num) {
      result *= counter;
      counter++;
    }

    return result;
  }
}