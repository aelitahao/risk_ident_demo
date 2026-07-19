import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withServer, req } from './_helpers.js';

function containsForbidden(obj) {
  const forbidden = ['demo_score', 'demoScore', 'contribution_points', 'contributionPoints'];
  const seen = [];
  const stack = [obj];
  while (stack.length) {
    const node = stack.pop();
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item);
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) {
        if (forbidden.includes(k)) seen.push(k);
        stack.push(v);
      }
    }
  }
  return seen;
}

test('prediction response contains no internal scores or contribution points', async () => {
  await withServer(async (base) => {
    const { json } = await req(base, 'POST', '/api/v1/users/US-001/prediction');
    const leaks = containsForbidden(json);
    assert.deepEqual(leaks, [], `leaked internal keys: ${leaks.join(', ')}`);
  });
});
