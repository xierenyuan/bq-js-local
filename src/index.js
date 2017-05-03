import Bag from 'bagjs'
const DEFAULT_OPTIONS = {
  // 默认获取 js 来源
  tag : ['noscript'],
  // 默认加载资源
  lazyload: ['//cdnjs.gtimg.com/cdnjs/libs/zepto/1.1.4/zepto.min.js'],
  doc: document
}

/**
 * 
 * 初始化
 * @export
 * @see https://github.com/nodeca/bag.js/blob/master/bag.js
 * @param {any} [option=DEFAULT_OPTIONS] 
 * @param {string} [localOptios={
 *   	prefix: 'bq_local',
 * 		stores: ['indexeddb', 'websql', 'localstorage'],
 * 		expire: 1
 * }] 
 * @returns Promise
 */
export function init(option = DEFAULT_OPTIONS, localOptios = {
  	prefix: 'bq_local',
		stores: ['indexeddb', 'websql', 'localstorage'],
		expire: 1
}) {
  let lazyLoad = option.lazyload || []
  let doc = option.doc || document
  let tag = option.tag || 'noscript'
  let noscript = doc.querySelectorAll(tag)
  noscript.forEach(node => {
    let parser  = new DOMParser()
		let html = parser.parseFromString(node.childNodes[0].nodeValue, "text/html")
		let scrips = html.querySelectorAll('script')
  	scrips.forEach(script => {
			lazyLoad.push(script.getAttribute('src'))
		})
  })
  let bag = new Bag(localOptios)
  return {
    lazyLoad: lazyLoad,
    require(_lazyLoad = lazyLoad ) {
      return bag.require(_lazyLoad)
    },
    clear(expiredOnly = true) {
      return bag.clear(expiredOnly)
    },
    remove(key) {
      return bag.remove(key)
    }
  }
}


