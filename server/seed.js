const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./models/User');
const Customer = require('./models/Customer');
const Invoice = require('./models/Invoice');
const Payment = require('./models/Payment');

const connectDB = require('./config/db');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany();
    await Customer.deleteMany();
    await Invoice.deleteMany();
    await Payment.deleteMany();

    // Create admin user
    console.log('👤 Creating admin user...');
    const admin = await User.create({
      name: 'Admin',
      email: 'admin@murugacoconut.com',
      password: 'admin123',
      role: 'admin',
      company: {
        name: 'Muruga Coconut',
        address: 'Chennai, Tamil Nadu, India',
        phone: '+91 9876543210',
        email: 'info@murugacoconut.com',
        gst: 'GSTIN12345678'
      }
    });

    // Create customers
    console.log('👥 Creating customers...');
    const customers = await Customer.create([
      { name: 'Rajesh Kumar', email: 'rajesh@example.com', phone: '+91 9876543211', company: 'Kumar Traders', address: { street: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', zipCode: '400001', country: 'India' } },
      { name: 'Priya Sharma', email: 'priya@example.com', phone: '+91 9876543212', company: 'Sharma Foods', address: { street: '45 Anna Salai', city: 'Chennai', state: 'Tamil Nadu', zipCode: '600001', country: 'India' } },
      { name: 'Arun Patel', email: 'arun@example.com', phone: '+91 9876543213', company: 'Patel Exports', address: { street: '78 SG Highway', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380001', country: 'India' } },
      { name: 'Deepa Nair', email: 'deepa@example.com', phone: '+91 9876543214', company: 'Nair Industries', address: { street: '12 MG Road', city: 'Kochi', state: 'Kerala', zipCode: '682001', country: 'India' } },
      { name: 'Suresh Reddy', email: 'suresh@example.com', phone: '+91 9876543215', company: 'Reddy Corp', address: { street: '56 Jubilee Hills', city: 'Hyderabad', state: 'Telangana', zipCode: '500033', country: 'India' } }
    ]);

    // Create invoices
    console.log('📄 Creating invoices...');
    const now = new Date();
    const invoices = [];
    const statuses = ['Paid', 'Paid', 'Paid', 'Pending', 'Sent', 'Overdue', 'Paid', 'Draft', 'Paid', 'Pending'];

    for (let i = 0; i < 10; i++) {
      const customer = customers[i % customers.length];
      const daysAgo = Math.floor(Math.random() * 90);
      const issueDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      const dueDate = new Date(issueDate.getTime() + 30 * 24 * 60 * 60 * 1000);

      const items = [
        { name: 'Coconut Oil (1L)', description: 'Premium cold-pressed coconut oil', quantity: Math.ceil(Math.random() * 20), price: 250 },
        { name: 'Desiccated Coconut (500g)', description: 'Fine grade desiccated coconut', quantity: Math.ceil(Math.random() * 15), price: 120 },
      ];
      if (Math.random() > 0.5) {
        items.push({ name: 'Coconut Milk (500ml)', description: 'Organic coconut milk', quantity: Math.ceil(Math.random() * 10), price: 180 });
      }

      const processedItems = items.map(item => ({ ...item, total: item.quantity * item.price }));
      const subtotal = processedItems.reduce((s, item) => s + item.total, 0);
      const taxRate = 18;
      const taxAmount = (subtotal * taxRate) / 100;
      const discountRate = i % 3 === 0 ? 5 : 0;
      const discountAmount = (subtotal * discountRate) / 100;
      const totalAmount = subtotal + taxAmount - discountAmount;

      const status = statuses[i];
      const paidDate = status === 'Paid' ? new Date(issueDate.getTime() + Math.random() * 25 * 24 * 60 * 60 * 1000) : null;

      const invoice = await Invoice.create({
        invoiceNumber: `INV-2026-${String(i + 1).padStart(4, '0')}`,
        customer: customer._id,
        items: processedItems,
        subtotal, taxRate, taxAmount, discountRate, discountAmount, totalAmount,
        status, dueDate, issueDate, paidDate,
        notes: i % 2 === 0 ? 'Thank you for your business!' : ''
      });
      invoices.push(invoice);

      // Update customer stats
      customer.totalInvoices++;
      customer.totalSpent += totalAmount;
    }
    await Promise.all(customers.map(c => c.save()));

    // Create payments for paid invoices
    console.log('💰 Creating payments...');
    for (const inv of invoices) {
      if (inv.status === 'Paid') {
        await Payment.create({
          invoice: inv._id,
          customer: inv.customer,
          amount: inv.totalAmount,
          method: ['Cash', 'Bank Transfer', 'UPI'][Math.floor(Math.random() * 3)],
          transactionId: `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`,
          paidAt: inv.paidDate
        });
      }
    }

    console.log('✅ Seed completed successfully!');
    console.log(`   Admin: admin@murugacoconut.com / admin123`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Invoices: ${invoices.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();
