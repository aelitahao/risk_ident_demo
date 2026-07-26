const DIABETES_KEY_RE = /(diabet|糖尿病)/i;
const HIGH_SALT_RE = /(高盐|重口|salty|\bsalt\b)/i;

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

export const RISK_FACTOR_DEFS = [
  {
    id: 'obesity',
    appliesTo: ['diabetes', 'hypertension'],
    points: 2,
    evaluate(input) {
      const b = input.basicInfo ?? {};
      const threshold = b.gender === 'female' ? 85 : 90;
      const hit = (b.bmi != null && b.bmi >= 28) || (b.waistCm != null && b.waistCm >= threshold);
      if (!hit) return null;
      return { label: '体型指标偏高', evidence: `BMI ${b.bmi ?? '未知'}，腰围 ${b.waistCm ?? '未知'} cm` };
    },
  },
  {
    id: 'age_over_45',
    appliesTo: ['diabetes', 'hypertension'],
    points: 1,
    evaluate(input) {
      const age = input.basicInfo?.ageYears;
      return age != null && age >= 45
        ? { label: '年龄 ≥ 45 岁', evidence: `${age} 岁` }
        : null;
    },
  },
  {
    id: 'sedentary_high',
    appliesTo: ['diabetes', 'hypertension'],
    points: 1,
    evaluate(input) {
      const s = input.lifestyle?.sedentaryMinutesPerDay;
      return s != null && s >= 480
        ? { label: '久坐时间较长', evidence: `${s} 分钟/天` }
        : null;
    },
  },
  {
    id: 'family_history_diabetes',
    appliesTo: ['diabetes'],
    points: 2,
    evaluate(input) {
      return familyMentionsDiabetes(input.healthHistory?.familyHistory)
        ? { label: '家族糖尿病史', evidence: '家族史记录中出现糖尿病相关字段' }
        : null;
    },
  },
  {
    id: 'current_smoking',
    appliesTo: ['hypertension'],
    points: 2,
    evaluate(input) {
      return input.lifestyle?.smokingStatus === 'current'
        ? { label: '当前吸烟', evidence: '生活方式记录显示当前吸烟' }
        : null;
    },
  },
  {
    id: 'high_salt_diet',
    appliesTo: ['hypertension'],
    points: 1,
    evaluate(input) {
      return dietMentionsHighSalt(input.lifestyle?.dietaryRecord)
        ? { label: '单日膳食提示高盐', evidence: '24 小时膳食回顾提示高盐相关内容' }
        : null;
    },
  },
];

export const KNOWN_FACTOR_IDS = new Set(RISK_FACTOR_DEFS.map((d) => d.id));

export function maxPointsFor(diseaseId) {
  return RISK_FACTOR_DEFS
    .filter((d) => d.appliesTo.includes(diseaseId))
    .reduce((s, d) => s + d.points, 0);
}

export function collectFactorsFor(diseaseId, input) {
  const risk = [];
  const protective = [];

  for (const def of RISK_FACTOR_DEFS) {
    if (!def.appliesTo.includes(diseaseId)) continue;
    const hit = def.evaluate(input);
    if (hit) risk.push({ id: def.id, label: hit.label, evidence: hit.evidence, points: def.points });
  }

  const b = input.basicInfo ?? {};
  const l = input.lifestyle ?? {};
  if (b.bmi != null && b.bmi < 24) {
    protective.push({ id: 'bmi_normal', label: 'BMI 处于常用正常范围', evidence: `BMI ${b.bmi}` });
  }
  if (diseaseId === 'hypertension' && l.smokingStatus === 'never') {
    protective.push({ id: 'never_smoked', label: '未吸烟史', evidence: '生活方式记录显示从未吸烟' });
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
