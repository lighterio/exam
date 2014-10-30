/**
 * Wrap the native JSON.stringify with something Circular-safe.
 */
var stringify = JSON.stringify;
var isWrapped = stringify.toString().indexOf('[native code]') < 0;
JSON.stringify = isWrapped ? stringify : function (o, u, w) {
  var a = [];
  return stringify(o, u || function(k, v) {
    if (typeof v == 'object' && v) {
      var l = a.length;
      for (var i = 0; i < l; i++) {
        if (a[i] == v) {
          return "[Circular " + (l - i) + "]";
        }
      }
      a.push(v);
    }
    return v;
  }, w);
};
