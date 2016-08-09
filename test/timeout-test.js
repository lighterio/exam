describe('timeout', function () {
  this.timeout(10)
  it('cascades', function (done) {
    is(this.timeLimit, 10)
    this.timeout(20)
    is(this.timeLimit, 20)
    setTimeout(done, 15)
  })
})
