import { readFileSync } from 'node:fs';

export const MODEL_ID = 'llm_v1';

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.chatanywhere.tech/v1';
const LLM_MODEL    = process.env.LLM_MODEL    ?? 'deepseek-v4-flash';

const SYSTEM_PROMPT = readFileSync(new URL('./prompt.txt', import.meta.url), 'utf8');

function requireApiKey() {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error('LLM_API_KEY env var is required when PREDICTION_MODEL=llm');
  return key;
}

let _client = null;
async function getClient() {
  if (!_client) {
    const { default: OpenAI } = await import('openai');
    _client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: requireApiKey() });
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
