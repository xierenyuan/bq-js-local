import {each} from './utils'
import Promise from 'lie'
import Base from './base.storage'
const P = Promise
class LocalStorage extends Base {
  constructor(namespace) {
    super(namespace)
  }

  remove(key) {
    localStorage.removeItem(this.getKey(key))
    return P.resolve()
  }

  set(key, value, expire) {
    let obj = {
      value: value,
      expire: expire
    }
    return new P((resolve, reject) => {
      try {
        localStorage.setItem(this.getKey(key), JSON.stringify(obj))
        resolve()
      } catch(e) {
        if (e.name.toUpperCase().indexOf('QUOTA') >= 0) {
          try {
            each(localStorage, (val, name) => {
              let k = name.split(this.ns)[1]
              k && this.remove(k)
            })
            localStorage.setItem(this.getKey(key), JSON.stringify(obj))
            resolve()
          } catch (e2) {
            reject(e2)
          }
        } else {
          reject(e)
        }
      }
    })
  }

  get(key, raw) {
    return new P((resolve, reject) => {
      try {
        let data = localStorage.getItem(this.getKey(key))
        if (data === null) return resolve()
        data = JSON.parse(data)
        resolve(data = raw ? data : data.value)
      } catch(e) {
        reject(new Error(`Can't read key: ${key}`))
      }
    })
  }

  clear(expiredOnly) {
    let now = +new Date()
    let p = P.resolve()
    each(localStorage, (val, name) => {
      let key = name.split(this.ns)[1]
      if (!key) return
      if (!expiredOnly) {
        p = p.then(() => {
          this.remove(key)
        })
        return
      }
      p = p.then(() => {
        return this.get(key, true).then(raw => {
          if (raw && (raw.expire > 0) && ((raw.expire - now) < 0)) {
            this.remove(key)
          }
        })
      })

    })
    return p
  }

  exists() {
    try {
      localStorage.setItem('__ls_test__', '__ls_test__')
      localStorage.removeItem('__ls_test__')
      return true
    } catch(e) {
      return false
    }
  }
}

LocalStorage.exists = () => {
  try {
    localStorage.setItem('__ls_test__', '__ls_test__')
    localStorage.removeItem('__ls_test__')
    return true
  } catch(e) {
    return false
  }
}

export default LocalStorage
