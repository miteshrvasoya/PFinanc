# PFinanc

A self-hosted personal and family finance manager: ledger-correct accounts and transactions, multi-asset portfolio tracking, bank-statement import, SMS transaction detection (Android), and an optional AI advisor. Your data stays in your own PostgreSQL database.

## Features

- **Ledger you can trust:** balances are derived as `opening balance + confirmed credits - confirmed debits`, with first-class transfers so moving money never inflates income or expenses.
- **Investments:** stocks, mutual funds, SIPs, ETFs, fixed deposits, EPF/PPF/NPS and physical assets, with XIRR and FIFO cost basis.
- **Statement import:** CSV import for bank statements, tradebooks and fund statements, with duplicate detection.
- **Family accounts:** roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`) with private and shared visibility.
- **Android SMS scan:** reads bank SMS and prepares drafts for you to approve.
- **AI advisor (optional):** a money check-up with insights and suggestions, plus a chat that knows your portfolio. Bring your own API key.
- **MCP server:** connect Claude, ChatGPT or any MCP-capable assistant to your portfolio (read-only) so it can research prices and suggest what to hold, sell or buy. See [docs/mcp.md](PFinanc-FullStack/docs/mcp.md).
- **Clients:** web app, Android/iOS app (Expo), and a marketing site.

## Repository layout

| Folder | What it is |
| --- | --- |
| `PFinanc-FullStack/backend` | Node.js, Express, TypeScript, PostgreSQL REST API |
| `PFinanc-FullStack/frontend` | Next.js web app |
| `PFinanc-FullStack/docs` | Architecture, API, database, accounting and permission docs |
| `PFinanc-FullStack/examples` | Sample CSV files for the importer |
| `PFinanc-Mobile-App` | Expo / React Native app |
| `PFinanc-Website` | Project landing page (TanStack Start) |

## Quick start

**Requirements:** Node.js 20+, PostgreSQL 14+.

```bash
# 1. Install
cd PFinanc-FullStack && npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Configure the backend
cp backend/.env.example backend/.env
#    edit backend/.env: set DB_* / DATABASE_URL and a random JWT_SECRET (openssl rand -hex 32)
cp frontend/.env.example frontend/.env.local

# 3. Create an empty PostgreSQL database named "pfinanc", then start everything
npm run dev
```

The backend applies database migrations and seeds system categories on startup. Open <http://localhost:3001>; on a fresh install a setup wizard creates the first owner and household.

Optional demo data (development only, creates demo users that share a well-known password, never use on a public server):

```bash
npm run seed:dev
```

### Mobile app

```bash
cd PFinanc-Mobile-App
npm install
npm start        # detects your PC's Wi-Fi IP and writes it to .env, then starts Expo
```

SMS scanning needs an Android development build (`npx expo run:android`); it does not work in Expo Go. See `PFinanc-Mobile-App/.env.example` for pointing the app at your backend. Before building your own release, change the app identifiers in `app.json` (`com.example.pfinanc`) and the API URL in `eas.json`.

## AI features and API keys

AI features are optional and no key ships with this project.

- **In the app:** open **AI Advisor > Settings** (web, in the sidebar) or the **Settings** button in the AI Advisor screen (mobile), choose a provider (Claude, OpenAI, Gemini or OpenRouter), pick or type a model, and paste your API key. It is stored in your own database and only a masked form (`••••abcd`) is ever returned to clients.
- **Server-wide default:** instead, set `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY` or `ANTHROPIC_API_KEY` in `backend/.env`.
- Only aggregated figures are sent to the provider: no account numbers, merchant names or raw SMS text are stored.

### Use your own assistant (MCP)

Your backend exposes an MCP endpoint at `<your-backend-url>/mcp`. In the web app open **AI Advisor > Connect AI (MCP)**, or in the mobile app **More > Connect Claude / ChatGPT**, to create a scoped, revocable access token and get copy-paste setup steps for Claude, ChatGPT and other clients. Claude.ai and ChatGPT reach your server over the internet, so it needs a public HTTPS address (optionally set `PUBLIC_BASE_URL`). Details and security notes: [docs/mcp.md](PFinanc-FullStack/docs/mcp.md).

AI output is guidance generated from your data, not financial advice.

## Security notes

- Set a strong `JWT_SECRET`; the backend refuses to start in production without one.
- Never commit `.env` files. Only `*.env.example` files are tracked.
- Use HTTPS and a restrictive `CORS_ORIGIN` when deploying.
- API keys saved through the app are stored in the database; protect database access and backups accordingly.
- Report vulnerabilities privately rather than in public issues.

## Tests

```bash
npm --prefix PFinanc-FullStack/backend test   # needs a PostgreSQL database
```

## Contributing

Issues and pull requests are welcome. Please keep changes focused, run the type checks (`npx tsc --noEmit` in each package), and never include real financial data or credentials in commits or issues.

## License

[MIT](LICENSE)
