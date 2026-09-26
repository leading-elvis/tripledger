import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, tripHref, sections, signInHref } from '../lib/navigation.mjs';

test('deep links keep the exact ledger and page, including archived-ledger URLs',()=>{
  const id='810cefc3-8f26-4966-9f29-1c7e6f04d1d3';
  for(const section of Object.keys(sections))assert.deepEqual(parseRoute(tripHref(id,section)+'/'),{kind:'trip',tripId:id,section});
  assert.deepEqual(parseRoute('/'),{kind:'home'});
  assert.deepEqual(parseRoute('/join'),{kind:'join'});
});
test('invalid routes cannot silently select another ledger or inherited section',()=>{
  for(const path of ['/unknown','/trips/no-id/expenses','/trips/810cefc3-8f26-4966-9f29-1c7e6f04d1d3/constructor','/trips/810cefc3-8f26-4966-9f29-1c7e6f04d1d3/expenses/extra'])assert.equal(parseRoute(path).kind,'missing');
  assert.throws(()=>tripHref('not-an-id'));
});
test('sign-in preserves ledger deep links and old/new invitation fragments without external redirects',()=>{
  for(const path of ['/trips/810cefc3-8f26-4966-9f29-1c7e6f04d1d3/team','/?scope=archived','/#join=secret','/join#join=secret'])assert.equal(new URL(signInHref(path),'https://app.local').searchParams.get('return_to'),path);
  for(const path of ['https://example.com','//example.com','/\\example.com','/signin-with-chatgpt','/callback'])assert.equal(new URL(signInHref(path),'https://app.local').searchParams.get('return_to'),'/');
});
