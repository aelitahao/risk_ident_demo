import { invalidInput, schemaVersionUnsupported, targetLeakage } from '../errors.js';

const GENDER_ENUM = new Set(['male', 'female', 'other']);
const SMOKING_ENUM = new Set(['never', 'former', 'current']);
const MODE_ENUM = new Set(['lifestyle_screening', 'comprehensive_profile']);
const DEFAULT_MODE = 'lifestyle_screening';

export function validateMode(mode) {
  if (mode == null) return DEFAULT_MODE;
  if (!MODE_ENUM.has(mode)) {
    throw invalidInput([{ field: 'mode', reason: 'must be lifestyle_screening|comprehensive_profile' }]);
  }
  return mode;
}

export { DEFAULT_MODE };

const LEAKAGE_KEY_PATTERNS = [
  /blood_pressure/i,
  /systolic/i,
  /diastolic/i,
  /hba1c/i,
  /glycated_hemoglobin/i,
  /fasting_glucose/i,
  /^bp_/i,
];

function isInt(v) {
  return typeof v === 'number' && Number.isInteger(v);
}
function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}
function inRange(v, lo, hi) {
  return v >= lo && v <= hi;
}

function checkOptionalNumber(details, path, v, lo, hi) {
  if (v == null) return;
  if (!isNum(v)) {
    details.push({ field: path, reason: 'must be number or null' });
    return;
  }
  if (!inRange(v, lo, hi)) {
    details.push({ field: path, reason: `must be within [${lo}, ${hi}]` });
  }
}

function checkOptionalInt(details, path, v, lo, hi) {
  if (v == null) return;
  if (!isInt(v)) {
    details.push({ field: path, reason: 'must be integer or null' });
    return;
  }
  if (!inRange(v, lo, hi)) {
    details.push({ field: path, reason: `must be within [${lo}, ${hi}]` });
  }
}

export function validatePredictionInput(input) {
  if (!input || typeof input !== 'object') throw invalidInput([{ field: '$', reason: 'must be object' }]);

  if (input.featureSchemaVersion !== '1.0') {
    throw schemaVersionUnsupported(input.featureSchemaVersion);
  }

  const details = [];

  const basic = input.basicInfo;
  if (!basic || typeof basic !== 'object') {
    details.push({ field: 'basicInfo', reason: 'required object' });
  } else {
    if (!isInt(basic.ageYears)) {
      details.push({ field: 'basicInfo.ageYears', reason: 'required integer' });
    } else if (!inRange(basic.ageYears, 18, 120)) {
      details.push({ field: 'basicInfo.ageYears', reason: 'must be within [18, 120]' });
    }
    if (typeof basic.gender !== 'string' || !GENDER_ENUM.has(basic.gender)) {
      details.push({ field: 'basicInfo.gender', reason: 'must be male|female|other' });
    }
    checkOptionalNumber(details, 'basicInfo.heightCm', basic.heightCm, 100, 250);
    checkOptionalNumber(details, 'basicInfo.weightKg', basic.weightKg, 25, 300);
    checkOptionalNumber(details, 'basicInfo.bmi', basic.bmi, 10, 80);
    checkOptionalNumber(details, 'basicInfo.waistCm', basic.waistCm, 40, 200);
  }

  const life = input.lifestyle;
  if (!life || typeof life !== 'object') {
    details.push({ field: 'lifestyle', reason: 'required object' });
  } else {
    if (life.smokingStatus != null && !SMOKING_ENUM.has(life.smokingStatus)) {
      details.push({ field: 'lifestyle.smokingStatus', reason: 'must be never|former|current' });
    }
    if (life.alcoholSummary != null && (typeof life.alcoholSummary !== 'string' || life.alcoholSummary.length > 200)) {
      details.push({ field: 'lifestyle.alcoholSummary', reason: 'string ≤ 200 chars' });
    }
    if (
      life.physicalActivitySummary != null &&
      (typeof life.physicalActivitySummary !== 'string' || life.physicalActivitySummary.length > 200)
    ) {
      details.push({ field: 'lifestyle.physicalActivitySummary', reason: 'string ≤ 200 chars' });
    }
    checkOptionalInt(details, 'lifestyle.sedentaryMinutesPerDay', life.sedentaryMinutesPerDay, 0, 1440);
    checkOptionalNumber(details, 'lifestyle.weekdaySleepHours', life.weekdaySleepHours, 0, 24);
    checkOptionalNumber(details, 'lifestyle.weekendSleepHours', life.weekendSleepHours, 0, 24);
    if (life.dietaryRecord != null && (typeof life.dietaryRecord !== 'object' || Array.isArray(life.dietaryRecord))) {
      details.push({ field: 'lifestyle.dietaryRecord', reason: 'object or null' });
    }
  }

  const hh = input.healthHistory;
  if (!hh || typeof hh !== 'object') {
    details.push({ field: 'healthHistory', reason: 'required object' });
  } else {
    if (!Array.isArray(hh.knownDiseases)) {
      details.push({ field: 'healthHistory.knownDiseases', reason: 'array of strings' });
    }
    if (hh.familyHistory == null || typeof hh.familyHistory !== 'object' || Array.isArray(hh.familyHistory)) {
      details.push({ field: 'healthHistory.familyHistory', reason: 'object' });
    }
    if (!Array.isArray(hh.currentSymptoms)) {
      details.push({ field: 'healthHistory.currentSymptoms', reason: 'array of strings' });
    }
    if (hh.generalIndicators == null || typeof hh.generalIndicators !== 'object' || Array.isArray(hh.generalIndicators)) {
      details.push({ field: 'healthHistory.generalIndicators', reason: 'object' });
    }
  }

  if (details.length) throw invalidInput(details);

  const leakage = [];
  const gi = input.healthHistory?.generalIndicators ?? {};
  for (const key of Object.keys(gi)) {
    if (LEAKAGE_KEY_PATTERNS.some((re) => re.test(key))) leakage.push(key);
  }
  if (leakage.length) throw targetLeakage(leakage);
}
