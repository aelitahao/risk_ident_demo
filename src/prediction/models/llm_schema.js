import { KNOWN_FACTOR_IDS } from '../factors.js';

const VALID_EVIDENCE = new Set(['sufficient', 'limited']);

export function validateAndSanitise(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('LLM output is not an object');
  const { diseases } = raw;
  if (!diseases || typeof diseases !== 'object') throw new Error('missing diseases object');

  for (const id of ['diabetes', 'hypertension']) {
    const d = diseases[id];
    if (!d) throw new Error(`missing disease: ${id}`);
    if (
      typeof d.score !== 'number' ||
      !Number.isFinite(d.score) ||
      d.score < 0 ||
      d.score > 1
    ) {
      throw new Error(`invalid score for ${id}: ${d.score}`);
    }
    if (!Array.isArray(d.riskFactors)) throw new Error(`riskFactors must be array for ${id}`);
    if (!Array.isArray(d.protectiveFactors)) throw new Error(`protectiveFactors must be array for ${id}`);
    if (d.evidenceLevel != null && !VALID_EVIDENCE.has(d.evidenceLevel)) {
      throw new Error(`invalid evidenceLevel for ${id}: ${d.evidenceLevel}`);
    }
  }

  for (const d of Object.values(diseases)) {
    d.riskFactors = d.riskFactors.filter((f) => KNOWN_FACTOR_IDS.has(f.id));
  }

  return { diseases };
}
