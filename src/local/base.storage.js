import Promise from 'lie'
const P = Promise
export default class BaseStorage {
  constructor(namespace) {
    this.namespace = namespace
    this.ns = `${namespace}__`
  }

  init() {
    return P.resolve() 
  }

  getKey(key) {
    return `${this.namespace}__${key}`
  }

};
