var base = '\u001b[39m';
var green = '\u001b[32m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var cyan = '\u001b[36m';
var grey = '\u001b[90m';

var isWin32 = (process.platform == 'win32');
var check = green + (isWin32 ? '\u221A' : '\u2714');
var ex = red + (isWin32 ? '\u00D7' : '\u2716');
var arrow = (isWin32 ? '\u2192' : '\u279C');

var stream = process.stdout;

var fs = require('fs');
var cwd = process.cwd();
var specialPattern = /(\.\?\*\+\(\)\[\]\{\}\\)/g;
var escCwd = cwd.replace(specialPattern, '\\$1') + '/';
var stackPattern = new RegExp(
  '\n +at ([^\n]*)' + escCwd + '([^:\n]*?)([^\\/:]+):([0-9]+):([0-9]+)([^\n]*)',
  'g'
);

function getTrace(trace) {
  var before = 4;
  trace = trace.replace(
    stackPattern,
    function (match, start, path, file, line, char, end) {
      var message = '\n     ' + start + cyan + path +
        base + file + cyan + ':' +
        base + line + cyan + ':' +
        green + char + red + end;
      if (before >= 0) {
        var lineNumber = line * 1; // 1-indexed
        var lines;
        try {
          lines = fs.readFileSync(cwd + '/' + path + file);
          lines = ('' + lines).split('\n');
        }
        catch (e) {
          message += e;
          lines = [];
        }
        message += grey;
        start = Math.max(1, lineNumber - before);
        end = Math.min(lines.length, lineNumber + (before ? 1 : 0));
        message += '!' + lines.length + '!' + start + '!' + end;
        var numberLength = ('' + end).length;
        for (var i = start; i <= end; i++) {
          line = lines[i - 1];
          var indent = '       ';
          var pipe = '| ';
          if (i == lineNumber) {
            char--;
            line = line.substr(0, char) + green + line.substr(char) + grey;
            indent = grey + '     \u279C ' + base;
            pipe = grey + pipe + base;
          }
          var n = '' + i;
          n = Array(n.length - numberLength + 1).join(' ') + n;
          message += '\n' + indent + n + pipe + line.replace('\t', '  ');
        }
        message += red;
        before--;
      }
      return message;
    }
  ).replace(/\n +at /g, '\n     ');
  return '   ' + red + trace + base;
}


module.exports = {

  start: function () {
    var art = ['',
      ' _____',
      '| ____)_  __ _ _ _ _ _',
      '|  _) \\ \\/ / _` | ` ` \\',
      '| |___ }  { (_| | | | |',
      '|_____/_/\\_\\__,_|_|_|_|',
      '', ''
    ];
    stream.write(art.join('\n'));
  },

  pass: function () {
    stream.write(grey + '.' + base);
  },

  fail: function () {
    stream.write(ex + base);
  },

  run: function (run) {
    var output = [];
    var passed = 0;
    var failed = run.failed;
    var slow = run.slowTime;
    var slower = run.slowerTime;
    var append = function (node, depth) {
      var indent = Array(depth + 1).join('  ');
      var children = node.children;
      var error, title, suite;
      if (node.does) {
        error = node.error;
        var time = node.time;
        var extra = [];
        if (error) {
          title = node.does;
          suite = node.suite;
          while (suite && suite.title) {
            title = suite.title + ' ' + title;
            suite = suite.suite;
          }
          var errors = [];
          var results = node.results;
          if (results.length) {
            results.forEach(function (result) {
              if (result.message) {
                errors.push(result);
                extra += '\n  ' + indent + red + arrow + ' ' + base + result.message;
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
        else {
          passed++;
        }
        output += (error ? indent + ex : indent + check + grey) + ' ' + node.does;
        if (time > slower) {
          output += red + ' (' + time + 'ms)';
        }
        else if (time > slow) {
          output += yellow + ' (' + time + 'ms)';
        }
        output += extra + base + '\n';
      }
      else {
        if (node.title) {
          output += (depth ? '' : '\n') + indent + base + node.title + '\n';
          error = node.error;
          if (error) {
            output += indent + '  ' + ex + ' ' + error + '\n';
            title = node.title;
            suite = node.suite;
            while (suite && suite.title) {
              title = suite.title + ' ' + title;
              suite = suite.suite;
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
    return [output, passed, failed];
  },

  all: function (outputs, passed, failed, time) {
    var output = '\n' + outputs.join('');
    time = new Date() - time;
    time = grey + '(' + time + 'ms)' + base;
    if (passed) {
      output += '\n' + green + passed + ' passed ' + time;
    }
    if (failed.length) {
      output += '\n' + red + failed.length + ' failed';
    }
    var indent = '  \n';
    failed.forEach(function (failure, index) {
      var title = base + (1 + index) + ') ' + failure.title;
      var errors = [];
      failure.errors.forEach(function (error) {
        errors.push(getTrace(error.trace || error.message || ('' + error)));
      });
      output += '\n\n' + title + '\n' + errors.join('\n');
    });
    stream.write(output + base + '\n\n');
    return output;
  }

};
