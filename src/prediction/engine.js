import { newPredictionId } from '../results/adapter.js';

const FALLBACK_ENGINE_ID = 'demo_fallback_rule_v1';
const SCHEMA_VERSION = '1.0';

const BOUNDARY_NOTE =
  '结果来自演示占位规则，不是患病概率、未来发病预测或临床诊断。';

function scoreToLevel(score) {
  if (score <= 1) return 'low';
  if (score <= 3) return 'medium';
  return 'high';
}

function scoreToPriority(level) {
  return level === 'high' ? 'priority' : level === 'medium' ? 'routine' : 'monitor';
}

function collectFactors(input) {
  const risk = [];
  const protective = [];
  const b = input.basicInfo ?? {};
  const l = input.lifestyle ?? {};

  const waistThreshold = b.gender === 'female' ? 85 : 90;
  if ((b.bmi != null && b.bmi >= 28) || (b.waistCm != null && b.waistCm >= waistThreshold)) {
    risk.push({ id: 'obesity', label: '体型指标偏高', evidence: `BMI ${b.bmi ?? '未知'}，腰围 ${b.waistCm ?? '未知'} cm`, points: 2 });
  } else if (b.bmi != null && b.bmi < 24) {
    protective.push({ id: 'bmi_normal', label: 'BMI 处于常用正常范围', evidence: `BMI ${b.bmi}` });
  }

  if (b.ageYears != null && b.ageYears >= 45) {
    risk.push({ id: 'age_over_45', label: '年龄 ≥ 45 岁', evidence: `${b.ageYears} 岁`, points: 1 });
  }

  if (l.smokingStatus === 'current') {
    risk.push({ id: 'current_smoking', label: '当前吸烟', evidence: '生活方式记录显示当前吸烟', points: 1 });
  } else if (l.smokingStatus === 'never') {
    protective.push({ id: 'never_smoked', label: '未吸烟史', evidence: '生活方式记录显示从未吸烟' });
  }

  if (l.sedentaryMinutesPerDay != null && l.sedentaryMinutesPerDay >= 480) {
    risk.push({ id: 'sedentary_high', label: '久坐时间较长', evidence: `${l.sedentaryMinutesPerDay} 分钟/天`, points: 1 });
  }

  return { risk, protective };
}

function evidenceLevel(input) {
  const missing = [
    input.basicInfo?.bmi,
    input.basicInfo?.waistCm,
    input.lifestyle?.smokingStatus,
    input.lifestyle?.sedentaryMinutesPerDay,
    input.lifestyle?.weekdaySleepHours,
  ].filter((v) => v == null).length;
  return missing > 2 ? 'limited' : 'sufficient';
}

export function fallbackPredict(input) {
  const { risk, protective } = collectFactors(input);
  const totalScore = risk.reduce((s, f) => s + (f.points ?? 0), 0);
  const level = scoreToLevel(totalScore);
  const priority = scoreToPriority(level);
  const evLevel = evidenceLevel(input);

  const factorPayload = risk.map(({ id, label, evidence }) => ({ id, label, evidence }));
  const protectivePayload = protective.map(({ id, label, evidence }) => ({ id, label, evidence }));

  const disease = (diseaseId) => ({
    diseaseId,
    riskLevel: level,
    screeningPriority: priority,
    evidenceLevel: evLevel,
    riskFactors: factorPayload,
    protectiveFactors: protectivePayload,
  });

  return {
    predictionId: newPredictionId(input.userId ?? null),
    userId: input.userId ?? null,
    modelVersion: FALLBACK_ENGINE_ID,
    featureSchemaVersion: SCHEMA_VERSION,
    diseases: [disease('diabetes'), disease('hypertension')],
    boundaryNote: BOUNDARY_NOTE,
  };
}

export const FALLBACK_CONSTANTS = { FALLBACK_ENGINE_ID };
