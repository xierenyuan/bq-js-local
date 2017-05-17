document.write('<script src="http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1"></' + 'script>');
(function (exports) {
'use strict';

var commonjsGlobal = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

var Mutation = commonjsGlobal.MutationObserver || commonjsGlobal.WebKitMutationObserver;

var scheduleDrain;

{
  if (Mutation) {
    var called = 0;
    var observer = new Mutation(nextTick);
    var element = commonjsGlobal.document.createTextNode('');
    observer.observe(element, {
      characterData: true
    });
    scheduleDrain = function () {
      element.data = (called = ++called % 2);
    };
  } else if (!commonjsGlobal.setImmediate && typeof commonjsGlobal.MessageChannel !== 'undefined') {
    var channel = new commonjsGlobal.MessageChannel();
    channel.port1.onmessage = nextTick;
    scheduleDrain = function () {
      channel.port2.postMessage(0);
    };
  } else if ('document' in commonjsGlobal && 'onreadystatechange' in commonjsGlobal.document.createElement('script')) {
    scheduleDrain = function () {

      // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
      // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
      var scriptEl = commonjsGlobal.document.createElement('script');
      scriptEl.onreadystatechange = function () {
        nextTick();

        scriptEl.onreadystatechange = null;
        scriptEl.parentNode.removeChild(scriptEl);
        scriptEl = null;
      };
      commonjsGlobal.document.documentElement.appendChild(scriptEl);
    };
  } else {
    scheduleDrain = function () {
      setTimeout(nextTick, 0);
    };
  }
}

var draining;
var queue = [];
//named nextTick for less confusing stack traces
function nextTick() {
  draining = true;
  var i, oldQueue;
  var len = queue.length;
  while (len) {
    oldQueue = queue;
    queue = [];
    i = -1;
    while (++i < len) {
      oldQueue[i]();
    }
    len = queue.length;
  }
  draining = false;
}

var index$1 = immediate;
function immediate(task) {
  if (queue.push(task) === 1 && !draining) {
    scheduleDrain();
  }
}

function INTERNAL() {}

var handlers = {};

var REJECTED = ['REJECTED'];
var FULFILLED = ['FULFILLED'];
var PENDING = ['PENDING'];
/* istanbul ignore else */
var index = Promise;

function Promise(resolver) {
  if (typeof resolver !== 'function') {
    throw new TypeError('resolver must be a function');
  }
  this.state = PENDING;
  this.queue = [];
  this.outcome = void 0;
  /* istanbul ignore else */
  if (resolver !== INTERNAL) {
    safelyResolveThenable(this, resolver);
  }
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};
Promise.prototype.then = function (onFulfilled, onRejected) {
  if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
    typeof onRejected !== 'function' && this.state === REJECTED) {
    return this;
  }
  var promise = new this.constructor(INTERNAL);
  /* istanbul ignore else */
  if (this.state !== PENDING) {
    var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
    unwrap(promise, resolver, this.outcome);
  } else {
    this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
  }

  return promise;
};
function QueueItem(promise, onFulfilled, onRejected) {
  this.promise = promise;
  if (typeof onFulfilled === 'function') {
    this.onFulfilled = onFulfilled;
    this.callFulfilled = this.otherCallFulfilled;
  }
  if (typeof onRejected === 'function') {
    this.onRejected = onRejected;
    this.callRejected = this.otherCallRejected;
  }
}
QueueItem.prototype.callFulfilled = function (value) {
  handlers.resolve(this.promise, value);
};
QueueItem.prototype.otherCallFulfilled = function (value) {
  unwrap(this.promise, this.onFulfilled, value);
};
QueueItem.prototype.callRejected = function (value) {
  handlers.reject(this.promise, value);
};
QueueItem.prototype.otherCallRejected = function (value) {
  unwrap(this.promise, this.onRejected, value);
};

function unwrap(promise, func, value) {
  index$1(function () {
    var returnValue;
    try {
      returnValue = func(value);
    } catch (e) {
      return handlers.reject(promise, e);
    }
    if (returnValue === promise) {
      handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
    } else {
      handlers.resolve(promise, returnValue);
    }
  });
}

handlers.resolve = function (self, value) {
  var result = tryCatch(getThen, value);
  if (result.status === 'error') {
    return handlers.reject(self, result.value);
  }
  var thenable = result.value;

  if (thenable) {
    safelyResolveThenable(self, thenable);
  } else {
    self.state = FULFILLED;
    self.outcome = value;
    var i = -1;
    var len = self.queue.length;
    while (++i < len) {
      self.queue[i].callFulfilled(value);
    }
  }
  return self;
};
handlers.reject = function (self, error) {
  self.state = REJECTED;
  self.outcome = error;
  /* istanbul ignore else */
  var i = -1;
  var len = self.queue.length;
  while (++i < len) {
    self.queue[i].callRejected(error);
  }
  return self;
};

function getThen(obj) {
  // Make sure we only access the accessor once as required by the spec
  var then = obj && obj.then;
  if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
    return function appyThen() {
      then.apply(obj, arguments);
    };
  }
}

