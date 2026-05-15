import OpenAI from "openai";

let cached: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  if (cached) return cached;

  const apiKey = process.env.OPENAI_API_KEY ?? process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL ?? process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY must be set. Add it to your .env file or environment.",
    );
  }

  cached = new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
  });
  return cached;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_target, prop, _receiver) {
    const client = getOpenAI();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
