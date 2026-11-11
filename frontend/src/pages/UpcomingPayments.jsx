import React, { useState } from 'react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Clock, AlertCircle, ArrowUpRight } from 'lucide-react';
import PayPalCheckoutModal from '../components/PayPalCheckoutModal';

export default function UpcomingPayments() {
  const { subscriptions } = useSubscriptions();
  const { t } = useLanguage();
  const [paypalTarget, setPaypalTarget] = useState(null);

  const sorted = [...subscriptions].sort(
    (a, b) => new Date(a.next_payment_date) - new Date(b.next_payment_date)
  );

  return (
    <div className="p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">
          {t('upcoming_title', 'Upcoming Renewals Timeline')}
        </h1>
        <p className="text-sm text-gray-400">
          {t('upcoming_desc', 'Scheduled subscription timeline and pre-warning alerts')}
        </p>
      </div>

      <div className="space-y-4">
        {sorted.map((sub) => {
          const diffDays = Math.ceil(
            (new Date(sub.next_payment_date) - new Date()) / (1000 * 60 * 60 * 24)
          );
          const isUrgent = diffDays <= 5;

          return (
            <div
              key={sub.id}
              className={`bg-navy-850 border p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 tilt-card transition ${
                isUrgent ? 'border-amber-500/40 bg-navy-850/90' : 'border-navy-700'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`p-3.5 rounded-2xl ${
                    isUrgent
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  }`}
                >
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-white text-base">{sub.merchant_name}</h3>
                    {isUrgent && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{t('upcoming_prewarning', 'Pre-warning Active')}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {t('upcoming_due_in', 'Due in')}{' '}
                        {diffDays > 0 ? `${diffDays} ${t('upcoming_days', 'days')}` : t('upcoming_today', 'today')}{' '}
                        ({sub.next_payment_date})
                      </span>
                    </span>
                    <span>•</span>
                    <span className="capitalize">{sub.billing_frequency}</span>
                    <span>•</span>
                    <span>{sub.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end sm:self-center">
                <span className="text-2xl font-extrabold text-white">₹{sub.amount}</span>
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

      <PayPalCheckoutModal
        isOpen={!!paypalTarget}
        onClose={() => setPaypalTarget(null)}
        amount={paypalTarget?.amount || 0}
        planName={paypalTarget?.merchant_name || ''}
      />
    </div>
  );
}
