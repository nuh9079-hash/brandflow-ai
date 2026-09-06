import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../app/api/create-assistant/route.ts", import.meta.url), "utf8");
function loadRoute({ authenticated = true, apiKey = "test-only", raw = "{}", failure } = {}) {
  let constructed = 0;
  const exports = {};
  class FakeGroq {
    constructor() { constructed++; }
    chat = { completions: { create: async () => {
      if (failure) throw failure;
      return { choices: [{ message: { content: raw } }] };
    } } };
  }
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, {
    exports, Response, process: { env: { GROQ_API_KEY: apiKey } }, console: { error() {} },
    require: (name) => name === "groq-sdk" ? FakeGroq : { auth: async () => ({ isAuthenticated: authenticated }) },
  });
  return { post: (body = { brief: "Test ürünü" }) => exports.POST(new Request("http://localhost/api/create-assistant", { method: "POST", body: JSON.stringify(body) })), constructed: () => constructed };
}

test("missing key is handled at request time without constructing the SDK", async () => {
  const route = loadRoute({ apiKey: "" });
  assert.equal(route.constructed(), 0);
  const response = await route.post();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).data, undefined);
  assert.equal(route.constructed(), 0);
});
test("unauthenticated calls are rejected before provider access", async () => {
  const route = loadRoute({ authenticated: false });
  assert.equal((await route.post()).status, 401);
  assert.equal(route.constructed(), 0);
});
test("invalid and oversized briefs return 400", async () => {
  for (const body of [null, [], {}, { brief: 4 }, { brief: " " }, { brief: "x".repeat(12001) }]) {
    assert.equal((await loadRoute().post(body)).status, 400);
  }
});
test("invalid provider output never becomes successful fallback content", async () => {
  for (const raw of ["bad json", "null", "{}", '{"caption":{},"hook":"a","cta":"b"}']) {
    const response = await loadRoute({ raw }).post();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).code, "AI_INVALID_RESPONSE");
  }
});
test("provider failures are explicit and do not leak provider messages", async () => {
  for (const status of [429, 401, 500]) {
    const response = await loadRoute({ failure: { status, message: "sensitive provider details" } }).post();
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert.ok(!(await response.text()).includes("sensitive"));
  }
});
test("valid AI response preserves a zero score", async () => {
  const response = await loadRoute({ raw: JSON.stringify({ caption: "Metin", hook: "Başlık", cta: "İncele", contentScore: 0 }) }).post();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.source, "ai");
  assert.equal(body.data.contentScore, 0);
});
