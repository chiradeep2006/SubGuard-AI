/**
 * SubGuard AI - High Performance Insights Controller
 * Provides ultra-fast, modular REST endpoints for financial summaries, anomalies,
 * and asynchronous Gemini AI recommendations with intelligent per-user caching.
 */

import { getSubscriptionsFromStore } from '../services/subscriptionStore.js';
import { getTransactionsForUser } from './transactionController.js';
import { calculateFinancialSummary } from '../services/financialCalculator.js';
import { detectAnomalies } from '../services/anomalyService.js';
import { generateGeminiRecommendations } from '../services/geminiRecommendations.js';
import {
  getFromCache,
  setInCache,
  runSingleFlight,
  CACHE_TTL,
  invalidateUserInsightsCache
} from '../services/insightsCache.js';

/**
 * GET /api/insights/summary
 * Ultra-fast deterministic financial aggregation (under 10ms with cache)
 */
export async function getFinancialSummary(req, res) {
  const userId = req.user?.id || 'default_user';
  const forceRefresh = req.query.refresh === 'true';
  const cacheKey = `summary:${userId}`;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, isCached: true });
    }
  }

  try {
    const [subs, txs] = await Promise.all([
      getSubscriptionsFromStore(userId),
      getTransactionsForUser(userId)
    ]);

    const { anomalies } = detectAnomalies(subs, txs);
    const summary = calculateFinancialSummary(subs, anomalies);

    setInCache(cacheKey, summary, CACHE_TTL.SUMMARY);
    res.json({ ...summary, isCached: false });
  } catch (err) {
    console.error('Insights Summary Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/insights/anomalies
 * Instant price spike and unusual transaction detection
 */
export async function getAnomalies(req, res) {
  const userId = req.user?.id || 'default_user';
  const forceRefresh = req.query.refresh === 'true';
  const cacheKey = `anomalies:${userId}`;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, isCached: true });
    }
  }

  try {
    const [subs, txs] = await Promise.all([
      getSubscriptionsFromStore(userId),
      getTransactionsForUser(userId)
    ]);

    const result = detectAnomalies(subs, txs);

    setInCache(cacheKey, result, CACHE_TTL.ANOMALIES);
    res.json({ ...result, isCached: false });
  } catch (err) {
    console.error('Insights Anomalies Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * GET /api/insights/recommendations
 * Asynchronous, non-blocking Gemini recommendations with single-flight deduplication
 */
export async function getRecommendations(req, res) {
  const userId = req.user?.id || 'default_user';
  const forceRefresh = req.query.refresh === 'true';
  const cacheKey = `recommendations:${userId}`;
  const flightKey = `flight:recs:${userId}`;

  if (!forceRefresh) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      return res.json({ ...cached, isCached: true });
    }
  }

  try {
    const result = await runSingleFlight(flightKey, async () => {
      const [subs, txs] = await Promise.all([
        getSubscriptionsFromStore(userId),
        getTransactionsForUser(userId)
      ]);

      const { anomalies } = detectAnomalies(subs, txs);
      const summary = calculateFinancialSummary(subs, anomalies);

      const recs = await generateGeminiRecommendations(summary, anomalies);
      setInCache(cacheKey, recs, CACHE_TTL.RECOMMENDATIONS);
      return recs;
    });

    res.json({ ...result, isCached: false });
  } catch (err) {
    console.error('Insights Recommendations Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

/**
 * POST /api/insights/refresh
 * Explicit cache invalidation endpoint
 */
export async function refreshInsights(req, res) {
  const userId = req.user?.id || 'default_user';
  invalidateUserInsightsCache(userId);
  res.json({ success: true, message: 'Insights cache invalidated successfully' });
}

