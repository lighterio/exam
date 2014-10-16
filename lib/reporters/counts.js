var doNothing = function () {};
var stream = process.stdout;

module.exports = {

  stream: process.stdout,
  start: doNothing,
  skip: doNothing,
  stub: doNothing,
  pass: doNothing,
  fail: doNothing,
  timestamp: doNothing,

  run: function (run) {
    var output = [];
    var passed = 0;
    var failed = [];
    var dive = function (node) {
      if (node.name) {
        if (node.error) {
          failed.push(1);
        }
        else {
          passed++;
        }
      }
      else {
        node.children.forEach(function (child) {
          dive(child);
        });
      }
    };
    dive(run);

    return {
      output: [],
      passed: passed,
      failed: failed,
      hasOnly: run.hasOnly,
      skipped: run.skipped,
      stubbed: run.stubbed
    };
  },

  all: function (outputs, passed, failed, skipped, stubbed, time) {

    var data = {
      passed: passed,
      failed: failed.length,
      skipped: skipped || 0,
      stubbed: stubbed || 0
    };

    data.total = data.passed + data.failed + data.skipped + data.stubbed;

    var json = JSON.stringify(data);

    stream.write(json + '\n');
  }

};
