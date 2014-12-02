# <a href="http://lighter.io/exam" style="font-size:40px;text-decoration:none;color:#000"><img src="https://cdn.rawgit.com/lighterio/lighter.io/master/public/exam.svg" style="width:90px;height:90px"> Exam</a>
[![NPM Version](https://img.shields.io/npm/v/exam.svg)](https://npmjs.org/package/exam)
[![Downloads](https://img.shields.io/npm/dm/exam.svg)](https://npmjs.org/package/exam)
[![Build Status](https://img.shields.io/travis/lighterio/exam.svg)](https://travis-ci.org/lighterio/exam)
[![Code Coverage](https://img.shields.io/coveralls/lighterio/exam/master.svg)](https://coveralls.io/r/lighterio/exam)
[![Dependencies](https://img.shields.io/david/lighterio/exam.svg)](https://david-dm.org/lighterio/exam)
[![Support](https://img.shields.io/gratipay/Lighter.io.svg)](https://gratipay.com/Lighter.io/)


## TL;DR

Exam is a JavaScript test runner, designed to be fast and easy.

### Powerful features
* A terse assertion library called `is` (or use your own).
* A fast mocking library called `mock` (or use your own).
* Tests can be distributed across CPUs for speed.
* Deferred alert/debug/trace.

### Quick Start

Install `exam`:
```bash
sudo npm install -g exam
```

Write some tests in `test/*`:
```js
var a = [1, 2, 3];
describe('Array.indexOf()', function () {
  it("returns -1 when a value isn't found", function () {
    is(a.indexOf(0), -1);
    is(a.indexOf(-1), -1);
  });
  it("returns an index when a value is found", function () {
    is(a.indexOf(1), 0);
    is(a.indexOf(2), 1);
  });
});
```

Run tests:
```bash
exam
```


## Test Functions

Exam exposes functions which you can use in your tests. By default, all of
these are available on the global scope. To keep global scope clean instead,
use the `--no-globals` or `-G` command line option.

### Suites and Tests

#### describe(title, fn)
Runs `fn` as a suite of tests.

#### ddescribe(title, fn)
Runs `fn` exclusively. Aliased as `describe.only`.

#### xdescribe(title, fn)
Sets up a suite but skips it. Aliased as `describe.skip`.

#### it(name, fn)
Runs `fn` as a test for the named functionality.

#### iit(name, fn)
Runs `fn` exclusively. Aliased as `it.only`.

#### xit(name, fn)
Sets up a test but skips it. Aliased as `it.skip`.

#### before(fn)
Runs `fn`** before a suite.

#### beforeEach(fn)
Runs `fn` before each test in a suite.

#### after(fn)
Runs `fn` after a suite.

#### afterEach(fn)
Runs `fn` after each test in a suite.

#### setup/teardown
Aliases for before/after.

### Assertions and Mocks

#### is(actual, expected)
Asserts equality.

#### mock(object, properties)
Temporarily decorates an object with values from a mock properties object.

#### unmock([object])
Restores the original properties of a mocked object (or all mocked objects).

### Logs

#### alert(arguments...)
Stores arguments to be logged after the test run finishes.

#### debug(arguments...)
Stores arguments to be logged after the test run finishes, if called from
within a failing test or suite.

#### trace(arguments...)
Stores arguments and a stack trace to be logged after the test run finishes,
if called from within a failing test or suite.


## Assertions

You can use exam's builtin `is` assertion library, or any other assertion
library that throws an AssertionError.

## is

You can also use `is` methods to make assertions:
```js
var a = [1, 2, 3];
is.array(a);
is.same(a, [1,2,3]);
is.number(a[0]);
is.is(a[0], 1);
```

Each `is` method also returns `is` so you can chain, if that's your thing:
```js
var a = [1, 2, 3];
is
  .array(a)
  .same(a, [1,2,3])
  .number(a[0])
  .is(a[0], 1)
```

### Comparisons

#### is(actual, expected)
The `is.is` function is also known simply as `is`, allowing a shorthand strict
equality assertion.
```js
var one = 1;
is(one, 1);   // No error.
is(one, '1'); // Throws an AssertionError.
```

It asserts that `actual` is equal to `expected`, and that they are of the same
type.

#### is.not(actual, expected)
Asserts that `actual` is not equal to `expected` (or that they are not of the
same type).

#### is.equal(actual, expected)
Asserts that `actual` is equal to `expected`, within JavaScript's dynamic type
system.

#### is.notEqual(actual, expected)
Asserts that `actual` is **not** equal to `expected`, within JavaScript's
dynamic type system.

#### is.same(actual, expected) *or* is.deepEqual(actual, expected)
Asserts that `actual` is "the same" as `expected`, meaning that their
stringified representations are equal.

#### is.notSame(actual, expected) *or* is.notDeepEqual(actual, expected)
Asserts that `actual` is **not** "the same" as `expected`, meaning that their
stringified representations are unequal.

#### is.greater(first, second)
Asserts that the `first` value is greater than the `second`.

#### is.less(first, second)
Asserts that the `first` value is less than the `second`.

#### is.greaterOrEqual(first, second)
Asserts that the `first` value is greater than or equal to the `second`.

#### is.lessOrEqual(first, second)
Asserts that the `first` value is less than or equal to the `second`.

### Strict Type Checks

#### is.type(value, expectedType)
Asserts that the value is of the expected type, expressed as a case-sensitive
string returned by `typeof`.

```js
var num = 1;
var one = '1'
is.type(num, 'number'); // No error.
is.type(one, 'number'); // Throws an AssertionError.
is.type(num, 'Number'); // Throws an AssertionError.
is.type(one, 'string'); // No error.
```

#### is.notType(value, expectedType)
Asserts that the value is **not** of the expected type, expressed as a
case-sensitive string returned by `typeof`.

#### is.null(value)
Asserts that the value is null. This is a strictly-typed assertion.

#### is.notNull(value)
Asserts that the value is **not** null. This is a strictly-typed assertion.

#### is.undefined(value)
Asserts that the value is undefined. This is a strictly-typed assertion.

#### is.notUndefined(value) *or* is.defined(value)
Asserts that the value is **not** undefined. This is a strictly-typed
assertion.

#### is.boolean(value)
Asserts that the value is a boolean. This is a strictly-typed assertion, so
truthy or falsy values which are not actually `true` or `false` will fail this
assertion.

#### is.notBoolean(value)
Asserts that the value is **not** a boolean. This is a strictly-typed, so
`true` and `false` are the only values that will fail this assertion.

#### is.number(value)
Asserts that the value is a number value. This is a strictly-typed assertion,
so strings with numeric values will fail this assertion.

#### is.notNumber(value)
Asserts that the value is a number value. This is a strictly-typed assertion,
so numeric values are the only values that will fail this assertion.

#### is.string(value)
Asserts that the value is a string. This is a strictly-typed assertion.

#### is.notString(value)
Asserts that the value is **not** a string. This is a strictly-typed assertion.

#### is.function(value)
Asserts that the value is a function. This is a strictly-typed assertion.

#### is.notFunction(value)
Asserts that the value is **not** a function. This is a strictly-typed
assertion.

#### is.object(value)
Asserts that the value is an object. This is a strictly-typed assertion.

#### is.notObject(value)
Asserts that the value is **not** an object. This is a strictly-typed
assertion.

### Value Checks

#### is.true(value)
Asserts that the value is the boolean value `true`.

#### is.notTrue(value)
Asserts that the value is **not** the boolean value `true`.

#### is.false(value)
Asserts that the value is the boolean value `false`.

#### is.notFalse(value)
Asserts that the value is **not** the boolean value `false`.

#### is.truthy(value)
Asserts that the value evaluates to **true**, meaning the value is either
`true`, a non-zero number, a non-empty string, a function, or a non-null object.

#### is.falsy(value)
Asserts that the value evaluates to **false**, meaning the value is either
`false`, `0` (zero), `""` (empty string), `null`, `undefined` or `NaN`.

#### is.nan(value)
Asserts that the value cannot be evaluated as a number. This includes anything
that is not a number, a string representation of a number, `null` (which
evaluates to zero), `false` (which evaluates to zero) or a `Date` object.

#### is.notNan(value)
Asserts that the value **can** be evaluated as a number. This includes
numbers, a string representations of numbers, `null` (which
evaluates to zero), `false` (which evaluates to zero) and `Date` objects.

### Instance Checks

#### is.instanceOf(value, expectedClass)
Asserts that the value is an instance of the expected class.

#### is.notInstanceOf(value, expectedClass)
Asserts that the value is **not** an instance of the expected class.

#### is.array(value)
Asserts that the value is an instance of the `Array` class.

#### is.notArray(value)
Asserts that the value is **not** an instance of the `Array` class.

#### is.date(value)
Asserts that the value is an instance of the `Date` class.

#### is.notDate(value)
Asserts that the value is **not** an instance of the `Date` class.

#### is.error(value)
Asserts that the value is an instance of the `Error` class.

#### is.notError(value)
Asserts that the value is **not** an instance of the `Error` class.

#### is.regExp(value)
Asserts that the value is an instance of the `RegExp` class.

#### is.notRegExp(value)
Asserts that the value is **not** an instance of the `RegExp` class.

### Advanced

#### is.in(value, search)
Asserts that `value` is a string and that it contains a substring `search`
or matches a regular expression `search`.

#### is.notIn(value, search)
Asserts that either 1) `value` is not a string, 2) `search` is not
a string or regular expression, or 3) `search` is not found in `value`.

#### is.lengthOf(value, length)
Asserts that the value (string, array, etc.) has the specified length.

#### is.notLengthOf(value, length)
Asserts that the value (string, array, etc.) has no length, or a different
length than specified.

#### is.arrayOf(value, expectedTypeOrClass)
Asserts that the value is an array of the specified type or an array of
instances of the specified class (depending on whether the second argument
is a string).

#### is.notArrayOf(value, expectedTypeOrClass)
Asserts that the value is not an array, or contains an item that is not of the
specified type or an item that is not an instance of the specified class
(depending on whether the second argument is a string).


## Mocking

You can use exam's builtin `mock` library, or any other mocking library
you like. The `mock` library exposes 2 globals, `mock` and `unmock`:

```js
describe('myConsole', function () {
  it('calls console.log', function (done) {
    mock(console, {
      log: function () {
        unmock(console);
        done();
      }
    });
  });
});
```

### mock(object, mockedProperties)

When mock is used as a function, it accepts 2 objects. Any properties of the
second object will be copied onto the first object, and if those properties
were already defined on the first, they will be saved so they can be unmocked
later.

In addition, `mock` is an object with several methods for replacing methods
with simple functions that create testable output.

### mock.ignore()

Returns a function that does nothing.

```js
describe('myConsole', function () {
  it('.log does not throw an error', function () {
    mock(console, {
      log: mock.ignore()
    });
    // This logs nothing, despite calling console.log('a').
    myConsole.log('a');
  });
});
```

### mock.count()

Returns a function that increments its `value` property each time it is called.

```js
describe('myConsole', function () {
  it('.log calls console.log once', function () {
    mock(console, {
      log: mock.count()
    });
    is(console.log.value, 0);
    myConsole.log('a');
    is(console.log.value, 1);
    unmock(console);
  });
});
```

### mock.concat([delimiter])

Returns a function whose first argument is concatenated onto its `value`
property each time it is called.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat()
    });
    is(console.log.value, '');
    myConsole.log('a');
    is(console.log.value, 'a');
    myConsole.log('b');
    is(console.log.value, 'ab');
    unmock(console);
  });
});
```

If a delimiter is supplied, it will be used to separate the concatenated
arguments.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.concat(',')
    });
    is(console.log.value, '');
    myConsole.log(1);
    is(console.log.value, '1');
    myConsole.log(2);
    is(console.log.value, '1,2');
    unmock(console);
  });
});
```

### mock.args([index])

Returns a function that pushes its arguments into an array each time it is
called.

```js
describe('myConsole', function () {
  it('.log calls console.log with multiple arguments', function () {
    mock(console, {
      log: mock.args()
    });
    is.same(console.log.value, []);
    myConsole.log('a');
    is.same(console.log.value, [{0: 'a'}]);
    myConsole.log('b', 'c');
    is.same(console.log.value, [{0: 'a'}, {0: 'b', 1: 'c'}]);
    unmock(console);
  });
});
```

If an index is supplied, it only pushes one of the arguments.

```js
describe('myConsole', function () {
  it('.log calls console.log', function () {
    mock(console, {
      log: mock.args(0)
    });
    is.same(console.log.value, []);
    myConsole.log(1);
    is.same(console.log.value, [1]);
    myConsole.log(2, 3);
    is.same(console.log.value, [1, 2]);
    unmock(console);
  });
});
```

### mock.fs([config][, createNewFs])

Uses [`mock-fs`](https://www.npmjs.org/package/mock-fs) to create a temporary
in-memory file system for fast, reliable tests. If `createNewFs` is truthy,
Node's built-in [`fs` module](http://nodejs.org/api/fs.html) remains unchanged,
otherwise its methods are mocked.

```js
// Replace Node's `fs` with a temporary file system.
var fs = mock.fs({
  'path/to/fake/dir': {
    'some-file.txt': 'file content here',
    'empty-dir': {} // Empty directory.
  },
  'path/to/some.png': new Buffer([8, 6, 7, 5, 3, 0, 9])
});

// Verify that we can read content.
var content = fs.readFileSync('path/to/fake/dir/some-file.txt');
is(content.toString(), 'file content here');

// Restore Node's built-in file system.
unmock(fs);
```

Calling `mock.fs` sets up a mock file system and returns a reference to Node's
built-in `fs` module, whose methods are now mocked. The resulting file system
has two base directories, `process.cwd()` and `os.tmpdir()`, plus any
directories/files added by the optional `config` object.

A `config` object is a nested structure in which:
* Keys are paths, relative to `process.cwd()`.
* `Buffer` and `string` values are file contents.
* Plain `object` values are directories.

To create a file or directory with additional properties (owner, permissions,
atime, etc.), use `mock.file()` or `mock.directory()`.

**Caveats:**

* Paths should use forward slashes, even on Windows.

* When you use `mock.fs` without the `createNewFs` argument, Node's own `fs`
  module is modified. If you use it **before** any other modules that modify
  `fs` (e.g. `graceful-fs`), the mock should behave as expected.

* The following [`fs` functions](http://nodejs.org/api/fs.html) are overridden:
  `fs.ReadStream`, `fs.Stats`, `fs.WriteStream`, `fs.appendFile`,
  `fs.appendFileSync`, `fs.chmod`, `fs.chmodSync`, `fs.chown`, `fs.chownSync`,
  `fs.close`, `fs.closeSync`, `fs.createReadStream`, `fs.createWriteStream`,
  `fs.exists`, `fs.existsSync`, `fs.fchmod`, `fs.fchmodSync`, `fs.fchown`,
  `fs.fchownSync`, `fs.fdatasync`, `fs.fdatasyncSync`, `fs.fstat`,
  `fs.fstatSync`, `fs.fsync`, `fs.fsyncSync`, `fs.ftruncate`,
  `fs.ftruncateSync`, `fs.futimes`, `fs.futimesSync`, `fs.lchmod`,
  `fs.lchmodSync`, `fs.lchown`, `fs.lchownSync`, `fs.link`, `fs.linkSync`,
  `fs.lstatSync`, `fs.lstat`, `fs.mkdir`, `fs.mkdirSync`, `fs.open`,
  `fs.openSync`, `fs.read`, `fs.readSync`, `fs.readFile`, `fs.readFileSync`,
  `fs.readdir`, `fs.readdirSync`, `fs.readlink`, `fs.readlinkSync`,
  `fs.realpath`, `fs.realpathSync`, `fs.rename`, `fs.renameSync`, `fs.rmdir`,
  `fs.rmdirSync`, `fs.stat`, `fs.statSync`, `fs.symlink`, `fs.symlinkSync`,
  `fs.truncate`, `fs.truncateSync`, `fs.unlink`, `fs.unlinkSync`, `fs.utimes`,
  `fs.utimesSync`, `fs.write`, `fs.writeSync`, `fs.writeFile` and
  `fs.writeFileSync`.

* Mock `fs.Stats` objects have the following properties: `dev`, `ino`, `nlink`,
  `mode`, `size`, `rdev`, `blksize`, `blocks`, `atime`, `ctime`, `mtime`,
  `uid`, and `gid`.  In addition, all of the `is*()` methods are provided (e.g.
  `isDirectory()` and `isFile()`).

* Mock file access is controlled based on file mode where `process.getuid()` and
  `process.getgid()` are available (POSIX systems). On other systems (e.g.
  Windows) the file mode has no effect.

* The following `fs` functions are **not** currently mocked (if your tests use
  these, they will work against the real file system): `fs.FSWatcher`,
  `fs.unwatchFile`, `fs.watch`, and `fs.watchFile`.

### mock.file(properties)

Creates a mock file. Supported properties:

 * **content** - `string|Buffer` File contents.
 * **mode** - `number` File mode (permission and sticky bits).  Defaults to `0666`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last file access time.  Defaults to `new Date()`.  Updated when file contents are accessed.
 * **ctime** - `Date` The last file change time.  Defaults to `new Date()`.  Updated when file owner or permissions change.
 * **mtime** - `Date` The last file modification time.  Defaults to `new Date()`.  Updated when file contents change.

```js
var old = new Date(1);
mock({
  foo: mock.file({
    content: 'file content here',
    ctime: old,
    mtime: old
  })
});
```

### mock.directory(properties)

Creates a mock directory. Supported properties:

 * **mode** - `number` Directory mode (permission and sticky bits).  Defaults to `0777`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last directory access time.  Defaults to `new Date()`.
 * **ctime** - `Date` The last directory change time.  Defaults to `new Date()`.  Updated when owner or permissions change.
 * **mtime** - `Date` The last directory modification time.  Defaults to `new Date()`.  Updated when an item is added, removed, or renamed.
 * **items** - `Object` Directory contents.  Members will generate additional files, directories, or symlinks.

To create a mock filesystem with a directory with the relative path `some/dir` that has a mode of `0755` and a couple child files, you could do something like this:
```js
mock({
  'some/dir': mock.directory({
    mode: 0755,
    items: {
      file1: 'file one content',
      file2: new Buffer([8, 6, 7, 5, 3, 0, 9])
    }
  })
});
```

### mock.symlink(properties)

Create a mock symlink. Supported properties:

 * **path** - `string` Path to the source (required).
 * **mode** - `number` Symlink mode (permission and sticky bits).  Defaults to `0666`.
 * **uid** - `number` The user id.  Defaults to `process.getuid()`.
 * **git** - `number` The group id.  Defaults to `process.getgid()`.
 * **atime** - `Date` The last symlink access time.  Defaults to `new Date()`.
 * **ctime** - `Date` The last symlink change time.  Defaults to `new Date()`.
 * **mtime** - `Date` The last symlink modification time.  Defaults to `new Date()`.

```js
mock({
  'some/dir': {
    'regular-file': 'file contents',
    'a-symlink': mock.symlink({
      path: 'regular-file'
    })
  }
});
```

### unmock(object)

Restores the properties which belonged to the object prior to being mocked.


## Running exam

Exam can be run using the command line interface, or by requiring the module.

### Command line

Install exam globally (using sudo if your environment
requires root access to install a Node binary):

```bash
sudo npm install -g exam
```

#### Usage
```
exam [options] [paths...]
```

For example, to run "test/a-test.js" and "test/b-test.js" in multiple processes and watch for changes:
```bash
exam --multi-process --watch test/a-test test/b-test
```

If there are no `paths` arguments, the path is assumed to be `test`, so test files include all files directly under the `test` directory.

#### Options


**-h, --help**<br>
Show usage information only.

**-w, --watch**<br>
Keep the process running, watch for file changes, and re-run tests
when a change is detected.

**-V, --version**<br>
Show the version number.

**-r, --require <modules>**<br>
Require a comma-delimited list of modules.

**-R, --reporter <name>**<br>
Which library will be used to output results. Options include "console",
"tap", "xunit" and "counts". *Default: "console"*.

**-G, --no-globals**<br>
Do not add functions such as `it` and `describe` to the global scope. Instead, add those functions to the `exam` object.

**-v, --recursive**<br>
Use the default `test` directory, or any directories specified as `paths`, and read their contents recursively, running any encountered files as tests.

**-p, --parser <parser>**<br>
Which EcmaScript parser will be used to handle syntax errors. Options include
"acorn" and "esprima". *Default: "acorn"*.

**-b, --bail**<br>
Exit after the first test failure.

**-a, --assertive**<br>
Stop a test after one failed assertion.

**-g, --grep <regexp>**<br>
Only run files/tests that match a regular expressi. (RegExp)',

**-i, --ignore <regexp>**<br>
Exclude files/tests that match a regular expressi. (RegExp)',

**-d, --debug**<br>
Run `node` with the --debug flag.

**-m, --multi-process**<br>
Spawn child processes, creating a cluster of test runners.

**-t, --timeout <millis>**<br>
Test case timeout in milliseconds (Number) [1000].

**-s, --slow <millis>**<br>
Slow test (yellow warning) threshold in millisecon. (Number) [10]',

**-S, --very-slow <millis>**<br>
Very slow (red warning) threshold in milliseconds (Numbe. [100]',

**-A, --hide-ascii**<br>
Do not show ASCII art before the run.

**-P, --hide-progress**<br>
Do not show dots as tests run.

**-C, --no-colors**<br>
Turn off color console logging.

### Module

You can also run `exam` from within your Node application. The module exposes
itself as a function that accepts an `options` object containing the arguments
you would pass to the CLI:

```js
var exam = require('exam');
exam({
  paths: ['test'],
  watch: true
});
```


## Acknowledgements

We would like to thank all of the amazing people who use, support,
promote, enhance, document, patch, and submit comments & issues.
Exam couldn't exist without you.

Exam is heavily influenced by [mocha](https://www.npmjs.org/package/mocha), and
it uses [mock-fs](https://www.npmjs.org/package/mock-fs), so thanks are due to
[TJ Holowaychuk](https://github.com/visionmedia),
[Tim Schaub](https://github.com/tschaub), and all of their contributors.

Additionally, huge thanks go to [TUNE](http://www.tune.com) for employing
and supporting [Exam](http://lighter.io/exam) project maintainers,
and for being an epically awesome place to work (and play).


## MIT License

Copyright (c) 2014 Sam Eubank

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


## How to Contribute

We welcome contributions from the community and are happy to have them.
Please follow this guide when logging issues or making code changes.

### Logging Issues

All issues should be created using the
[new issue form](https://github.com/lighterio/exam/issues/new).
Please describe the issue including steps to reproduce. Also, make sure
to indicate the version that has the issue.

### Changing Code

Code changes are welcome and encouraged! Please follow our process:

1. Fork the repository on GitHub.
2. Fix the issue ensuring that your code follows the
   [style guide](http://lighter.io/style-guide).
3. Add tests for your new code, ensuring that you have 100% code coverage.
   (If necessary, we can help you reach 100% prior to merging.)
   * Run `npm test` to run tests quickly, without testing coverage.
   * Run `npm run cover` to test coverage and generate a report.
   * Run `npm run report` to open the coverage report you generated.
4. [Pull requests](http://help.github.com/send-pull-requests/) should be made
   to the [master branch](https://github.com/lighterio/exam/tree/master).

### Contributor Code of Conduct

As contributors and maintainers of Exam, we pledge to respect all
people who contribute through reporting issues, posting feature requests,
updating documentation, submitting pull requests or patches, and other
activities.

If any participant in this project has issues or takes exception with a
contribution, they are obligated to provide constructive feedback and never
resort to personal attacks, trolling, public or private harassment, insults, or
other unprofessional conduct.

Project maintainers have the right and responsibility to remove, edit, or
reject comments, commits, code, edits, issues, and other contributions
that are not aligned with this Code of Conduct. Project maintainers who do
not follow the Code of Conduct may be removed from the project team.

Instances of abusive, harassing, or otherwise unacceptable behavior may be
reported by opening an issue or contacting one or more of the project
maintainers.

We promise to extend courtesy and respect to everyone involved in this project
regardless of gender, gender identity, sexual orientation, ability or
disability, ethnicity, religion, age, location, native language, or level of
experience.
