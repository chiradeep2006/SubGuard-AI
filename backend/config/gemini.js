import dns from 'node:dns';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

if (typeof dns.setDefaultResultOrder === 'function') {
  dns.setDefaultResultOrder('ipv4first');
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
export const configuredModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

export function getGeminiTimeoutMs() {
  return parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);
}

export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY || apiKey;
  return Boolean(
    key &&
    key.trim().length > 10 &&
    key !== 'YOUR_API_KEY' &&
    !key.includes('placeholder')
  );
}

export function getGeminiClient() {
  if (!isGeminiConfigured()) {
    return null;
  }
  const key = process.env.GEMINI_API_KEY || apiKey;
  return new GoogleGenAI({ apiKey: key.trim() });
}

export const ai = isGeminiConfigured() ? new GoogleGenAI({ apiKey: (process.env.GEMINI_API_KEY || apiKey).trim() }) : null;
