import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Eye, Edit, Trash2, Download, Send, FileText,
  ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const statusFilters = ['All', 'Draft', 'Sent', 'Pending', 'Paid', 'Overdue'];

const StatusBadge = ({ status }) => {
  const cls = { Paid: 'badge-paid', Pending: 'badge-pending', Overdue: 'badge-overdue', Draft: 'badge-draft', Sent: 'badge-sent', Cancelled: 'badge-draft' };
  return <span className={`badge ${cls[status] || 'badge-draft'}`}>{status}</span>;
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const navigate = useNavigate();
  const { success, error } = useNotification();

  useEffect(() => { fetchInvoices(); }, [page, search, statusFilter]);

  const fetchInvoices = async () => {
    try {
      const params = new URLSearchParams({ page, limit: 10, search, status: statusFilter });
      const res = await api.get(`/invoices?${params}`);
      setInvoices(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/invoices/${deleteId}`);
      success('Invoice deleted');
      setDeleteId(null);
      fetchInvoices();
    } catch (err) { error('Failed to delete invoice'); }
  };

  const handleDownloadPDF = async (id, invNum) => {
    try {
      const res = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${invNum}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      success('PDF downloaded');
    } catch (err) { error('Failed to generate PDF'); }
  };

  const handleSendEmail = async (id) => {
    try {
      await api.post(`/invoices/${id}/send`);
      success('Invoice sent via email!');
      fetchInvoices();
    } catch (err) { error(err.response?.data?.message || 'Failed to send email'); }
  };

  const exportCSV = () => {
    const headers = ['Invoice #', 'Customer', 'Amount', 'Status', 'Due Date', 'Created'];
    const rows = invoices.map(inv => [
      inv.invoiceNumber, inv.customer?.name || '', inv.totalAmount,
      inv.status, new Date(inv.dueDate).toLocaleDateString(), new Date(inv.createdAt).toLocaleDateString()
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'invoices.csv';
    link.click();
    success('CSV exported');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white">Invoices</h1>
          <p className="text-surface-400 text-sm mt-1">{pagination.total || 0} total invoices</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={() => navigate('/invoices/new')} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input placeholder="Search by invoice # or customer..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} className="input-glass pl-10 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statusFilters.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400 dark:hover:bg-surface-700'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="border-t border-surface-100 dark:border-surface-700/50">
                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-6 py-4"><div className="skeleton h-4 w-20 rounded" /></td>)}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <FileText className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                  <p className="text-surface-400">No invoices found</p>
                </td></tr>
              ) : invoices.map(inv => (
                <tr key={inv._id} className="border-t border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-sm text-primary-600 dark:text-primary-400 cursor-pointer hover:underline"
                    onClick={() => navigate(`/invoices/${inv._id}`)}>{inv.invoiceNumber}</td>
                  <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-300">{inv.customer?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-surface-800 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-6 py-4 text-sm text-surface-400">{new Date(inv.dueDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => navigate(`/invoices/${inv._id}`)} title="View"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleDownloadPDF(inv._id, inv.invoiceNumber)} title="Download PDF"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"><Download className="w-4 h-4" /></button>
                      <button onClick={() => handleSendEmail(inv._id)} title="Send Email"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Send className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(inv._id)} title="Delete"
                        className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
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

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-glass-xl p-6 max-w-sm w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-surface-800 dark:text-white mb-2">Delete Invoice?</h3>
            <p className="text-sm text-surface-400 mb-6">This will also remove all associated payments.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="btn-secondary flex-1 text-sm">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1 text-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
