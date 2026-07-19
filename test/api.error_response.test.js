import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

function assertErrorShape(json) {
  assert.ok(json?.error, 'error object present');
  assert.ok(typeof json.error.code === 'string');
  assert.ok(typeof json.error.message === 'string');
}

test('404 USER_NOT_FOUND on POST /users/:id/prediction with unknown user', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/NOT-EXIST/prediction');
    assert.equal(status, 404);
    assertErrorShape(json);
    assert.equal(json.error.code, 'USER_NOT_FOUND');
  });
});

test('400 SCHEMA_VERSION_UNSUPPORTED when featureSchemaVersion is wrong', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', {
      input: { featureSchemaVersion: '9.9', basicInfo: {}, lifestyle: {}, healthHistory: {} },
      source: 'questionnaire',
    });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'SCHEMA_VERSION_UNSUPPORTED');
  });
});

test('400 INVALID_INPUT with details for bad fields', async () => {
  await withServer(async (base) => {
    const bad = {
      basicInfo: { ageYears: 5, gender: 'unknown' },
      lifestyle: {},
      healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input: bad, source: 'questionnaire' });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(Array.isArray(json.error.details) && json.error.details.length > 0);
  });
});

test('422 TARGET_LEAKAGE when generalIndicators contains forbidden fields', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 40, gender: 'male', heightCm: 170, weightKg: 70, bmi: 24.2, waistCm: 82 },
      lifestyle: {
        smokingStatus: 'never',
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: 300,
        weekdaySleepHours: 7,
        weekendSleepHours: 8,
        dietaryRecord: null,
      },
      healthHistory: {
        knownDiseases: [],
        familyHistory: {},
        currentSymptoms: [],
        generalIndicators: { systolic_bp: 120, hba1c_pct: 5.5 },
      },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 422);
    assert.equal(json.error.code, 'TARGET_LEAKAGE');
    assert.ok(json.error.details.length >= 2);
  });
});

test('404 NOT_FOUND for unmatched route', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'GET', '/api/v1/nope');
    assert.equal(status, 404);
    assert.equal(json.error.code, 'NOT_FOUND');
  });
});
