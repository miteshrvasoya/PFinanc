# PFinanc 🚀

A powerful, self-hosted personal and family finance manager engineered for absolute correctness, strict ledger auditability, and multi-asset portfolio management.

---

## 🌟 Purpose

Most personal finance apps suffer from double-counting, lack of privacy, and poor investment tracking. PFinanc solves this by providing a **canonical financial ledger**, robust multi-asset portfolio management, and a multi-tenant family structure—all hosted securely on your own infrastructure. Built for developers and finance enthusiasts who want complete control over their financial data.

## ✨ Key Features

* **Canonical Financial Ledger**: Bulletproof cash balance derivation that strictly prevents double-counting (`Opening Balance + Confirmed Credits - Confirmed Debits`).
* **First-Class Transfers**: Move money between family members or accounts without falsely inflating your income or expenses.
* **Investment Portfolio Manager**: Track stocks, mutual funds, SIPs, ETFs, fixed deposits, and retirement accounts (EPF/PPF/NPS) with automated XIRR calculation and a FIFO cost-basis engine.
* **Smart Statement Ingestion**: AI-powered and deterministic bank statement CSV parsing with robust duplicate detection (SHA256 fingerprinting).
* **Multi-Tier Classification Engine**: Automatically categorizes transactions based on your learned rules and deterministic patterns.
* **Physical Assets**: Directly track physical gold, digital gold, SGBs, and tangible real estate alongside your liquid portfolio.
* **Multi-Tenant Family Accounts**: Role-based access control (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) for complete household financial management with private vs. shared visibility.
* **Zero 3rd-Party ORMs**: Custom raw SQL Data Access Layer with parameterized queries and transactional atomicity for peak performance.

## 🛠️ Tech Stack

* **Backend**: Node.js, Express, TypeScript, PostgreSQL
* **Frontend**: Next.js, React, Tailwind CSS (Single Page Application)
* **AI Integration**: OpenRouter API for intelligent bank statement parsing

---

## 🚀 Getting Started

Follow these steps to set up and run PFinanc on your local machine or server.

### Prerequisites
* **Node.js**: v18+ (v20+ recommended)
* **PostgreSQL**: v14+ running locally or on a server (default port 5432)

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/PFinanc.git
cd PFinanc

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment
Create a `.env` file in the `backend/` directory and configure your database credentials:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:root@localhost:5432/pfinanc
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pfinanc
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET=super_secure_pfinanc_family_secret_key
CORS_ORIGIN=http://localhost:3000

# Optional: Add OpenRouter API key for AI-powered CSV parsing
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3. Start the Servers
PFinanc is designed with automated initialization. Starting the backend will automatically apply database migrations and seed the necessary system categories.

```bash
# Terminal 1: Start Backend API (Port 5000)
cd backend
npm run dev

# Terminal 2: Start Frontend UI (Port 3000)
cd frontend
npm run dev
```

### 4. First-Time Setup Wizard
Open **http://localhost:3000** in your browser. PFinanc will detect a fresh installation and automatically launch the Setup Wizard to help you register the master administrator and create your household.

---

## 📂 Project Structure

```text
PFinanc/
├── backend/                  # Node.js + Express + TypeScript + PostgreSQL
│   ├── src/
│   │   ├── database/         # Custom SQL QueryHelper & migrations
│   │   ├── modules/          # Domain-driven feature modules (Auth, Investments, Analytics, etc.)
│   │   └── app.ts            # App initialization & automated DB setup
│   └── tests/                # Automated test suites
├── frontend/                 # Next.js + React + Tailwind CSS
│   └── src/
│       ├── components/       # UI components organized by feature
│       ├── context/          # React context for Auth & Households
│       └── pages/            # Client-rendered SPA views
├── docs/                     # Comprehensive engineering documentation
└── examples/                 # Sample CSV fixtures for bank statements & tradebooks
```

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open-source and available under the MIT License.
