import { supabase } from '../config/supabase.js';
import { generateFinancialAnalysis, askAssistant, checkOpenAIHealth } from '../services/openaiService.js';
import { getTransactionsForUser } from './transactionController.js';
import { calculateFinancialSummary } from '../services/financialCalculator.js';
import { detectAnomalies } from '../services/anomalyService.js';
import { generateAlgorithmicRecommendations } from '../services/geminiRecommendations.js';
import {
  getSubscriptionsFromStore,
  addSubscriptionToStore,
  updateSubscriptionInStore,
  deleteSubscriptionFromStore
} from '../services/subscriptionStore.js';
import {
  listUserConversations,
  createConversation,
  getConversationWithMessages,
  saveMessage,
  deleteConversation,
  clearConversationMessages
} from '../services/conversationStore.js';
import { invalidateUserInsightsCache } from '../services/insightsCache.js';

export async function getHealth(req, res) {
  try {
    const health = await checkOpenAIHealth();
    res.json(health);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAnalysis(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const [subs, txs] = await Promise.all([
      getSubscriptionsFromStore(userId),
      getTransactionsForUser(userId)
    ]);

    const { anomalies } = detectAnomalies(subs, txs);
    const summary = calculateFinancialSummary(subs, anomalies);
    const { recommendations, personalizedSavingsTips } = generateAlgorithmicRecommendations(summary, anomalies);

    res.json({
      wasteScore: summary.wasteScore,
      wasteScoreReason: summary.wasteScoreReason,
      topSpends: (subs || []).slice(0, 3).map((s) => `${s.merchant_name} (₹${s.amount})`),
      insights: recommendations.map((r) => ({
        title: r.title,
        description: r.description,
        severity: r.severity,
        potentialSaving: r.potentialSaving
      })),
      personalizedSavingsTips,
      summary
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listConversationsEndpoint(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const conversations = await listUserConversations(userId);
    res.json({ conversations });
  } catch (err) {
    console.error('List Conversations Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function createConversationEndpoint(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const { title = 'New Conversation' } = req.body || {};
    const conversation = await createConversation(userId, title);
    res.status(201).json({ conversation });
  } catch (err) {
    console.error('Create Conversation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function getConversationEndpoint(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const { id } = req.params;
    const data = await getConversationWithMessages(userId, id);

    if (!data) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    res.json(data);
  } catch (err) {
    console.error('Get Conversation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function deleteConversationEndpoint(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const { id } = req.params;
    const success = await deleteConversation(userId, id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    console.error('Delete Conversation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function clearConversationEndpoint(req, res) {
  try {
    const userId = req.user?.id || 'default_user';
    const { id } = req.params;
    const success = await clearConversationMessages(userId, id);

    if (!success) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    res.json({ success: true, message: 'Conversation cleared successfully' });
  } catch (err) {
    console.error('Clear Conversation Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function chatAssistant(req, res) {
  const { message = '', conversationId, history = [] } = req.body || {};
  const userId = req.user?.id || 'default_user';

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  try {
    // 1. Resolve or create active conversation strictly belonging to this user
    let activeConvId = conversationId;
    if (activeConvId) {
      const existing = await getConversationWithMessages(userId, activeConvId);
      if (!existing) {
        // Conversation does not belong to this user or does not exist
        const newConv = await createConversation(userId, message.slice(0, 40));
        activeConvId = newConv.id;
      }
    } else {
      const newConv = await createConversation(userId, message.slice(0, 40));
      activeConvId = newConv.id;
    }

    // 2. Persist the user's incoming message
    await saveMessage(userId, activeConvId, 'user', message.trim());

    // 3. Retrieve authenticated user's actual isolated subscription records
    const [subs, txs] = await Promise.all([
      getSubscriptionsFromStore(userId),
      getTransactionsForUser(userId)
    ]);

    const { anomalies } = detectAnomalies(subs, txs);

    const totalMonthly = subs.reduce((acc, curr) => {
      let multiplier = 1;
      if (curr.billing_frequency === 'yearly') multiplier = 1 / 12;
      if (curr.billing_frequency === 'quarterly') multiplier = 1 / 3;
      if (curr.billing_frequency === 'weekly') multiplier = 4.33;
      return acc + parseFloat(curr.amount || 0) * multiplier;
    }, 0);

    // 4. Build message history from conversation store if not explicitly passed
    let contextHistory = history;
    if (!contextHistory || contextHistory.length === 0) {
      const convData = await getConversationWithMessages(userId, activeConvId);
      if (convData && Array.isArray(convData.messages)) {
        contextHistory = convData.messages.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content
        }));
      }
    }

    // 5. Query OpenAI API with authenticated user's grounded data
    const result = await askAssistant(message, {
      currency: 'INR',
      totalMonthly: Math.round(totalMonthly),
      subscriptions: subs,
      upcoming7Days: subs.slice(0, 3),
      anomalies,
      history: contextHistory
    });

    // 6. Persist the assistant's reply into the conversation
    await saveMessage(
      userId,
      activeConvId,
      'assistant',
      result.reply,
      result.action ? { action: result.action } : {}
    );

    // 7. Return complete response payload
    res.json({
      ...result,
      conversationId: activeConvId
    });
  } catch (err) {
    console.error('Chat Assistant Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}

export async function executeAction(req, res) {
  const { action } = req.body || {};
  const userId = req.user?.id || 'default_user';

  if (!action || !action.type || !action.data) {
    return res.status(400).json({ error: 'Invalid action payload' });
  }

  try {
    if (action.type === 'ADD_SUBSCRIPTION') {
      const created = await addSubscriptionToStore(action.data, userId);
      return res.json({
        success: true,
        message: `Successfully added ${created.merchant_name} (₹${created.amount}/${created.billing_frequency}).`,
        subscription: created
      });
    }

    if (action.type === 'UPDATE_SUBSCRIPTION') {
      const updated = await updateSubscriptionInStore(
        action.data.id,
        { amount: action.data.amount },
        userId
      );
      return res.json({
        success: true,
        message: `Successfully updated ${action.data.merchant_name} to ₹${action.data.amount}.`,
        subscription: updated
      });
    }

    if (action.type === 'DELETE_SUBSCRIPTION') {
      const success = await deleteSubscriptionFromStore(action.data.id, userId);
      return res.json({
        success,
        message: `Successfully removed ${action.data.merchant_name} from your subscriptions.`
      });
    }

    res.status(400).json({ error: 'Unknown action type' });
  } catch (err) {
    console.error('Execute Action Error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
