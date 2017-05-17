import {each} from './utils'
import Promise from 'lie'
import Base from './base.storage'
const P = Promise
class IndexDB extends Base {
  constructor(namespace) {
    super(namespace)
    this.db = null
    this.createTablesql = 'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, expire INTEGER KEY)'
  }

  init() {
    return new P((resolve, reject) => {
      let idb = window.indexedDB
      let req = idb.open(this.namespace, 2)
      req.onsuccess = e => {
        this.db = e.target.result
        resolve()
      }

      req.onblocked = e => {
        reject(`IndexedDB blocked. ${e.target.errorCode}`)
      }

      req.onerror = e => {
        reject(`IndexedDB opening error.  ${e.target.errorCode}`)
      }

      req.onupgradeneeded = e => {
        this.db = e.target.result
        if (this.db.objectStoreNames.contains('kv')) this.db.deleteObjectStore('kv')
        let store = this.db.createObjectStore('kv', { keyPath: 'key' })
        store.createIndex('expire', 'expire', { unique: false })
      }
    })
  }

  remove(key) {
    return new P((resolve, reject) => {
      let tx = this.db.transaction('kv', 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = e => reject(e.target)
      tx.objectStore('kv')['delete'](key).onerror = () => tx.abort()
    })
  }

  set(key, value, expire) {
    return new P((resolve, reject) => {
      let tx = this.db.transaction('kv', 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = e => reject(e.target)
      tx.objectStore('kv').put({
        key: key,
        value: value,
        expire: expire
      }).onerror = ()=> tx.abort()
    })
  }

  get() {
    return new P((resolve, reject) => {
      let tx = this.db.transaction('kv')
      tx.onerror = tx.onabort = e => reject(e.target)
      tx.objectStore('kv').get(key).onsuccess = e => {
        if (e.target.result) {
          resolve(e.target.result.value)
        } else {
          resolve()
        }
      }
    })
  }

  clear(expiredOnly) {
    return new P((resolve, reject) => { 
      let keyrange = window.IDBKeyRange
      let tx = this.db.transaction('kv', 'readwrite')
      let store = tx.objectStore('kv')
      tx = db.transaction('kv', 'readwrite')
      store = tx.objectStore('kv')

      tx.oncomplete = () => resolve()
      tx.onerror = tx.onabort = e => reject(new Error(`Clear error: ${e.target}`))

      if (expiredOnly) {
        let cursor = store.index('expire').openCursor(keyrange.bound(1, +new Date()))
        cursor.onsuccess = e => {
          let _cursor = e.target.result
          if (_cursor) {
            // IE 8 not allow to use reserved keywords as functions (`delete` and `continue`). More info:
            // http://tiffanybbrown.com/2013/09/10/expected-identifier-bug-in-internet-explorer-8/
            store['delete'](_cursor.primaryKey).onerror = () => tx.abort()
            _cursor['continue']()
          }
        }
        return
      }
      
      // Just clear everything
      tx.objectStore('kv').clear().onerror = () => tx.abort()
    })
  }

  exists() {
    let db =  window.indexedDB
    if (!db) return false
    // Check outdated idb implementations, where `onupgradeneede` event doesn't work,
    // see https://github.com/pouchdb/pouchdb/issues/1207 for more details
    let dbName = '__idb_test__'
    let result = db.open(dbName, 1).onupgradeneeded === null
    if (db.deleteDatabase) db.deleteDatabase(dbName)
    return result
  }
}

IndexDB.exists = () => {
  let db =  window.indexedDB
  if (!db) return false
  // Check outdated idb implementations, where `onupgradeneede` event doesn't work,
  // see https://github.com/pouchdb/pouchdb/issues/1207 for more details
  let dbName = '__idb_test__'
  let result = db.open(dbName, 1).onupgradeneeded === null
  if (db.deleteDatabase) db.deleteDatabase(dbName)
  return result
}

export default IndexDB
