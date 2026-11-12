import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOpenAIClient, isOpenAIConfigured, configuredModel, getOpenAITimeoutMs } from '../config/openai.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Determine if an OpenAI error is non-retryable (invalid auth, bad request, missing quota)
 */
function isNonRetryableError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || (err.response && err.response.status);
  const code = err.code || err.error?.code;
  const msg = (err.message || '').toLowerCase();

  // 401 Unauthorized: Invalid API key
  if (status === 401 || code === 'invalid_api_key' || msg.includes('incorrect api key') || msg.includes('invalid api key')) {
    return true;
  }

  // 400 Bad Request: Invalid parameters / unsupported features
  if (status === 400 || code === 'invalid_request_error') {
    return true;
  }

  // 403 Forbidden
  if (status === 403 || msg.includes('permission_denied') || msg.includes('country_not_supported')) {
    return true;
  }

  // 429 Insufficient Quota: Out of credits / billing issue (Do not retry empty balance!)
  if (code === 'insufficient_quota' || msg.includes('insufficient_quota') || msg.includes('exceeded your current quota') || msg.includes('check your plan and billing')) {
    return true;
  }

  // 404 Model Not Found
  if (status === 404 || code === 'model_not_found' || msg.includes('model_not_found') || msg.includes('does not exist')) {
    return true;
  }

  return false;
}

/**
 * Extract retry delay from headers or calculate exponential backoff with jitter
 */
function getRetryAfterMs(err, attempt) {
  let retryAfter = null;
  if (err?.headers && typeof err.headers.get === 'function') {
    retryAfter = err.headers.get('retry-after');
  } else if (err?.headers && err.headers['retry-after']) {
    retryAfter = err.headers['retry-after'];
  }

  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, 5000);
    }
  }

  const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(base + jitter, 5000);
}

/**
 * Determine error category for safe diagnostic logging
 */
function getErrorCategory(err) {
  if (!err) return 'UNKNOWN';
  const status = err.status || err.statusCode;
  const code = err.code || err.error?.code;
  const msg = (err.message || '').toLowerCase();

  if (
    code === 'insufficient_quota' ||
    msg.includes('insufficient_quota') ||
    msg.includes('exceeded your current quota') ||
    msg.includes('check your plan and billing')
  ) {
    return 'INSUFFICIENT_CREDITS';
  }

  if (
    status === 401 ||
    code === 'invalid_api_key' ||
    msg.includes('incorrect api key') ||
    msg.includes('invalid api key') ||
    msg.includes('unauthorized')
  ) {
    return 'INVALID_API_KEY';
  }

  if (
    status === 429 ||
    code === 'rate_limit_exceeded' ||
    msg.includes('rate limit')
  ) {
    return 'RATE_LIMIT';
  }

  if (
    status === 404 ||
    code === 'model_not_found' ||
    msg.includes('model_not_found') ||
    msg.includes('does not exist')
  ) {
    return 'UNSUPPORTED_MODEL';
  }

  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('etimedout')
  ) {
    return 'TIMEOUT';
  }

  if (
    msg.includes('connection error') ||
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('network')
  ) {
    return 'NETWORK_ERROR';
  }

  if (status >= 500) {
    return 'SERVER_ERROR';
  }

  return 'GENERIC_ERROR';
}

/**
 * Produce helpful and friendly human-readable error response based on OpenAI error type
 */
