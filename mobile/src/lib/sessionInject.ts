/**
 * Runs in the eticket page at document start, same idea as splitTicketFinder/scanner.js:
 * remember the Authorization / X-Device-Id / X-Device-Key headers the site itself sends,
 * then replay search requests with XMLHttpRequest from that page.
 */
export const SESSION_HOOK_JS = `
(function () {
  var KEEP = ["authorization", "x-device-id", "x-device-key"];
  var auth = window.__tsfAuth || { authorization: "", "x-device-id": "", "x-device-key": "" };
  window.__tsfAuth = auth;

  function clean(v) {
    if (v == null) return "";
    var s = String(v).replace(/^\\s+|\\s+$/g, "");
    if (!s || s === "null" || s === "undefined" || s === "[HIDDEN]") return "";
    if (s.length >= 2) {
      var a = s.charAt(0);
      var b = s.charAt(s.length - 1);
      if ((a === '"' && b === '"') || (a === "'" && b === "'")) s = s.slice(1, -1);
    }
    return s;
  }

  function publish() {
    try {
      if (!window.ReactNativeWebView) return;
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: "RAILWAY_SESSION",
        authorization: auth.authorization || "",
        deviceId: auth["x-device-id"] || "",
        deviceKey: auth["x-device-key"] || ""
      }));
    } catch (e) {}
  }
  window.__tsfPublish = publish;

  function remember(key, value, fillOnly) {
    var k = String(key || "").toLowerCase();
    if (KEEP.indexOf(k) === -1) return;
    var v = clean(value);
    if (!v) return;
    if (fillOnly && auth[k]) return;
    if (auth[k] === v) return;
    auth[k] = v;
    publish();
  }

  function absorbHeaders(h, fillOnly) {
    if (!h) return;
    try {
      if (typeof Headers !== "undefined" && h instanceof Headers) {
        h.forEach(function (v, k) { remember(k, v, fillOnly); });
      } else if (Object.prototype.toString.call(h) === "[object Array]") {
        for (var i = 0; i < h.length; i++) {
          if (h[i]) remember(h[i][0], h[i][1], fillOnly);
        }
      } else {
        for (var key in h) {
          if (Object.prototype.hasOwnProperty.call(h, key)) remember(key, h[key], fillOnly);
        }
      }
    } catch (e) {}
  }

  if (!window.__tsfInstalled) {
    window.__tsfInstalled = true;

    var origSet = XMLHttpRequest.prototype.setRequestHeader;
    XMLHttpRequest.prototype.setRequestHeader = function (k, v) {
      try {
        if (!this._tsfOwn) remember(k, v, false);
      } catch (e) {}
      return origSet.apply(this, arguments);
    };

    var origFetch = window.fetch;
    if (typeof origFetch === "function") {
      window.fetch = function (input, init) {
        try {
          absorbHeaders(init && init.headers, false);
          if (input && typeof input !== "string" && input.headers) absorbHeaders(input.headers, false);
        } catch (e) {}
        return origFetch.apply(this, arguments);
      };
    }
  }

  window.__tsfSetAuth = function (next) {
    if (!next) return;
    remember("authorization", next.authorization, false);
    remember("x-device-id", next.deviceId || next["x-device-id"], false);
    remember("x-device-key", next.deviceKey || next["x-device-key"], false);
  };

  window.__tsfXhrGet = function (url) {
    return new Promise(function (resolve, reject) {
      try {
        var x = new XMLHttpRequest();
        x._tsfOwn = true;
        x.open("GET", url);
        x.setRequestHeader("Accept", "application/json");
        x.setRequestHeader("Content-Type", "application/json");
        x.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        if (auth.authorization) x.setRequestHeader("Authorization", auth.authorization);
        if (auth["x-device-id"]) x.setRequestHeader("X-Device-Id", auth["x-device-id"]);
        if (auth["x-device-key"]) x.setRequestHeader("X-Device-Key", auth["x-device-key"]);
        x.timeout = 20000;
        x.onload = function () {
          var text = "";
          try { text = x.responseText || ""; } catch (e) { text = ""; }
          if (text.length > 500000) text = text.slice(0, 500000);
          resolve({ status: x.status, text: text });
        };
        x.onerror = function () { reject(new Error("Network error")); };
        x.ontimeout = function () { reject(new Error("Network error")); };
        x.send();
      } catch (e) {
        reject(e);
      }
    });
  };

  window.__tsfRunGet = function (id, url) {
    var send = function (payload) {
      try {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      } catch (e) {}
    };
    if (!window.__tsfXhrGet) {
      send({ type: "TSF_XHR", id: id, error: "Network error" });
      return;
    }
    window.__tsfXhrGet(url).then(function (r) {
      send({ type: "TSF_XHR", id: id, status: r.status, text: r.text || "" });
    }).catch(function (e) {
      send({ type: "TSF_XHR", id: id, error: String((e && e.message) || e || "Network error") });
    });
  };

  function probeStorage() {
    var buckets = [];
    try { buckets.push(window.localStorage); } catch (e) {}
    try { buckets.push(window.sessionStorage); } catch (e) {}
    for (var b = 0; b < buckets.length; b++) {
      var store = buckets[b];
      try {
        for (var i = 0; i < store.length; i++) {
          var key = store.key(i);
          if (!key) continue;
          var raw = store.getItem(key);
          if (!raw) continue;
          var lk = String(key).toLowerCase();
          if (lk === "authorization" || lk === "auth" || lk === "token" || lk === "access_token" || lk === "accesstoken") {
            remember("authorization", raw, true);
          } else if (lk === "x-device-id" || lk === "device-id" || lk === "deviceid" || lk === "device_id") {
            remember("x-device-id", raw, true);
          } else if (lk === "x-device-key" || lk === "device-key" || lk === "devicekey" || lk === "device_key") {
            remember("x-device-key", raw, true);
          } else if (raw.charAt(0) === "{") {
            try {
              var obj = JSON.parse(raw);
              if (obj && typeof obj === "object") {
                remember("authorization", obj.authorization || obj.token || obj.access_token || obj.accessToken, true);
                remember("x-device-id", obj.deviceId || obj.device_id || obj["x-device-id"], true);
                remember("x-device-key", obj.deviceKey || obj.device_key || obj["x-device-key"], true);
              }
            } catch (e2) {}
          }
        }
      } catch (e) {}
    }
  }

  function announce() {
    try {
      if (!window.ReactNativeWebView) return false;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "TSF_READY" }));
      publish();
      return true;
    } catch (e) {
      return false;
    }
  }

  if (!window.__tsfBooted) {
    window.__tsfBooted = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", probeStorage);
    } else {
      probeStorage();
    }
    setTimeout(probeStorage, 1500);
    setTimeout(probeStorage, 4000);

    var tries = 0;
    var timer = setInterval(function () {
      tries++;
      if (announce() || tries > 40) clearInterval(timer);
    }, 250);
  } else {
    probeStorage();
    announce();
  }
})();
true;
`;
