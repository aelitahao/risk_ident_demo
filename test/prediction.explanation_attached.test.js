import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('prediction for DB user returns diseases with required fields', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    assert.equal(status, 200);
    assert.ok(Array.isArray(json.diseases));
    for (const d of json.diseases) {
      assert.ok(['low', 'medium', 'high'].includes(d.riskLevel));
      assert.ok(['monitor', 'routine', 'priority'].includes(d.screeningPriority));
      assert.ok(['sufficient', 'limited'].includes(d.evidenceLevel));
      assert.ok(Array.isArray(d.riskFactors));
      assert.ok(Array.isArray(d.protectiveFactors));
    }
  });
});
