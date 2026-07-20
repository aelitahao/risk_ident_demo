import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withServer, req } from './_helpers.js';
import { attachExplanation } from '../src/results/adapter.js';

test('explanation only includes factors that exist in the risk result (factor_grounding)', async () => {
  const riskDoc = JSON.parse(readFileSync(new URL('../data/demo/risk_results.json', import.meta.url), 'utf8'));
  const explDoc = JSON.parse(readFileSync(new URL('../data/demo/risk_explanations.json', import.meta.url), 'utf8'));

  const riskCardById = new Map(riskDoc.risk_cards.map((c) => [c.user_id, c]));
  const explCardById = new Map(explDoc.explanation_cards.map((c) => [c.user_id, c]));

  await withServer(async (base) => {
    for (const userId of ['US-001', 'US-002']) {
      const riskCard = riskCardById.get(userId);
      const explCard = explCardById.get(userId);
      if (!riskCard || !explCard) continue;

      const ls = riskCard.mode_results.lifestyle_screening.disease_results;
      const { json } = await req(base, 'POST', `/api/v1/users/${userId}/prediction`);

      for (const disease of ['diabetes', 'hypertension']) {
        const d = json.diseases.find((x) => x.diseaseId === disease);
        const riskFactorIds = new Set((ls[disease].major_risk_factors || []).map((f) => f.factor_id));
        const protectiveIds = new Set((ls[disease].protective_factors || []).map((f) => f.factor_id));

        if (d.explanation?.mainFactorExplanations) {
          for (const e of d.explanation.mainFactorExplanations) {
            assert.ok(
              riskFactorIds.has(e.factorId),
              `${userId} ${disease}: explanation factor ${e.factorId} not in risk result`,
            );
          }
        }

        if (d.explanation?.protectiveFactorExplanations) {
          for (const e of d.explanation.protectiveFactorExplanations) {
            assert.ok(
              protectiveIds.has(e.factorId),
              `${userId} ${disease}: protective factor ${e.factorId} not in risk result`,
            );
          }
        }
      }
    }
  });
});

test('attachExplanation drops fabricated factor_ids not present in the risk result', () => {
  const result = {
    diseases: [
      {
        diseaseId: 'diabetes',
        riskFactors: [{ id: 'sedentary', label: 's', evidence: '' }],
        protectiveFactors: [{ id: 'bmi_normal', label: 'b', evidence: '' }],
      },
    ],
  };
  const card = {
    mode_explanations: {
      lifestyle_screening: {
        overall_summary: 'ok',
        disease_explanations: {
          diabetes: {
            risk_conclusion: '低风险',
            main_factor_explanations: [
              { factor_id: 'sedentary', explanation: 'kept' },
              { factor_id: 'ghost_factor', explanation: 'should be dropped' },
            ],
            protective_factor_explanations: [
              { factor_id: 'bmi_normal', explanation: 'kept' },
              { factor_id: 'phantom_protective', explanation: 'should be dropped' },
            ],
          },
        },
      },
    },
  };
  attachExplanation(result, card);
  const d = result.diseases[0];
  assert.deepEqual(
    d.explanation.mainFactorExplanations.map((e) => e.factorId),
    ['sedentary'],
  );
  assert.deepEqual(
    d.explanation.protectiveFactorExplanations.map((e) => e.factorId),
    ['bmi_normal'],
  );
  assert.equal(d.explanation.riskConclusion, '低风险');
  assert.equal(result.overallSummary, 'ok');
});

