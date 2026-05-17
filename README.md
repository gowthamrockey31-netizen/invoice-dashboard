# 🥥 Muruga Coconut — Invoice Management Dashboard

A premium, full-stack Invoice Management SaaS Dashboard with AI-powered features.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![Node](https://img.shields.io/badge/Node.js-Express-green) ![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-blue)

## ✨ Features

- 📊 **Dashboard** — Revenue analytics, charts, AI insights
- 👥 **Customer Management** — Full CRUD with search & pagination
- 📄 **Invoice Management** — Create, edit, PDF generation, email delivery
- 💳 **Payment Tracking** — Record payments, auto-status updates
- 🤖 **AI Features** — Auto-suggest items, predict payment delays, smart email templates
- 🌙 **Dark Mode** — Toggle light/dark theme
- 📧 **Email Integration** — Gmail SMTP with Nodemailer
- 📄 **PDF Generation** — Professional invoices with PDFKit
- 📊 **CSV Export** — Export all data
- 🔐 **Authentication** — JWT-based secure admin login

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 18
- **MongoDB** (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- **Gmail Account** with App Password (for email features)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Copy `.env.example` to `server/.env` and update:

```env
MONGODB_URI=mongodb://localhost:27017/invoice-dashboard
JWT_SECRET=your-secret-key
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 3. Seed Database

```bash
cd server
npm run seed
```

This creates:
- **Admin user**: `admin@murugacoconut.com` / `admin123`
- 5 sample customers
- 10 sample invoices
- Payment records

### 4. Run

```bash
# Terminal 1 — Backend
cd server
npm run dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open **http://localhost:5173** in your browser.

## 📧 Gmail SMTP Setup

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Enable **2-Step Verification**
3. Go to **App Passwords** → Generate new password
4. Use the generated password in `EMAIL_PASS`

## 📁 Project Structure

```
├── client/               # React + Vite + Tailwind frontend
│   ├── src/
│   │   ├── components/   # UI components (layout, pages)
│   │   ├── contexts/     # Auth, Theme, Notification
│   │   ├── services/     # API layer (Axios)
│   │   └── index.css     # Design system
│   └── ...
├── server/               # Node.js + Express backend
│   ├── config/           # DB connection
│   ├── middleware/        # JWT auth
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API endpoints
│   ├── services/         # PDF, Email, AI
│   └── seed.js           # Database seeder
└── .env.example
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS 3, Recharts, Lucide Icons |
| Backend | Node.js, Express, Mongoose |
| Database | MongoDB |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| PDF | PDFKit |
| Email | Nodemailer (Gmail SMTP) |
| AI | Rule-based analytics (no external API) |

## 📜 License

MIT
