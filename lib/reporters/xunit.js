var doNothing = function () {};
var stream = process.stdout;
var time;
var replacements = {
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
  '&': '&amp;'
};
var esc = function (text) {
  return text.replace(/[<&>"]/g, function (match) {
    return replacements[match];
  });
};

module.exports = {

  start: function () {
    time = new Date();
  },

  skip: doNothing,
  stub: doNothing,
  pass: doNothing,
  fail: doNothing,
  timestamp: doNothing,

  run: function (run, data) {
    var dive = function (node) {
      if (node.name) {
        var error = node.error;
        var shouldShow = error || !node.isSuite;
        if (shouldShow) {
          data[error ? 'failed' : 'passed']++;
          var name;
          var suite = node.parent;
          while (suite && suite.name) {
            name = suite.name + (name ? ' ' + name : '');
            suite = suite.parent;
          }
          var time = new Date();
          data.output += '<testcase ' +
            'classname="' + esc(name) + '" ' +
            'name="' + esc(node.name) + '" ' +
            'time="' + (node.time / 1e3) + '"';
          if (error) {
            var message = error.replace(/\n[\S\s]+/, '');
            data.output += ' message="' + esc(message) + '">' +
              '<failure ' +
                'classname="' + esc(name) + '" ' +
                'name="' + esc(node.name) + '" ' +
                'time="' + (node.time / 1e3) + '" ' +
                'message="' + esc(message) + '">' +
                '<![CDATA[' + esc(error) + ']]>' +
                '</failure></testcase>\n';
          }
          else {
            data.output += '/>\n';
          }
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
    stream.write(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<testsuite name="Exam" ' +
        'tests="' + (data.passed + data.failed) + '" ' +
        'failures="' + data.failed + '" ' +
        // TODO: Report individual errors.
        'errors="' + data.failed + '" ' +
        'skipped="0" ' +
        'timestamp="' + (new Date()).toUTCString() + '" ' +
        'time="' + (data.elapsed / 1e3) + '">\n');
    stream.write(data.outputs.join(''));
    stream.write('</testsuite>\n');
  }

};
