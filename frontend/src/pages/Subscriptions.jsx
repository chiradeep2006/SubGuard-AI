import React, { useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Search,
  Plus,
  Trash2,
  Edit3,
  ShieldAlert,
  Info,
  CreditCard,
  Calendar,
  X,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import SubscriptionModal from '../components/SubscriptionModal';
import PayPalCheckoutModal from '../components/PayPalCheckoutModal';

export default function Subscriptions() {
  const { subscriptions, addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('renewal_asc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);
  const [viewingSub, setViewingSub] = useState(null);
  const [paypalTarget, setPaypalTarget] = useState(null);

  const filtered = subscriptions
    .filter((s) => {
      const matchesSearch = s.merchant_name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || (s.status || 'active').toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'renewal_asc') {
        return new Date(a.next_payment_date) - new Date(b.next_payment_date);
      }
      if (sortBy === 'renewal_desc') {
        return new Date(b.next_payment_date) - new Date(a.next_payment_date);
      }
      if (sortBy === 'amount_desc') {
        return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      }
      if (sortBy === 'amount_asc') {
        return (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0);
      }
      if (sortBy === 'name_asc') {
        return a.merchant_name.localeCompare(b.merchant_name);
      }
      return 0;
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

      {/* Controls & Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder={t('subs_search_placeholder', 'Search merchant name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="All">{t('subs_all_categories', 'All Categories')}</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Productivity">Productivity</option>
            <option value="Cloud/Dev">Cloud / Dev</option>
            <option value="Fitness">Fitness / Health</option>
            <option value="Music">Music & Media</option>
            <option value="Utilities">Utilities & Infra</option>
            <option value="Shopping">Shopping</option>
            <option value="Design">Design</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="relative">
          <ArrowUpDown className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="renewal_asc">Renewal (Soonest First)</option>
            <option value="renewal_desc">Renewal (Latest First)</option>
            <option value="amount_desc">Amount (Highest First)</option>
            <option value="amount_asc">Amount (Lowest First)</option>
            <option value="name_asc">Name (A - Z)</option>
          </select>
        </div>
      </div>

      {/* Subscription Cards Grid */}
      {filtered.length === 0 ? (
        <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto border border-purple-500/20 text-purple-400">
            <Plus className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Matching Subscriptions</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            {subscriptions.length === 0
              ? 'This account currently has no active subscriptions registered. Add your first subscription below or tell the AI Assistant to add one!'
              : 'No subscriptions matched your current search and filter criteria.'}
          </p>
          <button
            onClick={() => {
              setEditingSub(null);
              setModalOpen(true);
            }}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-purple-600/30"
          >
            + Add Subscription
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((sub) => {
            const currencySymbol = sub.currency === 'USD' ? '$' : sub.currency === 'EUR' ? '€' : sub.currency === 'GBP' ? '£' : '₹';
            const isPaused = sub.status === 'paused';
            const isCancelled = sub.status === 'cancelled';

            return (
              <div
                key={sub.id}
                className={`bg-navy-850 border rounded-2xl p-6 flex flex-col justify-between tilt-card transition ${
                  sub.is_unused
                    ? 'border-red-500/30 hover:border-red-500/50'
                    : 'border-navy-700 hover:border-purple-500/40'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white">{sub.merchant_name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-gray-300 font-medium">
                          {sub.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            isCancelled
                              ? 'bg-red-500/10 text-red-400 border-red-500/30'
                              : isPaused
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}
                        >
                          {sub.status || 'Active'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-purple-400">
                        {currencySymbol}{sub.amount}
                      </p>
                      <p className="text-[11px] text-gray-400 capitalize">{sub.billing_frequency}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1.5 text-xs text-gray-400 bg-navy-900/60 p-3 rounded-xl border border-navy-700/60">
                    <p className="flex justify-between">
                      <span>{t('subs_next_renewal', 'Next Renewal:')}</span>
                      <span className="text-gray-200 font-medium">{sub.next_payment_date}</span>
                    </p>
                    {sub.payment_method && (
                      <p className="flex justify-between">
                        <span>Payment Method:</span>
                        <span className="text-gray-200 font-medium">{sub.payment_method}</span>
                      </p>
                    )}
                    {sub.description && (
                      <p className="text-[11px] text-gray-400 italic pt-1 border-t border-navy-700/60 truncate">
                        "{sub.description}"
                      </p>
                    )}
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
                    className="text-xs font-bold px-3 py-2 bg-[#FFC439]/20 hover:bg-[#FFC439]/30 text-[#FFC439] border border-[#FFC439]/40 rounded-xl transition flex items-center space-x-1"
                  >
                    <span>{t('subs_renew_now', 'Renew')}</span>
                  </button>
                  <div className="flex space-x-1.5">
                    <button
                      onClick={() => setViewingSub(sub)}
                      className="p-2 text-gray-400 hover:text-white bg-navy-700/40 hover:bg-navy-700 rounded-lg transition"
                      title="View Details"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingSub(sub);
                        setModalOpen(true);
                      }}
                      className="p-2 text-gray-400 hover:text-white bg-navy-700/40 hover:bg-navy-700 rounded-lg transition"
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
            );
          })}
        </div>
      )}

      {/* View Details Modal */}
      {viewingSub && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setViewingSub(null)}
        >
          <div
            className="bg-navy-850 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingSub(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold text-white mb-1">{viewingSub.merchant_name}</h2>
            <p className="text-xs text-purple-400 font-semibold mb-4">{viewingSub.category}</p>

            <div className="space-y-3 bg-navy-900/70 p-4 rounded-xl border border-navy-700 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Subscription ID:</span>
                <span className="text-gray-200 font-mono text-[11px]">{viewingSub.id}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Amount & Currency:</span>
                <span className="text-white font-bold">
                  {viewingSub.currency || 'INR'} {viewingSub.amount}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Billing Cycle:</span>
                <span className="text-gray-200 capitalize">{viewingSub.billing_frequency}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Next Renewal Date:</span>
                <span className="text-emerald-400 font-bold">{viewingSub.next_payment_date}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Payment Method:</span>
                <span className="text-gray-200">{viewingSub.payment_method || 'Credit Card'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-navy-800">
                <span className="text-gray-400">Status:</span>
                <span className="text-emerald-400 font-bold capitalize">{viewingSub.status || 'Active'}</span>
              </div>
              {viewingSub.description && (
                <div className="pt-2">
                  <span className="text-gray-400 block mb-1">Notes:</span>
                  <p className="text-gray-200 italic bg-navy-950 p-2 rounded-lg border border-navy-800">
                    {viewingSub.description}
                  </p>
                </div>
              )}
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  const s = viewingSub;
                  setViewingSub(null);
                  setEditingSub(s);
                  setModalOpen(true);
                }}
                className="flex-1 py-2 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-white font-semibold rounded-lg text-xs transition"
              >
                Edit
              </button>
              <button
                onClick={() => setViewingSub(null)}
                className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <SubscriptionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialData={editingSub}
        onSave={async (data) => {
          if (editingSub) {
            await updateSubscription(editingSub.id, data);
          } else {
            await addSubscription(data);
          }
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
