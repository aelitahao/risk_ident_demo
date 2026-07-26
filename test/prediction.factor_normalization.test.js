import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maxPointsFor, collectFactorsFor, KNOWN_FACTOR_IDS } from '../src/prediction/factors.js';

test('maxPointsFor diabetes is 6', () => {
  assert.equal(maxPointsFor('diabetes'), 6);
});

test('maxPointsFor hypertension is 7', () => {
  assert.equal(maxPointsFor('hypertension'), 7);
});

test('full-hit diabetes input produces risk points equal to maxPointsFor', () => {
  const input = {
    basicInfo: { ageYears: 50, gender: 'male', bmi: 30, waistCm: 95, heightCm: 170, weightKg: 87 },
    lifestyle: {
      smokingStatus: 'never',
      sedentaryMinutesPerDay: 500,
      alcoholSummary: null,
      physicalActivitySummary: null,
      weekdaySleepHours: 7,
      weekendSleepHours: 8,
      dietaryRecord: null,
    },
    healthHistory: {
      knownDiseases: [],
      familyHistory: { diabetes: '父亲有糖尿病' },
      currentSymptoms: [],
      generalIndicators: {},
    },
    featureSchemaVersion: '1.0',
  };
  const { risk } = collectFactorsFor('diabetes', input);
  const totalPoints = risk.reduce((s, f) => s + f.points, 0);
  assert.equal(totalPoints, maxPointsFor('diabetes'));
});

test('full-hit hypertension input produces risk points equal to maxPointsFor', () => {
  const input = {
    basicInfo: { ageYears: 50, gender: 'male', bmi: 30, waistCm: 95, heightCm: 170, weightKg: 87 },
    lifestyle: {
      smokingStatus: 'current',
      sedentaryMinutesPerDay: 500,
      alcoholSummary: null,
      physicalActivitySummary: null,
      weekdaySleepHours: 7,
      weekendSleepHours: 8,
      dietaryRecord: { note: '高盐饮食' },
    },
    healthHistory: {
      knownDiseases: [],
      familyHistory: {},
      currentSymptoms: [],
      generalIndicators: {},
    },
    featureSchemaVersion: '1.0',
  };
  const { risk } = collectFactorsFor('hypertension', input);
  const totalPoints = risk.reduce((s, f) => s + f.points, 0);
  assert.equal(totalPoints, maxPointsFor('hypertension'));
});

test('KNOWN_FACTOR_IDS contains all risk factor ids', () => {
  assert.ok(KNOWN_FACTOR_IDS.has('obesity'));
  assert.ok(KNOWN_FACTOR_IDS.has('age_over_45'));
  assert.ok(KNOWN_FACTOR_IDS.has('sedentary_high'));
  assert.ok(KNOWN_FACTOR_IDS.has('family_history_diabetes'));
  assert.ok(KNOWN_FACTOR_IDS.has('current_smoking'));
  assert.ok(KNOWN_FACTOR_IDS.has('high_salt_diet'));
});
