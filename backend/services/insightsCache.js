/**
 * SubGuard AI - Intelligent In-Memory Insights Cache & Request Coalescing
 * High-performance, user-isolated cache with TTL expiration and stampede protection
 */

const cacheStore = new Map();
const inFlightPromises = new Map();

export const CACHE_TTL = {
  SUMMARY: 5 * 60 * 1000,         // 5 minutes
  ANOMALIES: 5 * 60 * 1000,       // 5 minutes
  RECOMMENDATIONS: 15 * 60 * 1000 // 15 minutes
};

/**
 * Get an item from cache if not expired
 */
export function getFromCache(key) {
  const entry = cacheStore.get(key);
  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set an item in cache with specific TTL in ms
 */
export function setInCache(key, data, ttlMs = CACHE_TTL.SUMMARY) {
  cacheStore.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    cachedAt: new Date().toISOString()
  });
}

/**
 * Single-flight request coalescing to prevent duplicate simultaneous executions
 */
export async function runSingleFlight(flightKey, computeFn) {
  if (inFlightPromises.has(flightKey)) {
    return inFlightPromises.get(flightKey);
  }

  const promise = (async () => {
    try {
      return await computeFn();
    } finally {
      inFlightPromises.delete(flightKey);
    }
  })();

  inFlightPromises.set(flightKey, promise);
  return promise;
}

/**
 * Invalidate all insights caches for a given user
 */
export function invalidateUserInsightsCache(userId) {
  if (!userId) return;
  const prefixes = [
    `summary:${userId}`,
    `anomalies:${userId}`,
    `recommendations:${userId}`,
    `analysis:${userId}`
  ];

  for (const key of cacheStore.keys()) {
    if (prefixes.some((p) => key.startsWith(p))) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Clear all cache entries
 */
export function clearAllInsightsCache() {
  cacheStore.clear();
  inFlightPromises.clear();
}

