import { newPredictionId } from '../results/adapter.js';

const FALLBACK_ENGINE_ID = 'demo_fallback_rule_v1';
const SCHEMA_VERSION = '1.0';

const BOUNDARY_NOTE =
  '结果来自演示占位规则，不是患病概率、未来发病预测或临床诊断。';

const DIABETES_KEY_RE = /(diabet|糖尿病)/i;
const HIGH_SALT_RE = /(高盐|重口|salty|\bsalt\b)/i;

function scoreToLevel(score) {
  if (score <= 1) return 'low';
  if (score <= 3) return 'medium';
  return 'high';
}

function scoreToPriority(level) {
  return level === 'high' ? 'priority' : level === 'medium' ? 'routine' : 'monitor';
}

function familyMentionsDiabetes(familyHistory) {
  if (!familyHistory || typeof familyHistory !== 'object') return false;
  for (const [k, v] of Object.entries(familyHistory)) {
    if (DIABETES_KEY_RE.test(k)) return true;
    if (typeof v === 'string' && DIABETES_KEY_RE.test(v)) return true;
    if (Array.isArray(v) && v.some((x) => typeof x === 'string' && DIABETES_KEY_RE.test(x))) return true;
  }
  return false;
}

function dietMentionsHighSalt(dietaryRecord) {
  if (!dietaryRecord || typeof dietaryRecord !== 'object') return false;
  try {
    return HIGH_SALT_RE.test(JSON.stringify(dietaryRecord));
  } catch {
    return false;
  }
}

function pushShared(risk, protective, b, l) {
  const waistThreshold = b.gender === 'female' ? 85 : 90;
  const obese = (b.bmi != null && b.bmi >= 28) || (b.waistCm != null && b.waistCm >= waistThreshold);
  if (obese) {
    risk.push({
      id: 'obesity',
      label: '体型指标偏高',
      evidence: `BMI ${b.bmi ?? '未知'}，腰围 ${b.waistCm ?? '未知'} cm`,
      points: 2,
    });
  } else if (b.bmi != null && b.bmi < 24) {
    protective.push({ id: 'bmi_normal', label: 'BMI 处于常用正常范围', evidence: `BMI ${b.bmi}` });
  }

  if (b.ageYears != null && b.ageYears >= 45) {
    risk.push({ id: 'age_over_45', label: '年龄 ≥ 45 岁', evidence: `${b.ageYears} 岁`, points: 1 });
  }

  if (l.sedentaryMinutesPerDay != null && l.sedentaryMinutesPerDay >= 480) {
    risk.push({
      id: 'sedentary_high',
      label: '久坐时间较长',
      evidence: `${l.sedentaryMinutesPerDay} 分钟/天`,
      points: 1,
    });
  }
}

export function collectFactorsFor(diseaseId, input) {
  const risk = [];
  const protective = [];
  const b = input.basicInfo ?? {};
  const l = input.lifestyle ?? {};
  const hh = input.healthHistory ?? {};

  pushShared(risk, protective, b, l);

  if (diseaseId === 'diabetes') {
    if (familyMentionsDiabetes(hh.familyHistory)) {
      risk.push({
        id: 'family_history_diabetes',
        label: '家族糖尿病史',
        evidence: '家族史记录中出现糖尿病相关字段',
        points: 2,
      });
    }
  }

  if (diseaseId === 'hypertension') {
    if (l.smokingStatus === 'current') {
      risk.push({
        id: 'current_smoking',
        label: '当前吸烟',
        evidence: '生活方式记录显示当前吸烟',
        points: 2,
      });
    } else if (l.smokingStatus === 'never') {
      protective.push({ id: 'never_smoked', label: '未吸烟史', evidence: '生活方式记录显示从未吸烟' });
    }

    if (dietMentionsHighSalt(l.dietaryRecord)) {
      risk.push({
        id: 'high_salt_diet',
        label: '单日膳食提示高盐',
        evidence: '24 小时膳食回顾提示高盐相关内容',
        points: 1,
      });
    }
  }

  return { risk, protective };
}

export const EVIDENCE_FIELD_PATHS = [
  ['basicInfo.bmi', (i) => i.basicInfo?.bmi],
  ['basicInfo.waistCm', (i) => i.basicInfo?.waistCm],
  ['lifestyle.smokingStatus', (i) => i.lifestyle?.smokingStatus],
  ['lifestyle.sedentaryMinutesPerDay', (i) => i.lifestyle?.sedentaryMinutesPerDay],
  ['lifestyle.weekdaySleepHours', (i) => i.lifestyle?.weekdaySleepHours],
];

export function evidenceSummary(input) {
  const missing = EVIDENCE_FIELD_PATHS.filter(([, get]) => get(input) == null).map(([path]) => path);
  return { level: missing.length > 2 ? 'limited' : 'sufficient', missing };
}

function buildDisease(diseaseId, input, ev) {
  const { risk, protective } = collectFactorsFor(diseaseId, input);
  const score = risk.reduce((s, f) => s + (f.points ?? 0), 0);
  const level = scoreToLevel(score);
  const out = {
    diseaseId,
    riskLevel: level,
    screeningPriority: scoreToPriority(level),
    evidenceLevel: ev.level,
    riskFactors: risk.map(({ id, label, evidence }) => ({ id, label, evidence })),
    protectiveFactors: protective.map(({ id, label, evidence }) => ({ id, label, evidence })),
  };
  if (ev.level === 'limited') out.missingEvidenceFields = ev.missing;
  return out;
}

export function fallbackPredict(input, mode = 'lifestyle_screening') {
  const ev = evidenceSummary(input);
  return {
    predictionId: newPredictionId(input.userId ?? null),
    userId: input.userId ?? null,
    modelVersion: FALLBACK_ENGINE_ID,
    featureSchemaVersion: SCHEMA_VERSION,
    mode,
    diseases: [buildDisease('diabetes', input, ev), buildDisease('hypertension', input, ev)],
    boundaryNote: BOUNDARY_NOTE,
  };
}

export const FALLBACK_CONSTANTS = { FALLBACK_ENGINE_ID };
