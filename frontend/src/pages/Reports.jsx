import React from 'react';
import { Download, FileText } from 'lucide-react';
import { useSubscriptions } from '../context/SubscriptionContext';
import { useLanguage } from '../context/LanguageContext';

export default function Reports() {
  const { subscriptions } = useSubscriptions();
  const { t } = useLanguage();

  const totalMonthlySpend = subscriptions.reduce((acc, curr) => {
    let factor = 1;
    if (curr.billing_frequency === 'yearly') factor = 1 / 12;
    if (curr.billing_frequency === 'quarterly') factor = 1 / 3;
    if (curr.billing_frequency === 'weekly') factor = 4.33;
    return acc + parseFloat(curr.amount) * factor;
  }, 0);

  const annualExposure = totalMonthlySpend * 12;

  const handleDownloadReport = () => {
    const header = 'Merchant,Category,Amount,Frequency,NextRenewal,Status\n';
    const rows = subscriptions
      .map(
        (s) =>
          `"${s.merchant_name}","${s.category}",${s.amount},"${s.billing_frequency}","${s.next_payment_date}","${s.status || 'active'}"`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SubGuard_Financial_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('reports_title', 'Financial Audit & Tax Reports')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('reports_desc', 'Export verified records for accounting, corporate claims, or tax audit')}
          </p>
        </div>
        <button
          onClick={handleDownloadReport}
          className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-sm shadow-lg shadow-purple-600/30 transition hover:scale-105"
        >
          <Download className="w-4 h-4" />
          <span>{t('reports_download_csv', 'Download Audit CSV')}</span>
        </button>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 tilt-card">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            {t('reports_tracked_subs', 'Tracked Subscriptions')}
          </p>
          <p className="text-3xl font-black text-white mt-2">
            {subscriptions.length} {t('reports_services', 'Services')}
          </p>
          <p className="text-xs text-emerald-400 mt-1 font-medium">
            {t('reports_verified_scope', '100% Verified in Scope')}
          </p>
        </div>

        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 tilt-card">
          <p className="text-xs text-gray-400 font-semibold uppercase">
            {t('reports_monthly_runrate', 'Monthly Run-rate')}
          </p>
          <p className="text-3xl font-black text-white mt-2">₹{Math.round(totalMonthlySpend).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('reports_normalized_month', 'Normalized calendar month')}
          </p>
        </div>

        <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 tilt-card">
          <p className="text-xs text-purple-400 font-semibold uppercase">
            {t('reports_annual_exposure', 'Annual Run-rate Exposure')}
          </p>
          <p className="text-3xl font-black text-purple-300 mt-2">₹{Math.round(annualExposure).toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t('reports_projected_12m', 'Projected 12-month commitment')}
          </p>
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-400" />
          <span>{t('reports_audited_ledger', 'Audited Commitments Ledger')}</span>
        </h3>

        <div className="divide-y divide-navy-700/60">
          {subscriptions.map((s) => (
            <div key={s.id} className="py-3 flex justify-between items-center text-sm">
              <div>
                <p className="font-bold text-white">{s.merchant_name}</p>
                <p className="text-xs text-gray-400">
                  {s.category} • {t('reports_billed', 'Billed')} {s.billing_frequency}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-white">₹{s.amount}</p>
                <p className="text-xs text-purple-400 font-medium">
                  {t('reports_next', 'Next:')} {s.next_payment_date}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
