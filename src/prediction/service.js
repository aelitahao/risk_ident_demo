import { validatePredictionInput, validateMode } from './validator.js';
import { getModel } from './models/index.js';
import { format } from './polisher.js';

export async function predict(input, options = {}) {
  validatePredictionInput(input);
  validateMode(options.mode);
  const model = getModel(options.model);
  const raw = await model.predict(input);
  return format(raw, input);
}
