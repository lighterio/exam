describe('fail', function () {
  it('fails', function () {
    // The directory this file is in should have been ignored.
    throw new Error("I'm not even supposed to be here today.")
  })

})
