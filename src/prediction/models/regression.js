import { collectFactorsFor, evidenceSummary, maxPointsFor } from '../factors.js';

export const MODEL_ID = 'regression_v1';

export async function predict(input) {
  const ev = evidenceSummary(input);
  const diseases = {};
  for (const id of ['diabetes', 'hypertension']) {
    const { risk, protective } = collectFactorsFor(id, input);
    const raw = risk.reduce((s, f) => s + (f.points ?? 0), 0);
    const score = Math.min(raw / maxPointsFor(id), 1);
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
