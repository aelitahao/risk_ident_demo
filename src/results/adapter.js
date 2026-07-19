const RISK_LEVEL_MAP = {
  '低风险': 'low',
  '中风险': 'medium',
  '高风险': 'high',
};

const PRIORITY_MAP = {
  '持续关注': 'monitor',
  '常规筛查': 'routine',
  '优先筛查': 'priority',
};

const EVIDENCE_MAP = {
  '较充分': 'sufficient',
  '充分': 'sufficient',
  '有限': 'limited',
};

const DEMO_ENGINE_ID = 'demo_placeholder_rule_engine_v2';
const SCHEMA_VERSION = '1.0';

function mapFactors(list) {
  if (!Array.isArray(list)) return [];
  return list.map((f) => ({
    id: f.factor_id,
    label: f.label,
    evidence: f.evidence ?? '',
  }));
}

function mapDisease(diseaseId, node) {
  return {
    diseaseId,
    riskLevel: RISK_LEVEL_MAP[node.risk_level] ?? 'low',
    screeningPriority: PRIORITY_MAP[node.screening_priority] ?? 'monitor',
    evidenceLevel: EVIDENCE_MAP[node.evidence_level] ?? 'sufficient',
    riskFactors: mapFactors(node.major_risk_factors),
    protectiveFactors: mapFactors(node.protective_factors),
  };
}

function newPredictionId(userId) {
  const seed = userId ?? 'anon';
  const rand = Math.random().toString(36).slice(2, 10);
  return `pred_${seed}_${Date.now().toString(36)}${rand}`;
}

export function riskCardToPredictionResult(card, userId) {
  const mode = card?.mode_results?.lifestyle_screening;
  if (!mode) throw new Error(`risk card missing lifestyle_screening: ${userId}`);
  const diseases = ['diabetes', 'hypertension'].map((d) => mapDisease(d, mode.disease_results[d]));
  const boundaryNote = mode.disease_results.diabetes?.boundary_note ?? '';
  return {
    predictionId: newPredictionId(userId),
    userId: userId ?? null,
    modelVersion: DEMO_ENGINE_ID,
    featureSchemaVersion: SCHEMA_VERSION,
    diseases,
    boundaryNote,
  };
}

export const RESULT_CONSTANTS = { DEMO_ENGINE_ID, SCHEMA_VERSION };
export { newPredictionId };
