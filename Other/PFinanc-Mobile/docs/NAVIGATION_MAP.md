# Navigation Map

## Primary Navigation (Bottom Tabs)
1. **Home** (HomeScreen)
2. **Transactions** (TransactionsScreen)
3. **Add (Center FAB)** (AddExpenseScreen - Modal or Stack)
4. **Investments** (InvestmentsScreen)
5. **More** (MoreScreen)

## Authentication Stack
- **Login** (LoginScreen)
- **App Unlock (Biometrics/OTP)** (AppUnlockScreen)

## Sub-screens (Accessible from More or specific flows)
- **Insights** (InsightsScreen) - Accessible from More tab or Home
- **AI Advisor** (AIAdvisorScreen) - Accessible from More tab or Home
- **SMS Transaction Review** (SMSTransactionReviewScreen) - Accessible from Transactions
- **Widget Setup/Info** (WidgetExperienceScreen / WidgetConfigurationScreen) - Accessible from Settings or More

## Flow
Auth -> Main App (Tabs)
Tabs:
- Home (Dashboard, Accounts overview, Net Worth, Cash Flow)
- Transactions (List of expenses/incomes/transfers, filters)
- Center Add -> Open Add Expense/Income sheet
- Investments (Portfolio tracking, assets)
- More (Settings, Insights, AI Advisor, Profile)
