# PFinanc CSV Ingestion & Transaction Classification Guide

PFinanc provides a resilient, machine-assisted data ingestion engine for bank statements, brokerage tradebooks, and mutual fund CAS files.

---

## 1. Supported File Formats & Templates

PFinanc natively supports generic CSV exports from Indian and international banks, brokers, and mutual funds:

| Source Type | Typical Filename / Export | Key Headers Detected |
|---|---|---|
| **Bank Statements** | `HDFC_Statement.csv`, `SBI_Account_Stmt.csv`, `ICICI_Stmt.csv` | `Date`, `Description / Narration`, `Withdrawal / Debit`, `Deposit / Credit`, `Balance` |
| **Brokerage Tradebooks** | `tradebook.csv` (Zerodha, Groww, Upstox, Angel One) | `Symbol`, `ISIN`, `Trade Date`, `Trade Type` (`buy`/`sell`), `Quantity`, `Price` |
| **Mutual Fund Statements** | `cams_cas.csv`, `groww_mf.csv` | `Scheme Name`, `Folio No`, `Date`, `Transaction Type`, `Amount`, `Units`, `NAV` |

Sample templates are available in the repository at:
- `examples/sample_bank_statement.csv`
- `examples/sample_broker_tradebook.csv`
- `examples/sample_mutual_fund_statement.csv`

---

## 2. Ingestion Pipeline & Verification Flow

```text
Upload CSV File
      │
      ▼
Parser & Heuristic Header Detection
      │
      ▼
Duplicate Detection (SHA256 Content & Temporal Matching)
      │
      ▼
Classification Engine (Tier 1 -> Tier 2 -> Tier 3 -> Tier 4)
      │
      ▼
Interactive Review Screen
 ├─ View parsed rows with predicted categories
 ├─ Adjust categories / transaction types inline
 └─ Check "Remember Rule" to persist classification rules
      │
      ▼
Atomic Ledger Commit (Database Transaction)
 ├─ Inserts Transactions & updates Account Balances
 ├─ Creates FIFO Investment Lots (for Stocks/MFs)
 └─ Emits Audit Trail Entries
```

---

## 3. Duplicate Detection Algorithm

To protect against duplicate transaction imports when overlapping statement date ranges are uploaded:
1. **Row Hash Matching**: Generates a deterministic SHA256 hash using `account_id + date + amount + description`.
2. **Temporal Proximity Detection**: Checks for existing transactions with identical amount and narration within $\pm 2$ days.
3. **Review Flag**: Matching rows are flagged as `DUPLICATE`. In the review table, users can choose whether to exclude or include them before committing.

---

## 4. Multi-Tier Classification Engine

Transactions are categorized in four hierarchical tiers:

1. **Tier 1: User-Defined Learned Rules (`USER_RULE`)**
   - High-priority custom pattern match (e.g. pattern `SWIGGY` $\rightarrow$ `Food & Dining`).
   - Learns automatically whenever you adjust a category during CSV review.
2. **Tier 2: System Built-In Rules (`SYSTEM_RULE`)**
   - Built-in regex patterns for merchants like Uber, Amazon, Netflix, Tata Power, D-Mart, Zomato, Salary credits, etc.
3. **Tier 3: Inter-Account Transfer Detection (`TRANSFER_DETECTED`)**
   - Detects transfers between accounts within the household.
4. **Tier 4: Uncategorized / Needs Review (`NEEDS_REVIEW`)**
   - Rows that do not match known patterns are flagged for manual categorization.

---

## 5. Opening Balances vs. Historical Import Invariant

- **Starting Position Mode**: If you only enter your current account balance during onboarding, PFinanc sets the account's baseline opening balance. **It does NOT create artificial income or expense records.**
- **Statement Import Mode**: If you upload historical statements, PFinanc records all debit/credit transactions, updating the ledger history authentically.
