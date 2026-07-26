import { getProfile } from '../repository.js';
import { userNotFound, invalidInput } from '../errors.js';
import { profileToPredictionInput } from './mapper.js';
import { predict } from './service.js';

export async function predictForUser({ params }) {
  const profile = getProfile(params.userId);
  if (!profile) throw userNotFound(params.userId);
  const input = profileToPredictionInput(profile);
  return predict(input);
}

export async function predictFromQuestionnaire({ body }) {
  if (!body || typeof body !== 'object') {
    throw invalidInput([{ field: '$', reason: 'request body must be JSON object' }]);
  }
  const { input, source } = body;
  if (!input) throw invalidInput([{ field: 'input', reason: 'required' }]);
  if (source != null && typeof source !== 'string') {
    throw invalidInput([{ field: 'source', reason: 'must be string' }]);
  }
  const normalizedInput = { ...input, userId: input.userId ?? null };
  return predict(normalizedInput);
}
