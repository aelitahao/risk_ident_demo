export function newPredictionId(userId) {
  const seed = userId ?? 'anon';
  const rand = Math.random().toString(36).slice(2, 10);
  return `pred_${seed}_${Date.now().toString(36)}${rand}`;
}
