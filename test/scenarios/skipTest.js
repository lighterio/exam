describe('skipTest', function () {

  it('runs this test', function () {
    is.pass('ran an only test')
  })

  it.skip('skips this test', function () {
    is.fail('ran a skipped test')
  })

  it('stubs this test')

})
