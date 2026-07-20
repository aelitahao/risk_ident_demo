import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('fallback response lists missingEvidenceFields when evidence is limited', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 40, gender: 'female', heightCm: null, weightKg: null, bmi: null, waistCm: null },
      lifestyle: {
        smokingStatus: null,
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: null,
        weekdaySleepHours: null,
        weekendSleepHours: null,
        dietaryRecord: null,
      },
      healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    for (const d of json.diseases) {
      assert.equal(d.evidenceLevel, 'limited');
      assert.ok(Array.isArray(d.missingEvidenceFields));
      assert.deepEqual(
        [...d.missingEvidenceFields].sort(),
        [
          'basicInfo.bmi',
          'basicInfo.waistCm',
          'lifestyle.sedentaryMinutesPerDay',
          'lifestyle.smokingStatus',
          'lifestyle.weekdaySleepHours',
        ],
      );
    }
  });
});

test('sufficient-evidence response omits missingEvidenceFields', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 50, gender: 'male', heightCm: 175, weightKg: 82, bmi: 26.8, waistCm: 92 },
      lifestyle: {
        smokingStatus: 'current',
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: 420,
        weekdaySleepHours: 6.5,
        weekendSleepHours: 7.5,
        dietaryRecord: null,
      },
      healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
      featureSchemaVersion: '1.0',
    };
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    for (const d of json.diseases) {
      assert.equal(d.evidenceLevel, 'sufficient');
      assert.equal(d.missingEvidenceFields, undefined);
    }
  });
});
