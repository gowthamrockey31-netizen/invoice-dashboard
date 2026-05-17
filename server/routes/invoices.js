const express = require('express');
const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Payment = require('../models/Payment');
const { protect } = require('../middleware/auth');
const { generateInvoiceNumber } = require('../utils/invoiceNumber');
const { generateInvoicePDF } = require('../services/pdfService');
const { sendInvoiceEmail } = require('../services/emailService');

const router = express.Router();
router.use(protect);

// @route   GET /api/invoices
// @desc    Get all invoices with filters & pagination
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 10, sort = '-createdAt', startDate, endDate } = req.query;
    const query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query)
      .populate('customer', 'name email company')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics for dashboard
router.get('/stats', async (req, res) => {
  try {
    const totalInvoices = await Invoice.countDocuments();
    const paidInvoices = await Invoice.countDocuments({ status: 'Paid' });
    const pendingInvoices = await Invoice.countDocuments({ status: { $in: ['Pending', 'Sent'] } });
    const overdueInvoices = await Invoice.countDocuments({ status: 'Overdue' });

    const revenueResult = await Invoice.aggregate([
      { $match: { status: 'Paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    const pendingResult = await Invoice.aggregate([
      { $match: { status: { $in: ['Pending', 'Sent'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const pendingAmount = pendingResult.length > 0 ? pendingResult[0].total : 0;

    // Monthly revenue for charts (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyRevenue = await Invoice.aggregate([
      { $match: { status: 'Paid', paidDate: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$paidDate' },
            month: { $month: '$paidDate' }
          },
          revenue: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Status distribution for donut chart
    const statusDistribution = await Invoice.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        totalRevenue,
        pendingAmount,
        monthlyRevenue,
        statusDistribution
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/invoices/recent
// @desc    Get recent invoices for dashboard
router.get('/recent', async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate('customer', 'name email')
      .sort('-createdAt')
      .limit(10);

    res.json({ success: true, data: invoices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/invoices/:id
// @desc    Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get payment history
    const payments = await Payment.find({ invoice: invoice._id }).sort('-paidAt');

    res.json({ success: true, data: { ...invoice.toObject(), payments } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/invoices
// @desc    Create invoice
router.post('/', async (req, res) => {
  try {
    const { customer, items, taxRate, discountRate, dueDate, notes, status } = req.body;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const taxAmount = (subtotal * (taxRate || 0)) / 100;
    const discountAmount = (subtotal * (discountRate || 0)) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Update item totals
    const processedItems = items.map(item => ({
      ...item,
      total: item.quantity * item.price
    }));

    const invoice = await Invoice.create({
      invoiceNumber,
      customer,
      items: processedItems,
      subtotal,
      taxRate: taxRate || 0,
      taxAmount,
      discountRate: discountRate || 0,
      discountAmount,
      totalAmount,
      status: status || 'Draft',
      dueDate,
      notes
    });

    // Update customer stats
    await Customer.findByIdAndUpdate(customer, {
      $inc: { totalInvoices: 1, totalSpent: totalAmount }
    });

    const populated = await Invoice.findById(invoice._id).populate('customer');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/invoices/:id
// @desc    Update invoice
router.put('/:id', async (req, res) => {
  try {
    const { items, taxRate, discountRate, ...rest } = req.body;
    let updateData = { ...rest };

    if (items) {
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const taxAmount = (subtotal * (taxRate || 0)) / 100;
      const discountAmount = (subtotal * (discountRate || 0)) / 100;
      const totalAmount = subtotal + taxAmount - discountAmount;

      updateData = {
        ...updateData,
        items: items.map(item => ({ ...item, total: item.quantity * item.price })),
        subtotal,
        taxRate: taxRate || 0,
        taxAmount,
        discountRate: discountRate || 0,
        discountAmount,
        totalAmount
      };
    }

    if (updateData.status === 'Paid' && !updateData.paidDate) {
      updateData.paidDate = new Date();
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customer');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Clean up payments
    await Payment.deleteMany({ invoice: invoice._id });

    res.json({ success: true, message: 'Invoice deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/invoices/:id/pdf
// @desc    Generate and download PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const user = await require('../models/User').findById(req.user._id);
    const pdfBuffer = await generateInvoicePDF(invoice, user);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${invoice.invoiceNumber}.pdf`,
      'Content-Length': pdfBuffer.length
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF' });
  }
});

// @route   POST /api/invoices/:id/send
// @desc    Send invoice via email
router.post('/:id/send', async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('customer');
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const user = await require('../models/User').findById(req.user._id);
    const pdfBuffer = await generateInvoicePDF(invoice, user);

    await sendInvoiceEmail(invoice, pdfBuffer, user);

    // Update invoice status
    invoice.emailSent = true;
    invoice.emailSentAt = new Date();
    if (invoice.status === 'Draft') {
      invoice.status = 'Sent';
    }
    await invoice.save();

    res.json({ success: true, message: 'Invoice sent successfully' });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email: ' + error.message });
  }
});

module.exports = router;
