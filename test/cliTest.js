describe('CLI', function () {

  it('runs tests', function (done) {
    process.chdir(__dirname.replace(/test$/, 'unit'));
    /*
    require('../commands/exam-cli');
    setTimeout(done, 1e3);
    */
    done();
  });

});
