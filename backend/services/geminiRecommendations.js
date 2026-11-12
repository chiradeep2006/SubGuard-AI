/**
 * SubGuard AI - Optimized AI Recommendations Engine (Powered by OpenAI)
 * Strictly scoped to intelligent AI reasoning: personalized explanations, smart savings tips,
 * and spending suggestions based on pre-aggregated financial metrics.
 */

import { isOpenAIConfigured, getOpenAIClient, configuredModel as openAIConfiguredModel, getOpenAITimeoutMs } from '../config/openai.js';
import { isGeminiConfigured, getGeminiClient, configuredModel as geminiConfiguredModel, geminiTimeoutMs } from '../config/gemini.js';

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
 * Generate AI-powered personalized recommendations with OpenAI (with fallback to Gemini & Algorithmic)
 */
export async function generateGeminiRecommendations(summary, anomalies) {
  // 1. Try OpenAI if configured
  if (isOpenAIConfigured()) {
    const openAIClient = getOpenAIClient();
    if (openAIClient) {
      const model = process.env.OPENAI_MODEL || openAIConfiguredModel || 'gpt-4o-mini';
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
}`;

      try {
        const timeoutMs = getOpenAITimeoutMs();
        const response = await openAIClient.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: `Financial Context:\n${JSON.stringify(compactContext, null, 2)}\n\nProvide up to 3 high-impact recommendations and 3 crisp savings tips.` }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
          },
          { timeout: timeoutMs }
        );

        const content = response.choices?.[0]?.message?.content?.trim();
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed.recommendations) && Array.isArray(parsed.personalizedSavingsTips)) {
            return {
              recommendations: parsed.recommendations,
              personalizedSavingsTips: parsed.personalizedSavingsTips,
              source: 'openai',
              model
            };
          }
        }
      } catch (openAIErr) {
        console.warn('[OpenAI Recommendations] Fallback engaged:', openAIErr.message);
      }
    }
  }

  // 2. Fallback to Gemini if configured
  if (isGeminiConfigured()) {
    const client = getGeminiClient();
    if (client) {
      const model = process.env.GEMINI_MODEL || geminiConfiguredModel || 'gemini-3-flash-preview';
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

      const timeoutMs = geminiTimeoutMs || 30000;
      let timeoutId;
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Timeout: Recommendations call exceeded ${timeoutMs}ms`)), timeoutMs);
      });

      try {
        const callPromise = (async () => {
          const primaryModel = model || 'gemini-3-flash-preview';
          try {
            const response = await client.models.generateContent({
              model: primaryModel,
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              config: {
                systemInstruction,
                temperature: 0.3,
                responseMimeType: 'application/json'
              }
            });
            if (response?.text) return response;
          } catch (mErr) {
            if ((mErr.status === 404 || (mErr.message || '').includes('not found')) && primaryModel !== 'gemini-3.5-flash') {
              console.warn(`[Gemini Recommendations] Primary model ${primaryModel} not found, trying gemini-3.5-flash`);
              const fallbackRes = await client.models.generateContent({
                model: 'gemini-3.5-flash',
                contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
                config: {
                  systemInstruction,
                  temperature: 0.3,
                  responseMimeType: 'application/json'
                }
              });
              if (fallbackRes?.text) return fallbackRes;
            } else {
              throw mErr;
            }
          }
          return null;
        })();

        const result = await Promise.race([callPromise, timeoutPromise]);
        clearTimeout(timeoutId);
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
        clearTimeout(timeoutId);
        console.warn('[Gemini Recommendations] Fallback engaged:', err.message);
      }
    }
  }

  // 3. Graceful fallback to deterministic algorithmic recommendations
  return generateAlgorithmicRecommendations(summary, anomalies);
}

