import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function SubscriptionModal({ isOpen, onClose, onSave, initialData }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    merchant_name: '',
    category: 'Entertainment',
    amount: '',
    currency: 'INR',
    billing_frequency: 'monthly',
    payment_method: 'Credit Card',
    status: 'active',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        merchant_name: initialData.merchant_name || '',
        category: initialData.category || 'Entertainment',
        amount: initialData.amount !== undefined ? initialData.amount.toString() : '',
        currency: initialData.currency || 'INR',
        billing_frequency: initialData.billing_frequency || 'monthly',
        payment_method: initialData.payment_method || 'Credit Card',
        status: initialData.status || 'active',
        description: initialData.description || '',
        start_date: initialData.start_date || new Date().toISOString().split('T')[0],
        next_payment_date:
          initialData.next_payment_date ||
          new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        merchant_name: '',
        category: 'Entertainment',
        amount: '',
        currency: 'INR',
        billing_frequency: 'monthly',
        payment_method: 'Credit Card',
        status: 'active',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        next_payment_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
      });
    }
    setErrors({});
    setIsSubmitting(false);
    setSuccessMsg('');
  }, [initialData, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.merchant_name || !formData.merchant_name.trim()) {
      errs.merchant_name = 'Subscription name is required';
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      errs.amount = 'Please enter a valid amount greater than 0';
    }
    if (!formData.next_payment_date) {
      errs.next_payment_date = 'Next renewal date is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const payload = {
        ...formData,
        merchant_name: formData.merchant_name.trim(),
        amount: parseFloat(formData.amount),
        description: formData.description.trim()
      };

      if (onSave) {
        await onSave(payload);
      }

      setSuccessMsg(
        initialData
          ? 'Subscription updated successfully!'
          : 'New subscription added successfully!'
      );

      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
      }, 700);
    } catch (err) {
      setErrors({ form: err.message || 'Failed to save subscription' });
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div className="bg-navy-850 border border-navy-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl relative my-8 animate-fadeIn">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 text-gray-400 hover:text-white transition disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-bold text-white">
            {initialData ? t('modal_edit_title', 'Edit Subscription') : t('modal_add_title', 'Add New Subscription')}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Register your active commitment for autonomous spend monitoring and anomaly detection
          </p>
        </div>

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs font-semibold">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errors.form && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-red-400 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subscription Name */}
          <div>
            <label className="text-xs text-gray-400 font-medium flex justify-between">
              <span>{t('modal_merchant_name', 'Subscription Name / Merchant')} *</span>
              {errors.merchant_name && (
                <span className="text-red-400 text-[11px] font-normal">{errors.merchant_name}</span>
              )}
            </label>
            <input
              type="text"
              value={formData.merchant_name}
              onChange={(e) => {
                setFormData({ ...formData, merchant_name: e.target.value });
                if (errors.merchant_name) setErrors({ ...errors, merchant_name: null });
              }}
              className={`w-full mt-1 px-4 py-2 bg-navy-900 border rounded-lg text-white focus:outline-none text-sm transition ${
                errors.merchant_name
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-navy-700 focus:border-purple-500'
              }`}
              placeholder="e.g. Netflix, Spotify, AWS, GitHub Pro, Gym"
            />
          </div>

          {/* Category & Status */}
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
                <option value="Cloud/Dev">Cloud / Dev</option>
                <option value="Fitness">Fitness / Health</option>
                <option value="Music">Music & Media</option>
                <option value="Utilities">Utilities & Infra</option>
                <option value="Shopping">Shopping & Delivery</option>
                <option value="Design">Design & Creative</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm capitalize"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Amount & Currency */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 font-medium flex justify-between">
                <span>{t('modal_amount', 'Amount')} *</span>
                {errors.amount && (
                  <span className="text-red-400 text-[11px] font-normal">{errors.amount}</span>
                )}
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: e.target.value });
                    if (errors.amount) setErrors({ ...errors, amount: null });
                  }}
                  className={`w-full px-4 py-2 bg-navy-900 border rounded-lg text-white focus:outline-none text-sm transition ${
                    errors.amount
                      ? 'border-red-500 focus:border-red-400'
                      : 'border-navy-700 focus:border-purple-500'
                  }`}
                  placeholder="649.00"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>

          {/* Frequency & Payment Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 font-medium">{t('modal_frequency', 'Billing Cycle')}</label>
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

            <div>
              <label className="text-xs text-gray-400 font-medium">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm"
              >
                <option value="Credit Card">Credit Card</option>
                <option value="Debit Card">Debit Card</option>
                <option value="UPI">UPI</option>
                <option value="PayPal">PayPal</option>
                <option value="Net Banking">Net Banking</option>
              </select>
            </div>
          </div>

          {/* Next Renewal Date */}
          <div>
            <label className="text-xs text-gray-400 font-medium flex justify-between">
              <span>{t('modal_next_renewal', 'Next Billing / Renewal Date')} *</span>
              {errors.next_payment_date && (
                <span className="text-red-400 text-[11px] font-normal">{errors.next_payment_date}</span>
              )}
            </label>
            <input
              type="date"
              value={formData.next_payment_date}
              onChange={(e) => {
                setFormData({ ...formData, next_payment_date: e.target.value });
                if (errors.next_payment_date) setErrors({ ...errors, next_payment_date: null });
              }}
              className={`w-full mt-1 px-4 py-2 bg-navy-900 border rounded-lg text-white focus:outline-none text-sm transition ${
                errors.next_payment_date
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-navy-700 focus:border-purple-500'
              }`}
            />
          </div>

          {/* Optional Description / Notes */}
          <div>
            <label className="text-xs text-gray-400 font-medium">Description / Notes (Optional)</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full mt-1 px-4 py-2 bg-navy-900 border border-navy-700 rounded-lg text-white focus:outline-none focus:border-purple-500 text-sm resize-none"
              placeholder="e.g. 4K Family plan shared with 3 household members"
            />
          </div>

          <div className="flex items-center space-x-3 pt-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="flex-1 py-2.5 bg-navy-800 hover:bg-navy-700 border border-navy-700 text-gray-300 font-semibold rounded-lg transition text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-lg shadow-purple-600/30 transition text-sm flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{initialData ? t('modal_save_btn', 'Update Subscription') : t('modal_save_btn', 'Save Subscription')}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
