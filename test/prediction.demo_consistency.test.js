import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('POST prediction returns diseases array with required fields for all demo users', async () => {
  const { readFileSync } = await import('node:fs');
  const doc = JSON.parse(readFileSync(new URL('../data/demo/user_profiles.json', import.meta.url), 'utf8'));
  const userIds = doc.profiles.map((p) => p.user_id);

  await withServer(async (base) => {
    for (const userId of userIds) {
      const { status, json } = await req(base, 'POST', `/api/v1/users/${userId}/prediction`);
      assert.equal(status, 200, `status for ${userId}`);
      assert.ok(Array.isArray(json.diseases), `diseases array for ${userId}`);
      for (const d of json.diseases) {
        assert.ok(['low', 'medium', 'high'].includes(d.riskLevel), `riskLevel for ${userId}/${d.diseaseId}`);
      }
    }
  });
});
