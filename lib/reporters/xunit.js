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

  run: function (run) {
    var output = '';
    var passed = 0;
    var failed = [];
    var dive = function (node) {
      if (node.name) {
        var title;
        var suite = node.parent;
        while (suite && suite.title) {
          title = suite.title + (title ? ' ' + title : '');
          suite = suite.parent;
        }
        var time = new Date();
        output += '<testcase ' +
          'classname="' + esc(title) + '" ' +
          'name="' + esc(node.name) + '" ' +
          'time="' + (node.time / 1e3) + '"';
        var err = node.error;
        if (err) {
          failed.push(err);
          output += ' message="' + esc(err.message) + '">' +
            '<failure ' +
              'classname="' + esc(title) + '" ' +
              'name="' + esc(node.name) + '" ' +
              'time="' + (node.time / 1e3) + '" ' +
              'message="' + esc(err.message) + '">' +
              '<![CDATA[' + esc(err.trace) + ']]>' +
              '</failure></testcase>\n';
        }
        else {
          output += '/>\n';
          passed++;
        }
      }
      else {
        node.children.forEach(function (child) {
          dive(child);
        });
      }
    };
    run.failed.forEach(function (fail) {
      var error = fail.errors[0];
      if (error) {
        output += '<testcase ' +
          'classname="' + esc(fail.title) + '" ' +
          'name="compile" ' +
          'time="0" ' +
          'message="' + esc(error.message) + '">' +
          '<failure ' +
            'classname="' + esc(fail.title) + '" ' +
            'name="compile" ' +
            'time="0" ' +
            'message="' + esc(error.message) + '">' +
            '<![CDATA[' + esc(error.trace) + ']]>' +
            '</failure></testcase>\n';
        failed.push(error);
      }
    });
    dive(run);
    return {
      output: output,
      passed: passed,
      failed: failed,
      only: run.hasOnly,
      skipped: run.skipped
    };
  },

  all: function (outputs, passed, failed, skipped, stubbed, time) {
    stream.write(
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<testsuite name="Exam" ' +
        'tests="' + (passed + failed.length) + '" ' +
        'failures="' + failed.length + '" ' +
        'errors="' + failed.length + '" ' +
        'skipped="0" ' +
        'timestamp="' + (new Date()).toUTCString() + '" ' +
        'time="' + ((new Date() - time) / 1e3) + '">\n');
    stream.write(outputs.join(''));
    stream.write('</testsuite>\n');
  }

};
