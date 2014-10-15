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

  run: function (run) {
    var output = [];
    var passed = 0;
    var failed = run.failed;
    var hasOnly = run.hasOnly;
    var skipped = 0;
    var stubbed = 0;
    var slow = run.slowTime;
    var slower = run.slowerTime;
    var append = function (node, depth) {
      var indent = Array(depth + 1).join('  ');
      var children = node.children;
      var error, title, suite;
      var skip = node.skip || (hasOnly && !node.only && !node.hasOnly);
      var stub = node.stub;
      if (node.name) {
        error = node.error;
        var time = node.time;
        var extra = [];
        var bullet;
        if (skip) {
          bullet = yellow + star;
          skipped++;
          if (hasOnly) {
            return;
          }
        }
        else if (error) {
          bullet = ex;
          title = node.name;
          suite = node.parent;
          while (suite && suite.title) {
            title = suite.title + ' ' + title;
            suite = suite.parent;
          }
          var errors = [];
          var results = node.results;
          if (results.length) {
            results.forEach(function (result) {
              if (result.message) {
                errors.push(result);
                extra += '\n  ' + indent + red + arrow + ' ' + result.message;
              }
              else {
                extra += '\n  ' + indent + green + arrow + ' ' + grey + result;
              }
            });
          }
          else {
            errors.push(error);
          }
          failed.push({title: title, errors: errors});
        }
        else if (stub) {
          stubbed++;
          bullet = todo;
        }
        else {
          passed++;
          bullet = check + grey;
        }
        output += indent + bullet + ' ' + node.name;
        if (time > slower) {
          output += red + ' (' + time + 'ms)';
        }
        else if (time > slow) {
          output += yellow + ' (' + time + 'ms)';
        }
        output += extra + base + '\n';
      }
      else {
        if (node.title && !(skip && hasOnly)) {
          output += (depth ? '' : '\n') + indent + base + node.title + '\n';
          error = node.error;
          if (error) {
            output += indent + '  ' + ex + ' ' + error + '\n';
            title = node.title;
            suite = node.parent;
            while (suite && suite.title) {
              title = suite.title + ' ' + title;
              suite = suite.parent;
            }
            failed.push({title: title, errors: [error]});
          }
        }
        children.forEach(function (child) {
          append(child, depth + 1);
        });
      }
    };
    append(run, -1);
    return {
      output: output,
      passed: passed,
      failed: failed,
      hasOnly: hasOnly,
      skipped: skipped,
      stubbed: stubbed
    };
  },

  all: function (outputs, passed, failed, skipped, stubbed, time) {
    var output = '\n' + outputs.join('');
    failed.forEach(function (failure, index) {
      var title = base + (1 + index) + ') ' + failure.title;
      var errors = [];
      failure.errors.forEach(function (error) {
        errors.push(formatTrace(error.trace || error.message || ('' + error)));
      });
      output += '\n' + title + '\n' + errors.join('\n') + '\n';
    });
    time = new Date() - time;
    time = grey + '(' + time + 'ms)' + base;
    output += '\n' + green + passed + ' passed ' + time;
    if (failed.length) {
      output += '\n' + red + failed.length + ' failed';
    }
    if (skipped) {
      output += '\n' + yellow + skipped + ' skipped';
    }
    if (stubbed) {
      output += '\n' + cyan + stubbed + ' stubbed';
    }
    var indent = '  \n';
    stream.write(output + base + '\n\n');
    return output;
  }

};

function formatTrace(trace) {
  var linesBefore = 4;
  trace = trace.replace(
    stackPattern,
    function (match, start, path, file, line, char, end) {
      var message = '\n     ' + start + cyan + './' + path +
        base + file + cyan + ':' +
        base + line + cyan + ':' +
        green + char + red + end;
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
  return '   ' + red + trace + base;
}
