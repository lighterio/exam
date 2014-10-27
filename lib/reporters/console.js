var fs = require('fs');

var base, green, red, yellow, cyan, grey, white;
var dot, ex, arrow, bullets;

var cwd = process.cwd();
var specialPattern = /(\.\?\*\+\(\)\[\]\{\}\\)/g;
var escCwd = cwd.replace(specialPattern, '\\$1') + '/';
var stackPattern = new RegExp(
  '\n +at ([^\n]*)' + escCwd + '([^:\n]*?)([^\\/:]+):([0-9]+):([0-9]+)([^\n]*)',
  'g'
);

var consoleReporter = module.exports = {

  init: function (options) {
    var isWindows = (process.platform == 'win32');
    var color = !options.noColors;
    base = color ? '\u001b[39m' : '';
    green = color ? '\u001b[32m' : '';
    red = color ? '\u001b[31m' : '';
    yellow = color ? '\u001b[33m' : '';
    cyan = color ? '\u001b[36m' : '';
    grey = color ? '\u001b[90m' : '';
    white = color ? '\u001b[37m' : '';
    dot = (isWindows ? '.' : '\u00B7');
    ex = red + (isWindows ? '\u00D7' : '\u2716');
    arrow = (isWindows ? '\u2192' : '\u279C') + ' ';
    bullets = {
      passed: green + (isWindows ? '\u221A' : '\u2714') + ' ' + grey,
      failed: ex + ' ',
      skipped: yellow + (isWindows ? '*' : '\u272D') + ' ',
      stubbed: cyan + arrow
    };
  },

  start: function (options) {
    if (!base) {
      this.init(options);
    }
    if (!options.hideAscii) {
      var version = require('../../package.json').version;
      var art = [
        yellow + '  ' + grey + '  _',
        yellow + ' __' + grey + '(O)' + yellow + '__ ' + grey + '   _____           v' + version,
        yellow + '|' + white + '#' + grey + 'A***A' + white + '#' + yellow + '|' + grey + '  | ____)_  __ _ _ _ _ _',
        yellow + '|' + white + '#######' + yellow + '|' + grey + '  |  _) \\ \\/ / _` | ` ` \\',
        yellow + '|' + white + '#######' + yellow + '|' + grey + '  | |___ }  { (_| | | | |',
        yellow + '|' + white + '#######' + yellow + '|' + grey + '  |_____/_/\\_\\__,_|_|_|_|',
        yellow + ' """""""',
        base
      ];
      this.stream.write(art.join('\n'));
    }
  },

  skip: function () {
   this.stream.write(yellow + dot + base);
  },

  stub: function () {
    this.stream.write(cyan + dot + base);
  },

  pass: function () {
    this.stream.write(green + dot + base);
  },

  fail: function () {
    this.stream.write(ex + base);
  },

  timestamp: function () {
    var date = new Date();
    this.stream.write(grey + date.toISOString().replace(/[A-Z]/g, ' ') + base + '\n\n');
  },

  finishTree: function (run, data) {
    var options = run.options;
    if (!base) {
      this.init(options);
    }
    var hasOnly = data.hasOnly;
    var dive = function (node, indent) {
      var name = node.name;
      var stub = !node.fn;
      var skip = node.skip || (hasOnly && !node.only && !node.hasOnly);
      var hide = hasOnly && skip;
      var error = (stub || skip) ? '' : node.error;
      var children = node.children;
      var color = error ? red : skip ? yellow : stub ? cyan : children ? base : grey;
      if (error) {
        var results = node.results;
        var parent = node.parent;
        var title = name;
        while (parent && parent.name) {
          title = parent.name + (name[0] == '.' ? '' : ' ') + name;
          parent = parent.parent;
        }
        (data.errors = data.errors || []).push(title + '\n' + formatStack(error));
      }
      if (name) {
        if (children) {
          if (!hide) {
            data.output += indent + base + name;
          }
        }
        else {
          var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : 'passed';
          data[key]++;
          if (!hide) {
            var time = node.time;
            data.output += indent + bullets[key] + name;
            if (key == 'passed' && (time >= options.slow)) {
              data.output += (time >= options.verySlow ? red : yellow) + ' (' + time + 'ms)';
            }
            if (error && results) {
              results.forEach(function (result) {
                if (result.message) {
                  data.output += indent + '  ' + red + arrow + result.message;
                }
                else {
                  data.output += indent + '  ' + green + arrow + result;
                }
              });
            }
          }
        }
      }
      if (children) {
        indent = (indent ? (indent + '  ').replace(/\n\n/, '\n') : '\n\n');
        children.forEach(function (child) {
          dive(child, indent);
        });
      }
    };
    dive(run);
    return data;
  },

  finishExam: function (data) {
    var output = data.outputs.join('');
    var errors = data.errors;
    if (errors) {
      errors.forEach(function (error, index) {
        output += '\n\n' + base + (1 + index) + grey + ') ' + base + error;
      });
    }
    var time = grey + '(' + data.time + 'ms)' + base;
    output += '\n\n' + green + data.passed + ' passed ' + time;
    if (data.failed) {
      output += '\n' + red + data.failed + ' failed';
    }
    if (data.skipped) {
      output += '\n' + yellow + data.skipped + ' skipped';
    }
    if (data.stubbed) {
      output += '\n' + cyan + data.stubbed + ' stubbed';
    }
    output += base + '\n\n';
    this.stream.write(output);
    return output;
  }

};

function formatStack(stack) {
  var linesBefore = 8;
  stack = stack.replace(/(\n + at )/, grey + '$1');
  stack = stack.replace(
    stackPattern,
    function (match, start, path, file, line, char, end) {
      var message = '\n    at ' + (start || '(') + cyan + './' + path +
        yellow + file + grey + ':' +
        base + line + grey + ':' +
        green + char + grey + (end || ')');
      if (linesBefore >= 1) {
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
          var indent = '         ';
          var pipe = '| ';
          if (i == lineNumber) {
            char--;
            line = line.substr(0, char) + green + line.substr(char) + grey;
            indent = base + '       ' + arrow;
            pipe = grey + pipe + base;
          }
          var n = '' + i;
          n = Array(numberLength - n.length + 1).join(' ') + n;
          message += '\n' + indent + n + pipe + line.replace('\t', '  ');
        }
        linesBefore /= 2;
      }
      return message;
    }
  );
  return '   ' + red + stack + base;
}
