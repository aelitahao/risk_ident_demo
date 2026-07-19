import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('POST /api/v1/predictions accepts anonymous questionnaire input', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 42, gender: 'female', heightCm: 165, weightKg: 68, bmi: 25, waistCm: 82 },
      lifestyle: {
        smokingStatus: 'never',
        alcoholSummary: null,
        physicalActivitySummary: '每周步行 3 次',
        sedentaryMinutesPerDay: 480,
        weekdaySleepHours: 6.5,
        weekendSleepHours: 8,
        dietaryRecord: null,
      },
      healthHistory: {
        knownDiseases: [],
        familyHistory: { diabetes: 'mother' },
        currentSymptoms: [],
        generalIndicators: {},
      },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    assert.equal(json.userId, null);
    assert.ok(typeof json.predictionId === 'string' && json.predictionId.length > 0);
    assert.equal(json.featureSchemaVersion, '1.0');
    assert.equal(json.diseases.length, 2);
  });
});
