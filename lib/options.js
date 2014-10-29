module.exports = function getOptions(options) {

  var defaults = {
    parser: 'acorn',
    reporter: 'console',
    slow: 10,
    verySlow: 1e2,
    timeout: 1e3,
    paths: [],
    dir: process.cwd(),
    ignoreWatch: /\/(\.cache|\.git)$/,
    fsWatchLimit: 20,
    watchInterval: 1e2,
    watchLimit: 1e3,
    stream: process.stderr
  };

  // If options are passed in, use them.
  if (options) {
    for (var name in defaults) {
      options[name] = options[name] || defaults[name];
    }
  }
  // Otherwise, get options from CLI arguments.
  else {

    options = defaults;

    var argv = process.argv;

    var flags = [
      'help|h||Show usage information',
      'version|V||Show the `exam` version number',
      'require|r|<path>|Require a module before each test file',
      'reporter|R|<name>|Result reporter ("console", "tap", "xunit" or "counts")',
      'recursive|v||Load test files recursively',
      'parser|p|<parser>|EcmaScript parser ("esprima", "acorn", or "none")',
      'bail|b||Exit after the first test failure',
      'assertive|B||Stop a test after one failed assertion',
      'grep|g|<pattern>|Only run files/tests that match a pattern',
      'ignore|i|<pattern>|Exclude files/tests that match a pattern',
      'watch|w||When changes are made, re-run tests',
      'ignore-watch|W|<pattern>|Do not watch files that match a pattern',
      'fs-watch-limit|l|<number>|Cap the number of `fs.watch` calls',
      'watch-limit|L|<ms>| Cap the number of `fs.stat` watched directories',
      'fallback-watch-interval|I|<ms>|Milliseconds between `fs.stat` calls for watching',
      'debug|d||Run `node` with the --debug flag',
      'multi-process|m||If true, tests are distributed among CPUs',
      'timeout|t|<ms>|Test case timeout in milliseconds',
      'slow|s|<ms>|Slow test (yellow warning) threshold in milliseconds',
      'very-slow|S|<ms>|Very slow (red warning) threshold in milliseconds',
      'hide-ascii|A||Do not show ASCII art before the run',
      'hide-progress|P||Do not show dots as tests run',
      'no-colors|C||Turn off color console logging',
      'timestamp|T||Show a timestamp after console reporter output',
      'files||<files>|Run tests on a comma-delimited set of files'
    ];

    var map = {};
    flags.forEach(function (flag) {
      flag = flag.split('|');
      map[flag[0]] = flag;
      map[flag[1]] = flag;
    });

    for (var index = 2; index < argv.length; index++) {
      argv[index].replace(/^\s*(-*)(.*)\s*$/g, dashify);
    }
  }

  options.optionify = function () {
    if (options.version) {
      console.log(exam.version);
      process.exit();
    }

    if (!/^(acorn|esprima|no.*|)$/.test(options.parser)) {
      console.error('Unknown parser: "' + options.parser + '".');
      console.error('  Expected "acorn", "esprima", or "none".');
      process.exit();
    }

    options.parser = options.parser.replace(/^no.*/, '');
    options.paths[0] = options.paths[0] || 'test';
    arrayify('require');
    arrayify('files');
    regexpify('grep');
    regexpify('ignore');
    regexpify('ignoreWatch');

    // Sandbox the watching process from test processes.
    if (options.watch || options.debug) {
      options.multiProcess = true;
    }
  };

  options.optionify();

  function dashify(match, dash, rest) {
    if (dash == '--') {
      gotOption(rest);
    }
    else if (dash == '-') {
      rest.split('').forEach(gotOption);
    }
    else {
      options.paths.push(match);
    }
  }

  function gotOption(flag) {
    var option = map[flag];
    if (option) {
      var name = option[0].replace(/-[a-z]/, function (match) {
        return match[1].toUpperCase();
      });
      // Negate a flag (setting to true if undefined).
      options[name] = !options[name];
      // If it takes arguments, override the above negation with a value.
      var argCount = option[2] ? option[2].split(' ').length : 0;
      while (argCount--) {
        options[name] = argv[++index];
      }
    }
    else {
      console.error('Unknown option: "' + flag + '".');
      process.exit();
    }
  }

  function arrayify(key) {
    if (typeof options[key] == 'string') {
      options[key] = options[key].split(',');
    }
  }

  function regexpify (key) {
    if (typeof options[key] == 'string') {
      options[key] = new RegExp(options[key]);
    }
  }

  return options;

};
