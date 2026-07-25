import { collectFactorsFor, evidenceSummary } from '../engine.js';

export const MODEL_ID = 'regression_v1';

// max reachable points per disease (used to normalise to 0-1)
const MAX_POINTS = { diabetes: 6, hypertension: 7 };

export async function predict(input) {
  const ev = evidenceSummary(input);
  const diseases = {};
  for (const id of ['diabetes', 'hypertension']) {
    const { risk, protective } = collectFactorsFor(id, input);
    const raw = risk.reduce((s, f) => s + (f.points ?? 0), 0);
    const score = Math.min(raw / MAX_POINTS[id], 1);
    diseases[id] = {
      score,
      riskFactors: risk.map(({ id: fid, label, evidence }) => ({ id: fid, label, evidence })),
      protectiveFactors: protective.map(({ id: fid, label, evidence }) => ({ id: fid, label, evidence })),
      evidenceLevel: ev.level,
    };
    if (ev.level === 'limited') diseases[id].missingEvidenceFields = ev.missing;
  }
  return { diseases, modelId: MODEL_ID };
}
