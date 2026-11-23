# Connecting AI assistants (MCP)

PFinanc ships a built-in **MCP server** (Model Context Protocol). It lets an AI assistant such as Claude, ChatGPT or any MCP-capable client read your investment portfolio, fetch live prices and prepare a report on what to hold, sell or buy. PFinanc is self-hosted, so there is no fixed address: the server runs on **your** backend, at `<your-backend-url>/mcp`.

- **Read-only.** No tool can create, edit or delete anything, or place trades.
- **Per-user and scoped.** Every connection belongs to one user and household and has explicit permissions.
- **Revocable and auditable.** Revoke any time; the app lists which tools each assistant called.

## How it works

```
Claude / ChatGPT / other client
        |   MCP over HTTPS (Streamable HTTP, JSON-RPC)
        v
  POST <backend>/mcp   Authorization: Bearer pfmcp_...        (or POST /mcp/t/<token>)
        |
        |  1. hash the token, look it up (not revoked, not expired, user active, still a household member)
        |  2. rate limit (60 requests/min per connection)
        |  3. build a server instance bound to that user + scopes (stateless, one per request)
        v
  Tools -> PFinanc services (holdings, portfolio, market data, insights) -> PostgreSQL
```

The endpoint is stateless, so it works behind load balancers and survives restarts without sessions.

## Set it up

1. **Make the backend reachable.** Claude.ai and ChatGPT connect from the internet, so the backend needs a public **HTTPS** address (your domain behind a reverse proxy, or a tunnel such as Cloudflare Tunnel or ngrok). Optionally set `PUBLIC_BASE_URL` in `backend/.env` so the app pre-fills it. Desktop and command-line assistants on your own network can use a local address.
2. **Create a connection** in the app: web **AI Advisor → Connect AI (MCP)**, or mobile **More → Connect Claude / ChatGPT**. Choose a name, an expiry and the permissions, then copy the token. It is shown once and only its SHA-256 hash is stored.
3. **Add it to your assistant:**

| Assistant | How |
| --- | --- |
| Claude (web/desktop) | Settings → Connectors → Add custom connector. URL: `https://<host>/mcp/t/<token>` |
| Claude Code | `claude mcp add --transport http pfinanc https://<host>/mcp --header "Authorization: Bearer <token>"` |
| Claude Desktop (config file) | `mcp-remote` bridge, see the snippet in the app |
| ChatGPT | Settings → Connectors → Advanced → Developer mode → create a connector with URL `https://<host>/mcp/t/<token>` and authentication "No authentication" (availability depends on plan) |
| Anything else | Streamable HTTP endpoint `https://<host>/mcp` with `Authorization: Bearer <token>` |

4. **Ask**, for example: *"Review my PFinanc portfolio. Which holdings should I consider selling or trimming, and what should I consider buying instead? Check current prices and recent news."*

Quick test from a terminal (should return the tool list):

```bash
curl -s https://<host>/mcp \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## Permissions (scopes)

| Scope | Allows |
| --- | --- |
| `investments` (always on) | Holdings, trades, portfolio performance, signals, live prices, latest AI report, for **your own** accounts |
| `cashflow` | Aggregated income, spending, savings and EMI figures (no transactions, no merchant names) |
| `household` | Include other family members' investments (household-wide view) |

## Tools

| Tool | Scope | What it returns |
| --- | --- | --- |
| `get_portfolio_overview` | investments | Totals, XIRR, allocation, concentration, SIP/stock budgets |
| `list_holdings` | investments | Positions with cost, price, P&L %, weight, long-term vs short-term units |
| `get_holding` | investments | One position: buy lots, realised P&L, dividends, recent trades |
| `list_investment_transactions` | investments | Trades/SIPs/dividends over a window |
| `get_portfolio_signals` | investments | Rule-based flags: overweight, deep losses, big winners, lots turning long-term, gaps to fill |
| `get_live_quotes` | investments | Current prices for holdings or any NSE/BSE ticker, vs last stored price (uses Angel One first when [configured](angelone.md)) |
| `get_market_snapshot` | investments | Nifty 50 and Sensex |
| `get_latest_ai_report` | investments | Your latest in-app AI check-up |
| `get_cashflow_summary` | cashflow | Monthly income/spend/savings and top categories |

Prompts (launchable from assistants that show MCP prompts): `portfolio_review`, `rebalance_ideas`, `price_check`, `monthly_investing_plan`.

The "signals" are deterministic rules computed from your own data (concentration above 20% in one stock, top-3 above 55%, losses beyond 15%, units within 60 days of the 12-month long-term mark, missing diversification). They are prompts for review, not instructions to trade.

## Management API (used by the web and mobile apps)

All require a normal PFinanc login (`Authorization: Bearer <login JWT>`, `x-household-id`).

| Method and path | Purpose |
| --- | --- |
| `GET /api/mcp/setup` | Suggested public URL, warnings, scope descriptions, tool and prompt catalogue |
| `GET /api/mcp/connections` | List your connections (never returns tokens) |
| `POST /api/mcp/connections` | Create `{ name, scopes[], expiresInDays? }`; returns the token once |
| `DELETE /api/mcp/connections/:id` | Revoke |
| `GET /api/mcp/activity` | Which tools were called, when, by which connection (names only, never data) |

## Security notes

- Tokens are 256-bit random (`pfmcp_...`), stored as SHA-256 hashes, and can expire or be revoked instantly. Max 10 active per user.
- The URL form (`/mcp/t/<token>`) exists for connector screens that only accept a URL. The token is then part of the address and can appear in proxy logs; prefer the header form where the client allows it, and keep access logs private.
- Requests carrying a foreign browser `Origin` are rejected (DNS-rebinding protection). Assistant backends do not send one.
- Always serve over HTTPS. Without it the token travels in clear text.
- Assistants receive your financial figures, and they pass them to the AI provider you use with them. Only connect assistants you trust, use the narrowest scopes, and revoke connections you no longer use.
- Live prices come from free providers and can be delayed or missing; assistants are told to say so.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Claude/ChatGPT cannot connect | Address is local or not HTTPS; use a public URL or tunnel |
| `401 Invalid, expired or revoked access token` | Token revoked/expired, or copied incompletely (it starts with `pfmcp_`) |
| `429 Too many requests` | More than 60 calls a minute on one connection; retry shortly |
| A tool says the connection lacks a permission | Create a new connection with that scope (cashflow / household) |
| Quotes are empty | The data provider has no quote for that symbol (mutual fund NAVs are best-effort) |
