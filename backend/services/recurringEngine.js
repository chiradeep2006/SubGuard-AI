/**
 * Rule-based Recurring Payment Detection Engine.
 * Analyzes transactions group by merchant and identifies periodicities.
 */
export function detectRecurringSubscriptions(transactions) {
  const merchantGroups = {};

  // Group transactions by normalized merchant name
  transactions.forEach((tx) => {
    const key = (tx.merchant || '').trim().toLowerCase();
    if (!merchantGroups[key]) merchantGroups[key] = [];
    merchantGroups[key].push({
      ...tx,
      dateObj: new Date(tx.transaction_date),
      amountNum: parseFloat(tx.amount)
    });
  });

  const candidates = [];

  for (const [merchantKey, txList] of Object.entries(merchantGroups)) {
    if (txList.length < 2) continue;

    // Sort ascending by date
    txList.sort((a, b) => a.dateObj - b.dateObj);

    // Calculate intervals and amount variances
    const intervalsInDays = [];
    let amountVarianceAcc = 0;

    for (let i = 1; i < txList.length; i++) {
      const diffTime = Math.abs(txList[i].dateObj - txList[i - 1].dateObj);
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      intervalsInDays.push(diffDays);

      const diffAmount = Math.abs(txList[i].amountNum - txList[i - 1].amountNum);
      amountVarianceAcc += diffAmount;
    }

    const avgInterval = intervalsInDays.reduce((a, b) => a + b, 0) / intervalsInDays.length;
    const avgAmountVariance = amountVarianceAcc / intervalsInDays.length;

    let frequency = null;
    let confidence = 0;
    const reasons = [];

    // Monthly check (26 - 35 days)
    if (avgInterval >= 26 && avgInterval <= 35) {
      frequency = 'monthly';
      confidence += 0.55;
      reasons.push(`Occurs every ~${Math.round(avgInterval)} days (matches monthly cycle)`);
    } else if (avgInterval >= 6 && avgInterval <= 8) {
      frequency = 'weekly';
      confidence += 0.5;
      reasons.push('Occurs weekly');
    } else if (avgInterval >= 85 && avgInterval <= 95) {
      frequency = 'quarterly';
      confidence += 0.5;
      reasons.push('Occurs quarterly');
    } else if (avgInterval >= 350 && avgInterval <= 375) {
      frequency = 'yearly';
      confidence += 0.6;
      reasons.push('Occurs annually');
    }

    if (frequency) {
      if (avgAmountVariance < 5.0) {
        confidence += 0.35;
        reasons.push('Consistent recurring charge amounts');
      } else if (avgAmountVariance < 50.0) {
        confidence += 0.15;
        reasons.push('Minor variation in payment amounts');
      }

      const latestTx = txList[txList.length - 1];
      const nextDate = new Date(latestTx.dateObj);
      if (frequency === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
      if (frequency === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
      if (frequency === 'quarterly') nextDate.setMonth(nextDate.getMonth() + 3);
      if (frequency === 'yearly') nextDate.setFullYear(nextDate.getFullYear() + 1);

      candidates.push({
        merchant: txList[0].merchant,
        frequency,
        confidence: Math.min(Number(confidence.toFixed(2)), 0.99),
        evidence: reasons.join('; '),
        suggestedAmount: latestTx.amountNum,
        nextPredictedDate: nextDate.toISOString().split('T')[0],
        sampleCount: txList.length
      });
    }
  }

  return candidates;
}

