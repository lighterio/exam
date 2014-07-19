var base = '\u001b[39m';
var green = '\u001b[32m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var grey = '\u001b[90m';

var isWin32 = (process.platform == 'win32');
var check = green + (isWin32 ? '\u221A' : '\u2714');
var ex = red + (isWin32 ? '\u00D7' : '\u2716');
var arrow = (isWin32 ? '\u2192' : '\u279C');

module.exports = {

  start: function () {
    var art = [
      '',
      ' _____',
      '| ____)_  __ _ _ _ _ _',
      '|  _) \\ \\/ / _` | ` ` \\',
      '| |___ )  ( (_| | | | |',
      '|_____)_/\\_\\__,_|_|_|_|',
      ''
    ];
    console.log(art.join('\n'));
  },

  pass: function () {
    process.stdout.write(grey + '.' + base);
  },

  fail: function () {
    process.stdout.write(ex + base);
  },

  file: function (exam) {
    var output = [];
    var passed = 0;
    var failed = [];
    var slow = exam.slowTime;
    var slower = exam.slowerTime;
    var append = function (node, depth) {
      var indent = Array(depth + 1).join('  ');
      var children = node.children;
      if (node.does) {
        var err = node.error;
        var time = node.time;
        var extra = [];
        if (err) {
          var title = node.does;
          var suite = node.suite;
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
            errors.push(node.error);
          }
          failed.push({title: title, errors: errors});
        }
        else {
          passed++;
        }
        output += (err ? indent + ex : indent + check + grey) + ' ' + node.does;
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
        }
        children.forEach(function (child) {
          append(child, depth + 1);
        });
      }
    };
    append(exam, -1);
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
      var title = base + (1 + index) + '. ' + failure.title;
      var errors = [];
      failure.errors.forEach(function (error) {
        var stack = error.trace || error.message || error;
        var text = '   ' + red + stack.replace(/\n/, grey + '\n');
        errors.push(text);
      });
      output += '\n\n' + title + '\n' + errors.join('\n\n');
    });
    console.log(output + base + '\n');
    return output;
  }

};
