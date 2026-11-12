import dns from 'node:dns';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const apiKey = process.env.OPENAI_API_KEY || '';
export const configuredModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export function getOpenAITimeoutMs() {
  return parseInt(process.env.OPENAI_TIMEOUT_MS || '60000', 10);
}

export function isOpenAIConfigured() {
  const key = process.env.OPENAI_API_KEY || apiKey;
  return Boolean(
    key &&
    key.trim().length > 10 &&
    key !== 'YOUR_API_KEY' &&
    !key.includes('placeholder')
  );
}

export function getOpenAIClient() {
  if (!isOpenAIConfigured()) {
    return null;
  }
  const key = (process.env.OPENAI_API_KEY || apiKey).trim();
  const timeoutMs = getOpenAITimeoutMs();
  return new OpenAI({
    apiKey: key,
    timeout: timeoutMs,
    maxRetries: 0 // We handle retries explicitly in invokeOpenAIWithRetry for precise backoff & safe logging
  });
}

