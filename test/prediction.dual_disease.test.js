import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('POST /api/v1/users/:id/prediction returns both diabetes and hypertension', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    assert.equal(status, 200);
    assert.equal(json.diseases.length, 2);
    const ids = json.diseases.map((d) => d.diseaseId).sort();
    assert.deepEqual(ids, ['diabetes', 'hypertension']);
    for (const d of json.diseases) {
      assert.ok(['low', 'medium', 'high'].includes(d.riskLevel));
      assert.ok(['monitor', 'routine', 'priority'].includes(d.screeningPriority));
      assert.ok(['sufficient', 'limited'].includes(d.evidenceLevel));
    }
  });
});