function safelyResolveThenable(self, thenable) {
  // Either fulfill, reject or reject with error
  var called = false;
  function onError(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.reject(self, value);
  }

  function onSuccess(value) {
    if (called) {
      return;
    }
    called = true;
    handlers.resolve(self, value);
  }

  function tryToUnwrap() {
    thenable(onSuccess, onError);
  }

  var result = tryCatch(tryToUnwrap);
  if (result.status === 'error') {
    onError(result.value);
  }
}

function tryCatch(func, value) {
  var out = {};
  try {
    out.value = func(value);
    out.status = 'success';
  } catch (e) {
    out.status = 'error';
    out.value = e;
  }
  return out;
}

Promise.resolve = resolve;
function resolve(value) {
  if (value instanceof this) {
    return value;
  }
  return handlers.resolve(new this(INTERNAL), value);
}

Promise.reject = reject;
function reject(reason) {
  var promise = new this(INTERNAL);
  return handlers.reject(promise, reason);
}

Promise.all = all;
function all(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var values = new Array(len);
  var resolved = 0;
  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    allResolver(iterable[i], i);
  }
  return promise;
  function allResolver(value, i) {
    self.resolve(value).then(resolveFromAll, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
    function resolveFromAll(outValue) {
      values[i] = outValue;
      if (++resolved === len && !called) {
        called = true;
        handlers.resolve(promise, values);
      }
    }
  }
}

Promise.race = race;
function race(iterable) {
  var self = this;
  if (Object.prototype.toString.call(iterable) !== '[object Array]') {
    return this.reject(new TypeError('must be an array'));
  }

  var len = iterable.length;
  var called = false;
  if (!len) {
    return this.resolve([]);
  }

  var i = -1;
  var promise = new this(INTERNAL);

  while (++i < len) {
    resolver(iterable[i]);
  }
  return promise;
  function resolver(value) {
    self.resolve(value).then(function (response) {
      if (!called) {
        called = true;
        handlers.resolve(promise, response);
      }
    }, function (error) {
      if (!called) {
        called = true;
        handlers.reject(promise, error);
      }
    });
  }
}

var head = document.head || document.getElementsByTagName('head')[0];
//////////////////////////////////////////////////////////////////////////////
// helpers

var _isArray = Array.isArray || function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

function _each(obj, iterator) {
  if (_isArray(obj)) {
    if (obj.forEach) return obj.forEach(iterator);

    for (var i = 0; i < obj.length; i++) {
      iterator(obj[i], i, obj);
    }
  } else {
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) iterator(obj[k], k);
    }
  }
}

function _default(obj, src) {
  // extend obj with src properties if not exists;
  _each(src, function (val, key) {
    if (!obj[key]) obj[key] = src[key];
  });
  return obj;
}
/////////////////////////////////////////////////////////////////////////////
var P = index;
//////////////////////////////////////////////////////////////////////////////
// Adapters for Store class

