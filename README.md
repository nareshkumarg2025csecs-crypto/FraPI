# FraPI Sentinel 2.0

Privacy-preserving, intent-aware UPI safety analyzer and scam prevention engine.

## 1. Quick Setup & Environment

### Prerequisites
- Node.js 18+ and npm
- Python 3.10+ (with virtual environment in `backend/.venv`)

### Installation & Environment Variables
1. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   ```
2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\pip install -r requirements.txt
   ```
3. **Environment Configuration:**
   Configure keys in `backend/.env` (keys live only on the backend, never in the frontend):
   ```env
   GSB_API_KEY=your_google_safe_browsing_key
   VT_API_KEY=your_virustotal_key
   ALLOWED_ORIGIN=http://localhost:5173
   ```

---

## 2. Project Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start concurrently Vite dev server (`:5173`) and FastAPI proxy (`:8000`) |
| `npm test` | Run all unit & integration test suites (frontend Vitest + backend Pytest) |
| `npm run test:e2e` | Run Playwright end-to-end resilience and privacy tests |
| `npm run eval` | Generate 200 evaluation scenarios and run the full benchmarking pipeline |
| `npm run build` | Build the optimized client-side PWA bundle |

---

## 3. Privacy Boundary Table

| Information Type | Stays Local (Default) | Sent Only If Opted In |
|---|---|---|
| **Uploaded Screenshots & Images** | 100% Local (Tesseract.js / jsQR in browser worker) | Never sent online under any condition |
| **Extracted Message Text / SMS** | 100% Local (Client-side regex & ML language classifier) | Never sent online under any condition |
| **User Intent & Amounts** | 100% Local (Rule & Intent triangulation engine) | Never sent online under any condition |
| **Payee VPA & Merchant Name** | 100% Local (Matched against local IndexedDB whitelist) | Never sent online under any condition |
| **Extracted Web URLs & Domains** | Validated with offline heuristic regular expressions | Google Safe Browsing & VirusTotal via backend proxy |
| **Local Scan History** | Saved in IndexedDB (Text redacted, can opt out) | Never sent online under any condition |

---

## 4. System Limitations & API Quotas

1. **Reputation API Terms & Quotas:**
   - VirusTotal Public API: strictly rate-limited to 4 requests/min and 500 requests/day.
   - Google Safe Browsing Lookup API: intended for light/non-commercial URL validation.
   - External reputation lookup is **OFF by default** and requires explicit user consent per analysis.
2. **Local Machine Learning & Heuristics:**
   - On-device logistic regression runs directly in the browser using Platt scaling.
   - No external search engines or unverified phone databases are queried.
3. **PWA Web Share Target:**
   - Share-to-app works on Android Chrome with the PWA installed (`POST /share-target`).
   - iOS Safari does not support the Web Share Target API.

---

## 5. How to Reproduce Every Number

Run the evaluation suite:
```bash
npm run eval
```
This regenerates `eval/scenarios.json` (200 curated scenarios with 100 scams and 100 hard legitimate cases), runs both the full pipeline and keyword baseline across deterministic tuning and held-out halves, and outputs verified metrics to `eval/eval-results.json` and `eval/EVAL.md`.

---

## 6. Demo Script

1. Navigate to `/check` in your browser.
2. Click **"Try an Example"** in the top right.
3. Choose **"₹3,000 Refund QR Scam"** (Scenario 1) and click **"Evaluate Payment Risk"**.
4. Observe the instant **HIGH RISK** verdict showing critical direction mismatch (Claim: Refund; QR: Pay ₹3,000 to `refunds.support@okaxis`).
5. Choose **"Genuine Bank OTP Alert"** (Scenario 2) and observe the **LOW RISK** verdict confirming that standard bank security warnings do not produce false alarms.

---

## 7. Security & Inline Styles Note

FraPI Sentinel enforces a strict Content Security Policy. In production builds, `style-src 'self' 'unsafe-inline'` is permitted because dynamic animations, transitions, and theme calculations powered by Framer Motion require runtime style attributes. All script execution strictly enforces `script-src 'self'` with zero third-party script execution.