function classifyOpenAIError(err) {
  if (!err) {
    return "Hey buddy! 😅 I'm having trouble connecting right now. Try again in a moment.";
  }

  const category = getErrorCategory(err);

  // Insufficient credits / Billing
  if (category === 'INSUFFICIENT_CREDITS') {
    return "Hey buddy! 😅 It looks like your OpenAI account has run out of credits or exceeded its current quota. Please check your billing details and credit balance on OpenAI, or try again in a bit!";
  }

  // Invalid API Key
  if (category === 'INVALID_API_KEY') {
    return "Hey buddy! 😅 The configured OpenAI API key appears to be invalid or unauthorized. Please verify your OPENAI_API_KEY in the backend settings.";
  }

  // Rate Limiting
  if (category === 'RATE_LIMIT') {
    return "Hey buddy! 😅 OpenAI is experiencing high traffic right now (rate limit reached). Please give it a few seconds and try again!";
  }

  // Unsupported Model
  if (category === 'UNSUPPORTED_MODEL') {
    return "Hey buddy! 😅 The requested OpenAI model is not available to this API project. Please set OPENAI_MODEL to a supported model like 'gpt-4o-mini'.";
  }

  // Timeout
  if (category === 'TIMEOUT') {
    return "Hey buddy! 😅 The request to OpenAI took longer than 60 seconds to respond. Please try asking again in a moment.";
  }

  // Network Error
  if (category === 'NETWORK_ERROR') {
    return "Hey buddy! 😅 I'm having trouble connecting to OpenAI due to a network communication error. Please try again in a moment.";
  }

  return "Hey buddy! 😅 I'm having trouble connecting to OpenAI right now. Try again in a moment.";
}

/**
 * Invoke OpenAI Chat Completion with configurable timeout, retry logic, and safe logging
 */
