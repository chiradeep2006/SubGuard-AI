/**
 * Backend Anomaly Detection Engine
 * Detects: Price increases, duplicate identical charges, anomalous charges.
 */
export function evaluateTransactionAnomaly(newTx, existingTransactions, existingSubscriptions) {
  const merchant = (newTx.merchant || '').trim().toLowerCase();
  const amount = parseFloat(newTx.amount);
  const txDate = new Date(newTx.transaction_date);

  // Check 1: Duplicate charge on same date
  const duplicate = existingTransactions.find((tx) => {
    return (
      (tx.merchant || '').trim().toLowerCase() === merchant &&
      parseFloat(tx.amount) === amount &&
      tx.transaction_date === newTx.transaction_date
    );
  });

  if (duplicate) {
    return {
      isAnomalous: true,
      reason: `Duplicate transaction identified: ${newTx.merchant} charged ₹${amount} twice on ${newTx.transaction_date}.`
    };
  }

  // Check 2: Price hike relative to existing subscription
  const matchedSub = existingSubscriptions.find(
    (s) => (s.merchant_name || '').trim().toLowerCase() === merchant
  );

  if (matchedSub) {
    const subAmount = parseFloat(matchedSub.amount);
    if (amount > subAmount) {
      const diff = (amount - subAmount).toFixed(2);
      return {
        isAnomalous: true,
        reason: `Unexpected price hike detected: ₹${amount} charged, but registered plan is ₹${subAmount} (Delta: +₹${diff}).`
      };
    }
  }

  return { isAnomalous: false, reason: null };
}

