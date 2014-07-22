describe('is', function () {

  it('is a function', function () {
    is.function(is);
  });

  describe('.is', function () {
    it('tests equality', function () {
      is(1, 1);
    });
    it('is not strict', function () {
      is('1', 1);
    });
  });

});
