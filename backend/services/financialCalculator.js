/**
 * SubGuard AI - High Performance Financial Calculation Engine
 * Deterministic, zero-latency financial metrics computed directly from database records.
 * Avoids unnecessary LLM roundtrips for mathematical aggregations.
 */

/**
 * Normalizes subscription amount to standard calendar monthly cost
 */
export function getNormalizedMonthlyAmount(sub) {
  const amount = parseFloat(sub.amount || 0);
  const freq = (sub.billing_frequency || 'monthly').toLowerCase();

  switch (freq) {
    case 'weekly':
      return amount * 4.3333;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
    case 'annual':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
}

/**
 * Perform comprehensive deterministic financial calculation
 */
export function calculateFinancialSummary(subscriptions = [], anomalies = [], budget = 5000) {
  const activeSubs = subscriptions.filter((s) => s.status !== 'cancelled');
  const inactiveSubs = subscriptions.filter((s) => s.is_unused || s.status === 'paused');
  const unusedSubs = subscriptions.filter((s) => s.is_unused);

  // 1. Monthly Run-rate Spend
  const rawMonthly = activeSubs.reduce((acc, sub) => {
    return acc + getNormalizedMonthlyAmount(sub);
  }, 0);
  const monthlySpending = Math.round(rawMonthly);

  // 2. Yearly Run-rate Spend (Exact 12x of monthly run-rate)
  const yearlySpending = monthlySpending * 12;

  // 3. Highest & Lowest Subscriptions
  let highestExpense = null;
  let lowestExpense = null;

  if (activeSubs.length > 0) {
    const sortedByMonthly = [...activeSubs].sort(
      (a, b) => getNormalizedMonthlyAmount(b) - getNormalizedMonthlyAmount(a)
    );
    const top = sortedByMonthly[0];
    const bottom = sortedByMonthly[sortedByMonthly.length - 1];

    highestExpense = {
      id: top.id,
      merchant_name: top.merchant_name,
      amount: top.amount,
      billing_frequency: top.billing_frequency,
      normalizedMonthly: Math.round(getNormalizedMonthlyAmount(top))
    };

    lowestExpense = {
      id: bottom.id,
      merchant_name: bottom.merchant_name,
      amount: bottom.amount,
      billing_frequency: bottom.billing_frequency,
      normalizedMonthly: Math.round(getNormalizedMonthlyAmount(bottom))
    };
  }

  // 4. Upcoming Renewals in Next 14 Days
  const now = Date.now();
  const day14 = now + 14 * 86400000;
  const upcomingRenewals = activeSubs.filter((s) => {
    if (!s.next_payment_date) return false;
    const dueTime = new Date(s.next_payment_date).getTime();
    return dueTime >= now && dueTime <= day14;
  });

  const upcomingRenewalsExpense = upcomingRenewals.reduce(
    (sum, s) => sum + parseFloat(s.amount || 0),
    0
  );

  // 5. Unused Subscription Monthly Loss
  const unusedMonthlyLoss = unusedSubs.reduce(
    (sum, s) => sum + getNormalizedMonthlyAmount(s),
    0
  );

  // 6. Anomaly Spike Exposure
  const anomalySpikeDelta = anomalies.reduce((sum, a) => {
    const hike = a.amount && a.baseline ? Math.max(0, a.amount - a.baseline) : 150;
    return sum + hike;
  }, 0);

  // 7. Potential Annual Billing Optimization (15% savings on eligible monthly subs over ₹500)
  const annualSwitchCandidates = activeSubs.filter(
    (s) => s.billing_frequency === 'monthly' && parseFloat(s.amount) >= 500 && !s.is_unused
  );
  const annualSwitchSavings = annualSwitchCandidates.reduce(
    (sum, s) => sum + parseFloat(s.amount) * 0.16,
    0
  );

  // 8. Total Opportunity Savings
  const potentialMonthlySavings = Math.round(
    unusedMonthlyLoss + anomalySpikeDelta + annualSwitchSavings
  );
  const potentialYearlySavings = potentialMonthlySavings * 12;

  // 9. Subscription Waste Score (0 - 100)
  let score = 0;
  const reasons = [];

  // Budget overshoot factor (up to 35 pts)
  if (monthlySpending > budget) {
    const overshootRatio = (monthlySpending - budget) / budget;
    const overshootPts = Math.min(35, Math.round(overshootRatio * 35));
    score += overshootPts;
    reasons.push(`Budget exceeded by ₹${Math.round(monthlySpending - budget).toLocaleString()}/mo`);
  }

  // Unused subscription factor (20 pts per unused, max 35)
  if (unusedSubs.length > 0) {
    const unusedPts = Math.min(35, unusedSubs.length * 20);
    score += unusedPts;
    reasons.push(`${unusedSubs.length} underutilized service (${unusedSubs.map((u) => u.merchant_name).join(', ')})`);
  }

  // Price hike anomalies factor (15 pts per anomaly, max 25)
  if (anomalies.length > 0) {
    const anomalyPts = Math.min(25, anomalies.length * 15);
    score += anomalyPts;
    reasons.push(`${anomalies.length} unexpected price hike detected`);
  }

  // Overlap streaming tier factor (10 pts)
  const entertainmentCount = activeSubs.filter((s) => s.category === 'Entertainment').length;
  if (entertainmentCount >= 3) {
    score += 10;
    reasons.push('Multiple overlapping streaming services');
  }

  const finalWasteScore = Math.min(100, Math.max(12, score));
  const wasteScoreReason =
    reasons.length > 0
      ? `Calculated based on: ${reasons.join(' • ')}.`
      : 'All recurring commitments are optimized and within defined budget thresholds.';

  return {
    monthlySpending: Math.round(monthlySpending),
    yearlySpending: Math.round(yearlySpending),
    activeSubscriptions: activeSubs.length,
    inactiveSubscriptions: inactiveSubs.length,
    highestExpense,
    lowestExpense,
    wasteScore: finalWasteScore,
    wasteScoreReason,
    potentialMonthlySavings,
    potentialYearlySavings,
    upcomingRenewalsExpense: Math.round(upcomingRenewalsExpense),
    upcomingRenewalsCount: upcomingRenewals.length,
    unusedSubscriptionCount: unusedSubs.length,
    unusedSubscriptions: unusedSubs.map((u) => ({
      id: u.id,
      merchant_name: u.merchant_name,
      amount: u.amount,
      billing_frequency: u.billing_frequency
    })),
    budget,
    calculatedAt: new Date().toISOString()
  };
}
