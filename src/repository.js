import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = resolve(HERE, '..', 'data', 'demo');

function loadJson(filename) {
  const raw = readFileSync(resolve(DEMO_DIR, filename), 'utf8');
  return JSON.parse(raw);
}

const profilesDoc = loadJson('user_profiles.json');
const riskResultsDoc = loadJson('risk_results.json');
const explanationsDoc = loadJson('risk_explanations.json');

const profileById = new Map();
for (const p of profilesDoc.profiles) profileById.set(p.user_id, p);

const riskCardById = new Map();
for (const c of riskResultsDoc.risk_cards) riskCardById.set(c.user_id, c);

const explanationById = new Map();
for (const c of explanationsDoc.explanation_cards) explanationById.set(c.user_id, c);

export function listProfiles() {
  return profilesDoc.profiles;
}

export function getProfile(userId) {
  return profileById.get(userId) ?? null;
}

export function hasProfile(userId) {
  return profileById.has(userId);
}

export function getRiskCard(userId) {
  return riskCardById.get(userId) ?? null;
}

export function hasRiskCard(userId) {
  return riskCardById.has(userId);
}

export function getExplanation(userId) {
  return explanationById.get(userId) ?? null;
}
