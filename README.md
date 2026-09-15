<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg" alt="Status" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React_Native-20232A?logo=react&logoColor=61DAFB" alt="React Native" />
  <img src="https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?logo=postgresql&logoColor=white" alt="PostgreSQL" />

  <h1>PFinanc 💰</h1>
  <p><b>Self-Hosted Personal & Family Finance Management Application</b></p>
</div>

<br />

Welcome to **PFinanc**, a comprehensive, self-hosted finance management suite designed for individuals and families. Take back control of your financial data with an ecosystem that includes a robust backend API, a responsive web dashboard, and a seamless cross-platform mobile app.

---

## ✨ Key Features

- **👨‍👩‍👧‍👦 Family & Household Ledger**: Manage finances collaboratively. Create households, invite members, and set role-based access control (RBAC).
- **📱 Cross-Platform Mobile App**: Built with Expo & React Native for seamless on-the-go transaction tracking (iOS & Android).
- **💻 Comprehensive Web Dashboard**: Powerful Next.js frontend for deep analytics, physical asset tracking, and investment portfolios.
- **🤖 AI-Powered Financial Advisor**: Automated insights, investment analysis, and intelligent classification rules.
- **📩 SMS Automation**: Automatically parse and categorize financial transactions from SMS messages directly on your mobile device.
- **📊 Advanced Analytics & Investments**: Track fixed deposits, mutual funds, stocks, physical assets, and see your net worth grow.
- **🔒 Private & Self-Hosted**: Your financial data stays yours. Easy to deploy with complete control over your database.

---

## 🛠️ Tech Stack

### Backend (`PFinanc-FullStack/backend`)
- **Node.js & Express**: High-performance RESTful API.
- **TypeScript**: Strictly typed backend logic.
- **PostgreSQL**: Relational database for robust financial ledgers.
- **JWT & Role-Based Access**: Secure authentication and household management.

### Web Frontend (`PFinanc-FullStack/frontend`)
- **Next.js**: Server-rendered React application.
- **TailwindCSS**: Beautiful, responsive, and modern UI.

### Mobile App (`PFinanc-App`)
- **React Native & Expo**: Universal mobile app development.
- **Zustand**: Lightweight global state management.
- **TanStack React Query**: Efficient data fetching and caching.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/)
- [Expo CLI](https://docs.expo.dev/)

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/miteshrvasoya/PFinanc.git
   cd PFinanc
   ```

2. **Backend & Web App Setup:**
   ```bash
   cd PFinanc-FullStack
   npm install
   
   # Setup environment variables
   cp backend/.env.example backend/.env
   
   # Run migrations and seed the database
   npm run migrate
   npm run seed:system
   
   # Start the development server (runs both backend and frontend concurrently)
   npm run dev
   ```

3. **Mobile App Setup:**
   ```bash
   cd ../PFinanc-App
   npm install
   
   # Start the Expo development server
   npm run start
   ```

---

## 📂 Project Structure

```
PFinanc/
├── PFinanc-FullStack/
│   ├── backend/         # Express API, Postgres Migrations, AI Advisor services
│   └── frontend/        # Next.js Web Dashboard
└── PFinanc-App/         # Expo React Native Mobile Application
```

---

## 👤 Author

**Mitesh Vasoya**

- 🐙 **GitHub:** [@miteshrvasoya](https://github.com/miteshrvasoya)
- 💼 **LinkedIn:** [Mitesh Vasoya](https://www.linkedin.com/in/mitesh-vasoya/) *(Update link if necessary)*
- ✉️ **Email:** mitesh@gmail.com

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/miteshrvasoya/PFinanc/issues). 

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the **MIT License**.

---
<div align="center">
  <i>Built with ❤️ by Mitesh Vasoya</i>
</div>
