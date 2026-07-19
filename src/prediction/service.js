import { validatePredictionInput } from './validator.js';
import { hasRiskCard, getRiskCard } from '../repository.js';
import { riskCardToPredictionResult } from '../results/adapter.js';
import { fallbackPredict } from './engine.js';

export function predict(input) {
  validatePredictionInput(input);
  if (input.userId && hasRiskCard(input.userId)) {
    return riskCardToPredictionResult(getRiskCard(input.userId), input.userId);
  }
  return fallbackPredict(input);
}
