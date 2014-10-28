var fs = require('fs');

var base, green, red, yellow, cyan, grey, white;
var dot, ex, arrow, bullets;
var bold, normal;

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
    bold = color ? '\u001b[1m' : '';
    normal = color ? '\u001b[22m' : '';
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
          title = parent.name + (title[0] == '.' ? '' : ' ') + title;
          parent = parent.parent;
        }
        title = boldify(title).replace(/([^\.])$/, '$1' + grey + '.' + base);
        (data.errors = data.errors || []).push(title + '\n' + formatStack(error));
      }
      if (name) {
        if (children) {
          if (!hide) {
            data.output += indent + base + boldify(name);
          }
        }
        else {
          var time = node.time;
          var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : time < 0 ? 'skipped' : 'passed';
          data[key]++;
          if (!hide) {
            data.output += indent + bullets[key] + boldify(name);
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
        output += '\n\n' + base + (index + 1) + grey + ') ' + base + error;
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
  var dirs = [[process.cwd(), '.'], [process.env.HOME, '~']];
  var linesBefore = 5;
  stack = stack.replace(/(\n + at )/, grey + '$1');
  stack = stack.replace(
    /\n +at ([^:\n]+ \(|)(\/[^:]+\/)([^\/:]+):(\d+):(\d+)(\)?)/g,
    function (match, start, path, file, line, char, end) {
      var shortPath = path;
      for (var i = 0; i < 2; i++) {
        var dir = dirs[i];
        if (dir[0] && (path.indexOf(dir[0]) === 0)) {
          shortPath = dir[1] + path.substr(dir[0].length);
          break;
        }
      }
      var message = '\n    at ' + (start || '(') +
        cyan + shortPath +
        yellow + file + grey + ':' +
        base + line + grey + ':' +
        green + char + grey + (end || ')');
      if (linesBefore >= 1) {
        var lineNumber = line * 1; // 1-indexed
        var lines = '';
        try {
          lines += fs.readFileSync(path + file);
        }
        catch (e) {
        }
        lines = lines.split('\n');
        message += grey;
        start = Math.max(1, lineNumber - linesBefore);
        end = Math.min(lines.length, lineNumber + Math.round(linesBefore / 2));
        var numberLength = ('' + end).length;
        for (i = start; i <= end; i++) {
          line = lines[i - 1];
          var indent = '         ';
          var pipe = '| ';
          if (i == lineNumber) {
            char--;
            line = line.substr(0, char) + green + line.substr(char).replace(/(;?$)/, grey + '$1');
            indent = '       ' + base + arrow;
            pipe = grey + pipe + base;
          }
          var n = '' + i;
          n = Array(numberLength - n.length + 1).join(' ') + n;
          message += '\n' + indent + n + pipe + line.replace('\t', '  ');
        }
        linesBefore -= 2;
      }
      return message;
    }
  );
  stack = stack.replace(/(\n +at )(\S+ )/g, '$1' + base + '$2' + grey);
  return '   ' + red + stack + base;
}

function boldify(text) {
  return text.replace(/(`\S+.*?\S+`|\S+\.\S+)/g, function (text) {
    if (text[0] == '`') {
      text = text.substr(1, text.length - 2);
    }
    return bold + text + normal;
  });
}