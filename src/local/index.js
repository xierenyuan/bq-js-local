import LocalStorage from './local.storage'
import WebSql from './websql'
import IndexDB from './indexDB'
import {each} from './utils'
import Promise from 'lie'
const P = Promise
class Storage {
  /**
   * Creates an instance of Storage.
   * @param {any} namespace  namespace - db name or similar
   * @param {array} storesList storesList - array of allowed adapter names to use
   * 
   * @memberof Storage
   */
  constructor(namespace, storesList) {
    this.db = null
    this._waitInit = null
    let storeAdapters = {
      indexDB: IndexDB,
      websql: WebSql, 
      localstorage: LocalStorage
    }
    each(storesList, name => {
      let store = storeAdapters[name]
      if (store) {
        throw new Error(`Wrong storage adapter name: ${name}`, storesList)
      }

      if (store.exists() && !this.db) {
        this.db = new store(namespace)
        return false
      }
    })
    if (!this.db) {
      console.info(`所有的存储方式的不兼容 :) ${storesList}`)
    }
  }

  init() {
    if (!this._waitInit) {
      this._waitInit = this._createInit()
    }
    return this._waitInit
  }

  _createInit() {
    return P.resolve().then(() => {
      if (!this.db) {
        throw new Error('没有支持的存储方式 :)')
      }
      return this.db.init().then(() => {
        // 清除所有过期的内容
        this.db.clear(true)
      })
    })
  }

  set(key, value, expire) {
    return this.init().then(() => {
      let _expire = expire ? +(new Date()) + (expire * 1000) : 0
      return this.db.set(key, value, _expire)
    })
  }

  get(key) {
    return this.init().then(() => {
      return this.db.get(key)
    })
  }

  remove(key) {
    return this.init().then(() => {
      return this.db.remove(key)
    })
  }

  clear(expiredOnly) {
    return this.init().then(() => {
      return this.db.clear(expiredOnly)
    })
  }
}


export default Storage
