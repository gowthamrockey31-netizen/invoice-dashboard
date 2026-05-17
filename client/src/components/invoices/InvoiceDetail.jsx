import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Send, CheckCircle, Clock, AlertTriangle,
  Calendar, Mail, CreditCard, FileText, Sparkles
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

const StatusBadge = ({ status }) => {
  const cfg = {
    Paid: { cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: CheckCircle },
    Pending: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock },
    Overdue: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: AlertTriangle },
    Draft: { cls: 'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400', icon: FileText },
    Sent: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Send },
  };
  const c = cfg[status] || cfg.Draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${c.cls}`}>
      <c.icon className="w-4 h-4" />
      {status}
    </span>
  );
};

const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error } = useNotification();
  const [invoice, setInvoice] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchInvoice(); }, [id]);

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data.data);
      // Fetch AI prediction
      if (res.data.data.customer?._id) {
        api.get(`/ai/predict-delays?customerId=${res.data.data.customer._id}`)
          .then(r => setPrediction(r.data.data?.[0]))
          .catch(() => {});
      }
    } catch (err) { error('Invoice not found'); navigate('/invoices'); }
    finally { setLoading(false); }
  };

  const handleDownload = async () => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invoice.invoiceNumber}.pdf`;
      link.click();
      success('PDF downloaded');
    } catch (err) { error('Failed to generate PDF'); }
  };

  const handleSend = async () => {
    try {
      await api.post(`/invoices/${id}/send`);
      success('Invoice sent via email!');
      fetchInvoice();
    } catch (err) { error('Failed to send email'); }
  };

  const handleMarkPaid = async () => {
    try {
      await api.put(`/invoices/${id}`, { status: 'Paid', paidDate: new Date() });
      success('Invoice marked as paid');
      fetchInvoice();
    } catch (err) { error('Failed to update'); }
  };

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-10 w-48 rounded-xl" /><div className="skeleton h-96 rounded-2xl" /></div>;
  }
  if (!invoice) return null;

  const customer = invoice.customer || {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-surface-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-surface-800 dark:text-white">{invoice.invoiceNumber}</h1>
            <p className="text-surface-400 text-sm mt-0.5">Created {new Date(invoice.createdAt).toLocaleDateString('en-IN')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={invoice.status} />
          {invoice.status !== 'Paid' && (
            <button onClick={handleMarkPaid} className="btn-success text-sm flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> Mark Paid
            </button>
          )}
          <button onClick={handleDownload} className="btn-secondary text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={handleSend} className="btn-primary text-sm flex items-center gap-1.5">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>

      {/* AI Prediction */}
      {prediction && prediction.risk !== 'Low' && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${
          prediction.risk === 'High' ? 'bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800' :
          'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
        }`}>
          <Sparkles className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-surface-800 dark:text-white">
              AI Payment Prediction: <span className={prediction.risk === 'High' ? 'text-red-600' : 'text-amber-600'}>{prediction.risk} Risk</span>
            </p>
            <p className="text-xs text-surface-500 mt-1">{prediction.recommendation}</p>
            <p className="text-xs text-surface-400 mt-1">Avg payment: {prediction.avgPaymentDays} days | Overdue rate: {prediction.overdueRate}%</p>
          </div>
        </div>
      )}

      {/* Invoice Card */}
      <div className="glass-card p-6 space-y-6">
        {/* Customer & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-2">Bill To</p>
            <p className="font-semibold text-surface-800 dark:text-white">{customer.name}</p>
            <p className="text-sm text-surface-500">{customer.email}</p>
            {customer.phone && <p className="text-sm text-surface-500">{customer.phone}</p>}
            {customer.company && <p className="text-sm text-surface-500">{customer.company}</p>}
          </div>
          <div className="sm:text-right space-y-1">
            <div className="flex sm:justify-end items-center gap-2 text-sm text-surface-500">
              <Calendar className="w-4 h-4" /> Issue: {new Date(invoice.issueDate).toLocaleDateString('en-IN')}
            </div>
            <div className="flex sm:justify-end items-center gap-2 text-sm text-surface-500">
              <Calendar className="w-4 h-4" /> Due: {new Date(invoice.dueDate).toLocaleDateString('en-IN')}
            </div>
            {invoice.emailSent && (
              <div className="flex sm:justify-end items-center gap-2 text-sm text-emerald-500">
                <Mail className="w-4 h-4" /> Sent {new Date(invoice.emailSentAt).toLocaleDateString('en-IN')}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-x-auto rounded-xl border border-surface-200 dark:border-surface-700">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400">Item</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-surface-400">Qty</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400">Price</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-surface-400">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, i) => (
                <tr key={i} className="border-t border-surface-100 dark:border-surface-700/50">
                  <td className="px-4 py-3 text-sm text-surface-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-surface-800 dark:text-white">{item.name}</p>
                    {item.description && <p className="text-xs text-surface-400 mt-0.5">{item.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-center text-surface-600 dark:text-surface-300">{item.quantity}</td>
                  <td className="px-4 py-3 text-sm text-right text-surface-600 dark:text-surface-300">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-sm text-right font-semibold text-surface-800 dark:text-white">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-72 space-y-2">
            <div className="flex justify-between text-sm"><span className="text-surface-500">Subtotal</span><span className="text-surface-700 dark:text-surface-200">{formatCurrency(invoice.subtotal)}</span></div>
            {invoice.taxRate > 0 && <div className="flex justify-between text-sm"><span className="text-surface-500">Tax ({invoice.taxRate}%)</span><span className="text-surface-700 dark:text-surface-200">{formatCurrency(invoice.taxAmount)}</span></div>}
            {invoice.discountRate > 0 && <div className="flex justify-between text-sm"><span className="text-surface-500">Discount ({invoice.discountRate}%)</span><span className="text-red-500">-{formatCurrency(invoice.discountAmount)}</span></div>}
            <div className="border-t border-surface-200 dark:border-surface-700 pt-2 flex justify-between">
              <span className="font-bold text-surface-800 dark:text-white">Total</span>
              <span className="text-xl font-bold text-primary-600">{formatCurrency(invoice.totalAmount)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
            <p className="text-xs font-semibold text-surface-400 uppercase mb-1">Notes</p>
            <p className="text-sm text-surface-600 dark:text-surface-300">{invoice.notes}</p>
          </div>
        )}
      </div>

      {/* Payment History */}
      {invoice.payments?.length > 0 && (
        <div className="glass-card p-6">
          <h2 className="font-semibold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-500" /> Payment History
          </h2>
          <div className="space-y-3">
            {invoice.payments.map((p, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-surface-900/50">
                <div>
                  <p className="text-sm font-medium text-surface-800 dark:text-white">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-surface-400">{p.method} • {new Date(p.paidAt).toLocaleDateString('en-IN')}</p>
                </div>
                {p.transactionId && <p className="text-xs text-surface-400 font-mono">{p.transactionId}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetail;
