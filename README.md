# Exam

[![NPM Version](https://badge.fury.io/js/exam.png)](http://badge.fury.io/js/exam)
[![Build Status](https://travis-ci.org/zerious/exam.png?branch=master)](https://travis-ci.org/zerious/exam)
[![Code Coverage](https://coveralls.io/repos/zerious/exam/badge.png?branch=master)](https://coveralls.io/r/zerious/exam)
[![Dependencies](https://david-dm.org/zerious/exam.png?theme=shields.io)](https://david-dm.org/zerious/exam)
[![Support](http://img.shields.io/gittip/zerious.png)](https://www.gittip.com/zerious/)

Exam is a Node.js test runner with a default assertion library included. It
forks processes to distribute the test load across cores, because your time is
important.

## Quick Start

Install `exam` globally.
```bash
npm i -g exam
```

Make your test directory.
```
cd myapp
mkdir test
```

Write some tests...
```javascript
describe("Array", function () {
  var a = [1,2,3];
  describe('#indexOf()', function () {
    it("returns -1 when a value isn't found", function () {
      is(a.indexOf(5), -1);
      is(a.indexOf(0), -1);
      is(a.indexOf(-1), -1);
    });
    it("returns an index when a value is", function () {
      is(a.indexOf(1), 0);
      is(a.indexOf(2), 1);
      is(a.indexOf(3), 1);
    });
  });
});
```
Run tests.
```bash
exam
```

## Test structure

Exam exposes global functions which you can use in your tests.

* `describe(title, fn)` runs `fn` as a suite of tests.
* `it(does, fn)` runs `fn` to test what something does.
* `is(actual, expected)` asserts equality.
* `before(fn)` runs `fn` before a suite.
* `beforeEach(fn)` runs `fn` before each test in a suite.
* `after(fn)` runs `fn` after a suite.
* `afterEach(fn)` runs `fn` after each test in a suite.

## Assertions

You can use exam's `is` assertion library, or any other assertion library you want.

## is
The `is` object contains chainable assertion methods. For example:

```
var a = [1, 2, 3];
is
  .array(a)
  .same(a, [1,2,3])
  .number(a[0])
  .is(a[0], true)
  .tis(a[0], 1)
  .greater(a[2], a[1])
  .false(a[0] == a[1])
  .truey(a[0])
  .truey(a)

```

* `is(actual, expected)` or `is.is(actual, expected)` asserts `actual == expected`.
* `is.not(actual, expected)` asserts `actual != expected`.
* `is.tis(actual, expected)` asserts `actual === expected`.
* `is.tisNot(actual, expected)` asserts `actual !== expected`.
* `is.same(actual, expected)` asserts `stringify(actual) == stringify(expected)`.
* `is.notSame(actual, expected)` asserts `stringify(actual) != stringify(expected)`.
* `is.truey(value)` asserts `!!value`.
* `is.falsey(value)` asserts `!value`.
* `is.fail()` throws an Error.

```

<!--children|waits|timeout|slowTime|slowerTime|report-->
