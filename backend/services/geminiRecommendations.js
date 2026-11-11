/**
 * SubGuard AI - Optimized Gemini Recommendations Engine
 * Strictly scoped to intelligent AI reasoning: personalized explanations, smart savings tips,
 * and spending suggestions based on pre-aggregated financial metrics.
 */

import { GoogleGenAI } from '@google/genai';
import { isGeminiConfigured, getGeminiClient, configuredModel } from '../config/gemini.js';

/**
 * Generate smart deterministic fallback recommendations (Zero latency)
 */
export function generateAlgorithmicRecommendations(summary, anomalies) {
  const recommendations = [];
  const tips = [];

  // Anomaly recommendation
  if (anomalies && anomalies.length > 0) {
    const primary = anomalies[0];
    recommendations.push({
      title: `Price Hike on ${primary.merchant}`,
      description: `${primary.merchant} charged ₹${primary.chargedAmount} vs baseline ₹${primary.baselineAmount} (+₹${primary.delta}). Contact support or adjust registered tier.`,
      severity: 'high',
      potentialSaving: primary.delta || 150
    });
  }

  // Unused subscription recommendation
  if (summary.unusedSubscriptions && summary.unusedSubscriptions.length > 0) {
    for (const unused of summary.unusedSubscriptions) {
      recommendations.push({
        title: `Underutilized ${unused.merchant_name}`,
        description: `Zero activity logged in past 30 days for ${unused.merchant_name}. Pausing or cancelling will trim unnecessary run-rate spend.`,
        severity: 'high',
        potentialSaving: Math.round(parseFloat(unused.amount || 0))
      });
      tips.push(`Cancel or pause inactive ${unused.merchant_name} (Save ₹${unused.amount}/month).`);
    }
  }

  // Overlap / streaming recommendation
  if (summary.activeSubscriptions >= 4) {
    recommendations.push({
      title: 'Optimize Overlapping Streaming Tiers',
      description: 'Audit concurrent video and music streaming subscriptions to combine into family bundles or annual plans.',
      severity: 'medium',
      potentialSaving: 350
    });
  }

  // General tips
  if (tips.length === 0) {
    tips.push('Audit active subscriptions to identify unbilled trials.');
  }
  tips.push('Shift eligible monthly subscriptions (e.g. Adobe or Amazon) to annual billing for up to 16% discount.');
  tips.push('Set up PayPal sandbox pre-renewal alerts 3 days prior to recurring charges.');

  return {
    recommendations,
    personalizedSavingsTips: tips,
    source: 'smart_engine',
    model: 'deterministic_optimizer'
  };
}

/**
 * Generate AI-powered personalized recommendations with Google Gemini SDK
 */
export async function generateGeminiRecommendations(summary, anomalies) {
  // If Gemini API is not configured, return smart algorithmic recommendations instantly
  if (!isGeminiConfigured()) {
    return generateAlgorithmicRecommendations(summary, anomalies);
  }

  const client = getGeminiClient();
  if (!client) {
    return generateAlgorithmicRecommendations(summary, anomalies);
  }

  const model = process.env.GEMINI_MODEL || configuredModel || 'gemini-3-flash-preview';

  // Compact prompt containing ONLY summarized metrics (Zero raw transaction clutter)
  const compactContext = {
    monthlyRunrate: summary.monthlySpending,
    activeCount: summary.activeSubscriptions,
    budgetThreshold: summary.budget || 5000,
    highestSpend: summary.highestExpense ? `${summary.highestExpense.merchant_name} (₹${summary.highestExpense.amount}/${summary.highestExpense.billing_frequency})` : 'N/A',
    unusedSubs: summary.unusedSubscriptions || [],
    detectedAnomalies: anomalies.map((a) => `${a.merchant}: +₹${a.delta} (Charged ₹${a.chargedAmount} vs ₹${a.baselineAmount})`)
  };

  const systemInstruction = `You are SubGuard AI's Financial Optimization Engine.
Given the summarized user subscription metrics, return actionable, concise recommendations and savings tips.
Output MUST be valid JSON matching this schema:
{
  "recommendations": [
    {
      "title": "string",
      "description": "string",
      "severity": "high" | "medium" | "low",
      "potentialSaving": number
    }
  ],
  "personalizedSavingsTips": [ "string" ]
}
Do not include markdown code fences or conversational greetings. Output only raw JSON.`;

  const userPrompt = `Financial Context:
${JSON.stringify(compactContext, null, 2)}

Provide up to 3 high-impact recommendations and 3 crisp savings tips.`;

  // Timeout wrapper: 12s timeout allows Gemini model generation while preventing indefinite hangs
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Gemini API call timed out')), 12000)
  );

  try {
    const callPromise = (async () => {
      const candidateModels = [
        model,
        'gemini-flash-latest',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash'
      ];
      const uniqueModels = [...new Set(candidateModels.filter(Boolean))];

      for (const m of uniqueModels) {
        try {
          const response = await client.models.generateContent({
            model: m,
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            config: {
              systemInstruction,
              temperature: 0.3,
              responseMimeType: 'application/json'
            }
          });
          if (response?.text) return response;
        } catch (mErr) {
          console.warn(`Recommendations model [${m}] fallback:`, mErr.message);
        }
      }
      return null;
    })();

    const result = await Promise.race([callPromise, timeoutPromise]);
    const text = result?.text?.trim();

    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.recommendations) && Array.isArray(parsed.personalizedSavingsTips)) {
          return {
            recommendations: parsed.recommendations,
            personalizedSavingsTips: parsed.personalizedSavingsTips,
            source: 'gemini',
            model
          };
        }
      } catch (parseErr) {
        // Clean markdown backticks if present
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        return {
          recommendations: parsed.recommendations,
          personalizedSavingsTips: parsed.personalizedSavingsTips,
          source: 'gemini',
          model
        };
      }
    }
  } catch (err) {
    console.warn('Gemini Recommendations fallback engaged:', err.message);
  }

  // Graceful fallback to deterministic recommendations
  return generateAlgorithmicRecommendations(summary, anomalies);
}

