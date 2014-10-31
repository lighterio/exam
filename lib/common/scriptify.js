JSON.scriptify = js;

JSON.eval = function (s) {
  try {
    eval('eval.o=' + s);
    return eval.o;
  }
  catch (e) {
    eval.e = e;
  }
};

function js(v, a) {
  var t = typeof v;
  if (t == 'function') {
    return v.toString();
  }
  if (t == 'string') {
    return '"' + v.replace(/["\t\n\r]/g, function (c) {
      return c == '"' ? '\\"' : c == '\t' ? '\\t' : c == '\n' ? '\\n' : '';
    }) + '"';
  }
  if (t == 'object' && v) {
    if (v instanceof Date) {
      return 'new Date(' + v.getTime() + ')';
    }
    if (v instanceof Error) {
      return '(function(){var e=new Error(' + js(v.message) + ');' +
        'e.stack=' + js(v.stack) + ';return e})()';
    }
    if (v instanceof RegExp) {
      return '/' + v.source + '/' +
        (v.global ? 'g' : '') +
        (v.ignoreCase ? 'i' : '') +
        (v.multiline ? 'm' : '');
    }
    var i, l;
    if (a) {
      l = a.length;
      for (i = 0; i < l; i++) {
        if (a[i] == v) {
          return '{"^":' + (l - i) + '}';
        }
      }
    }
    (a = a || []).push(v);
    var s;
    if (v instanceof Array) {
      s = '[';
      l = v.length;
      for (i = 0; i < l; i++) {
        s += (i ? ',' : '') + js(v[i], a);
      }
      a.pop();
      return s + ']';
    }
    else {
      var i = 0;
      s = '{';
      for (var k in v) {
        s += (i ? ',' : '') +
          (/^[$_a-z][\w$]*$/i.test(k) ? k : '"' + k + '"') +
          ':' + js(v[k], a);
        i++;
      }
      a.pop();
      return s + '}';
    }
  }
  return '' + v;
}