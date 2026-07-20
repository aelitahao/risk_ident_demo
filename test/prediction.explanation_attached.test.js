import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('prediction attaches overallSummary and per-disease explanation for users with a card', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    assert.equal(status, 200);
    assert.equal(typeof json.overallSummary, 'string');
    assert.ok(json.overallSummary.length > 0, 'overallSummary should be non-empty');

    const byDisease = Object.fromEntries(json.diseases.map((d) => [d.diseaseId, d]));
    for (const id of ['diabetes', 'hypertension']) {
      const d = byDisease[id];
      assert.ok(d.explanation, `${id} should have explanation`);
      assert.equal(typeof d.explanation.riskConclusion, 'string');
      assert.ok(Array.isArray(d.explanation.mainFactorExplanations));
      for (const e of d.explanation.mainFactorExplanations) {
        assert.equal(typeof e.factorId, 'string');
        assert.equal(typeof e.explanation, 'string');
      }
    }
  });
});
