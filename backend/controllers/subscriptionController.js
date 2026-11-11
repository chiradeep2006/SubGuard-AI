import { z } from 'zod';
import {
  getSubscriptionsFromStore,
  addSubscriptionToStore,
  updateSubscriptionInStore,
  deleteSubscriptionFromStore
} from '../services/subscriptionStore.js';

const subscriptionSchema = z.object({
  merchant_name: z.string().min(1, 'Merchant name is required'),
  category: z.string().default('Entertainment'),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  billing_frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  start_date: z.string().optional(),
  next_payment_date: z.string().optional(),
  status: z.enum(['active', 'paused', 'cancelled']).default('active'),
  is_unused: z.boolean().default(false)
});

export async function getSubscriptions(req, res) {
  try {
    const data = await getSubscriptionsFromStore(req.user.id);
    res.json({ subscriptions: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function createSubscription(req, res) {
  try {
    const validated = subscriptionSchema.parse(req.body);
    const created = await addSubscriptionToStore(validated, req.user.id);
    res.status(201).json({ subscription: created });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function updateSubscription(req, res) {
  const { id } = req.params;
  try {
    const validated = subscriptionSchema.partial().parse(req.body);
    const updated = await updateSubscriptionInStore(id, validated, req.user.id);
    if (!updated) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    res.json({ subscription: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function deleteSubscription(req, res) {
  const { id } = req.params;
  try {
    const success = await deleteSubscriptionFromStore(id, req.user.id);
    res.json({ success, message: 'Subscription removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