function DomStorage(namespace) {
  var self = this;
  var _ns = namespace + '__';

  this.init = function () {
    return P.resolve();
  };

  this.remove = function (key) {
    localStorage.removeItem(_ns + key);
    return P.resolve();
  };

  this.set = function (key, value, expire) {
    var obj = {
      value: value,
      expire: expire
    };

    return new P(function (resolve, reject) {
      try {
        localStorage.setItem(_ns + key, JSON.stringify(obj));
        resolve();
      } catch (e) {
        // On quota error try to reset storage & try again.
        // Just remove all keys, without conditions, no optimizations needed.
        if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
          try {
            _each(localStorage, function (val, name) {
              var k = name.split(_ns)[1];
              if (k) {
                self.remove(k);
              }
            });
            localStorage.setItem(_ns + key, JSON.stringify(obj));
            resolve();
          } catch (e2) {
            reject(e2);
          }
        } else {
          reject(e);
        }
      }
    });
  };

  this.get = function (key, raw) {
    return new P(function (resolve, reject) {
      try {
        var data = localStorage.getItem(_ns + key);

        // return `undefined` for missed keys
        if (data === null) return resolve();

        data = JSON.parse(localStorage.getItem(_ns + key));

        resolve(data = raw ? data : data.value);
      } catch (e) {
        reject(new Error("Can't read key: " + key));
      }
    });
  };

  this.clear = function (expiredOnly) {
    var now = +new Date();
    var p = P.resolve();

    _each(localStorage, function (val, name) {
      var key = name.split(_ns)[1];

      if (!key) return;

      if (!expiredOnly) {
        p = p.then(function () {
          self.remove(key);
        });
        return;
      }

      p = p.then(function () {
        return self.get(key, true).then(function (raw) {
          if (raw && raw.expire > 0 && raw.expire - now < 0) {
            // no need to chain promise, because operation is sync
            self.remove(key);
          }
        });
      });
    });

    return p;
  };
}

DomStorage.exists = function () {
  try {
    localStorage.setItem('__ls_test__', '__ls_test__');
    localStorage.removeItem('__ls_test__');
    return true;
  } catch (e) {
    return false;
  }
};

function WebSql(namespace) {
  var db;

  this.init = function () {
    return new P(function (resolve, reject) {
      db = window.openDatabase(namespace, '1.0', 'bag.js db', 2e5);

      if (!db) {
        reject("Can't open websql database");
        return;
      }

      db.transaction(function (tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, expire INTEGER KEY)', [], function () {
          resolve();
        }, function (tx, err) {
          reject(err);
        });
      });
    });
  };

  this.remove = function (key) {
    return new P(function (resolve, reject) {
      db.transaction(function (tx) {
        tx.executeSql('DELETE FROM kv WHERE key = ?', [key], function () {
          resolve();
        }, function (tx, err) {
          reject(err);
        });
      });
    });
  };

  this.set = function (key, value, expire) {
    return new P(function (resolve, reject) {
      db.transaction(function (tx) {
        tx.executeSql('INSERT OR REPLACE INTO kv (key, value, expire) VALUES (?, ?, ?)', [key, JSON.stringify(value), expire], function () {
          resolve();
        }, function (tx, err) {
          reject(err);
        });
      });
    });
  };

  this.get = function (key) {
    return new P(function (resolve, reject) {
      db.readTransaction(function (tx) {
        tx.executeSql('SELECT value FROM kv WHERE key = ?', [key], function (tx, result) {
          // return `undefined` for missed keys
          if (result.rows.length === 0) return resolve();

          var value = result.rows.item(0).value;

          try {
            resolve(JSON.parse(value));
          } catch (e) {
            reject(new Error("Can't unserialise data: " + value));
          }
        }, function (tx, err) {
          reject(err);
        });
      });
    });
  };

  this.clear = function (expiredOnly) {
    return new P(function (resolve, reject) {
      db.transaction(function (tx) {
        tx.executeSql(expiredOnly ? 'DELETE FROM kv WHERE expire > 0 AND expire < ?' : 'DELETE FROM kv', expiredOnly ? [+new Date()] : [], function () {
          resolve();
        }, function (tx, err) {
          reject(err);
        });
      });
    });
  };
}

