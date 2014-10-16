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

  run: function (run, data) {
    var dive = function (node) {
      if (node.error) {
        data.failed++;
      }
      else if (!node.isSuite) {
        data.passed++;
      }
      if (node.children) {
        node.children.forEach(function (child) {
          dive(child);
        });
      }
    };
    dive(run);
    return data;
  },

  all: function (data) {

    data = {
      passed: data.passed,
      failed: data.failed,
      skipped: data.skipped,
      stubbed: data.stubbed
    };

    data.total = data.passed + data.failed + data.skipped + data.stubbed;

    var json = JSON.stringify(data);

    stream.write(json + '\n');
  }

};
