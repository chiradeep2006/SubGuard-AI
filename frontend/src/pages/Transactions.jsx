import React, { useState, useEffect } from 'react';
import { Upload, Download, Search, AlertCircle, CheckCircle, Zap, Filter, Loader2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

export default function Transactions() {
  const { t } = useLanguage();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [anomalyFilter, setAnomalyFilter] = useState('All');
  const [detectionResults, setDetectionResults] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await apiRequest('/transactions');
      if (res && Array.isArray(res.transactions)) {
        const normalized = res.transactions.map((tx) => ({
          id: tx.id,
          merchant: tx.merchant || tx.merchant_name,
          amount: parseFloat(tx.amount) || 0,
          currency: tx.currency || 'INR',
          date: tx.transaction_date || tx.date || new Date().toISOString().split('T')[0],
          category: tx.category || 'General',
          status: tx.status || 'completed',
          is_anomalous: !!tx.is_anomalous,
          reason: tx.anomaly_reason || tx.reason || null
        }));
        setTransactions(normalized);
      }
    } catch (err) {
      console.warn('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const header = 'Merchant,Amount,Currency,Date,Category,Status,AnomalyFlag,Reason\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.merchant}",${t.amount},"${t.currency}","${t.date}","${t.category}","${t.status}","${t.is_anomalous ? 'ANOMALOUS' : 'NORMAL'}","${(t.reason || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + header + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SubGuard_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').filter((l) => l.trim().length > 0);
      const parsed = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts.length >= 2) {
          const merchant = parts[0]?.trim().replace(/^"|"$/g, '');
          const amount = parseFloat(parts[1]?.trim().replace(/^"|"$/g, ''));
          const date = parts[2]?.trim().replace(/^"|"$/g, '') || new Date().toISOString().split('T')[0];
          const category = parts[3]?.trim().replace(/^"|"$/g, '') || 'General';

          if (merchant && !isNaN(amount)) {
            parsed.push({
              merchant,
              amount,
              transaction_date: date,
              category
            });
          }
        }
      }

      if (parsed.length === 0) {
        alert('Could not find valid rows in CSV. Required format: merchant,amount,date,category');
        setUploading(false);
        return;
      }

      try {
        const res = await apiRequest('/transactions/csv', 'POST', { records: parsed });
        setDetectionResults(res);
        await fetchTransactions();
      } catch (err) {
        alert('Error uploading statement: ' + (err.message || 'Unknown error'));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsText(file);
  };

  const filtered = transactions.filter((tItem) => {
    const matchesSearch = tItem.merchant.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || tItem.category === categoryFilter;
    const matchesAnomaly =
      anomalyFilter === 'All' ||
      (anomalyFilter === 'anomalous' && tItem.is_anomalous) ||
      (anomalyFilter === 'normal' && !tItem.is_anomalous);
    return matchesSearch && matchesCategory && matchesAnomaly;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">
            {t('tx_title', 'Transaction History & Anomaly Detection')}
          </h1>
          <p className="text-sm text-gray-400">
            {t('tx_desc', 'Ingest statements, audit transactions, and flag unexpected price spikes')}
          </p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleExportCSV}
            disabled={transactions.length === 0}
            className="flex items-center space-x-2 px-4 py-2.5 bg-navy-850 hover:bg-navy-800 border border-navy-700 text-gray-200 rounded-xl text-sm font-semibold transition hover:scale-105 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-lg shadow-purple-600/30 transition hover:scale-105">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'Processing...' : t('tx_upload_csv', 'Upload Bank CSV')}</span>
            <input type="file" accept=".csv" disabled={uploading} onChange={handleCSVUpload} className="hidden" />
          </label>
        </div>
      </div>

      {detectionResults && (
        <div className="bg-gradient-to-r from-purple-900/40 to-navy-850 border border-purple-500/40 p-6 rounded-2xl space-y-4 animate-fadeIn">
          <div className="flex items-center space-x-2 text-purple-300 font-bold text-base">
            <Zap className="w-5 h-5 text-purple-400" />
            <span>{t('tx_audit_summary', 'Algorithmic Anomaly Audit Summary')}</span>
          </div>
          <p className="text-xs text-gray-300">{detectionResults.message}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-700">
              <span className="text-xs text-gray-400 font-semibold uppercase">
                {t('tx_anomaly_detected', 'Anomalies Identified')}
              </span>
              <p className="text-2xl font-black text-red-400 mt-1">
                {detectionResults.anomaliesIdentified || 0} Price Spikes / Duplicates
              </p>
            </div>
            <div className="bg-navy-900/80 p-4 rounded-xl border border-navy-700">
              <span className="text-xs text-gray-400 font-semibold uppercase">
                {t('reports_tracked_subs', 'Subscriptions Identified')}
              </span>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                {detectionResults.detectedSubscriptions?.length || 0} Patterns Confirmed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            type="text"
            placeholder={t('tx_search_placeholder', 'Search transactions by merchant name...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="All">All Categories</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Productivity">Productivity</option>
            <option value="Cloud/Dev">Cloud / Dev</option>
            <option value="Health">Health</option>
            <option value="General">General</option>
          </select>
        </div>

        <div>
          <select
            value={anomalyFilter}
            onChange={(e) => setAnomalyFilter(e.target.value)}
            className="w-full px-4 py-2.5 bg-navy-850 border border-navy-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
          >
            <option value="All">All Transactions</option>
            <option value="anomalous">Anomalies Only (Spikes & Flags)</option>
            <option value="normal">Normal Only</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-navy-850 border border-navy-700 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="p-12 text-center text-gray-400 flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span className="text-sm">Loading audited transactions ledger...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-2">
            <p className="text-base font-semibold text-white">No transactions found</p>
            <p className="text-xs">
              Upload a bank statement CSV using the button above to begin automatic anomaly auditing.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-navy-900/70 text-xs text-gray-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">{t('tx_col_merchant', 'Merchant')}</th>
                  <th className="p-4">{t('tx_col_date', 'Date')}</th>
                  <th className="p-4">{t('tx_col_category', 'Category')}</th>
                  <th className="p-4">{t('tx_col_amount', 'Amount')}</th>
                  <th className="p-4">{t('tx_col_flag', 'Audit Flag')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-700/60">
                {filtered.map((tx) => {
                  const symbol =
                    tx.currency === 'USD' ? '$' : tx.currency === 'EUR' ? '€' : tx.currency === 'GBP' ? '£' : '₹';
                  return (
                    <tr key={tx.id} className="hover:bg-navy-800/40 transition">
                      <td className="p-4 font-bold text-white">{tx.merchant}</td>
                      <td className="p-4 text-xs text-gray-400">{tx.date}</td>
                      <td className="p-4 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-navy-900 border border-navy-700 text-gray-300 text-[11px]">
                          {tx.category}
                        </span>
                      </td>
                      <td className="p-4 font-black text-white">
                        {symbol}{tx.amount}
                      </td>
                      <td className="p-4">
                        {tx.is_anomalous ? (
                          <span className="inline-flex items-center space-x-1.5 text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30 font-medium">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{tx.reason || t('tx_anomaly_detected', 'Price Hike / Anomaly Detected')}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-medium">
                            <CheckCircle className="w-3 h-3" />
                            <span>{t('tx_verified_normal', 'Verified Normal')}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
