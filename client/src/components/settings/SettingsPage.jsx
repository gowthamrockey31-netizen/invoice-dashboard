import { useState } from 'react';
import { Save, Moon, Sun, Building, Mail, Download } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNotification } from '../../contexts/NotificationContext';
import api from '../../services/api';

const SettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { success, error } = useNotification();

  const [company, setCompany] = useState({
    name: user?.company?.name || '',
    address: user?.company?.address || '',
    phone: user?.company?.phone || '',
    email: user?.company?.email || '',
    gst: user?.company?.gst || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ company });
      success('Settings saved');
    } catch (err) { error('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const exportAllData = async () => {
    try {
      const [customersRes, invoicesRes, paymentsRes] = await Promise.all([
        api.get('/customers?limit=1000'),
        api.get('/invoices?limit=1000'),
        api.get('/payments?limit=1000')
      ]);

      const data = {
        exportDate: new Date().toISOString(),
        customers: customersRes.data.data,
        invoices: invoicesRes.data.data,
        payments: paymentsRes.data.data
      };

      // JSON export
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      link.click();

      // CSV exports
      const exportCSV = (name, headers, rows) => {
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const b = new Blob([csv], { type: 'text/csv' });
        const u = window.URL.createObjectURL(b);
        const l = document.createElement('a');
        l.href = u; l.download = `${name}.csv`; l.click();
      };

      exportCSV('customers',
        ['Name', 'Email', 'Phone', 'Company'],
        customersRes.data.data.map(c => [c.name, c.email, c.phone, c.company])
      );

      exportCSV('invoices',
        ['Invoice #', 'Customer', 'Amount', 'Status', 'Due Date'],
        invoicesRes.data.data.map(i => [i.invoiceNumber, i.customer?.name || '', i.totalAmount, i.status, new Date(i.dueDate).toLocaleDateString()])
      );

      success('Data exported successfully!');
    } catch (err) { error('Failed to export data'); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-white">Settings</h1>
        <p className="text-surface-400 text-sm mt-1">Manage your dashboard preferences</p>
      </div>

      {/* Theme */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
          {isDark ? <Moon className="w-5 h-5 text-accent-500" /> : <Sun className="w-5 h-5 text-amber-500" />}
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-surface-700 dark:text-surface-200">Dark Mode</p>
            <p className="text-xs text-surface-400 mt-0.5">Toggle between light and dark theme</p>
          </div>
          <button onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isDark ? 'bg-primary-600' : 'bg-surface-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${isDark ? 'translate-x-7' : ''}`} />
          </button>
        </div>
      </div>

      {/* Company Info */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
          <Building className="w-5 h-5 text-primary-500" />
          Company Information
        </h2>
        <p className="text-xs text-surface-400 mb-4">This information appears on your invoices and PDFs.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Company Name</label>
              <input value={company.name} onChange={e => setCompany({...company, name: e.target.value})} className="input-glass" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Email</label>
              <input value={company.email} onChange={e => setCompany({...company, email: e.target.value})} className="input-glass" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Phone</label>
              <input value={company.phone} onChange={e => setCompany({...company, phone: e.target.value})} className="input-glass" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">GST Number</label>
              <input value={company.gst} onChange={e => setCompany({...company, gst: e.target.value})} className="input-glass" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-600 dark:text-surface-300 mb-1.5">Address</label>
            <textarea value={company.address} onChange={e => setCompany({...company, address: e.target.value})}
              className="input-glass h-20 resize-none" />
          </div>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Email Config Info */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary-500" />
          Email Configuration
        </h2>
        <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
          <p className="text-sm text-primary-700 dark:text-primary-300">
            Email settings are configured via environment variables on the server.
            Update <code className="px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 rounded text-xs">.env</code> file with your Gmail SMTP credentials.
          </p>
        </div>
      </div>

      {/* Export */}
      <div className="glass-card p-6">
        <h2 className="font-semibold text-surface-800 dark:text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-primary-500" />
          Export Data
        </h2>
        <p className="text-sm text-surface-400 mb-4">Download all your data as CSV and JSON files.</p>
        <button onClick={exportAllData} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export All Data
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