WebSql.exists = function () {
  return !!window.openDatabase;
};

function Idb(namespace) {
  var db;

  this.init = function () {
    return new P(function (resolve, reject) {
      var idb = window.indexedDB;

      var req = idb.open(namespace, 2 /*version*/);

      req.onsuccess = function (e) {
        db = e.target.result;
        resolve();
      };
      req.onblocked = function (e) {
        reject(new Error('IndexedDB blocked. ' + e.target.errorCode));
      };
      req.onerror = function (e) {
        reject(new Error('IndexedDB opening error. ' + e.target.errorCode));
      };
      req.onupgradeneeded = function (e) {
        db = e.target.result;

        if (db.objectStoreNames.contains('kv')) db.deleteObjectStore('kv');

        var store = db.createObjectStore('kv', { keyPath: 'key' });

        store.createIndex('expire', 'expire', { unique: false });
      };
    });
  };

  this.remove = function (key) {
    return new P(function (resolve, reject) {
      var tx = db.transaction('kv', 'readwrite');

      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = tx.onabort = function (e) {
        reject(e.target);
      };

      // IE 8 not allow to use reserved keywords as functions. More info:
      // http://tiffanybbrown.com/2013/09/10/expected-identifier-bug-in-internet-explorer-8/
      tx.objectStore('kv')['delete'](key).onerror = function () {
        tx.abort();
      };
    });
  };

  this.set = function (key, value, expire) {
    return new P(function (resolve, reject) {
      var tx = db.transaction('kv', 'readwrite');

      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = tx.onabort = function (e) {
        reject(e.target);
      };

      tx.objectStore('kv').put({
        key: key,
        value: value,
        expire: expire
      }).onerror = function () {
        tx.abort();
      };
    });
  };

  this.get = function (key) {
    return new P(function (resolve, reject) {
      var tx = db.transaction('kv');

      // tx.oncomplete = function () { resolve(result); };
      tx.onerror = tx.onabort = function (e) {
        reject(new Error('Key get error: ' + e.target));
      };

      tx.objectStore('kv').get(key).onsuccess = function (e) {
        if (e.target.result) resolve(e.target.result.value);else resolve();
      };
    });
  };

  this.clear = function (expiredOnly) {
    return new P(function (resolve, reject) {
      var keyrange = window.IDBKeyRange,
          tx = db.transaction('kv', 'readwrite'),
          store = tx.objectStore('kv');

      tx = db.transaction('kv', 'readwrite');
      store = tx.objectStore('kv');

      tx.oncomplete = function () {
        resolve();
      };
      tx.onerror = tx.onabort = function (e) {
        reject(new Error('Clear error: ', e.target));
      };

      if (expiredOnly) {
        var cursor = store.index('expire').openCursor(keyrange.bound(1, +new Date()));

        cursor.onsuccess = function (e) {
          var _cursor = e.target.result;
          if (_cursor) {
            // IE 8 not allow to use reserved keywords as functions (`delete` and `continue`). More info:
            // http://tiffanybbrown.com/2013/09/10/expected-identifier-bug-in-internet-explorer-8/
            store['delete'](_cursor.primaryKey).onerror = function () {
              tx.abort();
            };
            _cursor['continue']();
          }
        };

        return;
      }

      // Just clear everything
      tx.objectStore('kv').clear().onerror = function () {
        tx.abort();
      };
    });
  };
}

Idb.exists = function () {
  var db = window.indexedDB;

  if (!db) return false;

  // Check outdated idb implementations, where `onupgradeneede` event doesn't work,
  // see https://github.com/pouchdb/pouchdb/issues/1207 for more details
  var dbName = '__idb_test__';
  var result = db.open(dbName, 1).onupgradeneeded === null;

  if (db.deleteDatabase) db.deleteDatabase(dbName);

  return result;
};

/////////////////////////////////////////////////////////////////////////////
// key/value storage with expiration

var storeAdapters = {
  indexeddb: Idb,
  websql: WebSql,
  localstorage: DomStorage
};

