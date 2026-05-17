import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, Send, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

const formatCurrency = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n || 0);

const InvoiceForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { success, error } = useNotification();

  const [customers, setCustomers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    customer: '',
    items: [{ name: '', description: '', quantity: 1, price: 0 }],
    taxRate: 18,
    discountRate: 0,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    status: 'Draft'
  });

  useEffect(() => {
    fetchCustomers();
    if (isEdit) fetchInvoice();
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers/all');
      setCustomers(res.data.data);
    } catch (err) { console.error(err); }
  };

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/invoices/${id}`);
      const inv = res.data.data;
      setForm({
        customer: inv.customer?._id || '',
        items: inv.items.map(i => ({ name: i.name, description: i.description, quantity: i.quantity, price: i.price })),
        taxRate: inv.taxRate,
        discountRate: inv.discountRate,
        dueDate: new Date(inv.dueDate).toISOString().split('T')[0],
        notes: inv.notes || '',
        status: inv.status
      });
    } catch (err) { error('Failed to load invoice'); navigate('/invoices'); }
  };

  const fetchSuggestions = async (query) => {
    try {
      const res = await api.get(`/ai/suggest-items?query=${query}&customerId=${form.customer}`);
      setSuggestions(res.data.data || []);
    } catch (err) { setSuggestions([]); }
  };

  // Calculations
  const subtotal = form.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const taxAmount = (subtotal * form.taxRate) / 100;
  const discountAmount = (subtotal * form.discountRate) / 100;
  const totalAmount = subtotal + taxAmount - discountAmount;

  const updateItem = (index, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };
      return { ...prev, items };
    });

    if (field === 'name' && value.length >= 2) {
      fetchSuggestions(value);
      setShowSuggestions(index);
    } else if (field === 'name') {
      setShowSuggestions(null);
    }
  };

  const addItem = () => {
    setForm(prev => ({ ...prev, items: [...prev.items, { name: '', description: '', quantity: 1, price: 0 }] }));
  };

  const removeItem = (index) => {
    if (form.items.length <= 1) return;
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const applySuggestion = (index, suggestion) => {
    setForm(prev => {
      const items = [...prev.items];
      items[index] = { name: suggestion.name, description: suggestion.description, quantity: 1, price: suggestion.price };
      return { ...prev, items };
    });
    setShowSuggestions(null);
  };

  const handleSubmit = async (sendNow = false) => {
    if (!form.customer) { error('Please select a customer'); return; }
    if (form.items.some(i => !i.name || i.price <= 0)) { error('Please fill in all item details'); return; }

    setSaving(true);
    try {
      const data = { ...form, status: sendNow ? 'Sent' : form.status };
      if (isEdit) {
        await api.put(`/invoices/${id}`, data);
        success('Invoice updated');
      } else {
        const res = await api.post('/invoices', data);
        success('Invoice created');
        if (sendNow) {
          await api.post(`/invoices/${res.data.data._id}/send`);
          success('Invoice sent via email!');
        }
      }
      navigate('/invoices');
    } catch (err) {
      error(err.response?.data?.message || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/invoices')} className="p-2 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white">
            {isEdit ? 'Edit Invoice' : 'New Invoice'}
          </h1>
          <p className="text-surface-400 text-sm mt-0.5">Fill in the details below</p>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        {/* Customer & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Customer *</label>
            <select value={form.customer} onChange={e => setForm({...form, customer: e.target.value})}
              className="input-glass" required>
              <option value="">Select customer...</option>
              {customers.map(c => <option key={c._id} value={c._id}>{c.name} — {c.email}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Due Date *</label>
            <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="input-glass" required />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-surface-600 dark:text-surface-300">Items</label>
            <div className="flex items-center gap-1 text-xs text-accent-500">
              <Sparkles className="w-3.5 h-3.5" /> AI auto-suggest enabled
            </div>
          </div>

          <div className="space-y-3">
            {form.items.map((item, idx) => (
              <div key={idx} className="relative p-4 rounded-xl bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700">
                <div className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-12 sm:col-span-4 relative">
                    <label className="block text-xs text-surface-400 mb-1">Item Name</label>
                    <input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)}
                      onFocus={() => item.name.length >= 2 && setShowSuggestions(idx)}
                      onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                      className="input-glass text-sm" placeholder="Product or service..." />
                    {showSuggestions === idx && suggestions.length > 0 && (
                      <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-surface-800 rounded-xl shadow-glass-lg border border-surface-200 dark:border-surface-700 max-h-40 overflow-y-auto">
                        {suggestions.map((s, si) => (
                          <button key={si} onMouseDown={() => applySuggestion(idx, s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex justify-between items-center">
                            <span className="text-surface-700 dark:text-surface-200">{s.name}</span>
                            <span className="text-xs text-surface-400">₹{s.price}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <label className="block text-xs text-surface-400 mb-1">Description</label>
                    <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                      className="input-glass text-sm" placeholder="Optional..." />
                  </div>
                  <div className="col-span-4 sm:col-span-1">
                    <label className="block text-xs text-surface-400 mb-1">Qty</label>
                    <input type="number" min="1" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="input-glass text-sm text-center" />
                  </div>
                  <div className="col-span-4 sm:col-span-2">
                    <label className="block text-xs text-surface-400 mb-1">Price (₹)</label>
                    <input type="number" min="0" step="0.01" value={item.price} onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                      className="input-glass text-sm" />
                  </div>
                  <div className="col-span-3 sm:col-span-1 text-right">
                    <label className="block text-xs text-surface-400 mb-1">Total</label>
                    <p className="py-3 text-sm font-semibold text-surface-800 dark:text-white">{formatCurrency(item.quantity * item.price)}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {form.items.length > 1 && (
                      <button onClick={() => removeItem(idx)} className="p-2 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-5">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addItem} className="mt-3 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Tax, Discount, Totals */}
        <div className="flex flex-col sm:flex-row justify-end">
          <div className="w-full sm:w-80 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">Subtotal</span>
              <span className="font-medium text-surface-800 dark:text-white">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-surface-500">Tax (%)</span>
              <input type="number" min="0" max="100" value={form.taxRate} onChange={e => setForm({...form, taxRate: parseFloat(e.target.value) || 0})}
                className="input-glass text-sm w-20 text-right py-1.5" />
              <span className="font-medium text-surface-800 dark:text-white w-28 text-right">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm gap-3">
              <span className="text-surface-500">Discount (%)</span>
              <input type="number" min="0" max="100" value={form.discountRate} onChange={e => setForm({...form, discountRate: parseFloat(e.target.value) || 0})}
                className="input-glass text-sm w-20 text-right py-1.5" />
              <span className="font-medium text-red-500 w-28 text-right">-{formatCurrency(discountAmount)}</span>
            </div>
            <div className="border-t border-surface-200 dark:border-surface-700 pt-3 flex justify-between">
              <span className="font-semibold text-surface-800 dark:text-white">Total</span>
              <span className="text-xl font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Notes</label>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
            className="input-glass h-20 resize-none text-sm" placeholder="Payment terms, thank you note..." />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button onClick={() => navigate('/invoices')} className="btn-secondary text-sm">Cancel</button>
          <button onClick={() => handleSubmit(false)} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : isEdit ? 'Update Invoice' : 'Save as Draft'}
          </button>
          {!isEdit && (
            <button onClick={() => handleSubmit(true)} disabled={saving} className="btn-success flex items-center gap-2 text-sm">
              <Send className="w-4 h-4" /> Save & Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceForm;
