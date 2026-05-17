const PDFDocument = require('pdfkit');

const generateInvoicePDF = (invoice, user) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const company = user?.company || {};
      const companyName = company.name || 'Muruga Coconut';
      const companyEmail = company.email || '';
      const companyAddress = company.address || '';
      const companyPhone = company.phone || '';
      const companyGST = company.gst || '';

      // Header - Company info
      doc.fontSize(24).font('Helvetica-Bold').fillColor('#4F46E5')
        .text(companyName, 50, 50);
      doc.fontSize(9).font('Helvetica').fillColor('#64748B');
      if (companyAddress) doc.text(companyAddress, 50, 80);
      if (companyEmail) doc.text(`Email: ${companyEmail}`);
      if (companyPhone) doc.text(`Phone: ${companyPhone}`);
      if (companyGST) doc.text(`GST: ${companyGST}`);

      // Invoice title
      doc.fontSize(28).font('Helvetica-Bold').fillColor('#1E293B')
        .text('INVOICE', 350, 50, { align: 'right' });

      // Invoice details
      doc.fontSize(10).font('Helvetica').fillColor('#64748B');
      const detailsY = 90;
      doc.text(`Invoice #: ${invoice.invoiceNumber}`, 350, detailsY, { align: 'right' });
      doc.text(`Date: ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}`, { align: 'right' });
      doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`, { align: 'right' });

      const statusColors = {
        Paid: '#10B981', Pending: '#F59E0B', Overdue: '#EF4444',
        Draft: '#6B7280', Sent: '#3B82F6', Cancelled: '#6B7280'
      };
      doc.fontSize(11).font('Helvetica-Bold')
        .fillColor(statusColors[invoice.status] || '#6B7280')
        .text(`Status: ${invoice.status}`, { align: 'right' });

      // Divider
      doc.moveTo(50, 160).lineTo(545, 160).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // Bill To
      const customer = invoice.customer || {};
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#4F46E5').text('BILL TO', 50, 175);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1E293B').text(customer.name || 'N/A', 50, 192);
      doc.fontSize(9).font('Helvetica').fillColor('#64748B');
      if (customer.email) doc.text(customer.email);
      if (customer.phone) doc.text(customer.phone);
      if (customer.company) doc.text(customer.company);
      const addr = customer.address || {};
      const addressParts = [addr.street, addr.city, addr.state, addr.zipCode].filter(Boolean);
      if (addressParts.length) doc.text(addressParts.join(', '));

      // Items Table Header
      const tableTop = 270;
      doc.rect(50, tableTop, 495, 25).fill('#4F46E5');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.text('#', 58, tableTop + 8, { width: 25 });
      doc.text('ITEM', 85, tableTop + 8, { width: 200 });
      doc.text('QTY', 290, tableTop + 8, { width: 50, align: 'center' });
      doc.text('PRICE', 345, tableTop + 8, { width: 80, align: 'right' });
      doc.text('TOTAL', 430, tableTop + 8, { width: 100, align: 'right' });

      // Items rows
      let y = tableTop + 30;
      const items = invoice.items || [];
      items.forEach((item, i) => {
        const bgColor = i % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
        doc.rect(50, y - 5, 495, 22).fill(bgColor);
        doc.fontSize(9).font('Helvetica').fillColor('#334155');
        doc.text(`${i + 1}`, 58, y, { width: 25 });
        doc.text(item.name, 85, y, { width: 200 });
        doc.text(`${item.quantity}`, 290, y, { width: 50, align: 'center' });
        doc.text(`₹${item.price.toLocaleString('en-IN')}`, 345, y, { width: 80, align: 'right' });
        doc.font('Helvetica-Bold')
          .text(`₹${item.total.toLocaleString('en-IN')}`, 430, y, { width: 100, align: 'right' });
        y += 22;
      });

      // Totals section
      y += 15;
      doc.moveTo(300, y).lineTo(545, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      y += 10;

      const drawTotal = (label, value, bold = false) => {
        doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(bold ? '#1E293B' : '#64748B')
          .text(label, 300, y, { width: 130, align: 'right' });
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor(bold ? '#4F46E5' : '#334155')
          .text(`₹${value.toLocaleString('en-IN')}`, 430, y, { width: 100, align: 'right' });
        y += 20;
      };

      drawTotal('Subtotal:', invoice.subtotal);
      if (invoice.taxRate > 0) drawTotal(`Tax (${invoice.taxRate}%):`, invoice.taxAmount);
      if (invoice.discountRate > 0) drawTotal(`Discount (${invoice.discountRate}%):`, -invoice.discountAmount);

      doc.moveTo(300, y).lineTo(545, y).strokeColor('#4F46E5').lineWidth(1).stroke();
      y += 8;
      drawTotal('TOTAL:', invoice.totalAmount, true);

      // Notes
      if (invoice.notes) {
        y += 20;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#4F46E5').text('NOTES', 50, y);
        y += 15;
        doc.fontSize(9).font('Helvetica').fillColor('#64748B').text(invoice.notes, 50, y, { width: 400 });
      }

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#94A3B8')
        .text('Thank you for your business!', 50, 750, { align: 'center', width: 495 })
        .text(`Generated on ${new Date().toLocaleDateString('en-IN')}`, { align: 'center', width: 495 });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoicePDF };
