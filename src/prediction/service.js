import { validatePredictionInput, validateMode } from './validator.js';
import { hasRiskCard, getRiskCard, getExplanation } from '../repository.js';
import { riskCardToPredictionResult, attachExplanation } from '../results/adapter.js';
import { fallbackPredict } from './engine.js';

export function predict(input, options = {}) {
  validatePredictionInput(input);
  const mode = validateMode(options.mode);
  if (input.userId && hasRiskCard(input.userId)) {
    const result = riskCardToPredictionResult(getRiskCard(input.userId), input.userId, mode);
    const explanationCard = getExplanation(input.userId);
    if (explanationCard) attachExplanation(result, explanationCard);
    return result;
  }
  return fallbackPredict(input, mode);
}
