import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, env = {}, dependencies = {}) {
  const exports = {};
  const logs = [];
  vm.runInNewContext(ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, URL, process: { env }, console: { error: (...args) => logs.push(args) },
    require: name => { if (!(name in dependencies)) throw new Error(name); return dependencies[name]; },
  });
  return { ...exports, logs };
}

test('calendar errors distinguish connection, credentials, schema and permission failures without leaking details', () => {
  const loaded = load('../lib/calendar/storage-error.ts');
  for (const [input, expected] of [
    [{ message: 'TypeError: fetch failed' }, 'ulaşılamıyor'],
    [{ message: 'Invalid API key: secret-value' }, 'doğrulanamadı'],
    [{ code: '42P01', message: 'secret-value' }, 'henüz hazır değil'],
    [{ code: '42501', message: 'secret-value' }, 'erişim'],
  ]) {
    const result = loaded.calendarStorageError(input);
    assert.equal(result.ok, false);
    assert.equal(result.status, 503);
    assert.ok(result.error.includes(expected));
    assert.ok(!JSON.stringify([result, loaded.logs]).includes('secret-value'));
  }
});

const configuredEnv = {
  INSTAGRAM_CLIENT_ID: 'test-client', INSTAGRAM_CLIENT_SECRET: 'test-secret',
  INSTAGRAM_REDIRECT_URI: 'https://brandflow.example/api/social/instagram/callback',
  SUPABASE_SERVICE_ROLE_KEY: 'test-db', NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  SOCIAL_TOKEN_ENCRYPTION_KEY: 'x'.repeat(32), NODE_ENV: 'production',
};
test('Instagram requires storage and encryption before starting account authorization', () => {
  assert.equal(load('../lib/social/instagram-oauth.ts', configuredEnv).instagramOAuthConfigured(), true);
  for (const key of Object.keys(configuredEnv).filter(key => key !== 'NODE_ENV')) {
    assert.equal(load('../lib/social/instagram-oauth.ts', { ...configuredEnv, [key]: '' }).instagramOAuthConfigured(), false, key);
  }
  for (const uri of ['bad-url', 'http://localhost:3000/api/social/instagram/callback', 'https://example.com/wrong-path']) {
    assert.equal(load('../lib/social/instagram-oauth.ts', {...configuredEnv, INSTAGRAM_REDIRECT_URI: uri}).instagramOAuthConfigured(), false);
  }
});

test('missing Instagram configuration returns to the requesting site without setting an OAuth cookie', async () => {
  let protectedCalls = 0;
  const loaded = load('../app/api/social/instagram/connect/route.ts', {}, {
    '@clerk/nextjs/server': { auth: { protect: async () => { protectedCalls++; } } },
    'next/headers': { cookies: () => { throw new Error('must not create cookie'); } },
    'next/server': { NextResponse: { redirect: url => url.toString() } },
    '@/lib/social/instagram-oauth': { instagramOAuthConfigured: () => false },
  });
  const result = await loaded.GET({ url: 'https://brandflow.example/api/social/instagram/connect' });
  assert.equal(result, 'https://brandflow.example/profiles?instagram=config-missing');
  assert.equal(protectedCalls, 1);
});

test('connected account with disabled scheduler or missing cron secret is not advertised as ready', async () => {
  for (const [enabled, active, cron, expected] of [[false,true,'test',false],[true,true,'',false],[true,true,'test',true]]) {
    const source = readFileSync(new URL('../app/api/calendar/readiness/route.ts', import.meta.url),'utf8');
    const exports={};
    const deps={
      '@clerk/nextjs/server': {auth:async()=>({userId:'test-user'})},
      '@/lib/calendar/types': {automaticPublishPlatforms:['instagram']},
      '@/lib/social/connections': {getSocialConnection:async()=>({accountName:'test'})},
      '@/lib/supabase/server': {getSupabaseAdminClient:()=>({rpc:async()=>({data:[{enabled,active}]})})},
    };
    vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,Response,process:{env:{CRON_SECRET:cron}},require:name=>deps[name]});
    const body=await (await exports.GET({url:'https://brandflow.example/api/calendar/readiness'})).json();
    assert.equal(body.data.backgroundReady,expected);
    assert.equal(body.data.message.startsWith('Hazır:'),expected);
  }
});
