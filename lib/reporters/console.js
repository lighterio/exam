var os = require('os')
var colors = require('lighter-colors')
var snippetStack = require('../../common/error/snippet-stack')
var colorize = require('lighter-json').colorize

var base, red, green, cyan, magenta, yellow, gray, white
var dot, ex, arrow, timer, bullets
var width = 80
var spacer = (new Array(width + 1)).join(' ')

var platform = process.platform
var versions = process.versions
var cwd = process.cwd()
var project = cwd.replace(/^.*[/\\]/, '')
versions[platform] = os.release()
try {
  versions[project] = require(cwd + '/package').version
} catch (ignore) {
  versions[project] = ''
}
versions.exam = require('../../package').version

module.exports = {
  init: function (options) {
    this.options = options
    var isWindows = (process.platform === 'win32')
    if (options.noColors || options.noColor) {
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
    timer = '+'
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
      var art = [
        gray + (new Array(width)).join('-'),
        yellow + ' _' + gray + '(O)' + yellow + '_ ' + gray + '   ____                  ' + platform + ' ' + versions[platform],
        yellow + '|' + white + '@' + gray + 'A#A' + white + '@' + yellow + '|' + gray + '  | ___)_ ___ _ _ _ _    node ' + versions.node,
        yellow + '|' + white + '@@@@@' + yellow + '|' + gray + '  | _)_\\ V /o` | ` ` \\   exam ' + versions.exam,
        yellow + '|' + white + '@@@@@' + yellow + '|' + gray + '  |____/_A_\\_,_|_|_|_|   ' + project + ' ' + versions[project],
        yellow + ' """""',
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

  time: function () {
    this.stream.write(green + timer + base)
  },

  status: function (text) {
    this.stream.write('\u001B[3A\n' + gray + ' ' + text + '         \n\n')
  },

  stringify: function (data) {
    return colorize(data, 0, '  ', '', width - 9)
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
      var parent = node.parent
      if (error || logs) {
        var title = name
        while (parent && parent.name) {
          title = parent.name + (title[0] === '.' ? '' : ' ') + title
          parent = parent.parent
        }
        title = title.replace(/([^.])$/, '$1' + gray)
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
                  first += (' +' + self.number(elapsed, self.times)).gray
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
            if (node.runCount) {
              data.output += ('  ' + self.number(node.runCount) + ' runs').gray
            }
          }
        } else {
          data[key]++
          if (!hide) {
            // TODO: Compute an overall winner across benchmarks.
            if (node.speed) {
              parent.rows = parent.rows || []
              parent.best = parent.best || node.speed
              var speed = node.speed
              var isBest = speed === parent.best
              var hasWinner = (parent.children[1] || {}).slower
              var slower = node.slower
              var color = slower ? (node.time >= 2 ? 'red' : 'yellow') : 'green'
              var bullet = (slower || !hasWinner) ? ('• ')[color] : bullets.passed
              var worse = (1 - speed / parent.best) * 100
              var row = [
                indent + bullet + name.base + ':'.gray,
                isBest ? 'Fastest'.green : ('-' + self.number(worse, self.percent, true) + '%')[color],
                ' ' + self.number(speed, null, true) + ' op/s',
                ('±' + self.number(Math.sqrt(node.variance)) + ' op/s ').gray,
                (' ' + self.number(node.runCount) + ' runs').gray
              ]
              parent.rows.push(row)
              if (parent.rows.length === parent.children.length) {
                data.output += self.table(parent.rows)
              }
            } else {
              data.output += indent + bullets[key] + name
              if (key === 'passed' && (time >= options.slow)) {
                data.output += (time >= options.verySlow ? red : yellow) + ' (' + self.number(time, self.times) + ')'
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

  numbers: {
    T: 1e12,
    B: 1e9,
    M: 1e6,
    K: 1e3,
    '': 1
  },

  times: {
    hr: 36e5,
    min: 6e4,
    sec: 1e3,
    ms: 1
  },

  number: function (number, suffixes, precise) {
    number = number || 0
    suffixes = suffixes || this.numbers
    for (var suffix in suffixes) {
      var min = suffixes[suffix]
      if (number >= min) {
        number = number / min + suffix
        break
      }
    }
    var precision = precise ? /([\d.]{6})\d+/ : /([\d.]{4})\d+/
    return ('' + number)
      .replace(precision, '$1')
      .replace(/\.(\D?)$/i, '$1')
  },

  table: function (rows) {
    var widths = []
    rows.forEach(function (row, index) {
      row.forEach(function (text, index) {
        var cell = row[index] = {
          text: text,
          width: text.replace(/\u001b\[\d+m/, '').length
        }
        widths[index] = Math.max(widths[index] || 0, cell.width)
      })
    })
    var output = ''
    rows.forEach(function (row, index) {
      row.forEach(function (cell, index) {
        var space = spacer.substr(0, widths[index] - cell.width)
        output += (index ? ' ' + space + cell.text : cell.text + space)
      })
    })
    return output
  },

  finishExam: function (data) {
    var self = this
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
    var time = gray + '(' + self.number(data.time, self.times) + ')' + base
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
        output += ['\n\n' + gray + (new Array(width)).join('-') + '\n' +
        yellow + '   .   ' + gray + '       _         _     ' + magenta + '   .   ' + gray + '     _     _                    ' + cyan + '_' + gray + '     _',
          yellow + '__/*\\__' + gray + '  __ _| |___ _ _| |_   ' + magenta + '  /@\\   ' + gray + ' __| |___| |__ _  _ __ _     ' + cyan + '_|#|_' + gray + '  | |_ _ _ __ _ __ ___',
          yellow + "'\\***/'" + gray + " / o` | / o_) '_|  _|  " + magenta + '<@@@@@> ' + gray + "/ o` / o_) 'o \\ || / o` |   " + cyan + '|#####|' + gray + " |  _| '_/ o` / _/ o_)",
          yellow + ' /*^*\\ ' + gray + ' \\__,_|_\\__\\|_|  \\__|  ' + magenta + '  \\@/   ' + gray + '\\__,_\\__\\|_.__/\\_,_\\__, |     ' + cyan + '|#|' + gray + '    \\__|_| \\__,_\\__\\__\\',
          yellow + '       ' + gray + '                       ' + magenta + "   '    " + gray + '                   |___/' + base].join('\n')
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
