const express = require('express');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const { protect } = require('../middleware/auth');

const router = express.Router();
router.use(protect);

// @route   GET /api/payments
// @desc    Get all payments with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = '-paidAt', customerId, startDate, endDate } = req.query;
    const query = {};

    if (customerId) query.customer = customerId;

    if (startDate || endDate) {
      query.paidAt = {};
      if (startDate) query.paidAt.$gte = new Date(startDate);
      if (endDate) query.paidAt.$lte = new Date(endDate);
    }

    const total = await Payment.countDocuments(query);
    const payments = await Payment.find(query)
      .populate('invoice', 'invoiceNumber totalAmount status')
      .populate('customer', 'name email')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: payments,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/payments
// @desc    Record a payment
router.post('/', async (req, res) => {
  try {
    const { invoice: invoiceId, amount, method, transactionId, notes, paidAt } = req.body;

    const invoice = await Invoice.findById(invoiceId).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const payment = await Payment.create({
      invoice: invoiceId,
      customer: invoice.customer._id,
      amount,
      method: method || 'Bank Transfer',
      transactionId,
      notes,
      paidAt: paidAt || new Date()
    });

    // Calculate total paid for this invoice
    const totalPaid = await Payment.aggregate([
      { $match: { invoice: invoice._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const paidAmount = totalPaid.length > 0 ? totalPaid[0].total : 0;

    // Update invoice status
    if (paidAmount >= invoice.totalAmount) {
      invoice.status = 'Paid';
      invoice.paidDate = new Date();
    } else {
      invoice.status = 'Pending';
    }
    await invoice.save();

    // Update customer average payment days
    const daysDiff = Math.floor((new Date() - invoice.issueDate) / (1000 * 60 * 60 * 24));
    const customer = await Customer.findById(invoice.customer._id);
    if (customer) {
      const totalInvoices = customer.totalInvoices || 1;
      customer.avgPaymentDays = Math.round(
        ((customer.avgPaymentDays * (totalInvoices - 1)) + daysDiff) / totalInvoices
      );
      await customer.save();
    }

    const populated = await Payment.findById(payment._id)
      .populate('invoice', 'invoiceNumber totalAmount status')
      .populate('customer', 'name email');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/payments/history/:invoiceId
// @desc    Get payment history for an invoice
router.get('/history/:invoiceId', async (req, res) => {
  try {
    const payments = await Payment.find({ invoice: req.params.invoiceId })
      .populate('customer', 'name email')
      .sort('-paidAt');

    res.json({ success: true, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