async function invokeOpenAIWithRetry(client, model, messages, timeoutMs) {
  let attempt = 0;
  const startTime = Date.now();

  while (attempt <= MAX_RETRIES) {
    attempt++;
    const attemptStart = Date.now();
    const elapsed = Date.now() - startTime;
    const remainingBudget = timeoutMs - elapsed;

    if (remainingBudget <= 500) {
      console.warn(`[AI Diagnostic] Provider: OpenAI | Model: ${model} | HTTP Status: 408 | Error Category: TIMEOUT | Attempt: ${attempt} | Elapsed: ${elapsed}ms`);
      throw new Error(`Timeout: Model [${model}] call exceeded ${timeoutMs}ms`);
    }

    try {
      const completion = await client.chat.completions.create(
        {
          model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          timeout: remainingBudget
        }
      );

      const durationMs = Date.now() - attemptStart;
      console.log(`[AI Diagnostic] Provider: OpenAI | Model: ${model} | HTTP Status: 200 | Status: SUCCESS | Attempt: ${attempt} | Duration: ${durationMs}ms`);

      const replyText = completion.choices?.[0]?.message?.content?.trim();
      if (replyText) {
        return {
          reply: replyText,
          source: 'openai',
          model
        };
      }
      throw new Error('Empty response from OpenAI API');
    } catch (err) {
      const durationMs = Date.now() - attemptStart;
      const status = err.status || err.statusCode || (err.message && err.message.includes('Timeout') ? 408 : 500);
      const category = getErrorCategory(err);

      // Safe Diagnostic Logging (Never log private keys, tokens, or queries)
      console.warn(
        `[AI Diagnostic] Provider: OpenAI | Model: ${model} | HTTP Status: ${status} | Error Category: ${category} | Attempt: ${attempt}/${MAX_RETRIES + 1} | Duration: ${durationMs}ms`
      );

      // Halt immediately on non-retryable errors (auth, quota, 400, etc.)
      if (isNonRetryableError(err)) {
        console.warn(`[AI Diagnostic] Non-retryable error [${category}] encountered for model ${model}. Halting retries immediately.`);
        throw err;
      }

      // If timed out or attempts exhausted, throw
      if (category === 'TIMEOUT' || attempt > MAX_RETRIES) {
        throw err;
      }

      // Backoff delay before retry
      const waitMs = getRetryAfterMs(err, attempt - 1);
      if (Date.now() - startTime + waitMs >= timeoutMs) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

/**
 * Infer subscription category from merchant name
 */
function inferCategory(merchantName) {
  const m = (merchantName || '').toLowerCase();
  if (
    m.includes('netflix') ||
    m.includes('spotify') ||
    m.includes('prime') ||
    m.includes('hulu') ||
    m.includes('disney') ||
    m.includes('hotstar') ||
    m.includes('hbo') ||
    m.includes('youtube') ||
    m.includes('apple tv') ||
    m.includes('jiocinema') ||
    m.includes('zee5') ||
    m.includes('sonyliv')
  ) {
    return 'Entertainment';
  }
  if (
    m.includes('copilot') ||
    m.includes('github') ||
    m.includes('chatgpt') ||
    m.includes('openai') ||
    m.includes('claude') ||
    m.includes('notion') ||
    m.includes('slack') ||
    m.includes('zoom')
  ) {
    return 'Productivity';
  }
  if (
    m.includes('gym') ||
    m.includes('fitness') ||
    m.includes('cult') ||
    m.includes('headspace') ||
    m.includes('whoop')
  ) {
    return 'Health';
  }
  if (
    m.includes('adobe') ||
    m.includes('figma') ||
    m.includes('canva') ||
    m.includes('midjourney')
  ) {
    return 'Design';
  }
  if (m.includes('amazon') || m.includes('flipkart') || m.includes('instacart')) {
    return 'Shopping';
  }
  return 'Utilities';
}

/**
 * Fuzzy matcher for merchant name in user's active subscriptions
 */
function findMatchingSubscription(queryLower, subscriptions) {
  return subscriptions.find((s) => {
    const fullName = s.merchant_name.toLowerCase();
    const cleanName = fullName
      .replace(/(premium|family|pro|plus|membership|india|inc|annual|yearly|monthly)\b/gi, '')
      .trim();
    const firstWord = cleanName.split(' ')[0];

    return (
      queryLower.includes(fullName) ||
      (cleanName && queryLower.includes(cleanName)) ||
      (firstWord && firstWord.length > 2 && queryLower.includes(firstWord))
    );
  });
}

/**
 * Natural Language Rule & Intent Extractor for subscription management (Add/Update/Delete)
 */
export function extractChatIntent(userQuestion, subscriptions) {
  const q = userQuestion.trim();
  const lower = q.toLowerCase();

  // 1. ADD INTENT
  const isAdd =
    lower.startsWith('add ') ||
    lower.includes('want to add ') ||
    lower.startsWith('subscribe to ') ||
    lower.startsWith('new subscription ') ||
    lower.includes('create subscription ');

  if (isAdd) {
    const amountMatch = q.match(/(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);
    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;

    let frequency = 'monthly';
    if (lower.includes('yearly') || lower.includes('annual')) frequency = 'yearly';
    else if (lower.includes('weekly')) frequency = 'weekly';
    else if (lower.includes('quarterly')) frequency = 'quarterly';

    let merchant = q
      .replace(/i want to add/i, '')
      .replace(/add/i, '')
      .replace(/subscribe to/i, '')
      .replace(/new subscription/i, '')
      .replace(/create subscription/i, '')
      .replace(/subscription/i, '')
      .replace(/for\s+(?:₹|\$|rs\.?|inr)?\s*\d+(?:\.\d{1,2})?/i, '')
      .replace(/(?:₹|\$|rs\.?|inr)?\s*\d+(?:\.\d{1,2})?/i, '')
      .replace(/\b(monthly|yearly|annual|quarterly|weekly)\b/gi, '')
      .replace(/\b(plan|tier|service)\b/gi, '')
      .trim();

    if (!merchant && amount) merchant = 'Custom Subscription';
    if (merchant && amount) {
      return {
        intent: 'ADD_SUBSCRIPTION',
        data: {
          merchant_name: merchant,
          amount,
          billing_frequency: frequency,
          category: inferCategory(merchant),
          status: 'active'
        }
      };
    }
  }

  // 2. UPDATE INTENT
  const isUpdate =
    lower.includes('change ') ||
    lower.includes('update ') ||
    lower.includes('modify ') ||
    lower.includes('set price ') ||
    lower.includes('new price ');

  if (isUpdate) {
    const matchedSub = findMatchingSubscription(lower, subscriptions);
    const amountMatch =
      q.match(/(?:to|price to|for|is)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i) ||
      q.match(/(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i);

    if (matchedSub && amountMatch) {
      const newAmount = parseFloat(amountMatch[1]);
      return {
        intent: 'UPDATE_SUBSCRIPTION',
        data: {
          id: matchedSub.id,
          merchant_name: matchedSub.merchant_name,
          old_amount: matchedSub.amount,
          new_amount: newAmount,
          billing_frequency: matchedSub.billing_frequency
        }
      };
    }
  }

  // 3. DELETE / CANCEL INTENT
  const isDelete =
    lower.startsWith('cancel ') ||
    lower.startsWith('delete ') ||
    lower.startsWith('remove ') ||
    lower.includes('delete ') ||
    lower.includes('cancel ') ||
    lower.includes('remove ') ||
    lower.includes('unsubscribe ');

  if (isDelete) {
    const matchedSub = findMatchingSubscription(lower, subscriptions);
    if (matchedSub) {
      return {
        intent: 'DELETE_SUBSCRIPTION',
        data: {
          id: matchedSub.id,
          merchant_name: matchedSub.merchant_name,
          amount: matchedSub.amount,
          billing_frequency: matchedSub.billing_frequency
        }
      };
    }
  }

  return null;
}

/**
 * Intelligent Conversational Assistant query handler with Official OpenAI API
 */
export async function askAssistant(userQuestion, contextData = {}) {
  const q = (userQuestion || '').trim();
  const lower = q.toLowerCase();
  const subs = contextData.subscriptions || [];
  const total =
    contextData.totalMonthly ||
    subs.reduce((acc, c) => {
      let m = 1;
      if (c.billing_frequency === 'yearly') m = 1 / 12;
      if (c.billing_frequency === 'quarterly') m = 1 / 3;
      if (c.billing_frequency === 'weekly') m = 4.33;
      return acc + parseFloat(c.amount || 0) * m;
    }, 0);
  const anomalies = contextData.anomalies || [];
  const history = contextData.history || [];

  // Check for direct Action Commands (ADD, UPDATE, DELETE)
  const detectedAction = extractChatIntent(q, subs);

  if (detectedAction) {
    if (detectedAction.intent === 'ADD_SUBSCRIPTION') {
      const { merchant_name, amount, billing_frequency } = detectedAction.data;
      return {
        reply: `Sure! I can add **${merchant_name}** to your subscriptions.\n\n• **Platform:** ${merchant_name}\n• **Amount:** ₹${amount}\n• **Billing cycle:** ${
          billing_frequency.charAt(0).toUpperCase() + billing_frequency.slice(1)
        }\n\nWould you like me to save it?`,
        action: {
          type: 'ADD_SUBSCRIPTION',
          data: detectedAction.data
        },
        source: 'staging'
      };
    }

    if (detectedAction.intent === 'UPDATE_SUBSCRIPTION') {
      const { merchant_name, old_amount, new_amount, billing_frequency } = detectedAction.data;
      return {
        reply: `I found your **${merchant_name}** subscription (currently ₹${old_amount}/${billing_frequency}).\n\n• **Platform:** ${merchant_name}\n• **Updated Amount:** ₹${new_amount}\n• **Billing cycle:** ${
          billing_frequency.charAt(0).toUpperCase() + billing_frequency.slice(1)
        }\n\nWould you like to confirm this price update?`,
        action: {
          type: 'UPDATE_SUBSCRIPTION',
          data: detectedAction.data
        },
        source: 'staging'
      };
    }

    if (detectedAction.intent === 'DELETE_SUBSCRIPTION') {
      const { merchant_name, amount, billing_frequency } = detectedAction.data;
      return {
        reply: `Are you sure you want to cancel and remove **${merchant_name}** (₹${amount}/${billing_frequency}) from your subscription list?`,
        action: {
          type: 'DELETE_SUBSCRIPTION',
          data: detectedAction.data
        },
        source: 'staging'
      };
    }
  }

  // 1. OFFICIAL OPENAI API CALL
  const client = getOpenAIClient();
  if (client) {
    try {
      const systemInstruction = `You are SubGuard AI, a friendly, intelligent, and natural conversational AI assistant for subscription governance.

Personality & Tone:
- Be friendly, warm, helpful, and natural (like an approachable financial buddy).
- Comfortably handle greetings like "hey buddy", "what's up", "hello", or casual check-ins.
- You have expert knowledge of OTT services, pricing in India (INR / ₹), and global streaming platforms.
- When asked for recommendations (e.g. "affordable OTT", "suggest OTT under ₹200", "best OTT for movies"), provide clear, engaging, and cost-effective suggestions with exact pricing.
- Maintain full conversation context and understand follow-up questions naturally.
- Never invent user subscriptions or claims that actions are saved until confirmed.
- When answering financial questions about user spending, refer strictly to the verified database records below.

AUTHENTICATED USER'S ACTUAL DATABASE RECORDS:
- Active Subscriptions (${subs.length}):
${
  subs.length > 0
    ? subs
        .map(
          (s) =>
            `  • ${s.merchant_name}: ₹${s.amount}/${s.billing_frequency} [Category: ${s.category}, Renewal: ${
              s.next_payment_date || 'N/A'
            }${s.is_unused ? ', Inactive/Unused in 30 days' : ''}]`
        )
        .join('\n')
    : '  • None registered yet'
}
- Verified Monthly Run-rate Spend: ₹${Math.round(total)}
- Detected Price Anomalies: ${
        anomalies.length > 0
          ? anomalies.map((a) => `${a.merchant}: ${a.reason}`).join('; ')
          : 'None'
      }

RULES:
1. Casual & General Queries (e.g. "hey buddy", "tell me a joke", "affordable OTT", "suggest OTT under ₹200", "compare Netflix and Prime"): Respond conversationally and helpfully. DO NOT recite the user's spending data unless they ask for it.
2. Financial & Spending Queries: Use the exact database records above.
3. Subscription Changes: If the user wants to add, edit, or cancel a subscription, clearly explain the action and confirm before executing.`;

      // Build normalized multi-turn messages array
      const openAIMessages = [{ role: 'system', content: systemInstruction }];

      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          const text = msg.text || msg.content || '';
          if (!text.trim()) continue;
          const role =
            msg.sender === 'user' || msg.role === 'user' ? 'user' : 'assistant';
          openAIMessages.push({ role, content: text.trim() });
        }
      }

      openAIMessages.push({ role: 'user', content: q });

      // Stable model selection with graceful fallback
      const primaryModel = process.env.OPENAI_MODEL || configuredModel || 'gpt-4o-mini';
      const timeoutMs = getOpenAITimeoutMs();
      let openAIRes;

      try {
        openAIRes = await invokeOpenAIWithRetry(client, primaryModel, openAIMessages, timeoutMs);
      } catch (primaryErr) {
        // If 404 Model Not Found and not already on gpt-3.5-turbo, try gpt-3.5-turbo
        const is404 = primaryErr.status === 404 || primaryErr.code === 'model_not_found';
        if (is404 && primaryModel !== 'gpt-3.5-turbo') {
          console.warn(`[OpenAI] Primary model ${primaryModel} not found. Attempting fallback gpt-3.5-turbo.`);
          openAIRes = await invokeOpenAIWithRetry(client, 'gpt-3.5-turbo', openAIMessages, timeoutMs);
        } else {
          throw primaryErr;
        }
      }

      if (openAIRes && openAIRes.reply) {
        return openAIRes;
      }
    } catch (openAIError) {
      console.error(`[OpenAI] API invocation failed: ${openAIError.message}`);
      const friendlyErrorMsg = classifyOpenAIError(openAIError);

      return {
        reply: friendlyErrorMsg,
        source: 'openai_error',
        error: true
      };
    }
  }

  // 2. INTELLIGENT DETERMINISTIC FALLBACK (When OPENAI_API_KEY is not configured or in offline test mode)
  return generateSafeFallbackResponse(q, subs, total, anomalies);
}

/**
 * Intelligent deterministic response when OpenAI API is unconfigured
 * Ensures questions like "affordable OTT", "suggest OTT under ₹200", and "hey buddy"
 * receive comprehensive, friendly answers without showing the old generic welcome banner.
 */
function generateSafeFallbackResponse(query, subs, total, anomalies) {
  const lower = query.toLowerCase();

  // "hey buddy" / Greetings
  if (
    lower.includes('hey buddy') ||
    lower.includes('hey') ||
    lower.includes('hello') ||
    lower.startsWith('hi') ||
    lower.includes('howdy') ||
    lower.includes('good morning') ||
    lower.includes('good evening')
  ) {
    return {
      reply: `Hey buddy! 😊 Great to connect with you! I'm SubGuard AI, your subscription co-pilot.\n\nI can help you:\n• Find the most affordable OTT platforms & combo bundles (e.g. streaming under ₹200)\n• Compare plans between Netflix, Prime Video, Hotstar, and JioCinema\n• Track your monthly subscription run-rate\n• Add, update, or cancel subscriptions on the fly\n\nWhat are you looking to explore today?`,
      source: 'fallback'
    };
  }

  // "suggest OTT under ₹200" / "OTT under 200"
  if (
    lower.includes('under 200') ||
    lower.includes('under ₹200') ||
    lower.includes('under rs 200') ||
    lower.includes('under 200 rs') ||
    lower.includes('below 200') ||
    lower.includes('200 budget')
  ) {
    return {
      reply: `Here are the top OTT platforms and smart combos available in India for **under ₹200/month**:\n\n1. **JioCinema Premium:** **₹29/month** (Hollywood HBO, Peacock, Warner Bros, 4K streaming & live sports).\n2. **Zee5 All Access:** **₹99/month** (Huge library of Indian originals, movies, and TV shows).\n3. **Netflix Mobile:** **₹149/month** (Full Netflix catalog in 480p on 1 mobile phone or tablet).\n4. **Amazon Prime Video Lite:** **₹799/year (≈ ₹66/month)** (HD streaming on TV or mobile).\n5. **Disney+ Hotstar Super (Annual):** **₹899/year (≈ ₹75/month)** (Marvel, Star Wars, live cricket).\n\n💡 **Best Combo Under ₹200:**\nPair **JioCinema (₹29/mo)** + **Netflix Mobile (₹149/mo)** = **₹178/month total**! You get HBO blockbusters, live sports, and Netflix originals for well under ₹200!`,
      source: 'fallback'
    };
  }

  // "affordable OTT" / Cheap streaming options
  if (
    lower.includes('affordable ott') ||
    lower.includes('cheap ott') ||
    lower.includes('budget ott') ||
    lower.includes('cheap streaming') ||
    lower.includes('low cost ott') ||
    lower.includes('affordable streaming')
  ) {
    return {
      reply: `Here are the most affordable OTT platforms in India for budget-conscious streaming:\n\n• **JioCinema Premium (₹29/month):** Incredible value for HBO Max, Warner Bros, Paramount, and live sports in 4K.\n• **Amazon Prime Video Lite (₹799/year ≈ ₹66/month):** Prime Video streaming on 1 device.\n• **Disney+ Hotstar Super (₹899/year ≈ ₹75/month):** Full access to Marvel, Disney classics, and live sports.\n• **Zee5 All Access (₹99/month or ₹699/year ≈ ₹58/month):** Top regional cinema and originals.\n• **Netflix Mobile (₹149/month):** Solo mobile plan with complete Netflix access.\n\n💡 **Super-Saver Hack:** Stacking **JioCinema (₹29/mo)** + **Disney+ Hotstar (~₹75/mo)** gives you premier Hollywood movies and live cricket for just **₹104/month**!`,
      source: 'fallback'
    };
  }

  // Compare Netflix and Prime Video
  if (
    (lower.includes('compare') && (lower.includes('netflix') || lower.includes('prime'))) ||
    (lower.includes('netflix') && lower.includes('prime'))
  ) {
    return {
      reply: `Here is a direct comparison between **Netflix** and **Amazon Prime Video**:\n\n• **Netflix:**\n  - **Pricing:** ₹149/mo (Mobile, 480p), ₹199/mo (Basic, 720p), ₹499/mo (Standard, 1080p), ₹649/mo (Premium, 4K HDR + 4 devices).\n  - **Strengths:** Industry-leading global original series (Stranger Things, Squid Game), award-winning documentaries, international cinema, and seamless UI.\n  - **Best For:** Binge-watchers of high-production global series.\n\n• **Amazon Prime Video:**\n  - **Pricing:** ₹299/mo or ₹1,499/year (all-in-one Prime membership with free shipping, Prime Music), or Prime Lite at ₹799/year (~₹66/mo).\n  - **Strengths:** Huge catalog of Indian regional blockbusters (Tamil, Telugu, Malayalam, Hindi), Hollywood rentals, and included fast delivery benefits.\n  - **Best For:** Overall household value and regional Indian movies.\n\n💡 **Verdict:** For pure content quality and international releases, pick **Netflix**. For maximum return on investment and shopping perks, pick **Amazon Prime Video**!`,
      source: 'fallback'
    };
  }

  // How can I save money?
  if (
    lower.includes('save money') ||
    lower.includes('cut cost') ||
    lower.includes('reduce spending') ||
    lower.includes('saving tip') ||
    lower.includes('save on subscription')
  ) {
    return {
      reply: `Here are 4 high-impact ways to save money on your subscriptions right now:\n\n1. **Audit Unused Subscriptions:** Check your SubGuard AI Waste Score. Cancelling just 1 unused gym or streaming tier typically saves ₹500–₹1,500 every single month.\n2. **Switch to Annual Billing:** Services like Amazon Prime, Disney+ Hotstar, and Zee5 offer 25% to 45% discounts when billed annually instead of monthly.\n3. **Build a Smart Budget OTT Combo:** Rather than running 3 top-tier plans simultaneously, pair **JioCinema (₹29/mo)** with **Disney+ Hotstar (~₹75/mo)** for just **₹104/month total**.\n4. **Rotate Services:** Binge your favorite season on Netflix for 1 month, pause it, and switch to Prime Video or Hotstar next month!\n\nWant me to audit your current active subscriptions? Just ask: *"How much am I spending monthly?"*`,
      source: 'fallback'
    };
  }

  // Which OTT is best for movies?
  if (lower.includes('which ott') || lower.includes('best for movies') || lower.includes('best streaming')) {
    return {
      reply: `Here's a quick guide to choosing the best OTT platform for movies:\n\n• **Netflix:** Best for global cinema, acclaimed Hollywood blockbusters, and award-winning international originals.\n• **Amazon Prime Video:** Best for Indian regional blockbusters, Bollywood releases, and classic Hollywood hits.\n• **Disney+ Hotstar:** Unbeatable for Marvel Studios, Star Wars, Pixar, Disney family entertainment, and live sports.\n• **JioCinema:** Best budget option (₹29/mo) for HBO prestige films (Oppenheimer, Dune, The Dark Knight).\n\nTell me your favorite genres and I can tailor a personalized recommendation!`,
      source: 'fallback'
    };
  }

  // Spending / Monthly financial inquiry
  if (
    lower.includes('spending') ||
    lower.includes('total') ||
    lower.includes('how much') ||
    lower.includes('monthly') ||
    lower.includes('expense') ||
    lower.includes('cost')
  ) {
    const count = subs.length;
    if (count === 0) {
      return {
        reply: `You currently have **0 active subscriptions** tracked in SubGuard AI. Your current monthly run-rate spend is **₹0**.\n\nWant to add one? Try saying: *"Add Netflix for ₹649 monthly"* or *"Add Spotify for ₹119"*.`,
        source: 'fallback'
      };
    }

    return {
      reply: `You are currently spending **₹${Math.round(total)}/month** across **${count} active subscription${count > 1 ? 's' : ''}**:\n\n${subs
        .map((s) => `• **${s.merchant_name}**: ₹${s.amount}/${s.billing_frequency}`)
        .join('\n')}\n\nProjected annual commitment: **₹${Math.round(total * 12)}/year**.`,
      source: 'fallback'
    };
  }

  // Joke
  if (lower.includes('joke') || lower.includes('funny')) {
    return {
      reply: `Why did the gym membership break up with the bank account?\n\nBecause it was taking all the money but never showing up! 😂`,
      source: 'fallback'
    };
  }

  // Capabilities / What can you do?
  if (
    lower.includes('what can you do') ||
    lower.includes('what do you do') ||
    lower.includes('help me with') ||
    lower.includes('features')
  ) {
    return {
      reply: `I can help you with:\n• **Auditing spending:** Ask *"How much am I spending monthly?"* or *"List my subscriptions"*\n• **OTT comparisons:** Ask *"Affordable OTT"*, *"Suggest OTT under ₹200"*, or *"Which OTT is best for movies?"*\n• **Adding subscriptions:** Say *"Add Hotstar for ₹299 monthly"*\n• **Updating prices:** Say *"Change Netflix price to ₹649"*\n• **Cancelling services:** Say *"Cancel Spotify"*\n• **Casual conversations:** Say *"Hey buddy!"* or ask for recommendations!`,
      source: 'fallback'
    };
  }

  // Helpful conversational guidance (Never the generic welcome banner)
  return {
    reply: `I'm here to help you manage your subscriptions, compare OTT plans, and audit spending! Try asking me: *"Show affordable OTTs"*, *"Suggest OTT under ₹200"*, or *"How much am I spending monthly?"*.\n\n*(To activate live generative responses with OpenAI, configure OPENAI_API_KEY in your backend environment).*`,
    source: 'fallback'
  };
}

/**
 * Health check endpoint for OpenAI connectivity
 */
export async function checkOpenAIHealth() {
  const configured = isOpenAIConfigured();
  const primaryModel = process.env.OPENAI_MODEL || configuredModel || 'gpt-4o-mini';

  if (!configured) {
    return {
      status: 'unconfigured',
      configured: false,
      message: 'OPENAI_API_KEY is not set in backend environment. Fallback responses active.',
      model: primaryModel,
      provider: 'openai'
    };
  }

  const client = getOpenAIClient();
  try {
    const testRes = await client.chat.completions.create(
      {
        model: primaryModel,
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5
      },
      { timeout: 8000 }
    );

    return {
      status: 'connected',
      configured: true,
      model: primaryModel,
      provider: 'openai',
      openAIResponse: testRes.choices?.[0]?.message?.content?.trim() || 'Connected',
      sdk: 'openai'
    };
  } catch (err) {
    return {
      status: 'error',
      configured: true,
      model: primaryModel,
      provider: 'openai',
      error: err.message,
      errorCode: err.code || err.status || 'UNKNOWN'
    };
  }
}

/**
 * Generate financial analysis summary with OpenAI
 */
export async function generateFinancialAnalysis(contextData = {}) {
  const subs = contextData.subscriptions || [];
  const total = contextData.totalMonthly || 0;
  const anomalies = contextData.anomalies || [];

  const client = getOpenAIClient();
  const model = process.env.OPENAI_MODEL || configuredModel || 'gpt-4o-mini';

  if (client) {
    try {
      const prompt = `Analyze this subscription portfolio:\n- Active subscriptions: ${subs.length}\n- Monthly spend: ₹${total}\n- Anomalies: ${JSON.stringify(anomalies)}\n\nProvide a concise 2-sentence financial health summary.`;
      const res = await client.chat.completions.create(
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 150
        },
        { timeout: 15000 }
      );
      const text = res.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.warn('[OpenAI] Financial analysis fallback engaged:', err.message);
    }
  }

  return `Your active subscription portfolio comprises ${subs.length} service${subs.length === 1 ? '' : 's'} totaling ₹${Math.round(total)}/month. ${
    anomalies.length > 0
      ? `Attention: ${anomalies.length} price anomaly was detected requiring review.`
      : 'All recurring billing amounts are stable with zero detected price hikes.'
  }`;
}

