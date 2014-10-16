var fs = require('fs');
var exam = require('../../exam');

var base = '\u001b[39m';
var green = '\u001b[32m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var cyan = '\u001b[36m';
var grey = '\u001b[90m';
var white = '\u001b[37m';
var bold = '\u001b[1m';
var normal = '\u001b[22m';

var isWindows = (process.platform == 'win32');
var check = green + (isWindows ? '\u221A' : '\u2714');
var ex = red + (isWindows ? '\u00D7' : '\u2716');
var arrow = (isWindows ? '\u2192' : '\u279C');
var star = yellow + (isWindows ? '*' : '\u2731');
var todo = cyan + arrow;
var dot = '\u00B7';

var cwd = process.cwd();
var specialPattern = /(\.\?\*\+\(\)\[\]\{\}\\)/g;
var escCwd = cwd.replace(specialPattern, '\\$1') + '/';
var stackPattern = new RegExp(
  '\n +at ([^\n]*)' + escCwd + '([^:\n]*?)([^\\/:]+):([0-9]+):([0-9]+)([^\n]*)',
  'g'
);

var stream = process.stdout;

module.exports = {

  start: function () {
    var art = [
      yellow + '  ' + grey + '  _',
      yellow + ' __' + grey + '(O)' + yellow + '__ ' + grey + '   _____           v' + exam.version,
      yellow + '|' + white + '#' + grey + 'A***A' + white + '#' + yellow + '|' + grey + '  | ____)_  __ _ _ _ _ _',
      yellow + '|' + white + '#######' + yellow + '|' + grey + '  |  _) \\ \\/ / _` | ` ` \\',
      yellow + '|' + white + '#######' + yellow + '|' + grey + '  | |___ }  { (_| | | | |',
      yellow + '|' + white + '#######' + yellow + '|' + grey + '  |_____/_/\\_\\__,_|_|_|_|',
      yellow + ' """""""',
      base
    ];
    stream.write(art.join('\n'));
  },

  skip: function () {
   stream.write(yellow + dot + base);
  },

  stub: function () {
    stream.write(cyan + dot + base);
  },

  pass: function () {
    stream.write(green + dot + base);
  },

  fail: function () {
    stream.write(ex + base);
  },

  timestamp: function () {
    var date = new Date();
    stream.write(grey + date.toISOString().replace(/[A-Z]/g, ' ') + base + '\n\n');
  },

  run: function (run, data) {
    var options = process._EXAM_OPTIONS;
    var slow = run.slowTime;
    var slower = run.verySlowTime;
    var dive = function (node, depth) {
      var indent = Array(depth + 1).join('  ');
      var error, name, suite;
      var skip = node.skip || (data.hasOnly && !node.only && !node.hasOnly);
      var stub = node.stub;
      if (node.name) {
        error = node.error;
        if (error) {
          name = node.name;
          suite = node.parent;
          while (suite && suite.name) {
            name = suite.name + ' ' + name;
            suite = suite.parent;
          }
          (data.errors = data.errors || []).push(name + '\n' + formatStack(error));
        }
        if (node.isSuite && !(skip && data.hasOnly)) {
          data.output += (depth ? '' : '\n') + indent + base + node.name + '\n';
        }
        else if (!node.isSuite) {
          error = node.error;
          var time;
          var extra = '';
          var bullet;
          if (skip) {
            bullet = yellow + star;
            data.skipped++;
            if (data.hasOnly) {
              return;
            }
          }
          else if (error) {
            bullet = ex;
            name = node.name;
            suite = node.parent;
            while (suite && suite.name) {
              name = suite.name + ' ' + name;
              suite = suite.parent;
            }
            var results = node.results;
            if (results) {
              results.forEach(function (result) {
                if (result.message) {
                  extra += '\n  ' + indent + red + arrow + ' ' + result.message;
                }
                else {
                  extra += '\n  ' + indent + green + arrow + ' ' + result;
                }
              });
            }
          }
          else if (stub) {
            data.stubbed++;
            bullet = todo;
          }
          else {
            data.passed++;
            bullet = check + grey;
            time = node.time;
          }
          data.output += indent + bullet + ' ' + node.name;
          if (time > options.slow) {
            data.output += yellow + ' (' + time + 'ms)';
          }
          else if (time > options.verySlow) {
            data.output += red + ' (' + time + 'ms)';
          }
          data.output += extra + base + '\n';
        }
      }
      if (node.children) {
        node.children.forEach(function (child) {
          dive(child, depth + 1);
        });
      }
    };
    dive(run, -1);
    return data;
  },

  all: function (data) {
    var output = '\n' + data.outputs.join('');
    var errors = data.errors;
    if (errors) {
      errors.forEach(function (error, index) {
        output += '\n' + base + (1 + index) + ') ' + error + '\n';
      });
    }
    var time = grey + '(' + data.elapsed + 'ms)' + base;
    output += '\n' + green + data.passed + ' passed ' + time;
    if (data.failed) {
      output += '\n' + red + data.failed + ' failed';
    }
    if (data.skipped) {
      output += '\n' + yellow + data.skipped + ' skipped';
    }
    if (data.stubbed) {
      output += '\n' + cyan + data.stubbed + ' stubbed';
    }
    var indent = '  \n';
    stream.write(output + base + '\n\n');
    return output;
  }

};

function formatStack(stack) {
  var linesBefore = 4;
  stack = stack.replace(
    stackPattern,
    function (match, start, path, file, line, char, end) {
      var message = '\n     ' + (start || '(') + cyan + './' + path +
        base + file + cyan + ':' +
        base + line + cyan + ':' +
        green + char + red + (end || ')');
      if (linesBefore >= 0) {
        var lineNumber = line * 1; // 1-indexed
        var lines = '';
        try {
          lines += fs.readFileSync(cwd + '/' + path + file);
        }
        catch (e) {
        }
        lines = lines.split('\n');
        message += grey;
        start = Math.max(1, lineNumber - linesBefore);
        end = Math.min(lines.length, lineNumber + Math.round(linesBefore / 2));
        var numberLength = ('' + end).length;
        for (var i = start; i <= end; i++) {
          line = lines[i - 1];
          var indent = '       ';
          var pipe = '| ';
          if (i == lineNumber) {
            char--;
            line = line.substr(0, char) + green + line.substr(char) + grey;
            indent = grey + '     ' + arrow + ' ' + base;
            pipe = grey + pipe + base;
          }
          var n = '' + i;
          n = Array(numberLength - n.length + 1).join(' ') + n;
          message += '\n' + indent + n + pipe + line.replace('\t', '  ');
        }
        message += red;
        linesBefore--;
      }
      return message;
    }
  ).replace(/\n +at /g, '\n     ');
  return '   ' + red + stack + base;
}
