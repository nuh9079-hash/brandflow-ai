import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/content-store.ts", import.meta.url), "utf8");
function loadStore(responses) {
  const calls = [];
  const client = responses === null ? null : {
    from(table) {
      calls.push(table);
      const response = responses.shift();
      assert.ok(response, "Unexpected database query");
      const query = new Proxy({}, {
        get(_, property) {
          if (property === "then") return Promise.resolve(response).then.bind(Promise.resolve(response));
          return () => query;
        },
      });
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, console: { error() {} },
    require: () => ({ getSupabaseServerClient: () => client }),
  });
  return { store: exports, calls };
}

test("missing database never reports a successful mutation", async () => {
  const { store } = loadStore(null);
  for (const result of await Promise.all([
    store.deleteGeneratedContent("u", "c"),
    store.setFavorite("u", "c", true),
    store.updateProfile("u", { name: "Test" }),
  ])) { assert.equal(result.ok, false); assert.ok(result.error); }
});

test("delete succeeds only for an actually deleted owned row", async () => {
  for (const data of [null, { id: "c" }]) {
    const { store, calls } = loadStore([{ data, error: null }]);
    assert.equal((await store.deleteGeneratedContent("u", "c")).ok, Boolean(data));
    assert.deepEqual(calls, ["generated_contents"]);
  }
});

test("favorite does not write a relation when no owned content is updated", async () => {
  const { store, calls } = loadStore([{ data: null, error: null }]);
  assert.equal((await store.setFavorite("u", "other", true)).ok, false);
  assert.deepEqual(calls, ["generated_contents"]);
});

test("favorite relation failure is not hidden", async () => {
  for (const favorite of [true, false]) {
    const { store } = loadStore([{ data: { id: "c" }, error: null }, { error: { message: "offline" } }]);
    assert.equal((await store.setFavorite("u", "c", favorite)).ok, false);
  }
});

test("successful favorite and profile writes remain successful", async () => {
  const { store } = loadStore([{ data: { id: "c" }, error: null }, { error: null }, { error: null }]);
  assert.equal((await store.setFavorite("u", "c", true)).ok, true);
  assert.equal((await store.updateProfile("u", { name: "Test" })).ok, true);
});
