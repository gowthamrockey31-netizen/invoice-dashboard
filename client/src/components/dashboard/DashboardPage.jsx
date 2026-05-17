import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, FileText, CheckCircle, Clock, TrendingUp,
  ArrowUpRight, ArrowDownRight, Eye, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import api from '../../services/api';

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6', '#6B7280'];

const StatCard = ({ title, value, icon: Icon, trend, trendUp, gradient, delay }) => (
  <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg animate-slide-up`} style={{ animationDelay: `${delay}ms`, background: gradient }}>
    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
    <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-6 -translate-x-6" />
    <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${trendUp ? 'bg-white/20' : 'bg-white/15'}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}%
          </div>
        )}
      </div>
      <p className="text-white/70 text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const cls = {
    Paid: 'badge-paid', Pending: 'badge-pending', Overdue: 'badge-overdue',
    Draft: 'badge-draft', Sent: 'badge-sent'
  };
  return <span className={`badge ${cls[status] || 'badge-draft'}`}>{status}</span>;
};

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, recentRes, insightsRes] = await Promise.all([
        api.get('/invoices/stats'),
        api.get('/invoices/recent'),
        api.get('/ai/dashboard-insights').catch(() => ({ data: { data: [] } }))
      ]);
      setStats(statsRes.data.data);
      setRecentInvoices(recentRes.data.data);
      setInsights(insightsRes.data.data || []);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
        <div className="skeleton h-80 rounded-2xl" />
      </div>
    );
  }

  const chartData = (stats?.monthlyRevenue || []).map(item => ({
    name: MONTHS[item._id.month - 1],
    revenue: item.revenue,
    invoices: item.count
  }));

  const pieData = (stats?.statusDistribution || []).map(item => ({
    name: item._id,
    value: item.count,
    amount: item.amount
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-white">Dashboard</h1>
          <p className="text-surface-400 text-sm mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary flex items-center gap-2 text-sm w-fit">
          <FileText className="w-4 h-4" />
          New Invoice
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats?.totalRevenue || 0)} icon={DollarSign}
          trend={12} trendUp gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)" delay={0} />
        <StatCard title="Total Invoices" value={stats?.totalInvoices || 0} icon={FileText}
          trend={8} trendUp gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)" delay={100} />
        <StatCard title="Paid" value={stats?.paidInvoices || 0} icon={CheckCircle}
          gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" delay={200} />
        <StatCard title="Pending" value={stats?.pendingInvoices || 0} icon={Clock}
          gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" delay={300} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-surface-800 dark:text-white">Revenue Analytics</h2>
              <p className="text-xs text-surface-400 mt-1">Monthly revenue overview</p>
            </div>
            <TrendingUp className="w-5 h-5 text-primary-500" />
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 8px 32px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [formatCurrency(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2.5} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-surface-400 text-sm">
              No revenue data yet. Create and mark invoices as paid to see analytics.
            </div>
          )}
        </div>

        {/* Status Distribution */}
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <h2 className="font-semibold text-surface-800 dark:text-white mb-6">Invoice Status</h2>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                    paddingAngle={3} dataKey="value" strokeWidth={0}>
                    {pieData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {pieData.map((item, idx) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <span className="text-surface-600 dark:text-surface-300">{item.name}</span>
                    </div>
                    <span className="font-medium text-surface-800 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-surface-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="glass-card p-6 animate-slide-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-accent-500" />
            <h2 className="font-semibold text-surface-800 dark:text-white">AI Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.map((insight, idx) => (
              <div key={idx} className={`p-4 rounded-xl border ${
                insight.type === 'success' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                insight.type === 'warning' ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' :
                insight.type === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
              }`}>
                <span className="text-2xl">{insight.icon}</span>
                <h3 className="font-semibold text-sm mt-2 text-surface-800 dark:text-white">{insight.title}</h3>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{insight.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Invoices */}
      <div className="glass-card overflow-hidden animate-slide-up" style={{ animationDelay: '500ms' }}>
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="font-semibold text-surface-800 dark:text-white">Recent Invoices</h2>
          <button onClick={() => navigate('/invoices')} className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
            View all <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-surface-100 dark:border-surface-700">
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Invoice</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-surface-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv) => (
                <tr key={inv._id} className="border-t border-surface-100 dark:border-surface-700/50 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-sm text-surface-800 dark:text-white">{inv.invoiceNumber}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-surface-600 dark:text-surface-300">{inv.customer?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-surface-800 dark:text-white">{formatCurrency(inv.totalAmount)}</td>
                  <td className="px-6 py-4"><StatusBadge status={inv.status} /></td>
                  <td className="px-6 py-4 text-sm text-surface-400">{new Date(inv.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => navigate(`/invoices/${inv._id}`)}
                      className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-surface-400 text-sm">No invoices yet. Create your first invoice!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
