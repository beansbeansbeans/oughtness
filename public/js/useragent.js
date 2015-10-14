window.UserAgent = (function() {
  var browserInfoResult;

  function matchUA(uaList) {
    return uaList.some(function (item) {
      return item.test(navigator.userAgent);
    });
  }

  function UserAgent() {}

  UserAgent.prototype.getBrowserInfo = function (agent) {

    if(browserInfoResult) {
      return browserInfoResult;
    }

    agent = agent || navigator.userAgent;

    var matches = null, version, browser, m, v, j;
    var versionMatch;
    var desktopBrowsers = ['msie', 'firefox', 'chrome', 'chromium', 'opera', 'safari'];
    var regexs = [
      /(.+?)\s*\(([^)]+)\)\s+(.+)/,
      /(.+?)\s*\(([^)]+)\)?/
    ];
    var result = {
      agent: agent,
      browser: 'unknown',
      version: 0,
      os: 'unknown',
      osVersion: 0,
      desktop: true,
      tablet: false,
      mobile: false,
      ios: false
    };

    for (j = 0; j < regexs.length && !matches; j += 1) {
      matches = agent.match(regexs[j]);
    }

    if (!matches) {
      return result;
    }

    if (/iphone|ip[ao]d/i.test(matches[2])) {
      versionMatch = navigator.userAgent.match(/OS (\d+\.?\d*)/);
      if (versionMatch) {
        result.osVersion = parseFloat(versionMatch[1]);
      }

      result.os = 'ios';
      result.ios = true;
      result.desktop = false;
      result.mobile = true;
    }

    if (/ipad/i.test(matches[2])) {
      result.os = 'ios';
      result.ios = true;
      result.desktop = false;
      result.tablet = true;
    }

    if (/windows/i.test(matches[2])) {
      result.os = 'windows';
    }

    if (/macintosh/i.test(matches[2])) {
      result.os = 'osx';
    }

    if (/linux|x11/i.test(matches[2])) {
      result.os = 'linux';
    }

    if (/cros/i.test(matches[2])) {
      result.os = 'chromeos';
    }

    if (/android/i.test(matches[2])) {
      versionMatch = navigator.userAgent.match(/android (\d+\.\d+)/i);
      if (versionMatch) {
        result.osVersion = parseFloat(versionMatch[1]);
      }

      result.os = 'android';
      result.desktop = false;
      result.mobile = true;
    }

    m = matches.slice(-1)[0];
    if (result.os === 'ios') {
      if (/crios\/\d+/i.test(m)) {
        result.browser = 'chrome';
        result.version = parseFloat(m.match(/crios\/(\d+\.\d)/i)[1]);
      } else {
        result.browser = 'safari';
        v = m.match(/version\/(\d+\.\d)/i);
        if (v) {
          result.version = parseFloat(v[1]);
        }
      }
    }

    if (result.os === 'android') {

      if (/chrome\/\d+/i.test(m)) {
        result.browser = 'chrome';
        result.version = parseFloat(m.match(/chrome\/(\d+\.\d)/i)[1]);
      } else if (/firefox\/\d+/i.test(m)) {
        result.browser = 'firefox';
        result.version = parseFloat(m.match(/firefox\/(\d+\.\d)/i)[1]);
      } else {
        result.browser = 'android';
        v = m.match(/version\/(\d+\.\d)/i);
        if (v) {
          result.version = parseFloat(v[1]);
        }
      }

      if (/\bmobile;?/i.test(agent)) {
        result.tablet = false;
        result.mobile = true;
      } else {
        result.tablet = true;
        result.mobile = false;
      }
    }

    if (result.desktop) {

      for (j = 0; j < desktopBrowsers.length && result.browser === 'unknown'; j += 1) {

        browser = desktopBrowsers[j];

        if (new RegExp(browser, 'i').test(agent)) {

          result.browser = browser;

          if (browser === 'safari') {
            v = agent.match(/version\/(\d+\.\d)/i);
          } else {
            v = agent.match(new RegExp(browser + '[/\\s](\\d+\\.\\d)', 'i'));
          }

          if (v) {
            result.version = parseFloat(v[1]);
          }
        }
      }

      // Attempt to identify IE11's strange user agent
      if (result.browser === 'unknown' && /trident/i.test(agent)) {
        v = agent.match(/rv[:\s](\d+\.?\d*)/);
        if (v) {
          result.browser = 'msie';
          result.version = parseFloat(v[1]);
        }
      }
    }

    // Desktop override
    if (/desktop=1/.test(location.search)) {
      result.desktop = true;
      result.tablet = false;
      result.mobile = false;
    }

    browserInfoResult = result;
    return result;

  };

  UserAgent.prototype.checkRoadblock = function () {

    var match, browser = this.getBrowserInfo();

    var result = {
      roadblocked: true,
      browserSupported: false,
      webgl: browser.webgl
    };

    // Block all Blackberry
    if (/blackberry/i.test(browser.agent)) {
      return result;
    }

    // Mobile / Tablet
    if(browser.mobile === true || browser.tablet === true) {

      // Android < 4 - mobile roadblock
      if(browser.os === 'android' && browser.osVersion < 4) {
        return result;
      }

      // Android && !Chrome - mobile roadblock
      if(browser.os === 'android' && browser.browser !== 'chrome') {
        return result;
      }

      // iOS < 8 - mobile roadblock
      if(browser.os === 'ios' && browser.osVersion < 8) {
        return result;
      }

      // iOS 8 && !Chrome
      if(browser.os === 'ios' && (browser.browser !== 'chrome' && browser.browser !== 'safari')) {
        return result;
      }

    }

    // Desktop
    if(browser.desktop === true) {

      // Windows && IE < 11 - desktop roadblock
      if(browser.os === 'windows' && browser.browser === 'msie' && browser.version < 11) {
        return result;
      }

      // OSX && Safari < 8 - desktop roadblock
      if(browser.os === 'osx' && browser.browser === 'safari' && browser.version < 8) {
        return result;
      }

      if(browser.os === 'windows' || browser.os === 'osx') {

        // OSX/Windows && Chrome < 39 - desktop roadblock
        if(browser.browser === 'chrome' && browser.version < 39) {
          return result;
        }

        // OSX/Windows && Firefox < 34 - desktop roadblock
        if(browser.browser === 'firefox' && browser.version < 34) {
          return result;
        }

      }

    }

    result.browserSupported = true;
    result.roadblocked = false;

    return result;

  };

  return new UserAgent();
}());