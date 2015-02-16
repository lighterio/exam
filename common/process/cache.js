/**
 * Process Cache stores data in a least-recently-used in-memory cache,
 * which is attached to the process as a non-enumerable property. This
 * ensures that modules can share data regardless of their position in the
 * dependency graph, but it also makes collisions possible. Responsible
 * modules should namespace their keys.
 *
 * @origin https://github.com/lighterio/lighter-common/common/process/cache.js
 * @version 0.0.1
 * @import object/lru-cache
 */

var LruCache = require('../object/lru-cache');

// Initialize the cache if it doesn't already exist.
var cacheKey = '_lighterProcessCache_0';
var processCache = process[cacheKey];
if (!processCache) {
  Object.defineProperty(process, cacheKey, {
    enumerable: false,
    value: new LruCache()
  });
}
// If it exists but doesn't look like a cache, replace it.
else if (!processCache.get || !processCache.set) {
  process[cacheKey] = new LruCache();
}

// Export the cache, whether newly-created or existing.
module.exports = process[cacheKey];
