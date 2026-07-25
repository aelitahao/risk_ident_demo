import * as regression from './regression.js';
import * as llm from './llm.js';

const MODELS = { regression, llm };

export function getModel(name) {
  const key = name ?? process.env.PREDICTION_MODEL ?? 'regression';
  const model = MODELS[key];
  if (!model) throw new Error(`Unknown prediction model: "${key}". Available: ${Object.keys(MODELS).join(', ')}`);
  return model;
}
