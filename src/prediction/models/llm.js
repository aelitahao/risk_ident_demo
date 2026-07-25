// LLM-based prediction model using DeepSeek via OpenAI-compatible SDK
// Requires: npm install openai

export const MODEL_ID = 'llm_deepseek_v1';

const LLM_API_KEY  = process.env.LLM_API_KEY  ?? 'sk-c225e3a386bc4958ba44268a559f61f1';
const LLM_BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.deepseek.com';
const LLM_MODEL    = process.env.LLM_MODEL    ?? 'deepseek-v4-flash';

const SYSTEM_PROMPT = `You are a clinical risk screening assistant.
Given a structured patient profile, return a JSON object with this exact shape:
{
  "diseases": {
    "diabetes":     { "score": <0.0-1.0>, "riskFactors": [{"id":"...","label":"...","evidence":"..."}], "protectiveFactors": [...] },
    "hypertension": { "score": <0.0-1.0>, "riskFactors": [...], "protectiveFactors": [...] }
  }
}
score 0.0 = minimal risk, 1.0 = very high risk. Respond with valid JSON only, no prose.`;

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
    thinking: { type: 'enabled' },
    reasoning_effort: 'low',
    stream: false,
  });
  const raw = JSON.parse(completion.choices[0].message.content);
  return { diseases: raw.diseases, modelId: MODEL_ID };
}
