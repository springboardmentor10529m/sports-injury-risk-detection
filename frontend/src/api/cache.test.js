import { test } from "node:test";
import assert from "node:assert/strict";
import { createCache } from "./cache.js";

test("analysis completion preserves dashboard for immediate display and refreshes it", async () => {
  const cache = createCache();
  await cache.get("a", "dashboard", async () => "previous");
  cache.invalidate();
  assert.equal(cache.peek("a", "dashboard"), "previous");
  assert.equal(await cache.get("a", "dashboard", async () => "updated"), "updated");
});

test("failed refresh retains visible data and invalidation rejects stale in-flight writes", async () => {
  const cache = createCache();
  await cache.get("a", "dashboard", async () => "previous");
  await assert.rejects(cache.get("a", "dashboard", async () => { throw Error("offline"); }, 0));
  assert.equal(cache.peek("a", "dashboard"), "previous");
  let resolve;
  const pending = cache.get("a", "dashboard", () => new Promise(r => { resolve = r; }));
  await Promise.resolve();
  cache.invalidate();
  await cache.get("a", "dashboard", async () => "newest");
  resolve("obsolete");
  await pending;
  assert.equal(cache.peek("a", "dashboard"), "newest");
  assert.equal(cache.peek("b", "dashboard"), undefined);
});

test("fresh reads and concurrent requests share one fetch", async () => {
  const cache = createCache();
  let calls = 0;
  const fetch = async () => ++calls;
  assert.deepEqual(await Promise.all([cache.get("a", "x", fetch), cache.get("a", "x", fetch)]), [1, 1]);
  assert.equal(await cache.get("a", "x", fetch), 1);
  assert.equal(calls, 1);
  assert.equal(await cache.get("a", "x", fetch, 0), 2);
});

test("logout/invalidation prevents pending response from repopulating cache", async () => {
  const cache = createCache();
  let resolve;
  const pending = cache.get("a", "x", () => new Promise(r => { resolve = r; }));
  await Promise.resolve();
  cache.clear();
  resolve("old");
  await pending;
  assert.equal(cache.peek("a", "x"), undefined);
});

test("account switch clears values and failed requests can retry", async () => {
  const cache = createCache();
  await cache.get("a", "x", async () => "private");
  assert.equal(cache.peek("b", "x"), undefined);
  await assert.rejects(cache.get("b", "x", async () => { throw Error("offline"); }));
  assert.equal(await cache.get("b", "x", async () => "new"), "new");
});
