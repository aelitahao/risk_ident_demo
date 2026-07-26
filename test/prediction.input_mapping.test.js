import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profileToPredictionInput, stripLeakageFields } from '../src/prediction/mapper.js';

test('profileToPredictionInput maps Chinese gender/smoking to English enums', () => {
  const profile = {
    user_id: 'US-TEST',
    basic_info: {
      age_years: 50,
      gender: '女性',
      body_measurements: { height_cm: 160, weight_kg: 62, bmi: 24.2, waist_cm: 78 },
    },
    lifestyle: {
      smoking: { current_status: '当前不吸', smoked_100_cigarettes_lifetime: '是' },
      alcohol: { summary: '过去一年偶尔饮酒' },
      physical_activity: { summary: '每周步行', sedentary_minutes_per_day: 420 },
      sleep: { weekday_hours: 7, weekend_hours: 8 },
      dietary_record: { summary: '单日 1800 kcal' },
    },
    health_history: {
      known_diseases_and_comorbidities: ['甲状腺疾病'],
      family_medical_history: { close_relative_heart_attack: '否' },
      current_symptoms: [],
      key_general_indicators: { total_cholesterol_mg_dl: 180 },
    },
  };

  const input = profileToPredictionInput(profile);
  assert.equal(input.userId, 'US-TEST');
  assert.equal(input.basicInfo.gender, 'female');
  assert.equal(input.lifestyle.smokingStatus, 'former');
  assert.equal(input.featureSchemaVersion, '1.0');
  assert.deepEqual(input.healthHistory.knownDiseases, ['甲状腺疾病']);
});

test('profileToPredictionInput formats structured known disease records', () => {
  const input = profileToPredictionInput({
    user_id: 'US-X',
    health_history: {
      known_diseases_and_comorbidities: [
        { disease: '甲状腺疾病', status: '当前仍存在', diagnosis_age: 35 },
        { disease: '癌症或恶性肿瘤史', status: '既往确诊' },
      ],
    },
  });

  assert.deepEqual(input.healthHistory.knownDiseases, [
    '甲状腺疾病（当前仍存在，35 岁确诊）',
    '癌症或恶性肿瘤史（既往确诊）',
  ]);
});

test('stripLeakageFields removes bp/hba1c/fasting_glucose keys', () => {
  const input = {
    total_cholesterol_mg_dl: 180,
    systolic_bp: 120,
    diastolic_bp: 80,
    hba1c_pct: 5.5,
    fasting_glucose_mg_dl: 92,
    pulse_rate_bpm: 70,
  };
  const { cleaned, removed } = stripLeakageFields(input);
  assert.deepEqual(Object.keys(cleaned).sort(), ['pulse_rate_bpm', 'total_cholesterol_mg_dl']);
  assert.equal(removed.length, 4);
});
