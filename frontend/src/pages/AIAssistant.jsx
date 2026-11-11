import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  Check,
  X,
  Trash2,
  PlusCircle,
  Edit3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Copy,
  MessageSquare,
  Plus,
  PanelLeftClose,
  PanelLeft,
  Calendar,
  CreditCard,
  TrendingDown
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function AIAssistant() {
  const { subscriptions, refresh, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { t } = useLanguage();
  const { user } = useAuth();

  // Multi-conversation state
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionProcessing, setActionProcessing] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [fetchingConvs, setFetchingConvs] = useState(true);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load user conversations on mount or user change
  useEffect(() => {
    loadUserConversations();
  }, [user]);

  const loadUserConversations = async () => {
    setFetchingConvs(true);
    try {
      const res = await apiRequest('/assistant/conversations', 'GET');
      if (res && Array.isArray(res.conversations)) {
        setConversations(res.conversations);
        if (res.conversations.length > 0) {
          // Select most recent conversation
          selectConversation(res.conversations[0].id);
        } else {
          setActiveConvId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.warn('Failed to load conversations:', err.message);
      // Fallback empty
      setConversations([]);
      setActiveConvId(null);
      setMessages([]);
    } finally {
      setFetchingConvs(false);
    }
  };

  const selectConversation = async (convId) => {
    if (convId === activeConvId && messages.length > 0) return;
    setActiveConvId(convId);
    setLoading(true);

    try {
      const res = await apiRequest(`/assistant/conversations/${convId}`, 'GET');
      if (res && Array.isArray(res.messages)) {
        const mapped = res.messages.map((m) => ({
          id: m.id,
          sender: m.role === 'user' ? 'user' : 'bot',
          text: m.content,
          action: m.metadata?.action ? { ...m.metadata.action, status: m.metadata.action.status || 'pending' } : null,
          timestamp: new Date(m.created_at)
        }));
        setMessages(mapped);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.warn('Failed to load conversation messages:', err.message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewChat = async () => {
    try {
      const res = await apiRequest('/assistant/conversations', 'POST', { title: 'New Conversation' });
      if (res && res.conversation) {
        setConversations((prev) => [res.conversation, ...prev]);
        setActiveConvId(res.conversation.id);
        setMessages([]);
      }
    } catch (err) {
      // Local fallback for new chat
      const localId = 'conv_' + Date.now();
      const localConv = {
        id: localId,
        title: 'New Conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setConversations((prev) => [localConv, ...prev]);
      setActiveConvId(localId);
      setMessages([]);
    }
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await apiRequest(`/assistant/conversations/${convId}`, 'DELETE');
    } catch (err) {
      console.warn('Failed to delete on server:', err.message);
    }

    const updated = conversations.filter((c) => c.id !== convId);
    setConversations(updated);

    if (activeConvId === convId) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        setActiveConvId(null);
        setMessages([]);
      }
    }
  };

  // Copy message text to clipboard
  const handleCopyText = (text, id) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Markdown Formatter
  const renderFormattedText = (text) => {
    if (!text) return null;

    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 leading-relaxed">
        {lines.map((line, lIdx) => {
          if (!line.trim()) {
            return <div key={lIdx} className="h-1.5" />;
          }

          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
          const cleanLine = isBullet ? line.trim().replace(/^[•\-]\s*/, '') : line;

          // Parse bold **text**
          const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
          const renderedParts = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              const inner = part.slice(2, -2);
              const isMoney = inner.includes('₹') || inner.includes('$');
              return (
                <strong
                  key={pIdx}
                  className={`font-semibold ${isMoney ? 'text-emerald-400 font-bold' : 'text-purple-200'}`}
                >
                  {inner}
                </strong>
              );
            }
            return <span key={pIdx}>{part}</span>;
          });

          if (isBullet) {
            return (
              <div key={lIdx} className="flex items-start space-x-2 pl-1 my-0.5">
                <span className="text-purple-400 font-bold shrink-0 mt-0.5">•</span>
                <span className="flex-1">{renderedParts}</span>
              </div>
            );
          }

          return <p key={lIdx}>{renderedParts}</p>;
        })}
      </div>
    );
  };

  const handleSend = async (textToSend) => {
    const query = typeof textToSend === 'string' ? textToSend : input;
    if (!query || !query.trim() || loading) return;

    const trimmed = query.trim();
    setInput('');

    const userMessageId = 'user_' + Date.now();
    const newUserMsg = { id: userMessageId, sender: 'user', text: trimmed, timestamp: new Date() };

    setMessages((prev) => [...prev, newUserMsg]);
    setLoading(true);

    try {
      const historyPayload = messages.slice(-10).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await apiRequest('/assistant/chat', 'POST', {
        message: trimmed,
        conversationId: activeConvId,
        history: historyPayload
      });

      if (res && res.reply) {
        // If a new conversation was created on the backend
        if (res.conversationId && res.conversationId !== activeConvId) {
          setActiveConvId(res.conversationId);
          // Refresh conversation list to get title
          const convListRes = await apiRequest('/assistant/conversations', 'GET').catch(() => null);
          if (convListRes && Array.isArray(convListRes.conversations)) {
            setConversations(convListRes.conversations);
          }
        }

        const botMsg = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: res.reply,
          action: res.action ? { ...res.action, status: 'pending' } : null,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error('Invalid response from AI assistant');
      }
    } catch (err) {
      console.warn('AI Assistant request failed, using intelligent context fallback:', err.message);

      // Deterministic dynamic fallback computed from real subscriptions
      const q = trimmed.toLowerCase();
      let fallbackText = '';
      let fallbackAction = null;

      const addMatch = trimmed.match(/(?:add|subscribe to|create)\s+([a-zA-Z0-9+\s]+?)\s+(?:for\s+)?(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
      const updateMatch = trimmed.match(/(?:change|update|modify)\s+([a-zA-Z0-9+\s]+?)\s+(?:subscription\s+)?(?:from\s+(?:₹|rs\.?)?\d+\s+)?(?:to|price to)\s+(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
      const deleteMatch = trimmed.match(/(?:delete|cancel|remove)\s+([a-zA-Z0-9+\s]+?)(?:\s+from|\s+subscription|$)/i);

      if (addMatch) {
        const merchant = addMatch[1].trim();
        const amount = parseFloat(addMatch[2]);
        fallbackText = `Sure! I can add ${merchant} to your subscriptions.\n\nPlatform: ${merchant}\nAmount: ₹${amount}\nBilling cycle: Monthly\n\nWould you like me to save it?`;
        fallbackAction = {
          type: 'ADD_SUBSCRIPTION',
          data: {
            merchant_name: merchant,
            amount: amount,
            billing_frequency: 'monthly',
            category: 'Entertainment'
          },
          status: 'pending'
        };
      } else if (updateMatch) {
        const merchant = updateMatch[1].trim();
        const newAmount = parseFloat(updateMatch[2]);
        const existing = subscriptions.find((s) => s.merchant_name.toLowerCase().includes(merchant.toLowerCase()));
        if (existing) {
          fallbackText = `I found your ${existing.merchant_name} subscription (currently ₹${existing.amount}).\n\nWould you like to confirm updating the price to ₹${newAmount}?`;
          fallbackAction = {
            type: 'UPDATE_SUBSCRIPTION',
            data: {
              id: existing.id,
              merchant_name: existing.merchant_name,
              current_amount: existing.amount,
              amount: newAmount,
              new_amount: newAmount,
              billing_frequency: existing.billing_frequency
            },
            status: 'pending'
          };
        } else {
          fallbackText = `I couldn't locate a subscription named "${merchant}". You currently have: ${subscriptions.map((s) => s.merchant_name).join(', ') || 'None'}.`;
        }
      } else if (deleteMatch) {
        const merchant = deleteMatch[1].trim();
        const existing = subscriptions.find((s) => s.merchant_name.toLowerCase().includes(merchant.toLowerCase()));
        if (existing) {
          fallbackText = `Are you sure you want to remove ${existing.merchant_name} (₹${existing.amount}/${existing.billing_frequency}) from your active subscriptions?`;
          fallbackAction = {
            type: 'DELETE_SUBSCRIPTION',
            data: {
              id: existing.id,
              merchant_name: existing.merchant_name,
              amount: existing.amount
            },
            status: 'pending'
          };
        } else {
          fallbackText = `I couldn't find "${merchant}" in your active subscriptions.`;
        }
      } else if (q === 'hi' || q === 'hello' || q.startsWith('hi ') || q.startsWith('hello ')) {
        fallbackText = "Hey! How's it going? I'm SubGuard AI, powered by Google Gemini. What can I help you with today?";
      } else if (q.includes('what can you do')) {
        fallbackText = "I can help you manage your subscriptions, compare OTT plans, track monthly spending, detect unusual charges, and much more. Feel free to ask me anything!";
      } else if (q.includes('joke')) {
        fallbackText = "Why did the credit card go to therapy?\n\nBecause it had too many unresolved issues and recurring commitments! 😄";
      } else if (q.includes('which ott') || q.includes('best for movies')) {
        fallbackText = "When choosing the best OTT for movies, it depends on your taste:\n\n• **Netflix:** Premier choice for global cinema, Oscar-nominated originals, and international cinema.\n• **Amazon Prime Video:** Excellent collection of Indian regional cinema and Hollywood blockbusters.\n• **Disney+ Hotstar:** Unbeatable for Marvel, Star Wars, Pixar, and Disney classics.\n\nWhich genres do you enjoy most? I can recommend a tailored plan!";
      } else if (q.includes('monthly') || q.includes('spending') || q.includes('total') || q.includes('how much')) {
        const total = subscriptions.reduce((sum, s) => {
          let factor = 1;
          if (s.billing_frequency === 'yearly') factor = 1 / 12;
          if (s.billing_frequency === 'quarterly') factor = 1 / 3;
          if (s.billing_frequency === 'weekly') factor = 4.33;
          return sum + parseFloat(s.amount || 0) * factor;
        }, 0);
        fallbackText = `You are currently spending **₹${Math.round(total).toLocaleString('en-IN')}/month** across **${subscriptions.length} active subscriptions**.\n\n${subscriptions.map(s => `• **${s.merchant_name}**: ₹${s.amount}/${s.billing_frequency}`).join('\n')}\n\nProjected annual commitment: **₹${Math.round(total * 12).toLocaleString('en-IN')}/year**.`;
      } else {
        fallbackText = `I'm SubGuard AI, your conversational assistant. You can ask me to add subscriptions (*'Add Netflix for ₹1000'*), check your monthly spending, compare OTT plans, or ask general questions!`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: fallbackText,
          action: fallbackAction,
          timestamp: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Handle Action Confirmation (Add, Update, Delete)
  const handleConfirmAction = async (messageId, action) => {
    setActionProcessing(messageId);
    try {
      await apiRequest('/assistant/execute-action', 'POST', { action });

      // Synchronize live frontend store
      if (action.type === 'ADD_SUBSCRIPTION') {
        await addSubscription(action.data);
      } else if (action.type === 'UPDATE_SUBSCRIPTION') {
        await updateSubscription(action.data.id, { amount: action.data.amount || action.data.new_amount });
      } else if (action.type === 'DELETE_SUBSCRIPTION') {
        await deleteSubscription(action.data.id);
      }
      await refresh();

      // Mark message action as confirmed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, action: { ...m.action, status: 'confirmed' } } : m
        )
      );

      let confirmNote = '';
      if (action.type === 'ADD_SUBSCRIPTION') {
        confirmNote = `✅ **${action.data.merchant_name}** has been successfully added to your subscriptions for **₹${action.data.amount}/${action.data.billing_frequency || 'monthly'}**.\n\nYour dashboard metrics and subscription ledger have been updated in real-time.`;
      } else if (action.type === 'UPDATE_SUBSCRIPTION') {
        confirmNote = `✅ **${action.data.merchant_name}** has been updated to **₹${action.data.amount || action.data.new_amount}**.\n\nYour monthly outflow reflects the updated rate.`;
      } else if (action.type === 'DELETE_SUBSCRIPTION') {
        confirmNote = `🗑️ **${action.data.merchant_name}** has been removed from your subscriptions.\n\nYour monthly expense total has been lowered.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: 'bot_conf_' + Date.now(),
          sender: 'bot',
          text: confirmNote,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setActionProcessing(null);
    }
  };

  // Handle Cancel Action
  const handleCancelAction = (messageId, action) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, action: { ...m.action, status: 'cancelled' } } : m
      )
    );

    setMessages((prev) => [
      ...prev,
      {
        id: 'bot_cancel_' + Date.now(),
        sender: 'bot',
        text: `❌ Action cancelled. No changes were made to your subscriptions.`,
        timestamp: new Date()
      }
    ]);
  };

  // Clear current conversation messages
  const handleClearChat = async () => {
    if (activeConvId) {
      try {
        await apiRequest(`/assistant/conversations/${activeConvId}/clear`, 'POST');
      } catch (err) {
        console.warn('Failed to clear conversation on server:', err.message);
      }
    }
    setMessages([]);
  };

  const samplePrompts = [
    { label: 'Add Netflix for ₹1000', query: 'I want to add Netflix 1000' },
    { label: 'How much am I spending monthly?', query: 'How much am I spending monthly?' },
    { label: 'Which OTT is best for movies?', query: 'Which OTT is best for movies?' },
    { label: 'Which costs the most?', query: 'Which subscription costs the most?' },
    { label: 'Suggest ways to save money', query: 'How can I save ₹1000 on my subscriptions?' },
    { label: 'Tell me a funny joke', query: 'Tell me a funny finance joke' }
  ];

  return (
    <div className="flex h-[calc(100vh-4.5rem)] bg-navy-950 text-gray-100 overflow-hidden">
      {/* 1. Conversations Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } transition-all duration-300 ease-in-out shrink-0 bg-navy-900 border-r border-navy-800 flex flex-col overflow-hidden`}
      >
        <div className="p-4 border-b border-navy-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-purple-400 font-bold text-sm">
            <MessageSquare className="w-4 h-4" />
            <span>Conversations</span>
          </div>
          <button
            onClick={handleStartNewChat}
            className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition flex items-center space-x-1 text-xs font-semibold shadow-sm active:scale-95"
            title="Start New Chat"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {fetchingConvs ? (
            <div className="p-4 text-xs text-gray-400 text-center flex items-center justify-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
              <span>Loading conversations...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-xs text-gray-500 text-center">
              No conversations yet. Start a new chat!
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition ${
                  c.id === activeConvId
                    ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 font-medium'
                    : 'text-gray-400 hover:bg-navy-850 hover:text-gray-200 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-2 overflow-hidden">
                  <Bot className={`w-3.5 h-3.5 shrink-0 ${c.id === activeConvId ? 'text-purple-400' : 'text-gray-500'}`} />
                  <span className="truncate max-w-[170px]">{c.title || 'Conversation'}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c.id)}
                  className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition text-gray-500"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* User Account Info Footer */}
        <div className="p-3 border-t border-navy-800 bg-navy-950/60 text-xs text-gray-400 flex items-center justify-between">
          <div className="truncate">
            <span className="text-[10px] uppercase font-bold text-gray-500 block">Logged In As</span>
            <span className="text-gray-300 font-medium truncate block">{user?.email || 'admin@subguard.ai'}</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400" title="Connected" />
        </div>
      </div>

      {/* 2. Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header Bar */}
        <div className="p-4 border-b border-navy-800 bg-navy-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg bg-navy-850 hover:bg-navy-800 text-gray-400 hover:text-white border border-navy-700 transition"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-bold text-white flex items-center space-x-2">
                  <span>SubGuard AI Assistant</span>
                  <span className="text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <Sparkles className="w-2.5 h-2.5 text-purple-400 animate-spin" style={{ animationDuration: '6s' }} />
                    <span>Gemini Flash</span>
                  </span>
                </h1>
              </div>
              <p className="text-[11px] text-gray-400">
                Natural conversational assistant grounded in your authenticated subscription ledger
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartNewChat}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1.5 bg-navy-850 hover:bg-navy-800 text-gray-400 hover:text-white border border-navy-700 rounded-lg text-xs font-medium flex items-center space-x-1 transition"
                title="Clear current messages"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Welcome Screen - ONLY shown when messages are empty */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto my-auto text-center py-8 space-y-6">
              <div className="inline-flex p-4 rounded-3xl bg-gradient-to-tr from-purple-700/30 to-indigo-600/30 border border-purple-500/30 text-purple-300 shadow-xl shadow-purple-600/10">
                <Sparkles className="w-10 h-10 text-purple-400 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">How can I assist you today?</h2>
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  I can manage your subscriptions, compare OTT services, analyze spending, and answer casual questions using Google Gemini.
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto text-left pt-2">
                {samplePrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.query)}
                    className="p-3 bg-navy-900/90 hover:bg-navy-850 border border-navy-800 hover:border-purple-500/40 rounded-xl transition text-xs text-gray-300 hover:text-white flex items-center space-x-2 group shadow-sm active:scale-98"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition shrink-0" />
                    <span className="truncate">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'bot' && (
                <div className="p-2 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl text-white shrink-0 shadow-md shadow-purple-600/20 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`group relative p-4 rounded-2xl text-sm max-w-2xl leading-relaxed shadow-lg ${
                  m.sender === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-none font-medium'
                    : 'bg-navy-900/95 border border-navy-800 text-gray-200 rounded-tl-none'
                }`}
              >
                {/* Text Content */}
                {renderFormattedText(m.text)}

                {/* Copy Button */}
                <button
                  onClick={() => handleCopyText(m.text, m.id)}
                  className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md transition ${
                    m.sender === 'user'
                      ? 'text-purple-200 hover:bg-purple-700'
                      : 'text-gray-400 hover:bg-navy-800 hover:text-white'
                  }`}
                  title="Copy to clipboard"
                >
                  {copiedId === m.id ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Interactive Action Card (if staged by AI) */}
                {m.action && (
                  <div className="mt-4 pt-3 border-t border-navy-800">
                    <div className="p-3.5 rounded-xl bg-navy-950/80 border border-purple-500/30 shadow-inner space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {m.action.type === 'ADD_SUBSCRIPTION' && (
                            <PlusCircle className="w-4 h-4 text-emerald-400" />
                          )}
                          {m.action.type === 'UPDATE_SUBSCRIPTION' && (
                            <Edit3 className="w-4 h-4 text-amber-400" />
                          )}
                          {m.action.type === 'DELETE_SUBSCRIPTION' && (
                            <Trash2 className="w-4 h-4 text-rose-400" />
                          )}
                          <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                            {m.action.type === 'ADD_SUBSCRIPTION'
                              ? 'Add Subscription'
                              : m.action.type === 'UPDATE_SUBSCRIPTION'
                              ? 'Update Price'
                              : 'Cancel Subscription'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            m.action.status === 'confirmed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : m.action.status === 'cancelled'
                              ? 'bg-gray-700/50 text-gray-400 border border-gray-600'
                              : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 animate-pulse'
                          }`}
                        >
                          {m.action.status === 'confirmed'
                            ? 'Executed'
                            : m.action.status === 'cancelled'
                            ? 'Cancelled'
                            : 'Awaiting Confirmation'}
                        </span>
                      </div>

                      {/* Detail Metrics */}
                      <div className="grid grid-cols-2 gap-2 text-xs bg-navy-900/60 p-2.5 rounded-lg border border-navy-800">
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Service</span>
                          <span className="font-semibold text-white">{m.action.data.merchant_name}</span>
                        </div>
                        <div>
                          <span className="text-gray-500 text-[10px] uppercase font-bold block">Amount</span>
                          <span className="font-bold text-emerald-400">
                            ₹{m.action.data.amount || m.action.data.new_amount}
                            <span className="text-gray-400 text-[10px] font-normal">
                              {' '}
                              / {m.action.data.billing_frequency || 'monthly'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Confirmation Buttons */}
                      {m.action.status === 'pending' ? (
                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => handleConfirmAction(m.id, m.action)}
                            disabled={actionProcessing === m.id}
                            className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition shadow-md shadow-purple-600/30"
                          >
                            {actionProcessing === m.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Confirm & Save</span>
                          </button>
                          <button
                            onClick={() => handleCancelAction(m.id, m.action)}
                            disabled={actionProcessing === m.id}
                            className="py-2 px-4 bg-navy-850 hover:bg-navy-800 active:scale-95 text-gray-300 hover:text-white rounded-xl text-xs font-semibold border border-navy-700 transition"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : m.action.status === 'confirmed' ? (
                        <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium pt-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Action executed & database updated.</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 text-xs text-gray-400 font-medium pt-1">
                          <XCircle className="w-4 h-4" />
                          <span>Action cancelled.</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {m.sender === 'user' && (
                <div className="p-2 bg-navy-800 border border-navy-700 rounded-2xl text-purple-300 shrink-0 mt-1">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {loading && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-tr from-purple-700 to-indigo-600 rounded-2xl text-white shrink-0 shadow-md shadow-purple-600/20">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex items-center space-x-2 bg-navy-900 border border-navy-800 px-4 py-3 rounded-2xl rounded-tl-none">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400 ml-1">Gemini is thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/90 backdrop-blur-md shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative max-w-4xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything, compare OTT plans, or say 'Add Netflix for ₹1000'..."
              className="w-full pl-5 pr-14 py-3.5 bg-navy-900 border border-navy-700 hover:border-navy-600 focus:border-purple-500 rounded-2xl text-white text-sm focus:outline-none shadow-xl transition placeholder:text-gray-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-2.5 top-2 p-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-xl transition active:scale-95 shadow-md shadow-purple-600/30"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-gray-500 text-center mt-2">
            SubGuard AI is powered by Google Gemini and accesses only your verified subscription data.
          </p>
        </div>
      </div>
    </div>
  );
}
