# ExpenseX 💰📊

> **Track Expenses • Manage Better • Save More**

ExpenseX is a modern, responsive monthly budgeting and expense tracking web application powered by **Firebase Authentication** and **Google Cloud Firestore Database**. It allows users to set category-specific budgets, monitor real-time expense progress bars, analyze monthly expenditure trends with interactive charts, and calculate remaining monthly savings.

---

## 🌟 Key Features

### 1. 🔐 Authentication & Security
- **Email & Password Login (`index.html`)**: Powered by Firebase Authentication with error handling for invalid credentials, weak passwords, and network issues.
- **Account Registration (`register.html`)**: Full sign-up flow capturing user name, email, password, and security question for recovery.
- **Persistent Sessions**: User session state managed securely via Firebase Auth and synchronized across browser sessions.
- **Demo Quick Access**: One-click demo login for instant preview.

### 2. 🎯 Monthly Budget Setup & Showcase
- **Select Budget Type**: Set budgets easily for any category:
  - 🍔 **Food & Dining**
  - ✈️ **Travel & Transport**
  - 🎬 **Entertainment & Leisure**
  - 🛒 **Groceries & Supplies**
  - 💊 **Medical & Healthcare**
  - ⚡ **Bills & Utilities**
  - 🛍️ **Shopping**
  - 🎓 **Education**
  - 🏠 **Housing & Rent**
  - ➕ **Custom Categories**
- **Individual Budgets Showcase**: Grid of category cards displaying allocated limit, amount spent, remaining balance, and visual health indicators.
- **Overall Monthly Target**: Define overall spending cap with real-time remaining calculations.

### 3. 📈 Expense Bars & Analytics Tab
- **Visual Progress Bars**: Animated expense progress bars for each category comparing budget limits against actual spending.
  - 🟢 **Safe Zone (<70%)**: Green progress fill
  - 🟡 **Caution Zone (70% - 99%)**: Amber warning fill
  - 🔴 **Exceeded Zone (≥100%)**: Crimson over-budget alert
- **Remaining Monthly Budget Banner**: Prominently highlights exact remaining savings and percentage utilized.
- **Monthly Overview Graph**: Interactive Chart.js bar chart showing month-over-month expenses (January – December).
- **Category Doughnut Distribution**: Visual breakdown of spending share across all categories.

### 4. 🧾 Transaction Management
- **Add Expenses Separately**: Record expenses per category with amount, date, and description.
- **Search & Filter**: Filter transactions by category or search by description keywords.
- **Delete / Manage**: Quick deletion of individual transactions with automatic recalculation of balances.

### 5. ☁️ Real-time Firestore Database
- Data is stored in Cloud Firestore under `users/{uid}/budget_data/main`.
- Real-time listener (`onSnapshot`) synchronizes changes across tabs and devices instantly.
- Seamless offline caching via `localStorage` ensures zero downtime.

---

## 🚀 Live Deployments

- **GitHub Repository**: [https://github.com/Deepika13120/ExpenseX.git](https://github.com/Deepika13120/ExpenseX.git)
- **GitHub Pages**: [https://deepika13120.github.io/ExpenseX/](https://deepika13120.github.io/ExpenseX/)
- **Firebase Project**: `expensex-a6d8a` (Project Number: `739919926704`)
- **Firebase Hosting URL**: `https://expensex-a6d8a.web.app`

---

## 🛠️ Project Structure

```
expensex/
├── index.html              # Login page with Firebase Auth
├── register.html           # New account registration page
├── dashboard.html          # Main app: Budgets, Expense Bars, and Overview Graphs
├── expenses.html           # Dedicated transaction history view
├── css/
│   └── style.css           # Modern design system (tokens, glassmorphism, animations)
├── js/
│   ├── firebase-config.js  # Firebase configuration and auto-detection service
│   ├── auth.js             # Firebase Authentication & session guard
│   └── firestore-service.js# Firestore CRUD & real-time sync
├── firebase.json           # Firebase Hosting configuration
├── .firebaserc             # Firebase project targeting (expensex-a6d8a)
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD deployment workflow for GitHub Pages & Firebase
└── README.md               # Project documentation
```

---

## 💻 Local Testing & Setup

1. Open `index.html` in any modern web browser, or serve locally:
   ```bash
   npx serve .
   ```
2. Log in using your email and password, or click **"Quick Demo Access"**.
3. In the top-right corner, click **"Firebase Settings"** to verify or update your Firebase Web API Key if running locally.

---

## ☁️ Firebase Hosting Deployment

To deploy directly to Firebase Hosting:
```bash
# 1. Login to Firebase CLI
npx firebase-tools login

# 2. Deploy to hosting
npx firebase-tools deploy --only hosting
```
