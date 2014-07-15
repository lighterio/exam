var cluster = require('cluster');
var assert = require('assert-plus');

describe('cluster', function () {
  it('forks processes', function () {
    assert.equal(cluster.isMaster, false);
  });
});
