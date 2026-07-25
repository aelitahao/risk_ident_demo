import { invalidInput, schemaVersionUnsupported, targetLeakage } from '../errors.js';

const GENDER_ENUM = new Set(['male', 'female', 'other']);
const SMOKING_ENUM = new Set(['never', 'former', 'current']);

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

function checkOptionalString(details, path, v, max = 200) {
  if (v == null) return;
  if (typeof v !== 'string') {
    details.push({ field: path, reason: 'must be string or null' });
    return;
  }
  if (v.length > max) {
    details.push({ field: path, reason: `string ≤ ${max} chars` });
  }
}

function checkOptionalObject(details, path, v) {
  if (v == null) return true;
  if (typeof v !== 'object' || Array.isArray(v)) {
    details.push({ field: path, reason: 'must be object or null' });
    return false;
  }
  return true;
}

function validateStaticAttr(details, staticAttr) {
  if (!checkOptionalObject(details, 'staticAttr', staticAttr)) return;
  if (staticAttr == null) return;

  const demo = staticAttr.demographics;
  if (checkOptionalObject(details, 'staticAttr.demographics', demo) && demo != null) {
    checkOptionalString(details, 'staticAttr.demographics.education', demo.education);
  }

  const fam = staticAttr.familyBackground;
  if (checkOptionalObject(details, 'staticAttr.familyBackground', fam) && fam != null) {
    checkOptionalString(details, 'staticAttr.familyBackground.familyStructure', fam.familyStructure);
    checkOptionalString(details, 'staticAttr.familyBackground.familyLivingConditions', fam.familyLivingConditions);
  }

  const eco = staticAttr.economicCare;
  if (checkOptionalObject(details, 'staticAttr.economicCare', eco) && eco != null) {
    checkOptionalString(details, 'staticAttr.economicCare.economicStatus', eco.economicStatus);
    checkOptionalString(details, 'staticAttr.economicCare.medicalExpenseLevel', eco.medicalExpenseLevel);
  }

  const hh = staticAttr.healthHistory;
  if (checkOptionalObject(details, 'staticAttr.healthHistory', hh) && hh != null) {
    checkOptionalString(details, 'staticAttr.healthHistory.psychologicalDisorder', hh.psychologicalDisorder);
  }

  const env = staticAttr.livingEnvironment;
  if (checkOptionalObject(details, 'staticAttr.livingEnvironment', env) && env != null) {
    checkOptionalString(details, 'staticAttr.livingEnvironment.residentialEnv', env.residentialEnv);
  }

  const trait = staticAttr.lifestyleTrait;
  if (checkOptionalObject(details, 'staticAttr.lifestyleTrait', trait) && trait != null) {
    checkOptionalString(details, 'staticAttr.lifestyleTrait.hobbies', trait.hobbies);
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

  validateStaticAttr(details, input.staticAttr);

  if (details.length) throw invalidInput(details);

  const leakage = [];
  const gi = input.healthHistory?.generalIndicators ?? {};
  for (const key of Object.keys(gi)) {
    if (LEAKAGE_KEY_PATTERNS.some((re) => re.test(key))) leakage.push(key);
  }
  if (leakage.length) throw targetLeakage(leakage);
}
