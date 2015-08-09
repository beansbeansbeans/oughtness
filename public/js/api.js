var baseURL = "";
var cache = {};

module.exports = {
  setURL(url) {
    baseURL = url;
  },
  get(url, callback) {
    if(typeof cache[url] !== 'undefined') {
      return callback(null, cache[url]);
    }

    var request = new XMLHttpRequest();
    request.open('GET', baseURL + url, true);

    request.setRequestHeader("Accept", "application/json");
    if(this.token) {
      request.setRequestHeader("x-auth", this.token);
    }

    request.onload = function() {
      var result = {}, data;
      if (request.status == 200) {
        data = JSON.parse(request.responseText);
      } else {
        data = {};
      }

      result.responseCode = request.status;
      result.data = data;

      cache[url] = result;
      
      if(callback) {
        callback(null, result);
      }
    };

    request.onerror = () => {};

    request.send();
  },
  post(url, data, callback) {
    var request = new XMLHttpRequest();
    request.open('POST', baseURL + url, true);

    request.setRequestHeader("Content-Type", "application/json");
    request.setRequestHeader("Accept", "application/json");

    request.onload = function() {
      var data = {};

      if(request.responseText) {
        try {
          data = JSON.parse(request.responseText);
        } catch(e) {
          data = {};
        }
      }
      data.responseCode = request.status;

      if(request.status >= 200 && request.status < 400){
        data.success = true;
      } else {
        data.success = false;
      }

      if(callback) {
        callback(data);
      }
    };

    request.send(JSON.stringify(data));
  }
}