
let _isArray =  Array.isArray || function(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}


function _each(obj, iterator) {
  if (_isArray(obj)) {
    if (obj.forEach) return obj.forEach(iterator);

    for (var i = 0; i < obj.length; i++) iterator(obj[i], i, obj);
  } else {
    for (var k in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) iterator(obj[k], k);
    }
  }
}

export let isArray = _isArray
export let each = _each

export function merge(obj, src) {
  _each(src, (val, key) => {
    if (!obj[key]) obj[key] = src[key]
  })
  return obj
}


