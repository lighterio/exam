/**
 * Wrap the native JSON.stringify with a circular-safe method.
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/stringify.js
 * @version 0.0.2
 */

// If JSON.nativeStringify doesn't exist, we have yet to wrap JSON.stringify.
if (!JSON.nativeStringify) {

  // Reference the native stringify function.
  var nativeStringify = JSON.nativeStringify = JSON.stringify;

  // Stringify using a stack of parent values to detect circularity.
  var stringify = function (value, stack, space) {
    var string;
    if (value === null) {
      return 'null';
    }
    if (typeof value != 'object') {
      return nativeStringify(value);
    }
    var length = stack.length;
    for (var i = 0; i < length; i++) {
      if (stack[i] == value) {
        return '"[Circular ' + (length - i) + ']"';
      }
    }
    stack.push(value);
    var isArray = (value instanceof Array);
    var list = [];
    var json;
    if (isArray) {
      length = value.length;
      for (i = 0; i < length; i++) {
        json = stringify(value[i], stack, space);
        if (json != undefined) {
          list.push(json);
        }
      }
    }
    else {
      for (var key in value) {
        json = stringify(value[key], stack, space);
        if (json != undefined) {
          key = nativeStringify(key) + ':' + (space ? ' ' : '');
          list.push(key + json);
        }
      }
    }
    if (space && list.length) {
      var indent = '\n' + (new Array(stack.length)).join(space);
      var indentSpace = indent + space;
      list = indentSpace + list.join(',' + indentSpace) + indent;
    }
    else {
      list = list.join(',');
    }
    value = isArray ? '[' + list + ']' : '{' + list + '}';
    stack.pop();
    return value;
  };

  // Stringify, optionally using an replacer function.
  JSON.stringify = function (value, replacer, space) {
    return replacer ?
      nativeStringify(value, replacer, space) :
      stringify(value, [], space);
  };

}

// Export, in case someone is using the function directly.
module.exports = JSON.stringify;
