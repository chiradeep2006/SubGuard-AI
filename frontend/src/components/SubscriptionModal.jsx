import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SubscriptionModal({ isOpen, onClose, onSave, initialData }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    merchant_name: '',
    category: 'Entertainment',
    amount: '',
    billing_frequency: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    status: 'active'
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        merchant_name: '',
        category: 'Entertainment',
        amount: '',
        billing_frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        status: 'active'
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...formData, amount: parseFloat(formData.amount) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-4">
          {initialData ? t('modal_edit_title', 'Edit Subscription') : t('modal_add_title', 'Add New Subscription')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 font-medium">{t('modal_merchant_name', 'Merchant Name')}</label>
            <input
              type="text"
              required
              value={formData.merchant_name}
              onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
              className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              placeholder="e.g. Netflix, Amazon Prime"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">{t('modal_amount', 'Amount (₹)')}</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
                placeholder="649"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">{t('modal_frequency', 'Frequency')}</label>
              <select
                value={formData.billing_frequency}
                onChange={(e) => setFormData({ ...formData, billing_frequency: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">{t('modal_category', 'Category')}</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="Entertainment">Entertainment</option>
                <option value="Productivity">Productivity</option>
                <option value="Utilities">Utilities</option>
                <option value="Health">Health</option>
                <option value="Design">Design</option>
                <option value="Shopping">Shopping</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium">{t('modal_next_renewal', 'Next Renewal')}</label>
              <input
                type="date"
                required
                value={formData.next_payment_date}
                onChange={(e) => setFormData({ ...formData, next_payment_date: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-600/30 transition text-sm"
          >
            {t('modal_save_btn', 'Save Subscription')}
          </button>
        </form>
      </div>
    </div>
  );
}
