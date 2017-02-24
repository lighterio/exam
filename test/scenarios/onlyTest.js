describe('onlyTest', function () {
  it.skip('skips this test', function () {
    is.fail('ran a skipped test')
  })

  it.only('runs the test', function () {
    is.pass('ran the only test')
  })

  it.only('runs "another only test"', function () {
    is.pass('ran the "other only test"')
  })

  it('should have a stubbed test')
})
