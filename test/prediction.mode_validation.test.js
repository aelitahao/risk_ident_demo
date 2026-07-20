import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('invalid mode value returns 400 INVALID_INPUT (DB path)', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(
      base,
      'POST',
      '/api/v1/users/US-001/prediction',
      { mode: 'not_a_real_mode' },
    );
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.details.some((d) => d.field === 'mode'));
  });
});

test('invalid mode value returns 400 INVALID_INPUT (questionnaire path)', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 40, gender: 'female', heightCm: 165, weightKg: 60, bmi: 22.0, waistCm: 75 },
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
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', {
      input,
      source: 'questionnaire',
      mode: 'nonsense',
    });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.details.some((d) => d.field === 'mode'));
  });
});
