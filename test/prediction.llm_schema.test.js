import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndSanitise } from '../src/prediction/models/llm_schema.js';

const validOutput = {
  diseases: {
    diabetes: {
      score: 0.4,
      riskFactors: [{ id: 'age_over_45', label: '年龄', evidence: '50岁' }],
      protectiveFactors: [],
      evidenceLevel: 'sufficient',
    },
    hypertension: {
      score: 0.2,
      riskFactors: [],
      protectiveFactors: [{ id: 'never_smoked', label: '未吸烟', evidence: '记录' }],
      evidenceLevel: 'sufficient',
    },
  },
};

test('valid output passes through unchanged', () => {
  const result = validateAndSanitise(validOutput);
  assert.equal(result.diseases.diabetes.score, 0.4);
  assert.equal(result.diseases.hypertension.score, 0.2);
});

test('missing hypertension throws', () => {
  const bad = { diseases: { diabetes: validOutput.diseases.diabetes } };
  assert.throws(() => validateAndSanitise(bad), /missing disease: hypertension/);
});

test('score as string throws', () => {
  const bad = {
    diseases: {
      ...validOutput.diseases,
      diabetes: { ...validOutput.diseases.diabetes, score: '0.4' },
    },
  };
  assert.throws(() => validateAndSanitise(bad), /invalid score/);
});

test('score above 1 throws', () => {
  const bad = {
    diseases: {
      ...validOutput.diseases,
      diabetes: { ...validOutput.diseases.diabetes, score: 1.5 },
    },
  };
  assert.throws(() => validateAndSanitise(bad), /invalid score/);
});

test('unknown riskFactor id is silently dropped', () => {
  const withGhost = {
    diseases: {
      ...validOutput.diseases,
      diabetes: {
        ...validOutput.diseases.diabetes,
        riskFactors: [
          { id: 'age_over_45', label: '年龄', evidence: '50岁' },
          { id: 'ghost_factor', label: '幽灵', evidence: '编造' },
        ],
      },
    },
  };
  const result = validateAndSanitise(withGhost);
  assert.deepEqual(
    result.diseases.diabetes.riskFactors.map((f) => f.id),
    ['age_over_45'],
  );
});

test('invalid evidenceLevel throws', () => {
  const bad = {
    diseases: {
      ...validOutput.diseases,
      diabetes: { ...validOutput.diseases.diabetes, evidenceLevel: 'unknown' },
    },
  };
  assert.throws(() => validateAndSanitise(bad), /invalid evidenceLevel/);
});

test('null output throws', () => {
  assert.throws(() => validateAndSanitise(null), /not an object/);
});

// --- Integration tests using stub client ---

import { predict } from '../src/prediction/models/llm.js';
import { MODEL_ID as REGRESSION_MODEL_ID } from '../src/prediction/models/regression.js';

const baseInput = {
  basicInfo: { ageYears: 40, gender: 'female', heightCm: 165, weightKg: 65, bmi: 23.9, waistCm: 80 },
  lifestyle: {
    smokingStatus: 'never', alcoholSummary: null, physicalActivitySummary: null,
    sedentaryMinutesPerDay: 300, weekdaySleepHours: 7, weekendSleepHours: 8, dietaryRecord: null,
  },
  healthHistory: { knownDiseases: [], familyHistory: {}, currentSymptoms: [], generalIndicators: {} },
  featureSchemaVersion: '1.0',
};

function makeStub(response) {
  return {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] }),
      },
    },
  };
}

function makeErrorStub(err) {
  return { chat: { completions: { create: async () => { throw err; } } } };
}

const validLlmOutput = {
  diseases: {
    diabetes: { score: 0.3, riskFactors: [], protectiveFactors: [], evidenceLevel: 'sufficient' },
    hypertension: { score: 0.2, riskFactors: [], protectiveFactors: [], evidenceLevel: 'sufficient' },
  },
};

test('llm predict with valid stub returns llm modelId', async () => {
  const result = await predict(baseInput, makeStub(validLlmOutput));
  assert.equal(result.modelId, 'llm_v1');
  assert.ok(result.diseases.diabetes);
  assert.ok(result.diseases.hypertension);
});

test('llm predict with missing disease falls back to regression', async () => {
  const bad = { diseases: { diabetes: validLlmOutput.diseases.diabetes } };
  const result = await predict(baseInput, makeStub(bad));
  assert.equal(result.modelId, REGRESSION_MODEL_ID);
});

test('llm predict with string score falls back to regression', async () => {
  const bad = {
    diseases: {
      diabetes: { ...validLlmOutput.diseases.diabetes, score: '0.4' },
      hypertension: validLlmOutput.diseases.hypertension,
    },
  };
  const result = await predict(baseInput, makeStub(bad));
  assert.equal(result.modelId, REGRESSION_MODEL_ID);
});

test('llm predict with network error on both attempts falls back to regression', async () => {
  const netErr = Object.assign(new Error('fetch failed'), { message: 'fetch failed' });
  const result = await predict(baseInput, makeErrorStub(netErr));
  assert.equal(result.modelId, REGRESSION_MODEL_ID);
});

test('llm predict with ghost factorId drops it silently', async () => {
  const withGhost = {
    diseases: {
      diabetes: {
        score: 0.3,
        riskFactors: [{ id: 'ghost_factor', label: 'ghost', evidence: '' }],
        protectiveFactors: [],
        evidenceLevel: 'sufficient',
      },
      hypertension: validLlmOutput.diseases.hypertension,
    },
  };
  const result = await predict(baseInput, makeStub(withGhost));
  assert.equal(result.modelId, 'llm_v1');
  assert.deepEqual(result.diseases.diabetes.riskFactors, []);
});
