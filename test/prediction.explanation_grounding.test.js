import { test } from 'node:test';
import assert from 'node:assert/strict';
import { attachExplanation } from '../src/results/adapter.js';

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
  assert.deepEqual(d.explanation.mainFactorExplanations.map((e) => e.factorId), ['sedentary']);
  assert.deepEqual(d.explanation.protectiveFactorExplanations.map((e) => e.factorId), ['bmi_normal']);
  assert.equal(d.explanation.riskConclusion, '低风险');
  assert.equal(result.overallSummary, 'ok');
});
