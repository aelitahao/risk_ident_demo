import { readFileSync } from 'node:fs';
import { validateAndSanitise } from './llm_schema.js';
import * as regression from './regression.js';

export const MODEL_ID = 'llm_v1';

const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.chatanywhere.tech/v1';
const LLM_MODEL    = process.env.LLM_MODEL    ?? 'deepseek-v4-flash';
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 20000);

const SYSTEM_PROMPT = readFileSync(new URL('./prompt.txt', import.meta.url), 'utf8');

function requireApiKey() {
  const key = process.env.LLM_API_KEY;
  if (!key) throw new Error('LLM_API_KEY env var is required when PREDICTION_MODEL=llm');
  return key;
}

let _client = null;
export async function getClient(override) {
  if (override) return override;
  if (!_client) {
    const { default: OpenAI } = await import('openai');
    _client = new OpenAI({ baseURL: LLM_BASE_URL, apiKey: requireApiKey() });
  }
  return _client;
}

async function callLlm(client, input) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), LLM_TIMEOUT_MS);
  try {
    const completion = await client.chat.completions.create(
      {
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: JSON.stringify(input) },
        ],
        response_format: { type: 'json_object' },
        stream: false,
      },
      { signal: ac.signal },
    );
    return JSON.parse(completion.choices[0].message.content);
  } finally {
    clearTimeout(timer);
  }
}

function isNetworkError(err) {
  return (
    err?.name === 'AbortError' ||
    err?.code === 'ECONNRESET' ||
    err?.code === 'ENOTFOUND' ||
    err?.message?.includes('fetch failed') ||
    err?.message?.includes('network')
  );
}

async function fallback(input, reason) {
  console.warn('[llm] falling back to regression:', reason);
  const result = await regression.predict(input);
  return { ...result, modelId: regression.MODEL_ID };
}

export async function predict(input, _clientOverride) {
  const client = await getClient(_clientOverride);

  let raw;
  try {
    raw = await callLlm(client, input);
  } catch (err) {
    if (!isNetworkError(err)) {
      return fallback(input, err.message);
    }
    try {
      raw = await callLlm(client, input);
    } catch (retryErr) {
      return fallback(input, retryErr.message);
    }
  }

  let sanitised;
  try {
    sanitised = validateAndSanitise(raw);
  } catch (err) {
    return fallback(input, err.message);
  }

  return { diseases: sanitised.diseases, modelId: MODEL_ID };
}
