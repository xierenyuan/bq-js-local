import Local from './local/index'
import {isArray, each} from './local/utils'
import assign from 'lodash.assign'
import Promise from 'lie'
const P = Promise
let DEFAULT_OPTIONS = {
  prefix: 'bq_local',
  timeout: 20,  // 20 seconds
  expire: 7 * 24, // 一周
  isValidItem: null,
  stores: [ 'indexeddb', 'websql', 'localstorage' ]
}

class Bag {
  constructor(options = DEFAULT_OPTIONS) {
    this.options  = assign(DEFAULT_OPTIONS, options)
    this.options.stores = isArray(this.options.stores) ? this.options.stores : DEFAULT_OPTIONS.stores
    this.storage = null
    this.sourceMappingRe = /(?:^([ \t]*\/\/[@|#][ \t]+sourceMappingURL=)(.+?)([ \t]*)$)|(?:^([ \t]*\/\*[@#][ \t]+sourceMappingURL=)(.+?)([ \t]*\*\/[ \t])*$)/mg
    this.init()
  }

  init() {
    each(['remove', 'get', 'set', 'clear'], method => {
      this[method] = () => {
        this._createStorage()
        return this.storage[method].apply(this.storage, arguments)
      }
    })
  }

  _createStorage() {
    if (!this.storage) {
      let opts = this.options
      this.storage = new Local(opts.prefix, opts.stores)
    }
  }

  _getUrl(url) {
    return new P((resolve, reject) => {
      let xhr = new XMLHttpRequest()
      xhr.open('GET', url)
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve({
              content: xhr.responseText,
              type: xhr.getResponseHeader('content-type')
            })
          } else {
            let status = (xhr.status ? xhr.statusText + ' (' + xhr.status + ')' : '')
            reject(new Error(`Can't open url: ${url} ${ status} `))
          }
        }
      }

      setTimeout(() => {
        if (xhr.readyState < 4) {
          xhr.abort()
          reject(new Error('加载超时 :)'))
        }
      }, this.options.timeout * 1000)

      try {
        xhr.send()
      } catch (e) {
        reject(e)
      }
    })

  }

  _createCacheObj(obj, response) {
    let cacheObj = {}
    each(['url', 'key', 'unique'], (key) => {
      if (obj[key]) cacheObj[key] = obj[key]
    })

    let now = +new Date()
    
    cacheObj.data = response.content
    cacheObj.originalType = response.type
    cacheObj.type = obj.type || response.type
    cacheObj.stamp = now
    return cacheObj
  }

  _saveUrl(obj) {
    return this._getUrl(obj.url_real).then(res => {
      let delay = (obj.expire || this.options.expire) * 60 * 60; // in seconds
      let cached = this._createCacheObj(obj, result)
      return this.storage.set(obj.key, cached, delay)
      .then(
      () => assign(obj, cached),
      () => assign(obj, cached))
    })
  }

  _isCacheInvalid(cached, obj) {
    return !cached ||
    cached.expire - +new Date() < 0 ||
    obj.unique !== cached.unique ||
    obj.url !== cached.url ||
    (this.options.isValidItem && !this.options.isValidItem(cached, obj))
  }

  fetch(obj) {
    if (!obj.url) return P.resolve()
    obj.key = (obj.key || obj.url)
    return this.storage.get(obj.key)
      // Suppress error, we can get it in private mode (Firefox)
      .then(data => {
        return data
      }, () => {
        return null
      })
      .then(cached => {
        if (!cached && obj.cached) throw new Error('缓存不存在')

        // 如果不能从 store 里面取到 则从web 加载新的
        obj.execute = (obj.execute !== false)
        let shouldFetch = !cached || this._isCacheInvalid(cached, obj)
        if (!obj.live && !shouldFetch) {
          obj.type = obj.type || cached.originalType
          return assign(obj, cached)
        }

       // calculate loading url
       obj.url_real = obj.url

       if (obj.unique) { 
         // set parameter to prevent browser cache
         obj.url_real = obj.url + ((obj.url.indexOf('?') > 0) ? '&' : '?') + 'bq-local-unique=' + obj.unique
       }

       return this._saveUrl(obj)
        .then(
          ()=> {
            return obj
          },
          (err) => {
            if (!cached) throw err
            obj.type = obj.type || cached.originalType
            return assign(obj, cached)
          }
        )

      })

  }

