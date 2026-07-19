import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('GET /api/v1/users/:id returns PredictionInput-shaped profile', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'GET', '/api/v1/users/US-001');
    assert.equal(status, 200);
    assert.equal(json.userId, 'US-001');
    const p = json.profile;
    assert.equal(p.featureSchemaVersion, '1.0');
    assert.ok(p.basicInfo);
    assert.ok(p.lifestyle);
    assert.ok(p.healthHistory);
    assert.ok(['male', 'female', 'other'].includes(p.basicInfo.gender));
    assert.ok(Array.isArray(p.healthHistory.knownDiseases));
    assert.ok(Array.isArray(p.healthHistory.currentSymptoms));
  });
});

test('GET /api/v1/users/:id returns 404 for unknown user', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'GET', '/api/v1/users/NOT-EXIST');
    assert.equal(status, 404);
    assert.equal(json.error.code, 'USER_NOT_FOUND');
  });
});
