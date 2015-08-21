/**
 * Stringify JSON with colors for console logging.
 *
 * @origin https://github.com/lighterio/lighter-common/common/json/colorize.js
 * @version 0.0.1
 * @import string/colors
 */

var colors = require('../string/colors')

JSON.colorize = module.exports = function (data, stack, space, indent, maxWidth, maxDepth) {
  maxWidth = maxWidth || 80
  maxDepth = maxDepth || 5
  var type = typeof data
  var color
  if (type === 'function') {
    data = data.toString()
    if (stack) {
      data = data.replace(/\s+/g, ' ')
      if (data.length > maxWidth) {
        data = data.replace(/^([^\{]+?)\{.*\}$/, '$1{...}')
      }
      color = 'cyan'
    }
  } else if ((type === 'object') && data) {
    if (data instanceof Date) {
      data = data.toUTCString()
      if (stack) {
        data = '[Date: ' + data + ']'
        color = 'cyan'
      }
    } else if (data instanceof Error) {
      var e = data
      var message = (e.stack || '' + e).replace(/^\w*Error:? ?/, '')
      if (stack) {
        data = '[' + (e.name || 'Error') + ': ' + message + ']'
      } else {
        data = e.stack || '' + e
      }
      color = 'cyan'
    } else if (data instanceof RegExp) {
      data = '/' + data.source + '/'
        + (data.global ? 'g' : '')
        + (data.ignoreCase ? 'i' : '')
        + (data.multiline ? 'm' : '')
      color = 'green'
    } else {
      stack = stack || []
      indent = indent || space
      var colon = (space ? ': ' : ':').gray
      for (var i = 0, l = stack.length; i < l; i++) {
        if (stack[i] === data) {
          return ('[Circular ^' + (l - i) + ']').gray
        }
      }
      stack.push(data)
      var parts = []
      var length = 0
      var text
      var isArray = (data instanceof Array)
      if (stack.length > maxDepth) {
        data = (isArray ? '[Array]' : '[Object]').cyan
      } else {
        if (isArray) {
          data.forEach(function (value) {
            text = JSON.colorize(value, stack, space, indent + space, maxWidth - 2, maxDepth)
            length += text.replace().length
            parts.push(text)
          })
        } else {
          for (var key in data) {
            if (data.hasOwnProperty(key)) {
              var value = data[key]
              if (/[^$\w\d]/.test(key)) {
                key = '"' + key + '"'
              }
              if (key[0] === '_') {
                key = key.gray
              }
              text = key + colon + JSON.colorize(value, stack, space, indent + space, maxWidth - 2)
              length += text.plain.length
              parts.push(text)
            }
          }
        }
        if (space) {
          if (parts.length) {
            length += (parts.length - 1) * 2
          }
          if (length + indent.length > maxWidth) {
            data = '\n' + indent + parts.join(',\n'.gray + indent) + '\n' + indent.substr(2)
          } else {
            data = parts.join(', '.gray)
          }
        } else {
          data = parts.join(','.gray)
        }
        if (isArray) {
          data = '['.gray + data + ']'.gray
        } else {
          data = '{'.gray + data + '}'.gray
        }
      }
      stack.pop()
    }
  } else if (stack && !color) {
    if (type === 'string') {
      data = JSON.stringify(data)
      color = 'green'
    } else if (type === 'number') {
      color = 'magenta'
    } else if (type === 'boolean') {
      color = 'yellow'
    } else {
      color = 'red'
    }
  }
  data = '' + data
  return color ? data[color] : data
}
