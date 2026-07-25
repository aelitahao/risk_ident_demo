import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('prediction returns diseases with required fields and no explanation for anonymous input', async () => {
  const input = {
    basicInfo: { ageYears: 40, gender: 'male', heightCm: 175, weightKg: 70, bmi: 22.9, waistCm: 82 },
    lifestyle: {
      smokingStatus: 'never',
      alcoholSummary: null,
      physicalActivitySummary: null,
      sedentaryMinutesPerDay: 300,
      weekdaySleepHours: 7,
      weekendSleepHours: 8,
      dietaryRecord: null,
    },
    healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
    featureSchemaVersion: '1.0',
  };

  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    assert.equal(json.userId, null);
    assert.equal(json.overallSummary, undefined);
    assert.ok(Array.isArray(json.diseases));
    for (const d of json.diseases) {
      assert.ok(['low', 'medium', 'high'].includes(d.riskLevel));
      assert.equal(d.explanation, undefined);
    }
  });
});
