import { newPredictionId } from '../results/adapter.js';

const DEMO_BOUNDARY = '结果来自演示模型，不是患病概率、未来发病预测或临床诊断。';

function scoreToLevel(score) {
  if (score < 0.25) return 'low';
  if (score < 0.6)  return 'medium';
  return 'high';
}

function levelToPriority(level) {
  return level === 'high' ? 'priority' : level === 'medium' ? 'routine' : 'monitor';
}

export function format(rawPrediction, input) {
  const userId = input.userId ?? null;
  const diseases = ['diabetes', 'hypertension'].map((id) => {
    const d = rawPrediction.diseases[id];
    const level = scoreToLevel(d.score);
    const out = {
      diseaseId: id,
      riskLevel: level,
      screeningPriority: levelToPriority(level),
      evidenceLevel: d.evidenceLevel ?? 'sufficient',
      riskFactors: d.riskFactors ?? [],
      protectiveFactors: d.protectiveFactors ?? [],
    };
    if (d.missingEvidenceFields) out.missingEvidenceFields = d.missingEvidenceFields;
    return out;
  });

  return {
    predictionId: newPredictionId(userId),
    userId,
    modelVersion: rawPrediction.modelId,
    featureSchemaVersion: '1.0',
    diseases,
    boundaryNote: DEMO_BOUNDARY,
  };
}
