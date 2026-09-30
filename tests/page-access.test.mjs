import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function harness(userId) {
  let protectedCalls = 0;
  const auth = Object.assign(async () => ({ userId }), {
    protect: async () => { protectedCalls++; return { userId }; },
  });
  const exports = {};
  const dependencies = {
    '@clerk/nextjs/server': {
      createRouteMatcher: patterns => request => patterns.some(pattern => {
        const prefix = pattern.replace('(.*)', '');
        return request.nextUrl.pathname.startsWith(prefix);
      }),
      clerkMiddleware: handler => request => handler(auth, request),
    },
    'next/server': { NextResponse: { redirect: url => ({ location: url.toString(), status: 307 }) } },
  };
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, {
    exports, URL, process: { env: { NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'test', CLERK_SECRET_KEY: 'test' } },
    require: name => dependencies[name],
  });
  return {
    run: path => { const url = `https://brandflow.example${path}`; return exports.default({ url, nextUrl: new URL(url) }); },
    protectedCalls: () => protectedCalls,
  };
}

test('signed-out page visitors reach local sign-in with the original path and query', async () => {
  const h = harness(null);
  const response = await h.run('/dashboard?range=30d');
  const destination = new URL(response.location);
  assert.equal(response.status, 307);
  assert.equal(destination.origin, 'https://brandflow.example');
  assert.equal(destination.pathname, '/sign-in');
  assert.equal(destination.searchParams.get('redirect_url'), 'https://brandflow.example/dashboard?range=30d');
  assert.equal(h.protectedCalls(), 0);
});

test('signed-in visitors still undergo Clerk protection', async () => {
  const h = harness('user_test');
  await h.run('/dashboard');
  assert.equal(h.protectedCalls(), 1);
});

test('API protection is retained instead of redirecting API calls to HTML', async () => {
  const h = harness(null);
  await h.run('/api/analytics/overview');
  assert.equal(h.protectedCalls(), 1);
});

test('public sign-in and cron routes do not enter the protected page redirect', async () => {
  const h = harness(null);
  await h.run('/sign-in');
  await h.run('/api/cron/publish');
  assert.equal(h.protectedCalls(), 0);
});
