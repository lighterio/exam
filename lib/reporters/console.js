var base = '\u001b[39m';
var green = '\u001b[32m';
var red = '\u001b[31m';
var yellow = '\u001b[33m';
var grey = '\u001b[90m';
var check = green + '\u2714';
var ex = red + '\u2716';
var arrow = '\u279C';

module.exports = {

  start: function () {},

  pass: function () {
    process.stdout.write('.');
  },

  fail: function () {
    process.stdout.write(ex + base);
  },

  file: function (exam) {
    try {
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
          while (suite) {
            title = suite.title + ' ' + title;
            suite = suite.suite;
          }
          var errors = [];
          var results = node.results;
          if (results.length) {
            results.forEach(function (result) {
              if (result instanceof Error) {
                errors.push(result);
                extra += '\n  ' + indent + red + arrow + ' ' + result.message + grey;
              }
              else {
                extra += '\n  ' + indent + arrow + ' ' + result;
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

    }
    catch (e) {
      console.error(e);
    }
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
        var stack = error.trace || error.message;
        var text = '   ' + red + stack.replace(/\n/, grey + '\n');
        errors.push(text);
      });
      output += '\n\n' + title + '\n' + errors.join('\n\n');
    });
    console.log(output + base + '\n');
    return output;
  }

};
