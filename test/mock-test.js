var a = [];
var t = require('timers');

describe('mock', function () {

  it('mocks and unmocks properties that exist', function () {
    mock(console, {
      log: mock.concat()
    });
    console.log('hello');
    is(console.log.value, 'hello');
    unmock(console);
  });

  it('mocks and unmocks properties that do not exist', function () {
    mock(console, {
      blah: mock.concat()
    });
    console.blah('hello');
    is(console.blah.value, 'hello');
    unmock(console);
    is.undefined(console.blah);
  });

  it('mocks and unmocks prototype properties', function () {
    Array.prototype.something = function () {};
    mock(a, {
      something: mock.count()
    });
    a.something();
    is(a.something.value, 1);
    unmock(a);
  });

  it('mocks again', function () {
    mock(a, {
      join: mock.count()
    });
    mock(a, {
      push: mock.count()
    });
    a.join();
    a.push();
    is(a.join.value, 1);
    is(a.push.value, 1);
    unmock(a);
  });

  it('ignores duplicate unmocking', function () {
    mock(a, {
      join: mock.count()
    });
    unmock(a);
    unmock(a);
  });

  it('ignores unnecessary unmocking', function () {
    unmock({});
  });

  describe('.count', function () {

    it('counts calls', function () {
      mock(a, {
        join: mock.count()
      });
      is(a.join.value, 0);
      a.join();
      is(a.join.value, 1);
      a.join();
      is(a.join.value, 2);
      unmock(a);
    });

  });

  describe('.concat', function () {

    it('concatenates strings', function () {
      mock(a, {
        join: mock.count()
      });
      is(a.join.value, 0);
      a.join();
      is(a.join.value, 1);
      a.join();
      is(a.join.value, 2);
      unmock(a);
    });

    it('supports delimiters', function () {
      mock(a, {
        push: mock.concat(',')
      });
      is(a.push.value, '');
      a.push(1);
      is(a.push.value, '1');
      a.push(2);
      is(a.push.value, '1,2');
      a.push(3);
      is(a.push.value, '1,2,3');
      unmock(a);
    });

  });

  describe('.args', function () {

    xit('stores arguments', function () {
      mock(a, {
        push: mock.args()
      });
      a.push(1);
      is.same(a.push.value, [{0:1}]);
      a.push(2);
      is.same(a.push.value, [{0: 1}, {0: 2}]);
      a.push(1, 2);
      is.same(a.push.value, [{0: 1}, {0: 2}, {0: 1, 1: 2}]);
      unmock(a);
    });

    it('stores indexed arguments', function () {
      mock(a, {
        push: mock.args(0)
      });
      a.push(1);
      is.same(a.push.value, [1]);
      a.push(2);
      is.same(a.push.value, [1, 2]);
      a.push(1, 2);
      is.same(a.push.value, [1, 2, 1]);
      unmock(a);
    });

  });

  describe('.fs', function () {

    afterEach(unmock.fs);

    it('creates files and directories', function (done) {
      var fs = mock.fs({'/tmp/file.txt': 'FILE_CONTENT'});
      fs.readFile('/tmp/file.txt', function (err, content) {
        is(content.toString(), 'FILE_CONTENT');
        done();
      });
    });

    it('can be unmocked', function (done) {
      var fs = mock.fs({'/tmp/file.txt': 'FILE_CONTENT'});
      var content = fs.readFileSync('/tmp/file.txt');
      is(content.toString(), 'FILE_CONTENT');
      unmock.fs();
      try {
        fs.readFileSync('/tmp/file.txt');
      }
      catch (error) {
        done();
      }
    });

    it('can leave Node\'s built-in fs alone', function (done) {
      var fs = require('fs');
      mock.fs({'a.txt': 'A'}, true);
      fs.readFile('a.txt', function (err) {
        is.error(err);
        done();
      });
    });

  });

  describe('.file', function () {

    afterEach(unmock.fs);

    it('creates a file', function () {
      var fs = mock.fs({
        'gid.txt': mock.file({
          content: 'GROUP:1234',
          gid: 1234
        })
      });
      var stat = fs.statSync('gid.txt');
      is(stat.gid, 1234);
    });

  });

  describe('.time', function () {

    it('freezes time', function () {
      var time = 1412637494591;
      mock.time(time);
      var date = new Date();
      is.defined(date._INNER_DATE);
      is(date.getTime(), time);
      unmock.time();
    });

    it('unfreezes time', function () {
      var start = Date.now();
      var time = 1412637494591;
      is.greater(start, time);
      mock.time(time);
      is(Date.now(), time);
      unmock.time();
      is.not(Date.now(), time);
      is.lessOrEqual(Date.now() - start, 9);
    });

    describe('.add', function () {

      it('adds time', function () {
        var time = 1412637494591;
        mock.time(time);
        is(Date.now(), time);

        mock.time.add('5 milliseconds');
        is(Date.now(), time += 5);

        mock.time.add('1 second');
        is(Date.now(), time += 1e3);

        mock.time.add('10 minutes');
        is(Date.now(), time += 6e5);

        mock.time.add('2 hours');
        is(Date.now(), time += 72e5);

        mock.time.add('1 day');
        is(Date.now(), time += 864e5);

        unmock.time();
      });

    });

    describe('.speed', function () {

      it('speeds mock time', function (done) {

        var time = 1412637494591;
        var speed = 99;
        mock.time(time);
        mock.time.speed(speed);
        function check() {
          setImmediate(function () {
            var elapsed = Date.now() - time;
            if (elapsed) {
              is(elapsed % speed, 0);
              unmock.time();
              done();
            }
            else {
              check();
            }
          });
        }
        check();
      });

    });

  });

});
