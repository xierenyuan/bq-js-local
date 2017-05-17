import {each} from './utils'
import Promise from 'lie'
import Base from './base.storage'
const P = Promise
class WebSql extends Base {
  constructor(namespace) {
    super(namespace)
    this.db = null
    this.createTablesql = 'CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT, expire INTEGER KEY)'
  }

  init() {
    let db = this.db = window.openDatabase(this.namespace, '1.0', 'bq.local.js db', 2e5)
    if (!db) {
      reject('websql 数据库连接失败 :)')
      return
    }
    return this.executeSql(this.createTablesql)
  }

  remove(key) {
    return this.executeSql('DELETE FROM kv WHERE key = ?', [ key ])
  }

  set(key, value, expire) {
    let sql = 'INSERT OR REPLACE INTO kv (key, value, expire) VALUES (?, ?, ?)'
    return this.executeSql(sql, [ key, JSON.stringify(value), expire ])
  }

  get() {
    let sql = 'SELECT value FROM kv WHERE key = ?'
    return new P((resolve, reject) => {
      this.db.readTransaction(tx => {
        tx.executeSql(sql,
        [ key ],
        (tx, result) => {
          if (result.rows.length === 0) return resolve()
          let value = result.rows.item(0).value
          try {
            resolve(JSON.parse(value))
          } catch (e) {
            reject(new Error(`Can't unserialise data: ${value}`))
          }
        },
        (ex, err) => reject(err))
      })
    })
  }

  clear(expiredOnly) {
    let sql  = expiredOnly ? 'DELETE FROM kv WHERE expire > 0 AND expire < ?' : 'DELETE FROM kv'
    let value = expiredOnly ? [ +new Date() ] : []
    return this.executeSql(sql, value)
  }

  exists() {
    return (!!window.openDatabase)
  }

  executeSql(sql, value = []) {
    return new P((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(sql, value, () => resolve(), (tx, err) => reject(err))
      })
    })
  }
}

WebSql.exists = () => {
  return (!!window.openDatabase)
}

export default WebSql
