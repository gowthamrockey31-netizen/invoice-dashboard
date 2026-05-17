const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const sendInvoiceEmail = async (invoice, pdfBuffer, user) => {
  const transporter = createTransporter();
  const company = user?.company || {};
  const companyName = company.name || 'Muruga Coconut';
  const customer = invoice.customer;

  const htmlBody = `
    <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:0;">
      <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:30px;text-align:center;border-radius:8px 8px 0 0;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${companyName}</h1>
        <p style="color:#E0E7FF;margin:8px 0 0;font-size:14px;">Invoice ${invoice.invoiceNumber}</p>
      </div>
      <div style="background:#fff;padding:30px;border-radius:0 0 8px 8px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <p style="color:#334155;font-size:15px;">Dear <strong>${customer.name}</strong>,</p>
        <p style="color:#64748B;font-size:14px;line-height:1.6;">
          Please find attached your invoice <strong>${invoice.invoiceNumber}</strong>.
          Below is a summary of your invoice:
        </p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0;">
          <tr style="background:#F1F5F9;">
            <td style="padding:10px 15px;color:#64748B;font-size:13px;">Invoice Number</td>
            <td style="padding:10px 15px;color:#1E293B;font-weight:600;text-align:right;">${invoice.invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:10px 15px;color:#64748B;font-size:13px;">Issue Date</td>
            <td style="padding:10px 15px;color:#1E293B;text-align:right;">${new Date(invoice.issueDate).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr style="background:#F1F5F9;">
            <td style="padding:10px 15px;color:#64748B;font-size:13px;">Due Date</td>
            <td style="padding:10px 15px;color:#1E293B;text-align:right;">${new Date(invoice.dueDate).toLocaleDateString('en-IN')}</td>
          </tr>
          <tr>
            <td style="padding:10px 15px;color:#64748B;font-size:13px;font-weight:600;">Total Amount</td>
            <td style="padding:10px 15px;color:#4F46E5;font-weight:700;font-size:18px;text-align:right;">
              ₹${invoice.totalAmount.toLocaleString('en-IN')}
            </td>
          </tr>
        </table>
        <p style="color:#64748B;font-size:13px;line-height:1.6;">
          If you have any questions, feel free to reply to this email.
        </p>
        <p style="color:#64748B;font-size:13px;">Best regards,<br/><strong>${companyName}</strong></p>
      </div>
      <p style="text-align:center;color:#94A3B8;font-size:11px;padding:15px;">
        This is an automated email from ${companyName}
      </p>
    </div>
  `;

  const mailOptions = {
    from: `"${companyName}" <${process.env.EMAIL_USER}>`,
    to: customer.email,
    subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
    html: htmlBody,
    attachments: [
      {
        filename: `${invoice.invoiceNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  await transporter.sendMail(mailOptions);
};

const sendReminderEmail = async (invoice, templateHtml, user) => {
  const transporter = createTransporter();
  const company = user?.company || {};
  const companyName = company.name || 'Muruga Coconut';

  const mailOptions = {
    from: `"${companyName}" <${process.env.EMAIL_USER}>`,
    to: invoice.customer.email,
    subject: `Payment Reminder: Invoice ${invoice.invoiceNumber}`,
    html: templateHtml
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendInvoiceEmail, sendReminderEmail };
