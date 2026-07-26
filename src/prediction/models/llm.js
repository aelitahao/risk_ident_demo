// LLM-based prediction model via OpenAI-compatible endpoint (ChatAnywhere)
// Requires: npm install openai
import { readFileSync } from 'node:fs';

export const MODEL_ID = 'llm_v1';

const LLM_API_KEY  = process.env.LLM_API_KEY  ?? 'sk-9K3HSAtRJVL1swyxyKlOKqEtg3dEMjjimfJVFnNjsYLXsxzk';
const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.chatanywhere.tech/v1';
const LLM_MODEL    = process.env.LLM_MODEL    ?? 'deepseek-v4-flash';

const SYSTEM_PROMPT = readFileSync(new URL('./prompt.txt', import.meta.url), 'utf8');

let _client = null;
async function getClient() {
  if (!_client) {
    const { default: OpenAI } = await import('openai');
    _client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: LLM_API_KEY });
  }
  return _client;
}

export async function predict(input) {
  const client = await getClient();
  const completion = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: JSON.stringify(input) },
    ],
    response_format: { type: 'json_object' },
    stream: false,
  });
  const raw = JSON.parse(completion.choices[0].message.content);
  return { diseases: raw.diseases, modelId: MODEL_ID };
}