// namespace - db name or similar
// storesList - array of allowed adapter names to use
//
function Storage(namespace, storesList) {
  var db = null;
  // var init_done = false;

  _each(storesList, function (name) {
    // do storage names case insensitive
    name = name.toLowerCase();

    if (!storeAdapters[name]) {
      throw new Error('Wrong storage adapter name: ' + name, storesList);
    }

    if (storeAdapters[name].exists() && !db) {
      db = new storeAdapters[name](namespace);
      return false; // terminate search on first success
    }
  });

  if (!db) {
    /* eslint-disable no-console */
    // If no adaprets - don't make error for correct fallback.
    // Just log that we continue work without storing results.
    if (typeof console !== 'undefined' && console.log) {
      console.log('None of requested storages available: ' + storesList);
    }
    /* eslint-enable no-console */
  }

  function createInit() {
    return P.resolve().then(function () {
      if (!db) throw new Error('No available db');
      return db.init().then(function () {
        // init_done = true;
        db.clear(true); // clear expired
      });
    });
  }

  var _waitInit;

  this.init = function () {
    if (!_waitInit) _waitInit = createInit();
    return _waitInit;
  };

  this.set = function (key, value, expire) {
    return this.init().then(function () {
      return db.set(key, value, expire ? +new Date() + expire * 1000 : 0);
    });
  };

  this.get = function (key) {
    return this.init().then(function () {
      return db.get(key);
    });
  };

  this.remove = function (key) {
    return this.init().then(function () {
      return db.remove(key);
    });
  };

  this.clear = function (expiredOnly) {
    return this.init().then(function () {
      return db.clear(expiredOnly);
    });
  };
}

//////////////////////////////////////////////////////////////////////////////
// Bag class implementation

