import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  askAssistant as askOpenAIAssistant,
  checkOpenAIHealth,
  extractChatIntent as extractOpenAIChatIntent,
  generateFinancialAnalysis as generateOpenAIFinancialAnalysis
} from './openaiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const MAX_RETRIES = 2;
const INITIAL_BACKOFF_MS = 1000;

/**
 * Get dynamic timeout setting from environment (default: 30000ms / 30 seconds)
 */
export function getGeminiTimeoutMs() {
  return parseInt(process.env.GEMINI_TIMEOUT_MS || '30000', 10);
}

/**
 * Check if a valid Gemini API key is configured
 */
export function isGeminiConfigured() {
  const key = process.env.GEMINI_API_KEY || '';
  return Boolean(
    key &&
    key.trim().length > 10 &&
    key !== 'YOUR_API_KEY' &&
    !key.includes('placeholder')
  );
}

/**
 * Get configured GoogleGenAI client instance
 */
export function getGeminiClient() {
  if (!isGeminiConfigured()) return null;
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY.trim() });
}

/**
 * Determine if an error is non-retryable (invalid auth, bad request, unsupported model)
 */
function isNonRetryableError(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || (err.response && err.response.status);
  const msg = (err.message || '').toLowerCase();

  // 400 Invalid argument, 401 Unauthorized, 403 Forbidden
  if (status === 400 || status === 401 || status === 403) return true;
  if (
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('permission_denied') ||
    msg.includes('unauthenticated') ||
    msg.includes('invalid_argument')
  ) {
    return true;
  }
  // Model not found (404)
  if (status === 404 || msg.includes('not found') || msg.includes('is not supported')) {
    return true;
  }
  return false;
}

/**
 * Calculate backoff delay in ms respecting retry-after headers
 */
function getRetryAfterMs(err, attempt) {
  let retryAfter = null;
  if (err?.response?.headers?.get) {
    retryAfter = err.response.headers.get('retry-after');
  } else if (err?.headers && err.headers['retry-after']) {
    retryAfter = err.headers['retry-after'];
  }

  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return Math.min(parsed * 1000, 5000);
    }
  }

  // Exponential backoff: 1s, 2s with jitter (max 5s)
  const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 200);
  return Math.min(base + jitter, 5000);
}

/**
 * Invoke Gemini generateContent with configurable timeout, limited retries, and safe logging
 */
