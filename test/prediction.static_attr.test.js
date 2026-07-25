import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

function baseInput(extra = {}) {
  return {
    basicInfo: { ageYears: 40, gender: 'female', heightCm: 165, weightKg: 65, bmi: 23.9, waistCm: 80 },
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
    ...extra,
  };
}

test('staticAttr with all six sub-objects is accepted', async () => {
  await withServer(async (base) => {
    const input = baseInput({
      staticAttr: {
        demographics: { education: '本科' },
        familyBackground: { familyStructure: '三口之家', familyLivingConditions: '城市自有住房' },
        economicCare: { economicStatus: '中等', medicalExpenseLevel: '一般' },
        healthHistory: { psychologicalDisorder: '轻度焦虑史' },
        livingEnvironment: { residentialEnv: '一线城市小区' },
        lifestyleTrait: { hobbies: '阅读，慢跑' },
      },
    });
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 200);
    assert.equal(json.featureSchemaVersion, '1.0');
    assert.equal(json.diseases.length, 2);
  });
});

test('staticAttr omitted is still valid', async () => {
  await withServer(async (base) => {
    const { status } = await req(base, 'POST', '/api/v1/predictions', {
      input: baseInput(),
      source: 'questionnaire',
    });
    assert.equal(status, 200);
  });
});

test('staticAttr sub-object of wrong type is rejected as INVALID_INPUT', async () => {
  await withServer(async (base) => {
    const input = baseInput({ staticAttr: { demographics: 'not-an-object' } });
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.details.some((d) => d.field === 'staticAttr.demographics'));
  });
});

test('staticAttr string field exceeding 200 chars is rejected', async () => {
  await withServer(async (base) => {
    const input = baseInput({
      staticAttr: { lifestyleTrait: { hobbies: 'x'.repeat(201) } },
    });
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.details.some((d) => d.field === 'staticAttr.lifestyleTrait.hobbies'));
  });
});

test('staticAttr as array is rejected', async () => {
  await withServer(async (base) => {
    const input = baseInput({ staticAttr: [] });
    const { status, json } = await req(base, 'POST', '/api/v1/predictions', { input, source: 'questionnaire' });
    assert.equal(status, 400);
    assert.equal(json.error.code, 'INVALID_INPUT');
    assert.ok(json.error.details.some((d) => d.field === 'staticAttr'));
  });
});