function Bag(options) {
  if (!(this instanceof Bag)) return new Bag(options);

  var self = this;

  options = options || {};

  this.prefix = options.prefix || 'bag';
  this.timeout = options.timeout || 20; // 20 seconds
  this.expire = options.expire || 30 * 24; // 30 days
  this.isValidItem = options.isValidItem || null;

  this.stores = _isArray(options.stores) ? options.stores : ['indexeddb', 'websql', 'localstorage'];

  var storage = null;

  function createStorage() {
    if (!storage) storage = new Storage(self.prefix, self.stores);
  }

  function getUrl(url) {
    return new P(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url);
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve({
              content: xhr.responseText,
              type: xhr.getResponseHeader('content-type')
            });
          } else {
            reject(new Error("Can't open url " + url + (xhr.status ? xhr.statusText + ' (' + xhr.status + ')' : '')));
          }
        }
      };

      setTimeout(function () {
        if (xhr.readyState < 4) {
          xhr.abort();
          reject(new Error('Timeout'));
        }
      }, self.timeout * 1000);

      try {
        xhr.send();
      } catch (err) {
        reject(err);
      }
    });
  }

  function createCacheObj(obj, response) {
    var cacheObj = {};

    _each(['url', 'key', 'unique'], function (key) {
      if (obj[key]) cacheObj[key] = obj[key];
    });

    var now = +new Date();

    cacheObj.data = response.content;
    cacheObj.originalType = response.type;
    cacheObj.type = obj.type || response.type;
    cacheObj.stamp = now;

    return cacheObj;
  }

  function saveUrl(obj) {
    return getUrl(obj.url_real).then(function (result) {
      var delay = (obj.expire || self.expire) * 60 * 60; // in seconds
      var cached = createCacheObj(obj, result);

      return storage.set(obj.key, cached, delay)
      // Suppress error - have to return data anyway
      .then(function () {
        return _default(obj, cached);
      }, function () {
        return _default(obj, cached);
      });
    });
  }

  function isCacheInvalid(cached, obj) {
    return !cached || cached.expire - +new Date() < 0 || obj.unique !== cached.unique || obj.url !== cached.url || self.isValidItem && !self.isValidItem(cached, obj);
  }

  function fetch(obj) {
    if (!obj.url) return P.resolve();

    obj.key = obj.key || obj.url;

    return storage.get(obj.key)
    // Suppress error, we can get it in private mode (Firefox)
    .then(function (data) {
      return data;
    }, function () {
      return null;
    }).then(function (cached) {
      if (!cached && obj.cached) throw new Error('Cache not exists');

      // if can't get object from store, then just load it from web.
      obj.execute = obj.execute !== false;
      var shouldFetch = !cached || isCacheInvalid(cached, obj);

      // If don't have to load new date - return one from cache
      if (!obj.live && !shouldFetch) {
        obj.type = obj.type || cached.originalType;
        return _default(obj, cached);
      }

      // calculate loading url
      obj.url_real = obj.url;
      if (obj.unique) {
        // set parameter to prevent browser cache
        obj.url_real = obj.url + (obj.url.indexOf('?') > 0 ? '&' : '?') + 'bag-unique=' + obj.unique;
      }

      return saveUrl(obj).then(function () {
        return obj;
      }, function (err) {
        if (!cached) throw err;

        obj.type = obj.type || cached.originalType;
        return _default(obj, cached);
      });
    });
  }

  ////////////////////////////////////////////////////////////////////////////
  // helpers to set absolute sourcemap url

  /* eslint-disable max-len */
  var sourceMappingRe = /(?:^([ \t]*\/\/[@|#][ \t]+sourceMappingURL=)(.+?)([ \t]*)$)|(?:^([ \t]*\/\*[@#][ \t]+sourceMappingURL=)(.+?)([ \t]*\*\/[ \t])*$)/mg;
  /* eslint-enable max-len */

  function parse_url(url) {
    var pattern = new RegExp('^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?');
    var matches = url.match(pattern);
    return {
      scheme: matches[2],
      authority: matches[4],
      path: matches[5],
      query: matches[7],
      fragment: matches[9]
    };
  }

  function patchMappingUrl(obj) {
    var refUrl = parse_url(obj.url);
    var done = false;
    var res = obj.data.replace(sourceMappingRe, function (match, p1, p2, p3, p4, p5, p6) {
      if (!match) return null;
      done = true;
      // select matched group of params
      if (!p1) {
        p1 = p4;p2 = p5;p3 = p6;
      }

      var mapUrl = parse_url(p2);

      var scheme = (mapUrl.scheme ? mapUrl.scheme : refUrl.scheme) || window.location.protocol.slice(0, -1);
      var authority = (mapUrl.authority ? mapUrl.authority : refUrl.authority) || window.location.host;
      /* eslint-disable max-len */
      var path = mapUrl.path[0] === '/' ? mapUrl.path : refUrl.path.split('/').slice(0, -1).join('/') + '/' + mapUrl.path;
      /* eslint-enable max-len */
      return p1 + (scheme + '://' + authority + path) + p3;
    });
    return done ? res : '';
  }

  ////////////////////////////////////////////////////////////////////////////

  var handlers = {
    'application/javascript': function injectScript(obj) {
      var script = document.createElement('script'),
          txt;

      // try to change sourcemap address to absolute
      txt = patchMappingUrl(obj);
      if (!txt) {
        // or add script name for dev tools
        txt = obj.data + '\n//# sourceURL=' + obj.url;
      }

      // Have to use .text, since we support IE8,
      // which won't allow appending to a script
      script.text = txt;
      head.appendChild(script);
      return;
    },

    'text/css': function injectStyle(obj) {
      var style = document.createElement('style'),
          txt;

      // try to change sourcemap address to absolute
      txt = patchMappingUrl(obj);
      if (!txt) {
        // or add stylesheet script name for dev tools
        txt = obj.data + '\n/*# sourceURL=' + obj.url + ' */';
      }

      // Needed to enable `style.styleSheet` in IE
      style.setAttribute('type', 'text/css');

      if (style.styleSheet) {
        // We should append style element to DOM before assign css text to
        // workaround IE bugs with `@import` and `@font-face`.
        // https://github.com/andrewwakeling/ie-css-bugs
        head.appendChild(style);

        style.styleSheet.cssText = txt; // IE method
      } else {
        style.appendChild(document.createTextNode(txt)); // others
        head.appendChild(style);
      }

      return;
    }
  };

  function execute(obj) {
    if (!obj.type) return;

    // Cut off encoding if exists:
    // application/javascript; charset=UTF-8
    var handlerName = obj.type.split(';')[0];

    // Fix outdated mime types if needed, to use single handler
    if (handlerName === 'application/x-javascript' || handlerName === 'text/javascript') {
      handlerName = 'application/javascript';
    }

    if (handlers[handlerName]) handlers[handlerName](obj);

    return;
  }

  ////////////////////////////////////////////////////////////////////////////

  //
  // Public methods
  //

  this.require = function (resources) {
    createStorage();

    return new P(function (resolve, reject) {
      var result = [],
          exec_pos = 0,
          res = _isArray(resources) ? resources : [resources];

      if (!resources) {
        resolve();
        return;
      }

      _each(res, function (r, i) {
        result[i] = false;
      });

      _each(res, function (r, i) {
        if (typeof r === 'string') res[i] = { url: r };

        fetch(res[i]).then(function () {
          // return content only, if one need full info -
          // check input object, that will be extended.
          result[i] = res[i].data;

          var k;

          for (k = exec_pos; k < result.length; k++) {
            if (result[k] === false) break;
            if (res[k].execute) execute(res[k]);
          }

          exec_pos = k;

          if (exec_pos >= res.length) {
            resolve(_isArray(resources) ? result : result[0]);
          }
        }, function (err) {
          reject(err);
        });
      });
    });
  };

  // Create proxy methods (init store then subcall)
  _each(['remove', 'get', 'set', 'clear'], function (method) {
    self[method] = function () {
      createStorage();
      return storage[method].apply(storage, arguments);
    };
  });

  this.addHandler = function (types, handler) {
    types = _isArray(types) ? types : [types];
    _each(types, function (type) {
      handlers[type] = handler;
    });
  };

  this.removeHandler = function (types) {
    self.addHandler(types /*, undefined*/);
  };
}

var DEFAULT_OPTIONS = {
  // 默认获取 js 来源
  tag: ['noscript'],
  // 默认加载资源
  lazyload: ['//cdnjs.gtimg.com/cdnjs/libs/zepto/1.1.4/zepto.min.js'],
  doc: document
};

/**
 * 
 * 初始化
 * @export
 * @see https://github.com/nodeca/bag.js/blob/master/bag.js
 * @param {any} [option=DEFAULT_OPTIONS] 
 * @param {string}  [localOptios={
 *   	prefix: 'bq_local',
 * 		stores: ['indexeddb', 'websql', 'localstorage'],
 * 		expire: 1
 * }] 
 * @returns Promise
 */
function init() {
  var option = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : DEFAULT_OPTIONS;
  var localOptios = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {
    prefix: 'bq_local',
    // ['indexeddb', 'websql', 'localstorage']
    stores: ['indexeddb', 'websql', 'localstorage'],
    expire: 1
  };

  var lazyLoad = option.lazyload || [];
  var doc = option.doc || document;
  var tag = option.tag || 'noscript';
  var noscript = doc.querySelectorAll(tag);
  noscript.forEach(function (node) {
    var parser = new DOMParser();
    var html = parser.parseFromString(node.childNodes[0].nodeValue, "text/html");
    var scrips = html.querySelectorAll('script');
    scrips.forEach(function (script) {
      lazyLoad.push(script.getAttribute('src'));
    });
  });
  var bag = new Bag(localOptios);
  return {
    lazyLoad: lazyLoad,
    require: function require() {
      var _lazyLoad = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : lazyLoad;

      return bag.require(_lazyLoad);
    },
    clear: function clear() {
      var expiredOnly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;

      return bag.clear(expiredOnly);
    },
    remove: function remove(key) {
      return bag.remove(key);
    },
    get: function get(key) {
      return bag.get(key);
    },
    set: function set(key, data, expire) {
      return bag.set(key, data, expire);
    }
  };
}

exports.init = init;

}((this.bqLocal = this.bqLocal || {})));
//# sourceMappingURL=index.js.map
