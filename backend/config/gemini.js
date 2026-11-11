import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
export const configuredModel = process.env.GEMINI_MODEL || 'gemini-flash-latest';

export function isGeminiConfigured() {
  return Boolean(
    apiKey &&
    apiKey.trim().length > 10 &&
    apiKey !== 'YOUR_API_KEY' &&
    !apiKey.includes('placeholder')
  );
}

export function getGeminiClient() {
  if (!isGeminiConfigured()) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

export const ai = isGeminiConfigured() ? new GoogleGenAI({ apiKey }) : null;
