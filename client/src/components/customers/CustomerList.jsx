import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, Users, X } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const CustomerForm = ({ customer, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', company: '', gst: '', notes: '',
    address: { street: '', city: '', state: '', zipCode: '', country: 'India' },
    ...customer
  });
  const [saving, setSaving] = useState(false);
  const { success, error } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (customer?._id) {
        await api.put(`/customers/${customer._id}`, form);
        success('Customer updated');
      } else {
        await api.post('/customers', form);
        success('Customer created');
      }
      onSaved();
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const updateAddress = (field, value) => {
    setForm(prev => ({ ...prev, address: { ...prev.address, [field]: value } }));
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-glass-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-surface-100 dark:border-surface-700">
          <h2 className="text-lg font-semibold text-surface-800 dark:text-white">
            {customer?._id ? 'Edit Customer' : 'Add Customer'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5 text-surface-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Name *</label>
              <input className="input-glass" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Email *</label>
              <input className="input-glass" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Phone</label>
              <input className="input-glass" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Company</label>
              <input className="input-glass" value={form.company} onChange={e => setForm({...form, company: e.target.value})} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Street Address</label>
            <input className="input-glass" value={form.address?.street || ''} onChange={e => updateAddress('street', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-surface-500 mb-1">City</label>
              <input className="input-glass text-sm" value={form.address?.city || ''} onChange={e => updateAddress('city', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-surface-500 mb-1">State</label>
              <input className="input-glass text-sm" value={form.address?.state || ''} onChange={e => updateAddress('state', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-surface-500 mb-1">ZIP</label>
              <input className="input-glass text-sm" value={form.address?.zipCode || ''} onChange={e => updateAddress('zipCode', e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-surface-500 mb-1">Country</label>
              <input className="input-glass text-sm" value={form.address?.country || ''} onChange={e => updateAddress('country', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">GST</label>
              <input className="input-glass" value={form.gst} onChange={e => setForm({...form, gst: e.target.value})} /></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Notes</label>
            <textarea className="input-glass h-20 resize-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Saving...' : customer?._id ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const { success, error } = useNotification();

  useEffect(() => { fetchCustomers(); }, [page, search]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get(`/customers?page=${page}&limit=10&search=${search}`);
      setCustomers(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteId}`);
      success('Customer deleted');
      setDeleteId(null);
      fetchCustomers();
    } catch (err) { error('Failed to delete customer'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white">Customers</h1>
          <p className="text-surface-400 text-sm mt-1">{pagination.total || 0} total customers</p>
        </div>
        <button onClick={() => { setEditCustomer(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input placeholder="Search customers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="input-glass pl-10 text-sm" />
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-100 dark:border-surface-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Company</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Invoices</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="border-t border-surface-100 dark:border-surface-700/50">
                    {[1,2,3,4,5,6].map(j => <td key={j} className="px-6 py-4"><div className="skeleton h-4 w-24 rounded" /></td>)}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center">
                  <Users className="w-12 h-12 mx-auto text-surface-300 mb-3" />
                  <p className="text-surface-400">No customers found</p>
                </td></tr>
              ) : customers.map(c => (
                <tr key={c._id} className="border-t border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 font-semibold text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-medium text-sm text-surface-800 dark:text-white">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-500">{c.email}</td>
                  <td className="px-6 py-4 text-sm text-surface-500">{c.phone || '—'}</td>
                  <td className="px-6 py-4 text-sm text-surface-500">{c.company || '—'}</td>
                  <td className="px-6 py-4 text-sm font-medium text-surface-700 dark:text-surface-300">{c.totalInvoices || 0}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setEditCustomer(c); setShowForm(true); }} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(c._id)} className="p-1.5 rounded-lg text-surface-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-surface-100 dark:border-surface-700">
            <p className="text-xs text-surface-400">Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && <CustomerForm customer={editCustomer} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchCustomers(); }} />}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-glass-xl p-6 max-w-sm w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-surface-800 dark:text-white mb-2">Delete Customer?</h3>
            <p className="text-sm text-surface-400 mb-6">This action cannot be undone.</p>
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

export default CustomerList;
