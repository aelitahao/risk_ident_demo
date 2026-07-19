import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withServer, req } from './_helpers.js';

const RISK_LEVEL_MAP = { '低风险': 'low', '中风险': 'medium', '高风险': 'high' };

test('POST prediction result matches demo lifestyle_screening for all users', async () => {
  const doc = JSON.parse(readFileSync(new URL('../data/demo/risk_results.json', import.meta.url), 'utf8'));
  const expectations = new Map();
  for (const card of doc.risk_cards) {
    const ls = card.mode_results.lifestyle_screening.disease_results;
    expectations.set(card.user_id, {
      diabetes: RISK_LEVEL_MAP[ls.diabetes.risk_level],
      hypertension: RISK_LEVEL_MAP[ls.hypertension.risk_level],
    });
  }

  await withServer(async (base) => {
    for (const [userId, expected] of expectations) {
      const { status, json } = await req(base, 'POST', `/api/v1/users/${userId}/prediction`);
      assert.equal(status, 200, `status for ${userId}`);
      const byDisease = Object.fromEntries(json.diseases.map((d) => [d.diseaseId, d.riskLevel]));
      assert.equal(byDisease.diabetes, expected.diabetes, `diabetes level for ${userId}`);
      assert.equal(byDisease.hypertension, expected.hypertension, `hypertension level for ${userId}`);
    }
  });
});
