describe('errorTest', function () {
  it('fails deeply', function () {
    (function () {
      (function () {
        (function () {
          (function () {
            is(1, 2)
          })()
        })()
      })()
    })()
  })
  it('calls done twice', function (done) {
    done()
    done()
  })
  describe('suite', function () {
    thisWillThrowAnError()
  })
})
