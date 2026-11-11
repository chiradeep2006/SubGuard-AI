import React, { useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Clock, AlertCircle, ArrowUpRight, Filter, AlertTriangle } from 'lucide-react';
import PayPalCheckoutModal from '../components/PayPalCheckoutModal';

export default function UpcomingPayments() {
  const { subscriptions } = useSubscriptions();
  const { t } = useLanguage();
  const [paypalTarget, setPaypalTarget] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const filtered = subscriptions.filter(
    (s) => categoryFilter === 'All' || s.category === categoryFilter
  );

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date)
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('upcoming_title', 'Upcoming Renewals Timeline')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('upcoming_desc', 'Scheduled subscription timeline and pre-warning alerts')}
          </p>
        </div>

        {/* Category Filter */}
        <div className="relative w-full sm:w-auto">
          <Filter className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-48 pl-10 pr-4 py-2 bg-navy-850 border border-navy-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 transition"
          >
            <option value="All">All Categories</option>
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
      </div>

      {sorted.length === 0 ? (
        <div className="bg-navy-850 border border-navy-700/80 rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="p-4 bg-purple-500/10 rounded-2xl w-fit mx-auto border border-purple-500/20 text-purple-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No Upcoming Renewals</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            There are no renewals scheduled under this filter category.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((sub) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const targetDate = new Date(sub.next_payment_date);
            targetDate.setHours(0, 0, 0, 0);
            const diffDays = Math.round((targetDate - today) / (1000 * 60 * 60 * 24));

            const isOverdue = diffDays < 0;
            const is72HourPrewarning = diffDays >= 0 && diffDays <= 3;
            const isUrgent = isOverdue || is72HourPrewarning;

            const currencySymbol =
              sub.currency === 'USD' ? '$' : sub.currency === 'EUR' ? '€' : sub.currency === 'GBP' ? '£' : '₹';

            return (
              <div
                key={sub.id}
                className={`bg-navy-850 border p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 tilt-card transition ${
                  isOverdue
                    ? 'border-red-500/50 bg-red-950/10'
                    : is72HourPrewarning
                    ? 'border-amber-500/40 bg-navy-850/90'
                    : 'border-navy-700'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div
                    className={`p-3.5 rounded-2xl ${
                      isOverdue
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : is72HourPrewarning
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    }`}
                  >
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold text-white text-base">{sub.merchant_name}</h3>
                      {isOverdue && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Overdue ({Math.abs(diffDays)}d ago)</span>
                        </span>
                      )}
                      {!isOverdue && is72HourPrewarning && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                          <AlertCircle className="w-3 h-3" />
                          <span>Pre-warning 72h Active</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span className={isOverdue ? 'text-red-400 font-semibold' : ''}>
                          {isOverdue
                            ? `Overdue since ${sub.next_payment_date}`
                            : diffDays === 0
                            ? 'Due Today'
                            : `Due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${sub.next_payment_date})`}
                        </span>
                      </span>
                      <span>•</span>
                      <span className="capitalize">{sub.billing_frequency}</span>
                      <span>•</span>
                      <span>{sub.category}</span>
                      {sub.payment_method && (
                        <>
                          <span>•</span>
                          <span>{sub.payment_method}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  <span className="text-2xl font-extrabold text-white">
                    {currencySymbol}{sub.amount}
                  </span>
                  <button
                    onClick={() => setPaypalTarget(sub)}
                    className="px-3.5 py-1.5 bg-[#FFC439]/20 hover:bg-[#FFC439]/30 text-[#FFC439] border border-[#FFC439]/40 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                  >
                    <span>{t('upcoming_renew_early', 'Renew Early')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PayPalCheckoutModal
        isOpen={!!paypalTarget}
        onClose={() => setPaypalTarget(null)}
        amount={paypalTarget?.amount || 0}
        planName={paypalTarget?.merchant_name || ''}
      />
    </div>
  );
}
