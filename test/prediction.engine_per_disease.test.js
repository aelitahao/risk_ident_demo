import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('fallback engine gives higher hypertension risk than diabetes for high-BMI current smoker', async () => {
  const input = {
    basicInfo: { ageYears: 50, gender: 'male', heightCm: 170, weightKg: 92, bmi: 31.8, waistCm: 102 },
    lifestyle: {
      smokingStatus: 'current',
      alcoholSummary: null,
      physicalActivitySummary: null,
      sedentaryMinutesPerDay: 300,
      weekdaySleepHours: 7,
      weekendSleepHours: 7,
      dietaryRecord: null,
    },
    healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
    featureSchemaVersion: '1.0',
  };

  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    const byDisease = Object.fromEntries(json.diseases.map((d) => [d.diseaseId, d]));

    const levelRank = { low: 0, medium: 1, high: 2 };
    assert.ok(
      levelRank[byDisease.hypertension.riskLevel] > levelRank[byDisease.diabetes.riskLevel],
      `expected hypertension > diabetes, got h=${byDisease.hypertension.riskLevel} d=${byDisease.diabetes.riskLevel}`,
    );

    const hyperFactorIds = byDisease.hypertension.riskFactors.map((f) => f.id);
    assert.ok(hyperFactorIds.includes('current_smoking'), 'hypertension should surface current_smoking');
    const diabetesFactorIds = byDisease.diabetes.riskFactors.map((f) => f.id);
    assert.ok(!diabetesFactorIds.includes('current_smoking'), 'diabetes should not surface current_smoking in fallback');
  });
});

test('fallback engine surfaces family diabetes history only for diabetes disease', async () => {
  const input = {
    basicInfo: { ageYears: 35, gender: 'female', heightCm: 165, weightKg: 60, bmi: 22.0, waistCm: 78 },
    lifestyle: {
      smokingStatus: 'never',
      alcoholSummary: null,
      physicalActivitySummary: null,
      sedentaryMinutesPerDay: 200,
      weekdaySleepHours: 7,
      weekendSleepHours: 8,
      dietaryRecord: null,
    },
    healthHistory: {
      knownDiseases: [],
      familyHistory: { diabetes: '母亲' },
      currentSymptoms: [],
      generalIndicators: {},
    },
    featureSchemaVersion: '1.0',
  };

  await withServer(async (base) => {
    const { json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    const byDisease = Object.fromEntries(json.diseases.map((d) => [d.diseaseId, d]));
    const diabetesIds = byDisease.diabetes.riskFactors.map((f) => f.id);
    const hyperIds = byDisease.hypertension.riskFactors.map((f) => f.id);
    assert.ok(diabetesIds.includes('family_history_diabetes'));
    assert.ok(!hyperIds.includes('family_history_diabetes'));
  });
});
