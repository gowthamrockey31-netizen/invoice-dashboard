import { useState, useEffect } from 'react';
import { CreditCard, Calendar, ChevronLeft, ChevronRight, Plus, X, AlertTriangle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const methods = ['Cash', 'Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cheque', 'Other'];

const PaymentPage = () => {
  const [payments, setPayments] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showForm, setShowForm] = useState(false);
  const { success, error } = useNotification();

  const [form, setForm] = useState({ invoice: '', amount: '', method: 'Bank Transfer', transactionId: '', notes: '' });
  const [pendingInvoices, setPendingInvoices] = useState([]);

  useEffect(() => { fetchPayments(); fetchPredictions(); }, [page]);

  const fetchPayments = async () => {
    try {
      const res = await api.get(`/payments?page=${page}&limit=10`);
      setPayments(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchPredictions = async () => {
    try {
      const res = await api.get('/ai/predict-delays');
      setPredictions((res.data.data || []).filter(p => p.riskScore >= 2).slice(0, 5));
    } catch (err) { /* ignore */ }
  };

  const fetchPendingInvoices = async () => {
    const res = await api.get('/invoices?status=Pending&limit=50');
    const sent = await api.get('/invoices?status=Sent&limit=50');
    setPendingInvoices([...res.data.data, ...sent.data.data]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', { ...form, amount: parseFloat(form.amount) });
      success('Payment recorded');
      setShowForm(false);
      setForm({ invoice: '', amount: '', method: 'Bank Transfer', transactionId: '', notes: '' });
      fetchPayments();
    } catch (err) { error(err.response?.data?.message || 'Failed to record payment'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white">Payments</h1>
          <p className="text-surface-400 text-sm mt-1">{pagination.total || 0} total payments</p>
        </div>
        <button onClick={() => { setShowForm(true); fetchPendingInvoices(); }} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Record Payment
        </button>
      </div>

      {/* AI Risk Predictions */}
      {predictions.length > 0 && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-surface-800 dark:text-white text-sm">AI Payment Risk Analysis</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {predictions.map((p, i) => (
              <div key={i} className={`p-4 rounded-xl border ${
                p.risk === 'High' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-surface-800 dark:text-white">{p.customer.name}</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    p.risk === 'High' ? 'bg-red-200 text-red-700' : 'bg-amber-200 text-amber-700'
                  }`}>{p.risk}</span>
                </div>
                <p className="text-xs text-surface-500">Avg: {p.avgPaymentDays} days • {p.pendingInvoices} pending</p>
                <p className="text-xs text-surface-400 mt-1">{p.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Method</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="border-t border-surface-100 dark:border-surface-700/50">
                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-6 py-4"><div className="skeleton h-4 w-20 rounded" /></td>)}
                  </tr>
                ))
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                  <p className="text-surface-400">No payments recorded yet</p>
                </td></tr>
              ) : payments.map(p => (
                <tr key={p._id} className="border-t border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-sm text-primary-600 dark:text-primary-400">{p.invoice?.invoiceNumber || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-300">{p.customer?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4"><span className="badge bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-300">{p.method}</span></td>
                  <td className="px-6 py-4 text-sm text-surface-400">{new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4 text-xs text-surface-400 font-mono">{p.transactionId || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100 dark:border-surface-700">
            <p className="text-xs text-surface-400">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p+1))} disabled={page===pagination.pages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-glass-xl w-full max-w-md animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-surface-100 dark:border-surface-700">
              <h2 className="text-lg font-semibold text-surface-800 dark:text-white">Record Payment</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5 text-surface-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Invoice *</label>
                <select value={form.invoice} onChange={e => setForm({...form, invoice: e.target.value})} className="input-glass" required>
                  <option value="">Select invoice...</option>
                  {pendingInvoices.map(inv => (
                    <option key={inv._id} value={inv._id}>
                      {inv.invoiceNumber} — {inv.customer?.name} — {formatCurrency(inv.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Amount (₹) *</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="input-glass" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Method</label>
                  <select value={form.method} onChange={e => setForm({...form, method: e.target.value})} className="input-glass">
                    {methods.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Transaction ID</label>
                <input value={form.transactionId} onChange={e => setForm({...form, transactionId: e.target.value})} className="input-glass" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} className="input-glass h-16 resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 text-sm">Cancel</button>
                <button type="submit" className="btn-primary flex-1 text-sm">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
