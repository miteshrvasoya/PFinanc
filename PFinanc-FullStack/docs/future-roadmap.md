# Future Roadmap & Extensibility — PFinanc

The Phase 1 architecture is engineered to support future automation and wealth management without requiring database rewrites.

---

## Phase 2 — Android React Native Application & SMS Ingestion
* **Direct REST API Ingestion**: Mobile client reads transactional SMS messages (e.g. bank debit/credit alerts).
* **Draft Transaction Ingestion**: Generates `DRAFT` transactions with `source_type = 'SMS'` and raw metadata for user review before confirmation.

## Phase 3 — Email Transaction Ingestion
* Webhook/OAuth ingestion for bank statement emails and e-receipts.
* Deterministic duplicate checks prevent re-importing transactions already captured via SMS.

## Phase 4 — Investment Portfolio & Net Worth Expansion
* **Account Types**: Support `BROKERAGE`, `MUTUAL_FUND`, `FD`, `EPF`, `PPF`, `NPS`.
* **Asset Tracking**: Integration with NAV and stock price sync to dynamically calculate asset valuation in Net Worth.

## Phase 5 — Financial Intelligence & Automation
* Recurring subscription detection (Netflix, Spotify, broadband).
* EPF/SIP auto-reminders.
* Anomaly detection for unusual spending spikes.