  _parseUrl(url) {
    let pattern = new RegExp('^(([^:/?#]+):)?(//([^/?#]*))?([^?#]*)(\\?([^#]*))?(#(.*))?')
    let matches = url.match(pattern)
    return {
      scheme: matches[2],
      authority: matches[4],
      path: matches[5],
      query: matches[7],
      fragment: matches[9]
    }
  }

  _patchMappingUrl(obj) {
    let refUrl = this._parseUrl(obj.url)
    let done = false
    let res = obj.data.replace(this.sourceMappingRe, (match, p1, p2, p3, p4, p5, p6) => {
      if (!match) return null
      done = true
      if (!p1) {
        p1 = p4
        p2 = p5
        p3 = p6
      }
      let mapUrl = this._parseUrl(p2)
      let scheme = (mapUrl.scheme ? mapUrl.scheme : refUrl.scheme) || window.location.protocol.slice(0, -1)
      let authority = (mapUrl.authority ? mapUrl.authority : refUrl.authority) || window.location.host
      let path = mapUrl.path[0] === '/' ? mapUrl.path : refUrl.path.split('/').slice(0, -1).join('/') + '/' + mapUrl.path
      return p1 + (scheme + '://' + authority + path) + p3
    })
    return done ? res : ''
  }

  _handlers() {
    return {
      'application/javascript': obj => {
        let script = document.createElement('script')
        // try to change sourcemap address to absolute
        let txt = this._patchMappingUrl(obj)
        if (!txt) {
          // or add script name for dev tools
          txt = obj.data + '\n//# sourceURL=' + obj.url
        }
        // Have to use .text, since we support IE8,
        // which won't allow appending to a script
        script.text = txt
        head.appendChild(script)
        return
      },

      'text/css': obj => {
        let style = document.createElement('style')
        let txt = this._patchMappingUrl(obj)
        if (!txt) {
          txt = obj.data + '\n/*# sourceURL=' + obj.url + ' */'
        }
          // Needed to enable `style.styleSheet` in IE
        style.setAttribute('type', 'text/css')
        if (style.styleSheet) {
          // We should append style element to DOM before assign css text to
          // workaround IE bugs with `@import` and `@font-face`.
          // https://github.com/andrewwakeling/ie-css-bugs
          head.appendChild(style);
          style.styleSheet.cssText = txt
        } else {
          style.appendChild(document.createTextNode(txt))
          head.appendChild(style)
        }
        return;
      }
    }
  }

  _execute(obj) {
    if (!obj.type) return

    // Cut off encoding if exists:
    // application/javascript; charset=UTF-8
    let handlerName = obj.type.split(';')[0]
    // Fix outdated mime types if needed, to use single handler
    if (handlerName === 'application/x-javascript' || handlerName === 'text/javascript') {
      handlerName = 'application/javascript';
    }

    let handlers = this._handlers()
    if (handlers[handlerName]) handlers[handlerName](obj)
    return
  }

  require(resources) {
    this._createStorage()
    return new P((resolve, reject) => {
      let result = []
      let exec_pos = 0
      let res = isArray(resources) ? resources : [ resources ]

      if (!resources) {
        resolve()
        return
      }

      each(res, (r, i) => {
        result[i] = false
      })

      each(res, (r, i) => {
      if (typeof r === 'string') res[i] = { url: r }
      this.fetch(res[i]).then(
          () => {
            // return content only, if one need full info -
            // check input object, that will be extended.
            result[i] = res[i].data
            let k
            for (k = exec_pos; k < result.length; k++) {
              if (result[k] === false) break
              if (res[k].execute) this._execute(res[k])
            }
            
            exec_pos = k

            if (exec_pos >= res.length) {
              resolve(isArray(resources) ? result : result[0])
            }
          },
          err => reject(err)
        )
      
      })

    })
  }

  addHandler(types, handler) {
    types = isArray(types) ? types : [ types ]
    let handlers = this._handlers()
    each(types, (type) => {
      handlers[type] = handler
    })
    this._handlers = () => {
      return handlers
    }
  }

  removeHandler(types) {
    this.addHandler(types)
  }

}

export default Bag
