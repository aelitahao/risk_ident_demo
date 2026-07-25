import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('prediction returns diseases array with riskLevel for DB user', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    assert.equal(status, 200);
    assert.ok(Array.isArray(json.diseases));
    for (const d of json.diseases) {
      assert.ok(['low', 'medium', 'high'].includes(d.riskLevel));
    }
  });
});

test('questionnaire path returns consistent riskLevel regardless of mode param', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 50, gender: 'male', heightCm: 175, weightKg: 90, bmi: 29.4, waistCm: 100 },
      lifestyle: {
        smokingStatus: 'current',
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: 600,
        weekdaySleepHours: 6,
        weekendSleepHours: 7,
        dietaryRecord: null,
      },
      healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
      featureSchemaVersion: '1.0',
    };
    const { json: a } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.ok(Array.isArray(a.diseases));
    for (const d of a.diseases) {
      assert.ok(['low', 'medium', 'high'].includes(d.riskLevel));
    }
  });
});
