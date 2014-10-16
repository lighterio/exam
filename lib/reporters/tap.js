var doNothing = function () {};
var stream = process.stdout;

module.exports = {

  start: doNothing,
  skip: doNothing,
  stub: doNothing,
  pass: doNothing,
  fail: doNothing,
  timestamp: doNothing,

  run: function (run, data) {
    data.output = [];
    var dive = function (node) {
      if (node.name) {
        var error = node.error;
        var shouldShow = error || !node.isSuite;
        if (shouldShow) {
          data[error ? 'failed' : 'passed']++;
          var name = node.name;
          var suite = node.parent;
          while (suite && suite.name) {
            name = suite.name + ' ' + name;
            suite = suite.parent;
          }
          name = name.replace(/\n/g, ' ');
          data.output.push(name + (error ? '\n' + error : ''));
        }
      }
      if (node.children) {
        node.children.forEach(dive);
      }
    };
    dive(run);
    return data;
  },

  all: function (data) {
    var lines = [];
    data.outputs.forEach(function (output) {
      output.forEach(function (line) {
        lines.push(line);
      });
    });
    stream.write(1 + '...' + lines.length + '\n');
    lines.forEach(function (line, index) {
      var text = line.replace(/\n/g, '\n  ');
      var prefix = text.length > line.length ? 'not ok ' : 'ok ';
      stream.write(prefix + (index + 1) + ' ' + text + '\n');
    });
    stream.write('# tests ' + lines.length + '\n');
    stream.write('# pass ' + data.passed + '\n');
    stream.write('# fail ' + data.failed + '\n');
  }

};
