const GENDER_MAP = { '男性': 'male', '女性': 'female' };

const LEAKAGE_KEY_PATTERNS = [
  /blood_pressure/i,
  /systolic/i,
  /diastolic/i,
  /hba1c/i,
  /glycated_hemoglobin/i,
  /fasting_glucose/i,
  /^bp_/i,
];

function truncate(s, n) {
  if (typeof s !== 'string') return s;
  return s.length <= n ? s : s.slice(0, n);
}

function mapGender(v) {
  if (v == null) return 'other';
  return GENDER_MAP[v] ?? 'other';
}

function mapSmoking(smoking) {
  if (!smoking) return null;
  const current = smoking.current_status;
  const lifetime = smoking.smoked_100_cigarettes_lifetime;
  if (!current) return null;
  if (current.includes('不吸') || current.includes('已戒') || current.includes('戒烟')) {
    return lifetime === '是' ? 'former' : 'never';
  }
  if (current.includes('吸')) return 'current';
  return null;
}

function mapKnownDisease(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;

  const disease = entry.disease ?? entry.name;
  if (!disease) return null;

  const details = [];
  if (entry.status) details.push(entry.status);
  if (entry.diagnosis_age != null) details.push(`${entry.diagnosis_age} 岁确诊`);
  return details.length ? `${disease}（${details.join('，')}）` : disease;
}

export function stripLeakageFields(indicators) {
  if (!indicators || typeof indicators !== 'object') return { cleaned: {}, removed: [] };
  const cleaned = {};
  const removed = [];
  for (const [k, v] of Object.entries(indicators)) {
    if (LEAKAGE_KEY_PATTERNS.some((re) => re.test(k))) {
      removed.push(k);
    } else {
      cleaned[k] = v;
    }
  }
  return { cleaned, removed };
}

export function profileToPredictionInput(profile) {
  const basic = profile.basic_info ?? {};
  const body = basic.body_measurements ?? {};
  const lifestyle = profile.lifestyle ?? {};
  const health = profile.health_history ?? {};

  const { cleaned: generalIndicators } = stripLeakageFields(health.key_general_indicators);

  return {
    userId: profile.user_id,
    basicInfo: {
      ageYears: basic.age_years ?? null,
      gender: mapGender(basic.gender),
      heightCm: body.height_cm ?? null,
      weightKg: body.weight_kg ?? null,
      bmi: body.bmi ?? null,
      waistCm: body.waist_cm ?? null,
    },
    lifestyle: {
      smokingStatus: mapSmoking(lifestyle.smoking),
      alcoholSummary: truncate(lifestyle.alcohol?.summary ?? null, 200),
      physicalActivitySummary: truncate(lifestyle.physical_activity?.summary ?? null, 200),
      sedentaryMinutesPerDay: lifestyle.physical_activity?.sedentary_minutes_per_day ?? null,
      weekdaySleepHours: lifestyle.sleep?.weekday_hours ?? null,
      weekendSleepHours: lifestyle.sleep?.weekend_hours ?? null,
      dietaryRecord: lifestyle.dietary_record ?? null,
    },
    healthHistory: {
      knownDiseases: Array.isArray(health.known_diseases_and_comorbidities)
        ? health.known_diseases_and_comorbidities.map(mapKnownDisease).filter(Boolean)
        : [],
      familyHistory: health.family_medical_history ?? {},
      currentSymptoms: Array.isArray(health.current_symptoms) ? health.current_symptoms : [],
      generalIndicators,
    },
    featureSchemaVersion: '1.0',
  };
}
