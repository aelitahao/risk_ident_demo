import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('anonymous input with mostly missing lifestyle fields returns evidenceLevel=limited', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: {
        ageYears: 40,
        gender: 'female',
        heightCm: null,
        weightKg: null,
        bmi: null,
        waistCm: null,
      },
      lifestyle: {
        smokingStatus: null,
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: null,
        weekdaySleepHours: null,
        weekendSleepHours: null,
        dietaryRecord: null,
      },
      healthHistory: {
        knownDiseases: [],
        familyHistory: {},
        currentSymptoms: [],
        generalIndicators: {},
      },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    for (const d of json.diseases) assert.equal(d.evidenceLevel, 'limited');
  });
});
