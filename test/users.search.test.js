import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('GET /api/v1/users?q= filters by userId substring (case-insensitive)', async () => {
  await withServer(async (base) => {
    const { json: hit } = await req(base, 'GET', '/api/v1/users?q=US-01');
    assert.ok(hit.total >= 1);
    for (const u of hit.users) assert.ok(u.userId.toUpperCase().includes('US-01'));

    const { json: lower } = await req(base, 'GET', '/api/v1/users?q=us-001');
    assert.ok(lower.users.some((u) => u.userId === 'US-001'));

    const { json: miss } = await req(base, 'GET', '/api/v1/users?q=nomatch');
    assert.equal(miss.total, 0);
    assert.deepEqual(miss.users, []);
  });
});
