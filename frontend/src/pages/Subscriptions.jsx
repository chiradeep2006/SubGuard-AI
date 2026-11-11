import React, { useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { Search, Plus, Trash2, Edit3, ShieldAlert } from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';
import PayPalCheckoutModal from '../components/PayPalCheckoutModal';

export default function Subscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [paypalTarget, setPaypalTarget] = useState(null);

  const filtered = subscriptions.filter((s) => {
    const matchesSearch = s.merchant_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('subs_title', 'My Subscriptions')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('subs_desc', 'View, audit, edit, and renew your commitments')}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSub(null);
            setModalOpen(true);
          }}
          className="flex items-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition hover:scale-105 shadow-lg shadow-purple-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>{t('subs_new_btn', 'New Subscription')}</span>
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={t('subs_search_placeholder', 'Search merchant name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
        >
          <option value="All">{t('subs_all_categories', 'All Categories')}</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Productivity">Productivity</option>
          <option value="Health">Health</option>
          <option value="Design">Design</option>
          <option value="Shopping">Shopping</option>
          <option value="Utilities">Utilities</option>
        </select>
      </div>

      {/* Subscription Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto border border-purple-500/20 text-purple-400">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Subscriptions for this Account</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            This account currently has no active subscriptions registered. Add your first subscription below or tell the AI Assistant to add one for you!
          </p>
          <button
            onClick={() => {
              setEditingSub(null);
              setModalOpen(true);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-600/30"
          >
            + Add First Subscription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sub) => (
            <div
              key={sub.id}
              className="bg-navy-850 border border-navy-700 rounded-2xl p-6 flex flex-col justify-between tilt-card hover:border-purple-500/40 transition"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-white">{sub.merchant_name}</h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-gray-300 font-medium">
                      {sub.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-purple-400">₹{sub.amount}</p>
                    <p className="text-[11px] text-gray-400 capitalize">{sub.billing_frequency}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 text-xs text-gray-400 bg-navy-900/60 p-3 rounded-xl border border-navy-700/60">
                  <p>
                    {t('subs_status', 'Status:')}{' '}
                    <span className="text-emerald-400 font-semibold capitalize">{sub.status || t('subs_active', 'Active')}</span>
                  </p>
                  <p>
                    {t('subs_next_renewal', 'Next Renewal:')}{' '}
                    <span className="text-gray-200 font-medium">{sub.next_payment_date}</span>
                  </p>
                  {sub.is_unused && (
                    <div className="mt-2 flex items-center space-x-1.5 text-red-400 font-medium pt-1 border-t border-navy-700">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('subs_flagged_unused', 'Flagged: No recorded usage in 30 days')}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-navy-700/80 flex items-center justify-between">
                <button
                  onClick={() => setPaypalTarget(sub)}
                  className="text-xs font-bold px-3.5 py-2 bg-[#FFC439]/20 hover:bg-[#FFC439]/30 text-[#FFC439] border border-[#FFC439]/40 rounded-xl transition flex items-center space-x-1.5"
                >
                  <span>{t('subs_renew_now', 'Renew via PayPal')}</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setEditingSub(sub);
                      setModalOpen(true);
                    }}
                    className="p-2 text-gray-400 hover:text-white bg-navy-700/50 hover:bg-navy-700 rounded-lg transition"
                    title={t('subs_edit', 'Edit')}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteSubscription(sub.id)}
                    className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition"
                    title={t('subs_delete', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingSub}
        onSave={(data) => {
          if (editingSub) updateSubscription(editingSub.id, data);
          else addSubscription(data);
        }}
      />

      <PayPalCheckoutModal
        isOpen={!!paypalTarget}
        onClose={() => setPaypalTarget(null)}
        amount={paypalTarget?.amount || 0}
        planName={paypalTarget?.merchant_name || ''}
      />
    </div>
  );
}
