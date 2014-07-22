describe('CLI', function () {

  it('runs tests', function (done) {
    delete require.cache[require.resolve('../exam')];
    delete require.cache[require.resolve('../lib/reporters/console')];
    var dir = __dirname.replace(/test$/, 'unit');
    process.chdir(dir);
    process.on('exam:finished', done);
    process._EXAM_OPTIONS = {
      reporter: 'blackhole'
    };
    // TODO: Actually run some tests.
    done();
  });

});