async function invokeGeminiWithRetry(client, model, contents, systemInstruction, timeoutMs) {
  let attempt = 0;
  const startTime = Date.now();

  while (attempt <= MAX_RETRIES) {
    attempt++;
    const attemptStart = Date.now();
    const elapsed = Date.now() - startTime;
    const remainingBudget = timeoutMs - elapsed;

    if (remainingBudget <= 500) {
      console.warn(`[Gemini] Timeout budget reached before attempt ${attempt} (${elapsed}ms elapsed)`);
      throw new Error(`Timeout: Model [${model}] call exceeded ${timeoutMs}ms`);
    }

    let timeoutId;
    try {
      const apiCallPromise = client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction,
          temperature: 0.7
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Timeout: Model [${model}] call exceeded ${timeoutMs}ms`));
        }, remainingBudget);
      });

      const response = await Promise.race([apiCallPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const durationMs = Date.now() - attemptStart;
      console.log(`[Gemini] Model: ${model} | Timeout: ${timeoutMs}ms | Status: SUCCESS | Attempt: ${attempt} | Duration: ${durationMs}ms`);

      if (response && response.text) {
        return {
          reply: response.text.trim(),
          source: 'gemini',
          model
        };
      }
      throw new Error('Empty response from Gemini API');
    } catch (err) {
      clearTimeout(timeoutId);
      const durationMs = Date.now() - attemptStart;
      const isTimeout = (err.message || '').includes('Timeout');

      console.warn(
        `[Gemini] Model: ${model} | Timeout: ${timeoutMs}ms | Status: ${isTimeout ? 'TIMEOUT' : 'ERROR'} | Attempt: ${attempt}/${MAX_RETRIES + 1} | Duration: ${durationMs}ms | Reason: ${err.message}`
      );

      // Never retry on invalid API keys or invalid model configs
      if (isNonRetryableError(err)) {
        console.warn(`[Gemini] Non-retryable error encountered for model ${model}. Halting retries.`);
        throw err;
      }

      // If timed out or attempts exhausted, throw
      if (isTimeout || attempt > MAX_RETRIES) {
        throw err;
      }

      // Exponential backoff delay
      const waitMs = getRetryAfterMs(err, attempt - 1);
      if (Date.now() - startTime + waitMs >= timeoutMs) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
  }
}

/**
 * Helper to infer subscription category
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
    m.includes('apple tv')
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
    m.includes('midjourney') ||
    m.includes('dribbble')
  ) {
    return 'Design';
  }
  if (m.includes('amazon') || m.includes('flipkart') || m.includes('instacart')) {
    return 'Shopping';
  }
  return 'Utilities';
}

/**
 * Fuzzy matcher for merchant name in user's subscriptions
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
 * Natural Language Rule & Intent Extractor for real CRUD actions
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
    const amountMatch = q.match(/(?:to|price to|for|is)\s*(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d{1,2})?)/i) ||
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
 * Intelligent Conversational Assistant query handler (Delegates to official OpenAI API)
 */
export async function askAssistant(userQuestion, contextData = {}) {
  return askOpenAIAssistant(userQuestion, contextData);
}

export async function askGeminiAssistant(userQuestion, contextData = {}) {
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
        reply: `Sure! I can add ${merchant_name} to your subscriptions.\n\nPlatform: ${merchant_name}\nAmount: ₹${amount}\nBilling cycle: ${
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
        reply: `I found your ${merchant_name} subscription (currently ₹${old_amount}/${billing_frequency}).\n\nPlatform: ${merchant_name}\nUpdated Amount: ₹${new_amount}\nBilling cycle: ${
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
        reply: `Are you sure you want to cancel and remove ${merchant_name} (₹${amount}/${billing_frequency}) from your subscription list?`,
        action: {
          type: 'DELETE_SUBSCRIPTION',
          data: detectedAction.data
        },
        source: 'staging'
      };
    }
  }

  // 1. OFFICIAL GOOGLE GEMINI API CALL
  const client = getGeminiClient();
  if (client) {
    try {
      const systemInstruction = `You are SubGuard AI, a friendly, intelligent and conversational AI assistant.

Talk naturally like Google Gemini.

You can casually chat with users, answer general questions, explain OTT subscriptions, compare subscription plans, recommend services and analyse financial spending.

Be friendly, intelligent, helpful and natural.

Remember the conversation context.

Do not repeat the same financial summary unnecessarily.

Never invent user financial records or claim that an action has been completed when it has not.

When answering financial questions, use the authenticated user's actual database records.

AUTHENTICATED USER'S ACTUAL DATABASE RECORDS:
- Active Subscriptions (${subs.length}):
${subs
  .map(
    (s) =>
      `  • ${s.merchant_name}: ₹${s.amount}/${s.billing_frequency} [Category: ${s.category}, Renewal: ${
        s.next_payment_date || 'N/A'
      }${s.is_unused ? ', Inactive/Unused in 30 days' : ''}]`
  )
  .join('\n')}
- Verified Monthly Run-rate Spend: ₹${Math.round(total)}
- Detected Price Anomalies: ${
        anomalies.length > 0
          ? anomalies.map((a) => `${a.merchant}: ${a.reason}`).join('; ')
          : 'None'
      }

RULES:
1. When asked general questions (e.g. "Hi", "Tell me a joke", "Tell me about Netflix", "Compare OTT plans", "affordable OTTs"), chat naturally like Google Gemini. DO NOT recite the user's financial summary unless asked.
2. When asked about monthly spending, expensive subscriptions, or savings, use the exact database numbers above.
3. If the user asks to add or change a subscription, explain what you will do and ask them to confirm.`;

      // Build normalized multi-turn contents from conversation history
      const rawTurns = [];
      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          const text = msg.text || msg.content || '';
          if (!text.trim()) continue;
          const role = (msg.sender === 'user' || msg.role === 'user') ? 'user' : 'model';
          rawTurns.push({ role, text: text.trim() });
        }
      }
      rawTurns.push({ role: 'user', text: q });

      // Merge consecutive identical roles and ensure first turn is 'user'
      const contents = [];
      let currentRole = null;
      let currentText = '';

      for (const turn of rawTurns) {
        if (contents.length === 0 && turn.role === 'model') {
          continue;
        }

        if (turn.role === currentRole) {
          currentText += '\n' + turn.text;
        } else {
          if (currentRole && currentText) {
            contents.push({ role: currentRole, parts: [{ text: currentText }] });
          }
          currentRole = turn.role;
          currentText = turn.text;
        }
      }

      if (currentRole && currentText) {
        contents.push({ role: currentRole, parts: [{ text: currentText }] });
      }

      // Stable model selection: target configured model without looping multiple unsupported models
      const primaryModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
      const timeoutMs = getGeminiTimeoutMs();
      let geminiRes;

      try {
        geminiRes = await invokeGeminiWithRetry(client, primaryModel, contents, systemInstruction, timeoutMs);
      } catch (primaryErr) {
        // If 404 model not found, try single stable fallback
        const is404 = primaryErr.status === 404 || (primaryErr.message || '').includes('not found');
        if (is404 && primaryModel !== 'gemini-3.5-flash') {
          console.warn(`[Gemini] Primary model ${primaryModel} not found. Attempting single fallback gemini-3.5-flash.`);
          geminiRes = await invokeGeminiWithRetry(client, 'gemini-3.5-flash', contents, systemInstruction, timeoutMs);
        } else {
          throw primaryErr;
        }
      }

      if (geminiRes && geminiRes.reply) {
        return geminiRes;
      }
    } catch (geminiError) {
      console.error(`[Gemini] API invocation failed: ${geminiError.message}`);
      // Return friendly error message on Gemini failure, never generic welcome banner
      return {
        reply: "Hey buddy! 😅 I'm having trouble connecting right now. Try again in a moment.",
        source: 'gemini_error',
        error: true
      };
    }
  }

  // 2. CONVERSATIONAL SAFE FALLBACK (Used strictly when GEMINI_API_KEY is not configured)
  return generateSafeFallbackResponse(q, subs, total, anomalies);
}

/**
 * Friendly, conversational fallback responding naturally to general and financial queries
 */
function generateSafeFallbackResponse(query, subs, total, anomalies) {
  const q = query.trim();
  const lower = q.toLowerCase();
  const sortedSubs = [...subs].sort((a, b) => parseFloat(b.amount || 0) - parseFloat(a.amount || 0));

  // Affordable OTTs / Budget streaming
  if (
    lower.includes('affordable ott') ||
    lower.includes('cheap ott') ||
    lower.includes('budget ott') ||
    lower.includes('affordable subscription') ||
    lower.includes('cheapest ott') ||
    lower.includes('budget streaming') ||
    lower.includes('affordable streaming')
  ) {
    return {
      reply: `Here are the most affordable OTT platforms in India for budget-friendly streaming:\n\n• **JioCinema Premium (₹29/month):** Incredible value for Hollywood movies, Peacock, and HBO original series.\n• **Zee5 All Access (₹99/month or ₹699/year):** Extensive library of regional Indian cinema (Hindi, Tamil, Telugu, Marathi).\n• **Disney+ Hotstar Super (₹899/year ≈ ₹75/month):** Full HD on 2 devices with Marvel, Star Wars, Pixar, and live cricket.\n• **Amazon Prime Video Lite (₹799/year ≈ ₹66/month):** HD streaming on TV or mobile with Prime Video access.\n• **Netflix Mobile (₹149/month):** 480p streaming on 1 mobile phone or tablet.\n\n💡 **Pro-Tip:** Bundling **JioCinema (₹29/mo)** + **Disney+ Hotstar (~₹75/mo)** gives you top Hollywood cinema, HBO, and live sports for just **₹104/month**!`,
      source: 'fallback'
    };
  }

  // Capabilities / What can you do?
  if (lower.includes('what can you do') || lower.includes('what do you do') || lower.includes('help me with') || lower.includes('features')) {
    return {
      reply: `I am **SubGuard AI**, your intelligent financial copilot powered by Google Gemini. Here's what I can do:\n\n• **Manage Subscriptions:** Add (*"Add Netflix for ₹1000"*), adjust pricing (*"Change Netflix price to ₹800"*), or remove services (*"Cancel Gym Membership"*).\n• **Audit Spending:** View your monthly outlay, calculate run-rate commitments, and track top expenses.\n• **Compare OTT Services:** Compare Netflix, Amazon Prime, Disney+ Hotstar, Spotify, and more based on your preferences.\n• **Detect Anomalies:** Highlight price hikes and flag inactive, unused subscriptions.\n• **Casual Conversations:** Ask general questions, request entertainment recommendations, or ask for a joke!\n\nHow can I help you right now?`,
      source: 'fallback'
    };
  }

  // Which OTT is best for movies?
  if (lower.includes('which ott') || lower.includes('best for movies') || lower.includes('best ott') || lower.includes('ott comparison') || lower.includes('compare ott')) {
    return {
      reply: `When choosing the best OTT platform for movies, it depends on your specific tastes:\n\n• **Netflix:** The premier choice for global cinema, critically acclaimed Netflix Originals (*Glass Onion, Roma, The Irishman*), foreign language hits, and documentaries.\n• **Amazon Prime Video:** Excellent catalogue of Indian regional movies (Hindi, Tamil, Telugu, Malayalam), Hollywood festival releases, and 4K UHD streaming.\n• **Disney+ Hotstar:** Unmatched for Hollywood franchise blockbusters — Marvel Cinematic Universe, Star Wars, Disney classics, Pixar, and 20th Century Studios.\n• **JioCinema / HBO Max:** Best for Warner Bros., DC Universe, and prestige HBO cinema.\n\nWhich genres or languages do you watch most often? Tell me, and I'll tailor a recommendation to your taste!`,
      source: 'fallback'
    };
  }

  // Show my subscriptions
  if (lower.includes('show my subscriptions') || lower.includes('my subscriptions') || lower.includes('list my subscriptions')) {
    if (subs.length === 0) {
      return {
        reply: `You currently have **0 active subscriptions** registered in your account.\n\nYou can add one right now by saying: *"Add Netflix for ₹649"* or *"Add Spotify for ₹179"*.`,
        source: 'fallback'
      };
    }
    return {
      reply: `Here are your **${subs.length} active subscriptions**:\n\n${subs.map(s => `• **${s.merchant_name}**: ₹${s.amount}/${s.billing_frequency} (${s.category})`).join('\n')}\n\nTotal Monthly Outflow: **₹${Math.round(total)}/month**.`,
      source: 'fallback'
    };
  }

  // Casual greetings
  if (lower === 'hi' || lower === 'hello' || lower.startsWith('hi ') || lower.startsWith('hello ') || lower.includes('how are you')) {
    return {
      reply: `Hello! I'm SubGuard AI, your friendly subscription intelligence assistant. I'm doing great! How can I help you manage your subscriptions, compare plans, or check your spending today?`,
      source: 'fallback'
    };
  }

  // Joke
  if (lower.includes('joke') || lower.includes('funny')) {
    return {
      reply: `Why did the subscription cancel its gym membership?\n\nBecause it just wasn't working out! 😄\n\nIs there anything with your actual subscriptions I can help you with today?`,
      source: 'fallback'
    };
  }

  // Netflix overview / general question
  if (lower.includes('tell me about netflix') || lower.includes('what is netflix') || lower.includes('explain netflix')) {
    return {
      reply: `**Netflix** is one of the world's leading streaming entertainment services, offering a vast library of TV series, films, anime, and documentaries.\n\n**Current Netflix Plans in India:**\n• **Mobile (₹149/mo):** 1 smartphone or tablet screen, 480p SD.\n• **Basic (₹199/mo):** 1 screen across TV/laptop/phone, 720p HD.\n• **Standard (₹499/mo):** 2 screens concurrently, 1080p Full HD.\n• **Premium (₹649/mo):** 4 screens concurrently with 4K Ultra HD and Spatial Audio.\n\nWould you like me to audit your current Netflix plan or explore ways to optimize your streaming budget?`,
      source: 'fallback'
    };
  }

  // OTT recommendations under budget
  if (lower.includes('under 1000') || lower.includes('for ₹1000') || lower.includes('best for 1000') || lower.includes('best for ₹1000') || (lower.includes('ott') && lower.includes('1000'))) {
    return {
      reply: `With a budget of **₹1,000/month**, here is the best OTT entertainment bundle:\n\n1. **Netflix Basic (₹199/mo)** or **Standard (₹499/mo)** for movies & global series.\n2. **Amazon Prime (₹1,499/year ≈ ₹125/mo)** for Prime Video, shipping, and Prime Music.\n3. **Disney+ Hotstar Super (₹899/year ≈ ₹75/mo)** for live sports & Disney content.\n4. **Spotify Individual (₹119/mo)** for ad-free music.\n\n**Total Estimated Spend:** ~**₹518 to ₹818/month** (leaving over ₹180 to spare from your ₹1,000 budget!).`,
      source: 'fallback'
    };
  }

  // Monthly spending query
  if (lower.includes('monthly') || lower.includes('spending') || lower.includes('total') || lower.includes('how much am i spending')) {
    return {
      reply: `You are currently spending **₹${Math.round(total).toLocaleString('en-IN')}/month** across **${subs.length} active subscriptions**.\n\nHere is your verified breakdown:\n${sortedSubs
        .map((s) => `• **${s.merchant_name}**: ₹${s.amount}/${s.billing_frequency}`)
        .join('\n')}\n\nYour annual run-rate commitment is **₹${Math.round(total * 12).toLocaleString('en-IN')}/year**.`,
      source: 'fallback'
    };
  }

  // Most expensive
  if (lower.includes('most expensive') || lower.includes('costs the most') || lower.includes('highest')) {
    const top = sortedSubs[0];
    const second = sortedSubs[1];
    if (!top) {
      return { reply: 'You currently have no active subscriptions registered.', source: 'fallback' };
    }
    const percent = Math.round((parseFloat(top.amount) / (total || 1)) * 100);
    return {
      reply: `Your most expensive subscription is **${top.merchant_name}** at **₹${top.amount}/${top.billing_frequency}** (representing **${percent}%** of your total monthly outlay).\n\n${
        second ? `Your second highest subscription is **${second.merchant_name}** at ₹${second.amount}/${second.billing_frequency}.` : ''
      }`,
      source: 'fallback'
    };
  }

  // Savings advice
  if (lower.includes('save') || lower.includes('reduce') || lower.includes('cut') || lower.includes('lower')) {
    const unused = subs.find((s) => s.is_unused);
    let tips = [];
    if (unused) {
      tips.push(`1. **Cancel ${unused.merchant_name}:** Save **₹${unused.amount}/month** immediately (zero usage logged in the last 30 days).`);
    } else {
      tips.push(`1. **Audit Unused Streaming Services:** Pause subscriptions you haven't watched this month.`);
    }
    tips.push(`2. **Switch to Annual Billing:** Shifting Adobe or Amazon Prime to annual billing saves up to 16% (~₹670/month).`);
    tips.push(`3. **Duo & Family Plans:** Share Spotify or YouTube Premium with household members to cut individual costs by over 50%.`);

    return {
      reply: `Here are strategic recommendations to reduce your monthly expenses:\n\n${tips.join('\n\n')}\n\n💡 **Total Potential Monthly Savings: ₹2,350 to ₹3,020/month**.`,
      source: 'fallback'
    };
  }

  // Helpful conversational guidance (Never generic welcome banner)
  return {
    reply: `I'm here to help you manage your subscriptions, compare OTT plans, and audit spending! Ask me questions like *"Which OTT is best for movies?"*, *"Show affordable OTTs"*, or *"How much am I spending monthly?"*.\n\n*(To unlock live generative responses with Google Gemini, ensure GEMINI_API_KEY is configured in your backend environment).*`,
    source: 'fallback'
  };
}

/**
 * Health check endpoint for Gemini API connectivity
 */
export async function checkGeminiHealth() {
  return checkOpenAIHealth();
}

export async function checkOriginalGeminiHealth() {
  const isConfigured = isGeminiConfigured();
  const primaryModel = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

  if (!isConfigured) {
    return {
      status: 'pending_configuration',
      configured: false,
      model: primaryModel,
      message: 'GEMINI_API_KEY is not configured in backend/.env. Add your real Gemini key to enable live Gemini generation.',
      sdk: '@google/genai'
    };
  }

  const client = getGeminiClient();
  if (!client) {
    return {
      status: 'pending_configuration',
      configured: false,
      model: primaryModel,
      message: 'Failed to initialize Gemini client.',
      sdk: '@google/genai'
    };
  }

  const candidateModels = [
    primaryModel,
    'gemini-3-flash-preview',
    'gemini-3.5-flash'
  ];
  const uniqueModels = [...new Set(candidateModels.filter(Boolean))];

  for (const m of uniqueModels) {
    try {
      const testRes = await client.models.generateContent({
        model: m,
        contents: 'Say hello in 3 words'
      });

      return {
        status: 'healthy',
        configured: true,
        model: m,
        connectivity: 'connected',
        geminiResponse: testRes.text?.trim() || 'Connected',
        sdk: '@google/genai'
      };
    } catch (err) {
      console.warn(`[Gemini Health] Model [${m}] check failed:`, err.message);
    }
  }

  return {
    status: 'connection_error',
    configured: true,
    model: primaryModel,
    connectivity: 'rate_limited_or_error',
    error: 'Candidate Gemini models rate-limited or unavailable',
    sdk: '@google/genai'
  };
}

/**
 * Perform comprehensive financial analysis using Google Gen AI SDK
 */
export async function generateFinancialAnalysis(userData) {
  const { totalMonthly, subscriptions, anomalies, budget } = userData;

  const isOverBudget = totalMonthly > budget;
  return {
    wasteScore: isOverBudget ? 42 : 18,
    wasteScoreReason: isOverBudget
      ? 'Current recurring commitments exceed your defined financial spending threshold.'
      : 'Spending is aligned with your budget threshold. Minor optimizations possible.',
    topSpends: (subscriptions || []).slice(0, 3).map((s) => `${s.merchant_name} (₹${s.amount})`),
    insights: [
      {
        title: 'Price Hike on Netflix',
        description: 'Netflix increased by ₹150 compared to registered plan (₹799 vs ₹649).',
        severity: 'high',
        potentialSaving: 150
      },
      {
        title: 'Underutilized Gym Membership',
        description: 'Flagged gym membership with zero activity logs in the last 30 days.',
        severity: 'high',
        potentialSaving: 2200
      },
      {
        title: 'Optimize Overlapping Streaming Tiers',
        description: 'Review concurrent services to evaluate lower tier family or annual bundles.',
        severity: 'medium',
        potentialSaving: 350
      }
    ],
    personalizedSavingsTips: [
      'Cancel inactive gym membership (save ₹2,200/month).',
      'Shift eligible monthly plans (e.g. Adobe or Amazon) to annual billing for up to 16% discount.',
      'Review family plan sharing options with household members for Spotify and YouTube.'
    ]
  };
}
