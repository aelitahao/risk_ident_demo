import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { predict } from '../src/prediction/service.js';
import { profileToPredictionInput } from '../src/prediction/mapper.js';

test('predict() is the single entry point for both DB and questionnaire flows', async () => {
  const doc = JSON.parse(readFileSync(new URL('../data/demo/user_profiles.json', import.meta.url), 'utf8'));
  const profile = doc.profiles.find((p) => p.user_id === 'US-001');
  const dbInput = profileToPredictionInput(profile);
  const questionnaireInput = { ...dbInput, userId: null };

  const dbResult = await predict(dbInput);
  const anonResult = await predict(questionnaireInput);

  assert.equal(dbResult.diseases.length, 2);
  assert.equal(anonResult.diseases.length, 2);
  for (const r of [dbResult, anonResult]) {
    assert.equal(r.featureSchemaVersion, '1.0');
    assert.ok(typeof r.modelVersion === 'string');
    assert.ok(typeof r.boundaryNote === 'string');
  }
  assert.equal(dbResult.userId, 'US-001');
  assert.equal(anonResult.userId, null);
});
