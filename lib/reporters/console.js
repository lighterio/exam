var colors = require('../../common/string/colors')
var snippetStack = require('../../common/error/snippet-stack')

var base, red, green, cyan, magenta, yellow, gray, white
var dot, ex, arrow, bullets
var width = 100
var spacer = (new Array(width + 1)).join(' ')

require('../../common/json/colorize')

var consoleReporter = module.exports = {

  init: function (options) {
    this.options = options
    var isWindows = (process.platform === 'win32')
    if (options.noColors) {
      String.colors = false
    }
    base = colors.base
    red = colors.red
    green = colors.green
    cyan = colors.cyan
    magenta = colors.magenta
    yellow = colors.yellow
    gray = colors.gray
    white = colors.white
    dot = (isWindows ? '.' : '\u00B7')
    ex = red + (isWindows ? '\u00D7' : '\u2716')
    arrow = (isWindows ? '\u2192' : '\u279C') + ' '
    bullets = {
      passed: green + (isWindows ? '\u221A' : '\u2714') + ' ' + gray,
      failed: ex + ' ',
      skipped: yellow + (isWindows ? '*' : '\u272D') + ' ',
      stubbed: cyan + arrow,
      trace: (isWindows ? '+ ' : '\u271A ').cyan,
      debug: (isWindows ? '÷ ' : '\u2756 ').magenta,
      alert: (isWindows ? '*' : '\u272D ').yellow
    }
  },

  start: function (options) {
    this.init(options)
    if (!options.hideAscii) {
      var version = require('../../package.json').version
      var art = [
        gray + (new Array(width)).join('='),
        yellow + '  ' + gray + '  _',
        yellow + ' __' + gray + '(O)' + yellow + '__ ' + gray + '   _____           v' + version,
        yellow + '|' + white + '#' + gray + 'A***A' + white + '#' + yellow + '|' + gray + '  | ____)_  __ _ _ _ _ _',
        yellow + '|' + white + '#######' + yellow + '|' + gray + '  |  _) \\ \\/ / _` | ` ` \\',
        yellow + '|' + white + '#######' + yellow + '|' + gray + '  | |___ }  { (_| | | | |',
        yellow + '|' + white + '#######' + yellow + '|' + gray + '  |_____/_/\\_\\__,_|_|_|_|',
        yellow + ' """""""',
        base
      ]
      this.stream.write(art.join('\n'))
    }
  },

  skip: function () {
    this.stream.write(yellow + dot + base)
  },

  stub: function () {
    this.stream.write(cyan + dot + base)
  },

  pass: function () {
    this.stream.write(green + dot + base)
  },

  fail: function () {
    this.stream.write(ex + base)
  },

  status: function (text) {
    this.stream.write('\u001B[3A\n' + gray + ' ' + text + '         \n\n')
  },

  stringify: function (data) {
    return JSON.colorize(data, 0, '  ', '', width - 9)
  },

  finishTree: function (run, data) {
    var self = this
    var options = run.options
    self.init(options)
    self.stream.write('')
    var hasOnly = data.hasOnly
    var dive = function (node, indent) {
      var name = node.name
      var stub = !node.fn
      var time = node.time
      var skip = node.skip || (hasOnly && !node.only && !node.hasOnly) || isNaN(time)
      var hide = hasOnly && skip
      var error = (stub || skip) ? '' : node.error
      var children = node.children
      var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : 'passed'
      var results = node.results
      var logs = node.logs
      if (error || logs) {
        var parent = node.parent
        var title = name
        while (parent && parent.name) {
          title = parent.name + (title[0] === '.' ? '' : ' ') + title
          parent = parent.parent
        }
        title = title.replace(/([^\.])$/, '$1' + gray)
        if (error) {
          error.stack = (error.stack || (error || '')).replace(/(\/exam\/exam\.js:\d+:\d+\))[\s\S]*$/, '$1')
          data.errors = data.errors || []
          data.errors.push(title + '\n    ' + snippetStack(error, {
            indent: '      ',
            lead: 5,
            color: 'red'
          }))
        }
        if (logs && !skip) {
          var text = ''
          logs.forEach(function (log) {
            title = title || log.file
            if (error || (log.type === 'alert')) {
              var lines = []
              for (var i = 0, l = log.args.length; i < l; i++) {
                lines.push(log.args[i])
              }
              lines = bullets[log.type] + lines.join('\n').replace(/\n/g, '\n     ')
              if (log.stack) {
                lines += snippetStack('\n' + log.stack, {
                  indent: '       ',
                  lead: log.lead,
                  color: 'cyan'
                })
              }
              text += '\n   ' + lines.replace(/^[^\n]+/, function (first) {
                var emptiness = width - 9 - first.plain.length
                if (emptiness > 0) {
                  first += spacer.substr(0, emptiness)
                }
                var elapsed = log.time - node.started
                if (!isNaN(elapsed)) {
                  first += (' +' + (elapsed || 0) + 'ms').gray
                }
                return first
              })
            }
          })
          if (text) {
            data.logs = data.logs || []
            data.logs.push(' ' + bullets[key] + base + title + text)
          }
        }
      }
      if (name) {
        if (children) {
          if (!hide) {
            data.output += indent + base + name
          }
        } else {
          data[key]++
          if (!hide) {
            if (node.speed) {
              var speed = self.whole(node.speed)
              var deviation = self.whole(Math.sqrt(node.variance) + 1)
              var bullet = node.slower ? (node.time >= 10 ? '• '.red  : '• '.yellow) : bullets.passed
              data.output += indent + bullet + name.base + ': '.gray + speed + ' op/s' + (' ±' + deviation).gray + ' over ' + node.passes + ' passes'
            } else {
              data.output += indent + bullets[key] + name
              if (key === 'passed' && (time >= options.slow)) {
                data.output += (time >= options.verySlow ? red : yellow) + ' (' + time + 'ms)'
              }
            }
            if (error && results) {
              results.forEach(function (result) {
                if (result.message) {
                  data.output += indent + '  ' + red + arrow + result.message
                } else {
                  data.output += indent + '  ' + green + arrow + result
                }
              })
            }
          }
        }
      }
      if (children) {
        indent = (indent ? (indent + '  ').replace(/\n\n/, '\n') : '\n\n ')
        children.forEach(function (child) {
          dive(child, indent)
        })
      }
    }
    dive(run)
    return data
  },

  whole: function (number) {
    return ('' + Math.floor(number))
      .replace(/(\d\d)\d{9}$/, '$1B')
      .replace(/(\d)(\d)\d{8}$/, '$1.$2B')
      .replace(/(\d\d)\d{6}$/, '$1M')
      .replace(/(\d)(\d)\d{5}$/, '$1.$2M')
      .replace(/(\d\d)\d{3}$/, '$1K')
      .replace(/(\d)(\d)\d{2}$/, '$1.$2K')
  },

  finishExam: function (data) {
    var output = data.outputs.join('')
    var errors = data.errors
    if (errors) {
      errors.forEach(function (error, index) {
        var n = index + 1
        if (n < 10) {
          n = ' ' + n
        }
        output += '\n\n' + base + n + gray + ') ' + base + error
      })
    }
    var time = gray + '(' + (data.time || 0) + 'ms)' + base
    output += '\n\n ' + green + data.passed + ' passed ' + time
    if (data.failed) {
      output += '\n ' + red + data.failed + ' failed'
    }
    if (data.skipped) {
      output += '\n ' + yellow + data.skipped + ' skipped'
    }
    if (data.stubbed) {
      output += '\n ' + cyan + data.stubbed + ' stubbed'
    }
    var logs = data.logs
    if (logs) {
      if (!this.options.hideAscii) {
        output += ["\n\n" + gray + (new Array(width)).join('-') + "\n" +
          yellow + "   .   " + gray + "       _         _     " + magenta + "   .   " + gray + "     _     _                    " + cyan + "_" + gray + "     _",
          yellow + "__/*\\__" + gray + "  __ _| |___ _ _| |_   " + magenta + "  /@\\   " + gray + " __| |___| |__ _  _ __ _     " + cyan + "_|#|_" + gray + "  | |_ _ _ __ _ __ ___",
          yellow + "'\\***/'" + gray + " / o` | / o_) \'_|  _|  " + magenta + "<@@@@@> " + gray + "/ o` / o_) 'o \\ || / o` |   " + cyan + "|#####|" + gray + " |  _| '_/ o` / _/ o_)",
          yellow + " /*^*\\ " + gray + " \\__,_|_\\__\\|_|  \\__|  " + magenta + "  \\@/   " + gray + "\\__,_\\__\\|_.__/\\_,_\\__, |     " + cyan + "|#|" + gray + "    \\__|_| \\__,_\\__\\__\\",
          yellow + "       " + gray + "                       " + magenta + "   '    " + gray + "                   |___/" + base].join('\n')
      }
      logs.forEach(function (log) {
        output += '\n\n' + log
      })
    }
    output += base + '\n\n'
    if (this.options.watch) {
      output += '\n\n'
    }
    this.stream.write(output)
    return output
  }

}
