// Memory only: never persist athlete records to browser storage.
export function createCache() {
  let owner;
  let entries = new Map();
  function scope(token) {
    if (owner !== token) { owner = token; entries = new Map(); }
    return entries;
  }
  return {
    clear() { entries = new Map(); },
    invalidate() {
      // Keep the last displayable values, but isolate them from in-flight reads.
      entries = new Map([...entries].filter(([, entry]) => entry.value !== undefined)
        .map(([key, entry]) => [key, { value: entry.value, time: -Infinity }]));
    },
    peek(token, key) { return scope(token).get(key)?.value; },
    get(token, key, fetcher, ttl = 15000) {
      const current = scope(token);
      const entry = current.get(key);
      if (entry?.pending) return entry.pending;
      if (entry && Date.now() - entry.time < ttl) return Promise.resolve(entry.value);
      const next = { ...entry };
      next.pending = Promise.resolve().then(fetcher).then(value => {
        if (entries === current) current.set(key, { value, time: Date.now() });
        return value;
      }).catch(error => {
        if (entries === current) {
          if (entry?.value !== undefined) current.set(key, { value: entry.value, time: -Infinity });
          else current.delete(key);
        }
        throw error;
      });
      current.set(key, next);
      return next.pending;
    },
  };
}
