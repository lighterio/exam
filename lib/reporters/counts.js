var countsReporter = module.exports = {

  finishTree: function (run, data) {
    var hasOnly = data.hasOnly;
    var dive = function (node) {
      if (node.children) {
        node.children.forEach(function (child) {
          dive(child);
        });
      }
      else {
        var stub = !node.fn;
        var time = node.time;
        var skip = node.skip || (hasOnly && !node.only && !node.hasOnly) || isNaN(time);
        var error = (stub || skip) ? '' : node.error;
        var key = error ? 'failed' : skip ? 'skipped' : stub ? 'stubbed' : 'passed';
        data[key]++;
      }
    };
    dive(run);
    return data;
  },

  finishExam: function (data) {

    data = {
      passed: data.passed,
      failed: data.failed,
      skipped: data.skipped,
      stubbed: data.stubbed
    };

    data.total = data.passed + data.failed + data.skipped + data.stubbed;

    var json = JSON.stringify(data);

    this.stream.write(json + '\n');
  }

};
