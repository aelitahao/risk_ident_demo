import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('GET /api/v1/users returns 24 users with expected fields', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'GET', '/api/v1/users');
    assert.equal(status, 200);
    assert.equal(json.total, 24);
    assert.equal(json.users.length, 24);
    const row = json.users[0];
    for (const k of ['userId', 'ageYears', 'gender', 'bmi', 'waistCm', 'lifestyleSummary', 'dataStatus']) {
      assert.ok(k in row, `missing field ${k}`);
    }
    assert.ok(['male', 'female', 'other'].includes(row.gender));
    assert.ok(['complete', 'partial', 'sparse'].includes(row.dataStatus));
  });
});
