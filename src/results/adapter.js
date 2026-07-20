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

export function riskCardToPredictionResult(card, userId, requestedMode = 'lifestyle_screening') {
  let effectiveMode = requestedMode;
  let modeFallback = false;
  let node = card?.mode_results?.[requestedMode];
  if (!node && requestedMode !== 'lifestyle_screening') {
    node = card?.mode_results?.lifestyle_screening;
    if (node) {
      effectiveMode = 'lifestyle_screening';
      modeFallback = true;
    }
  }
  if (!node) throw new Error(`risk card has no usable mode: ${userId}`);
  const diseases = ['diabetes', 'hypertension'].map((d) => mapDisease(d, node.disease_results[d]));
  const boundaryNote = node.disease_results.diabetes?.boundary_note ?? '';
  const result = {
    predictionId: newPredictionId(userId),
    userId: userId ?? null,
    modelVersion: DEMO_ENGINE_ID,
    featureSchemaVersion: SCHEMA_VERSION,
    mode: effectiveMode,
    diseases,
    boundaryNote,
  };
  if (modeFallback) result.modeFallback = true;
  return result;
}

function pickFactorExplanations(list, allowedIds) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((e) => e && typeof e.factor_id === 'string' && allowedIds.has(e.factor_id))
    .map((e) => ({ factorId: e.factor_id, explanation: e.explanation ?? '' }))
    .filter((e) => e.explanation);
}

function buildDiseaseExplanation(diseaseResult, explanationNode) {
  if (!explanationNode) return null;
  const riskIds = new Set(diseaseResult.riskFactors.map((f) => f.id));
  const protectiveIds = new Set(diseaseResult.protectiveFactors.map((f) => f.id));

  const mainFactorExplanations = pickFactorExplanations(explanationNode.main_factor_explanations, riskIds);
  const protectiveFactorExplanations = pickFactorExplanations(
    explanationNode.protective_factor_explanations,
    protectiveIds,
  );
  const riskConclusion = typeof explanationNode.risk_conclusion === 'string' ? explanationNode.risk_conclusion : '';

  if (!riskConclusion && !mainFactorExplanations.length && !protectiveFactorExplanations.length) return null;

  const out = {};
  if (riskConclusion) out.riskConclusion = riskConclusion;
  if (mainFactorExplanations.length) out.mainFactorExplanations = mainFactorExplanations;
  if (protectiveFactorExplanations.length) out.protectiveFactorExplanations = protectiveFactorExplanations;
  return out;
}

export function attachExplanation(result, explanationCard) {
  if (!result || !explanationCard) return result;
  const modeKey = result.mode ?? 'lifestyle_screening';
  const modeNode =
    explanationCard.mode_explanations?.[modeKey] ??
    explanationCard.mode_explanations?.lifestyle_screening;
  if (!modeNode) return result;

  if (typeof modeNode.overall_summary === 'string' && modeNode.overall_summary) {
    result.overallSummary = modeNode.overall_summary;
  }

  const explanationsByDisease = modeNode.disease_explanations ?? {};
  for (const d of result.diseases) {
    const built = buildDiseaseExplanation(d, explanationsByDisease[d.diseaseId]);
    if (built) d.explanation = built;
  }
  return result;
}

export const RESULT_CONSTANTS = { DEMO_ENGINE_ID, SCHEMA_VERSION };
export { newPredictionId };
