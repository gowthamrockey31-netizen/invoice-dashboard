const express = require('express');
const { protect } = require('../middleware/auth');
const { suggestItems, predictPaymentDelays, getSmartEmailTemplate, getDashboardInsights } = require('../services/aiService');
const router = express.Router();
router.use(protect);

router.get('/suggest-items', async (req, res) => {
  try {
    const { query, customerId } = req.query;
    const suggestions = await suggestItems(query, customerId);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/predict-delays', async (req, res) => {
  try {
    const { customerId } = req.query;
    const predictions = await predictPaymentDelays(customerId);
    res.json({ success: true, data: predictions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/email-template/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { customerName, invoiceNumber, amount, dueDate } = req.query;
    const template = await getSmartEmailTemplate(type, { customerName, invoiceNumber, amount, dueDate });
    res.json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/dashboard-insights', async (req, res) => {
  try {
    const insights = await getDashboardInsights();
    res.json({ success: true, data: insights });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
