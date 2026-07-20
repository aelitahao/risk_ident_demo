import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

test('comprehensive_profile mode returns mode field and different factor set than lifestyle_screening', async () => {
  await withServer(async (base) => {
    const { status: s1, json: lifestyle } = await req(
      base,
      'POST',
      '/api/v1/users/US-010/prediction',
      { mode: 'lifestyle_screening' },
    );
    const { status: s2, json: comprehensive } = await req(
      base,
      'POST',
      '/api/v1/users/US-010/prediction',
      { mode: 'comprehensive_profile' },
    );

    assert.equal(s1, 200);
    assert.equal(s2, 200);
    assert.equal(lifestyle.mode, 'lifestyle_screening');
    assert.equal(comprehensive.mode, 'comprehensive_profile');
    assert.equal(lifestyle.modeFallback, undefined);
    assert.equal(comprehensive.modeFallback, undefined);

    const lifestyleFactors = new Set(
      lifestyle.diseases.flatMap((d) => d.riskFactors.map((f) => f.id)),
    );
    const comprehensiveFactors = new Set(
      comprehensive.diseases.flatMap((d) => d.riskFactors.map((f) => f.id)),
    );
    assert.notDeepEqual(
      [...lifestyleFactors].sort(),
      [...comprehensiveFactors].sort(),
      'comprehensive_profile should surface a different risk-factor set than lifestyle_screening',
    );
  });
});

test('mode defaults to lifestyle_screening when body has no mode key', async () => {
  await withServer(async (base) => {
    const { status, json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    assert.equal(status, 200);
    assert.equal(json.mode, 'lifestyle_screening');
  });
});

test('questionnaire path echoes mode in response without changing fallback score', async () => {
  await withServer(async (base) => {
    const input = {
      basicInfo: { ageYears: 50, gender: 'male', heightCm: 175, weightKg: 90, bmi: 29.4, waistCm: 100 },
      lifestyle: {
        smokingStatus: 'current',
        alcoholSummary: null,
        physicalActivitySummary: null,
        sedentaryMinutesPerDay: 600,
        weekdaySleepHours: 6,
        weekendSleepHours: 7,
        dietaryRecord: null,
      },
      healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
      featureSchemaVersion: '1.0',
    };
    const { json: a } = await req(base, 'POST', '/api/v1/predictions', {
      input,
      source: 'questionnaire',
      mode: 'lifestyle_screening',
    });
    const { json: b } = await req(base, 'POST', '/api/v1/predictions', {
      input,
      source: 'questionnaire',
      mode: 'comprehensive_profile',
    });
    assert.equal(a.mode, 'lifestyle_screening');
    assert.equal(b.mode, 'comprehensive_profile');
    for (const d of ['diabetes', 'hypertension']) {
      const aa = a.diseases.find((x) => x.diseaseId === d);
      const bb = b.diseases.find((x) => x.diseaseId === d);
      assert.equal(aa.riskLevel, bb.riskLevel, `${d} risk level must match across modes on fallback path`);
    }
  });
});
