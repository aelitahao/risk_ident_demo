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

const profileById = new Map();
for (const p of profilesDoc.profiles) profileById.set(p.user_id, p);

export function listProfiles() {
  return profilesDoc.profiles;
}

export function getProfile(userId) {
  return profileById.get(userId) ?? null;
}

export function hasProfile(userId) {
  return profileById.has(userId);
}
