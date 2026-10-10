import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { createStoreServer } from '../remote/service.js';

const valid = { full_name: "Test O'Reilly <script>example</script>", x_handle: '@test_member', telegram: '@test_member', email: 'test@example.com', country: 'Nigeria', role: 'scout', desks: ['DeFi'], links: "'); DROP TABLE applications; --", context: '', why: 'I investigate user activity and explain findings using clear evidence.' };

test('store HTTP, authentication, persistence, claims, review races, and client limits', async t => {
  const db = new PGlite();
  let server;
  t.after(async () => { if (server?.listening) await new Promise(resolve => server.close(resolve)); await db.close(); });
  // A new production database is owned by this role. PGlite has one pre-existing database.
  await db.exec('CREATE ROLE ifagrithm_owner; CREATE ROLE ifagrithm_app; GRANT USAGE, CREATE ON SCHEMA public TO ifagrithm_owner;');
  const setup = await readFile(new URL('../remote/db-setup.sh', import.meta.url), 'utf8');
  // Tolerate CRLF checkouts (Windows) — the heredoc lines may end with \r.
  const schema = setup.match(/--dbname=ifagrithm <<'SQL'\r?\n([\s\S]*?)\r?\nSQL/)[1];
  await db.exec(schema);
  await db.exec('SET ROLE ifagrithm_app;');
  const sql = async (strings, ...values) => {
    const text = strings.reduce((query, part, index) => query + (index ? `$${index}` : '') + part, '');
    const params = values.map(value => Array.isArray(value) ? `{${value.map(item => `"${item.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')}}` : value);
    return (await db.query(text, params)).rows;
  };
  const secret = 'test-only-store-secret';
  server = createStoreServer({ sql, secret }); // Empty email key prevents all real email.
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  let client = 1;
  async function request(path, body, options = {}) {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-ifg-secret': secret, 'x-ifg-client-ip': `198.51.100.${client++}`, ...options.headers },
      body: body === undefined ? undefined : options.raw ? body : JSON.stringify(body),
    });
    return { status: response.status, headers: response.headers, data: await response.json() };
  }
  await t.test('unauthorized requests never reach records or claims', async () => {
    assert.equal((await request('/applications', undefined, { headers: { 'x-ifg-secret': 'wrong' } })).status, 401);
    assert.equal((await request(`/claim/${'a'.repeat(48)}`, undefined, { headers: { 'x-ifg-secret': 'wrong' } })).status, 401);
  });
  await t.test('malformed, scalar, oversized, and non-JSON requests get explicit client errors', async () => {
    assert.equal((await request('/apply', 'null', { raw: true })).status, 400);
    assert.equal((await request('/apply', '{broken', { raw: true })).status, 400);
    assert.equal((await request('/apply', 'x'.repeat(40000), { raw: true })).status, 413);
    assert.equal((await request('/apply', '{}', { raw: true, headers: { 'content-type': 'text/plain' } })).status, 415);
  });
  const receipt = await request('/apply', valid);
  assert.equal(receipt.status, 201);
  const id = receipt.data.id;
  await t.test('parameterized writes retain entered text and cannot execute SQL', async () => {
    const records = await request('/applications');
    assert.equal(records.data.applications[0].links, valid.links);
    assert.equal(records.data.applications[0].full_name, valid.full_name);
    assert.match(records.headers.get('cache-control'), /no-store/);
    assert.equal((await request('/enquiries', { name: 'Test', email: 'test@example.com', question: 'Test question', company: '' })).status, 201);
    assert.equal((await request('/enquiries')).data.enquiries.length, 1);
    await assert.rejects(db.query('DELETE FROM applications'), /permission denied/);
    await assert.rejects(db.query('TRUNCATE applications'), /permission denied/);
  });
  let token;
  await t.test('competing approvals produce one winning token', async () => {
    const decisions = await Promise.all([request('/approve', { id, tier: 'gold' }), request('/approve', { id, tier: 'silver' })]);
    assert.deepEqual(decisions.map(value => value.status).sort(), [200, 409]);
    const winner = decisions.find(value => value.status === 200);
    token = new URL(winner.data.claim_url).searchParams.get('t');
    assert.equal(winner.data.mail.skipped, true);
    assert.equal((await request('/applications')).data.applications[0].claim_token, token);
    assert.equal((await request('/reject', { id })).status, 409);
  });
  await t.test('claim response contains approved identity and excludes contact data', async () => {
    const claim = await request(`/claim/${token}`);
    assert.equal(claim.status, 200);
    assert.equal(claim.data.name, valid.full_name);
    assert.equal(claim.data.role, 'RESEARCH SCOUT');
    assert.equal(claim.data.desk, 'DeFi');
    assert.equal(claim.data.email, undefined);
    assert.match(claim.headers.get('cache-control'), /no-store/);
    assert.equal((await request(`/claim/${'a'.repeat(48)}`)).status, 404);
  });
  await t.test('competing approve and reject cannot both succeed', async () => {
    const second = await request('/apply', valid);
    const decisions = await Promise.all([request('/approve', { id: second.data.id, tier: 'bronze' }), request('/reject', { id: second.data.id })]);
    assert.deepEqual(decisions.map(value => value.status).sort(), [200, 409]);
    assert.equal((await request('/reject', { id: 2147483648 })).status, 400);
  });
  await t.test('one visitor cannot consume every other visitor submission allowance', async () => {
    const headers = { 'x-ifg-client-ip': '203.0.113.80' };
    for (let i = 0; i < 5; i++) assert.equal((await request('/apply', valid, { headers })).status, 201);
    const limited = await request('/apply', valid, { headers });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) > 0);
    assert.equal((await request('/apply', valid, { headers: { 'x-ifg-client-ip': '203.0.113.81' } })).status, 201);
  });
});
