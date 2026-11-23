# Angel One SmartAPI integration

PFinanc can use [Angel One SmartAPI](https://smartapi.angelone.in/docs/Introduction) for two things:

- **Market data:** live NSE/BSE prices for the stocks and ETFs you hold. When configured, Angel One is the first source in the price chain; if it cannot price something, the existing free sources are tried next.
- **Portfolio:** read your Angel One demat holdings and import them into PFinanc as holding snapshots.

> **Mutual funds are not covered.** SmartAPI has no mutual fund endpoints (prices or holdings). Fund NAVs keep coming from the free AMFI-based source already in the app. Import fund holdings with a statement or manually.

Everything is read-only. PFinanc never places, modifies or cancels orders.

## Setup

1. **Get an API key.** Create an app at <https://smartapi.angelone.in> (API key from the app page).
2. **Enable TOTP** on your Angel One account. Angel One shows a QR code and, beside it, a text **secret**. That secret is what lets PFinanc generate login codes by itself.
3. **Add the credentials to `PFinanc-FullStack/backend/.env`** and restart the backend:

```env
ANGELONE_API_KEY=...
ANGELONE_CLIENT_CODE=A123456
ANGELONE_PIN=1234
ANGELONE_TOTP_SECRET=JBSWY3DPEHPK3PXP
```

4. Open **Integrations** in the web app (or **More → Angel One** on mobile) and tap **Test connection**.

Optional settings (see `backend/.env.example`): `ANGELONE_HOUSEHOLD_ID`, `ANGELONE_PRICE_REFRESH_MINUTES` (default 15), `ANGELONE_AUTO_REFRESH`, and the `ANGELONE_LOCAL_IP` / `ANGELONE_PUBLIC_IP` / `ANGELONE_MAC_ADDRESS` header values (Angel One does not check them for read-only calls).

## Security model

- The PIN and TOTP secret grant access to your brokerage login. They live **only in the backend `.env`**: never in the database, the web app or the mobile app. Protect the file (`chmod 600`), never commit it, and keep backups private.
- No secret is ever returned by the API, logged, or included in an error message. The status screen shows the client code masked.
- The login session (JWT) is kept in server memory only and is renewed automatically; PFinanc logs in again if Angel One expires it.
- **One broker login per server.** Because the credentials belong to one person, only one household may use them: `ANGELONE_HOUSEHOLD_ID` if set, otherwise the oldest household on the server (the installer's). Within that household only the **owner and admins** can test, sync or look up quotes. Other households get `403`. This matters because anyone who can register on your server would otherwise be able to read your account.
- Use a strong `JWT_SECRET`, HTTPS, and a restrictive `CORS_ORIGIN` as described in the main README.

## What it does

### Prices
- Quotes use the SmartAPI **market quote** endpoint in `FULL` mode (price, open/high/low, previous close, % change, volume), 50 symbols per request and 1 request per second, which are the documented limits.
- PFinanc symbols are mapped to Angel One's numeric tokens through the public instrument master (~42 MB). It is streamed once, filtered to NSE/BSE cash instruments (~23,000 rows), stored in `angelone_instruments`, and refreshed every few days and each weekday morning.
- Prices refresh automatically during market hours (Mon-Fri, India time) every `ANGELONE_PRICE_REFRESH_MINUTES`, plus once after the close. You can also tap **Refresh prices now**.
- Stored prices record their source (`ANGEL_ONE`), so you can see where each number came from.

### Holdings import
- **Preview** reads your demat holdings and shows quantity, average cost, price and P&L without saving anything.
- **Import** saves them on a dedicated account named **Angel One (Demat)** (type brokerage, owned by you). Holdings are stored as per-day snapshots, so running it again the same day updates in place and never duplicates, and PFinanc's holdings engine never double counts them with transaction history.
- Securities are matched by ISIN (then by symbol). New ones are created automatically; ETFs are recognised by name pattern.
- A position you sold on Angel One is closed in PFinanc on the next import.
- Import is manual by design because it changes stored data.

### Price charts
Open any holding (web: click it on the Portfolio page; mobile: expand it on the Portfolio screen) to see its price chart.

- **Ranges:** **1D** (the default: the latest trading session, so it also works on weekends and holidays), 1W, 1M, 3M, 6M, 1Y, and **Since I bought**.
- **Since I bought** starts from your first buy in your trade history. For holdings that have no trade history (for example ones imported from Angel One as snapshots) the app asks for the buy date once, remembers it, and lets you remove it again.
- The chart marks each of your buys, draws your average cost as a dashed line (when it is near the visible prices), and shows the change, high and low for the range plus your return since buying.
- **Source:** Angel One candles for stocks and ETFs. Granularity follows the span within the documented limits: 5-minute candles for a day, 15-minute for a week, hourly for a month, daily beyond that (daily candles reach back up to 2,000 days, so very old purchases show the most recent five years). Mutual funds, and any case where Angel One is unavailable or rate limited, use the daily prices PFinanc has stored, and the chart says so. Stored prices build up over time, so a young install has a short history.
- Candle requests are limited by Angel One to 2 per second, 40 per minute and 2,000 per hour. PFinanc caches charts (1 minute for intraday, 10 minutes for daily) and stops at 40 per minute rather than risk the account; the chart then falls back to stored prices.
- Charts and price refreshes use only public market data through the shared login, so they work for every household. Reading **account data** (holdings import, profile) stays restricted to the one allowed household.

## API

All under `/api/integrations/angelone` (normal PFinanc login, owner/admin of the allowed household).

| Method and path | Purpose |
| --- | --- |
| `GET /status` | Configured/available, masked client code, last syncs, how to set up. Safe for any member |
| `POST /test` | Log in and read the profile (name, exchanges); proves the credentials work |
| `GET /holdings` | Live preview of demat holdings, nothing saved |
| `POST /holdings/sync` | Import holdings as snapshots |
| `POST /prices/sync` | Refresh prices for everything the household holds |
| `GET /quotes?symbols=RELIANCE,TCS&exchange=NSE` | Live quotes for any NSE/BSE symbol |

Charts live with the other investment routes under `/api/investments` (any household member):

| Method and path | Purpose |
| --- | --- |
| `GET /chart/:symbol?range=1D&view=personal` | Price history. `range` is `1D` (default), `1W`, `1M`, `3M`, `6M`, `1Y` or `SINCE_BUY`; `view` is `personal` or `household` |
| `PUT /holdings/:symbol/buy-date` | Save the date you bought a holding that has no trade history: `{ "date": "2024-03-15" }` |
| `DELETE /holdings/:symbol/buy-date` | Remove the saved date |

## Rate limits and errors

Documented limits are enforced client-side per API, and PFinanc will wait rather than exceed them: login 1/s, holdings 1/s, quote 1/s (50 symbols), search 1/s. Angel One answers HTTP 403 when a limit is exceeded; PFinanc reports that as a rate-limit error.

Session errors (`AG8001`, `AG8002`, `AG8003`, `AB8050`, `AB8051`, `AB1010`, `AB1011`) trigger an automatic token refresh or a fresh login, then one retry. `AB1015` ("Holding not found") is treated as an empty portfolio.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Status says "Not configured" | One of the four `ANGELONE_*` values is missing, or the backend was not restarted |
| Login rejected / TOTP errors | Wrong client code or PIN, wrong TOTP secret, or the server clock is off (TOTP needs an accurate clock; enable NTP) |
| "Could not reach Angel One" | The server has no outbound internet access to `apiconnect.angelone.in` |
| Some symbols stay unpriced | The symbol is not in the NSE/BSE cash instrument list, or is a mutual fund |
| "belongs to a different household" | Set `ANGELONE_HOUSEHOLD_ID` to the household that should use it |

Angel One's own policies (for example API access requirements) can change; check the [official documentation](https://smartapi.angelone.in/docs/Introduction) if something stops working.
