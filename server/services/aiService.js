const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');

// Auto-suggest invoice items based on past invoice data
const suggestItems = async (query, customerId) => {
  try {
    const matchStage = {};
    if (customerId) matchStage.customer = require('mongoose').Types.ObjectId(customerId);

    const pipeline = [
      ...(Object.keys(matchStage).length ? [{ $match: matchStage }] : []),
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.name',
          avgPrice: { $avg: '$items.price' },
          lastPrice: { $last: '$items.price' },
          count: { $sum: 1 },
          description: { $last: '$items.description' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ];

    if (query) {
      pipeline.splice(pipeline.length - 1, 0, {
        $match: { _id: { $regex: query, $options: 'i' } }
      });
    }

    const results = await Invoice.aggregate(pipeline);

    return results.map(item => ({
      name: item._id,
      price: Math.round(item.lastPrice * 100) / 100,
      avgPrice: Math.round(item.avgPrice * 100) / 100,
      description: item.description || '',
      frequency: item.count
    }));
  } catch (error) {
    console.error('AI suggest error:', error);
    return [];
  }
};

// Predict payment delays based on customer history
const predictPaymentDelays = async (customerId) => {
  try {
    let customers;
    if (customerId) {
      customers = await Customer.find({ _id: customerId });
    } else {
      customers = await Customer.find();
    }

    const predictions = [];

    for (const customer of customers) {
      const invoices = await Invoice.find({
        customer: customer._id,
        status: { $in: ['Paid', 'Overdue'] }
      });

      let totalDays = 0;
      let overdueCount = 0;
      let paidCount = 0;

      invoices.forEach(inv => {
        if (inv.paidDate && inv.issueDate) {
          const days = Math.floor((inv.paidDate - inv.issueDate) / (1000 * 60 * 60 * 24));
          totalDays += days;
          paidCount++;
        }
        if (inv.status === 'Overdue') overdueCount++;
      });

      const avgDays = paidCount > 0 ? Math.round(totalDays / paidCount) : 0;
      const overdueRate = invoices.length > 0 ? (overdueCount / invoices.length) * 100 : 0;

      let risk = 'Low';
      let riskScore = 0;
      if (overdueRate > 50 || avgDays > 45) { risk = 'High'; riskScore = 3; }
      else if (overdueRate > 25 || avgDays > 30) { risk = 'Medium'; riskScore = 2; }
      else { risk = 'Low'; riskScore = 1; }

      // Pending invoices
      const pendingInvoices = await Invoice.find({
        customer: customer._id,
        status: { $in: ['Pending', 'Sent'] }
      });

      predictions.push({
        customer: { id: customer._id, name: customer.name, email: customer.email },
        avgPaymentDays: avgDays,
        overdueRate: Math.round(overdueRate),
        risk,
        riskScore,
        totalInvoices: invoices.length,
        pendingInvoices: pendingInvoices.length,
        recommendation: risk === 'High'
          ? 'Send payment reminder immediately. Consider requiring advance payment.'
          : risk === 'Medium'
          ? 'Send a friendly reminder before due date.'
          : 'No action needed. Customer has good payment history.'
      });
    }

    return predictions.sort((a, b) => b.riskScore - a.riskScore);
  } catch (error) {
    console.error('AI predict error:', error);
    return [];
  }
};

// Smart email templates
const getSmartEmailTemplate = async (type, data) => {
  const { customerName, invoiceNumber, amount, dueDate } = data;
  const templates = {
    'new-invoice': {
      subject: `New Invoice ${invoiceNumber || ''}`,
      body: `Dear ${customerName || 'Customer'},\n\nWe have generated a new invoice${invoiceNumber ? ` #${invoiceNumber}` : ''} for you${amount ? ` amounting to ₹${amount}` : ''}.${dueDate ? `\n\nThe payment is due by ${dueDate}.` : ''}\n\nPlease find the invoice attached. If you have any questions, feel free to reach out.\n\nBest regards`
    },
    'reminder': {
      subject: `Payment Reminder: Invoice ${invoiceNumber || ''}`,
      body: `Dear ${customerName || 'Customer'},\n\nThis is a friendly reminder that invoice${invoiceNumber ? ` #${invoiceNumber}` : ''}${amount ? ` of ₹${amount}` : ''} is${dueDate ? ` due on ${dueDate}` : ' pending'}.\n\nWe kindly request you to process the payment at your earliest convenience.\n\nBest regards`
    },
    'overdue': {
      subject: `Overdue Notice: Invoice ${invoiceNumber || ''}`,
      body: `Dear ${customerName || 'Customer'},\n\nWe would like to bring to your attention that invoice${invoiceNumber ? ` #${invoiceNumber}` : ''}${amount ? ` of ₹${amount}` : ''} is now overdue${dueDate ? ` (was due on ${dueDate})` : ''}.\n\nPlease arrange for the payment immediately to avoid any further delays.\n\nBest regards`
    },
    'thank-you': {
      subject: `Thank You for Your Payment - Invoice ${invoiceNumber || ''}`,
      body: `Dear ${customerName || 'Customer'},\n\nWe have received your payment for invoice${invoiceNumber ? ` #${invoiceNumber}` : ''}${amount ? ` of ₹${amount}` : ''}.\n\nThank you for your prompt payment. We appreciate your business!\n\nBest regards`
    }
  };

  return templates[type] || templates['new-invoice'];
};

// Dashboard insights
const getDashboardInsights = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentPaid = await Invoice.countDocuments({ status: 'Paid', paidDate: { $gte: thirtyDaysAgo } });
    const recentCreated = await Invoice.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const overdueInvoices = await Invoice.find({ status: 'Overdue' }).populate('customer', 'name');
    const highRiskCustomers = await Customer.find({ avgPaymentDays: { $gt: 30 } }).limit(5);

    const insights = [];

    if (recentCreated > 0) {
      const paidRate = Math.round((recentPaid / recentCreated) * 100);
      insights.push({
        type: paidRate > 70 ? 'success' : paidRate > 40 ? 'warning' : 'danger',
        icon: paidRate > 70 ? '✅' : '⚠️',
        title: 'Collection Rate',
        message: `${paidRate}% of invoices were paid in the last 30 days.`,
        metric: `${paidRate}%`
      });
    }

    if (overdueInvoices.length > 0) {
      insights.push({
        type: 'danger',
        icon: '🔴',
        title: 'Overdue Invoices',
        message: `${overdueInvoices.length} invoice(s) are overdue. Follow up with: ${overdueInvoices.slice(0, 3).map(i => i.customer?.name).filter(Boolean).join(', ')}.`,
        metric: overdueInvoices.length
      });
    }

    if (highRiskCustomers.length > 0) {
      insights.push({
        type: 'warning',
        icon: '⚡',
        title: 'Slow Payers',
        message: `${highRiskCustomers.length} customer(s) have average payment times over 30 days.`,
        metric: highRiskCustomers.length
      });
    }

    const totalRevenue = await Invoice.aggregate([
      { $match: { status: 'Paid', paidDate: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    if (totalRevenue.length > 0) {
      insights.push({
        type: 'success',
        icon: '💰',
        title: 'Monthly Revenue',
        message: `₹${totalRevenue[0].total.toLocaleString('en-IN')} collected this month.`,
        metric: `₹${totalRevenue[0].total.toLocaleString('en-IN')}`
      });
    }

    return insights;
  } catch (error) {
    console.error('AI insights error:', error);
    return [];
  }
};

module.exports = { suggestItems, predictPaymentDelays, getSmartEmailTemplate, getDashboardInsights };
