import { supabase, isSupabaseConfigured } from '../config/supabase.js';
import crypto from 'crypto';

// In-memory fallback stores isolated by userId
// userConversationsMap: Map<userId, Conversation[]>
const userConversationsMap = new Map();
// conversationMessagesMap: Map<conversationId, Message[]>
const conversationMessagesMap = new Map();

function generateId(prefix = 'conv') {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * List all conversations for an authenticated user
 */
export async function listUserConversations(userId) {
  if (!userId) return [];

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (err) {
      console.warn('[ConversationStore] Supabase list fallback:', err.message);
    }
  }

  // In-memory fallback
  const userConvs = userConversationsMap.get(userId) || [];
  return [...userConvs].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
}

/**
 * Create a new conversation for an authenticated user
 */
export async function createConversation(userId, title = 'New Conversation') {
  if (!userId) throw new Error('User ID is required');

  const now = new Date().toISOString();
  const conv = {
    id: generateId('conv'),
    user_id: userId,
    title: title.slice(0, 100),
    created_at: now,
    updated_at: now
  };

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert([conv])
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('[ConversationStore] Supabase create fallback:', err.message);
    }
  }

  // In-memory store
  const list = userConversationsMap.get(userId) || [];
  list.unshift(conv);
  userConversationsMap.set(userId, list);
  conversationMessagesMap.set(conv.id, []);

  return conv;
}

/**
 * Get a single conversation with its messages, strictly verifying ownership
 */
export async function getConversationWithMessages(userId, conversationId) {
  if (!userId || !conversationId) return null;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data: conv, error: convErr } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!convErr && conv) {
        const { data: msgs } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .order('created_at', { ascending: true });

        return {
          conversation: conv,
          messages: msgs || []
        };
      }
    } catch (err) {
      console.warn('[ConversationStore] Supabase get fallback:', err.message);
    }
  }

  // In-memory store
  const userConvs = userConversationsMap.get(userId) || [];
  const conv = userConvs.find((c) => c.id === conversationId);
  if (!conv) return null;

  const messages = conversationMessagesMap.get(conversationId) || [];
  return {
    conversation: conv,
    messages: [...messages].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  };
}

/**
 * Save a message (user or assistant) in a conversation, verifying user ownership
 */
export async function saveMessage(userId, conversationId, role, content, metadata = {}) {
  if (!userId || !conversationId || !content) {
    throw new Error('Missing parameters to save message');
  }

  const now = new Date().toISOString();
  const message = {
    id: generateId('msg'),
    conversation_id: conversationId,
    user_id: userId,
    role: role === 'user' ? 'user' : 'assistant',
    content: content.trim(),
    metadata,
    created_at: now
  };

  // Update conversation title if this is the first user query
  let updatedTitle = null;

  if (isSupabaseConfigured() && supabase) {
    try {
      // Verify conversation ownership first
      const { data: conv } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();

      if (!conv) {
        throw new Error('Forbidden: Conversation not found or access denied');
      }

      await supabase.from('messages').insert([message]);

      const updates = { updated_at: now };
      if (role === 'user' && conv.title === 'New Conversation') {
        updatedTitle = content.slice(0, 40).trim();
        updates.title = updatedTitle;
      }

      await supabase.from('conversations').update(updates).eq('id', conversationId);

      return message;
    } catch (err) {
      console.warn('[ConversationStore] Supabase saveMessage fallback:', err.message);
    }
  }

  // In-memory store
  const userConvs = userConversationsMap.get(userId) || [];
  const conv = userConvs.find((c) => c.id === conversationId);
  if (!conv) {
    throw new Error('Forbidden: Conversation not found or access denied');
  }

  conv.updated_at = now;
  if (role === 'user' && conv.title === 'New Conversation') {
    conv.title = content.slice(0, 40).trim();
  }

  const msgs = conversationMessagesMap.get(conversationId) || [];
  msgs.push(message);
  conversationMessagesMap.set(conversationId, msgs);

  return message;
}

/**
 * Delete a conversation and all its messages, strictly verifying ownership
 */
export async function deleteConversation(userId, conversationId) {
  if (!userId || !conversationId) return false;

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      return !error;
    } catch (err) {
      console.warn('[ConversationStore] Supabase delete fallback:', err.message);
    }
  }

  // In-memory store
  const userConvs = userConversationsMap.get(userId) || [];
  const idx = userConvs.findIndex((c) => c.id === conversationId);
  if (idx === -1) return false;

  userConvs.splice(idx, 1);
  userConversationsMap.set(userId, userConvs);
  conversationMessagesMap.delete(conversationId);

  return true;
}

/**
 * Clear all messages in a conversation
 */
export async function clearConversationMessages(userId, conversationId) {
  if (!userId || !conversationId) return false;

  const convWithMsgs = await getConversationWithMessages(userId, conversationId);
  if (!convWithMsgs) return false;

  if (isSupabaseConfigured() && supabase) {
    try {
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
      return true;
    } catch (err) {
      console.warn('[ConversationStore] Supabase clear fallback:', err.message);
    }
  }

  conversationMessagesMap.set(conversationId, []);
  return true;
}

