# FraPI Sentinel 2.0 — Comprehensive Project Documentation

## 1. System Overview & Philosophy
FraPI Sentinel 2.0 is a local-first, privacy-preserving payment intent verification and UPI scam prevention system.
Rather than blindly trusting QR code payloads, FraPI Sentinel triangulates user expectations, merchant references, message context, and payment parameters in the client browser.

### Core Axioms
1. **QR Scanning Never Receives Money:** Scanning an `upi://pay` QR code will always deduct funds.
2. **PIN/OTP is Never Needed to Receive Money:** You only enter your UPI PIN to authenticate outgoing payments.
3. **Legitimate Support Never Demands Remote Screen-Sharing:** Any request to install AnyDesk, TeamViewer, or QuickSupport is an immediate red flag.
4. **Local-First Privacy:** Screenshots, SMS text, personal messages, and intent details never leave the user's browser.

---

## 2. Layered Protection Architecture

FraPI Sentinel 2.0 evaluates potential payment risks through a deterministic multi-layer pipeline:

1. **Layer 1: OCR & QR Parsing:** Client-side optical character recognition via Tesseract.js and QR decoding via jsQR.
2. **Layer 2: Hard Rule Engine (R1–R14):** Evaluates protocol axioms (e.g., scan-to-receive inversions, PIN-for-cashback demands, remote access software, APK downloads, advance fees).
3. **Layer 3: Intent Triangulation Engine:** Compares declared user intent (e.g., expected incoming refund) against parsed QR instructions (e.g., outgoing payment).
4. **Layer 4: Trusted References & Homoglyph Detection:** Fuzzy skeleton metrics and visual confusable detection for merchant VPAs.
5. **Layer 5B: Browser Language Model:** Lightweight logistic regression model scoring scam vocabulary in the browser.
6. **Layer 6: Local Entity & Blocklist Checks:** Offline heuristics and local IndexedDB blocklists of reported handles/domains.
7. **Layer 7: Online Reputation Proxy:** Opt-in proxy querying Google Safe Browsing and VirusTotal exclusively for stripped domain strings.
8. **Layer 8: Noisy-OR Risk Synthesis:** Combines layer outputs with strict rule-based floors and caps to produce a deterministic verdict (`LOW_RISK`, `REVIEW`, `HIGH_RISK`).

---

## 3. Evaluation & Accuracy Benchmarks

Evaluated across **200 realistic scenarios** (100 scams across 10 categories, 100 hard legitimate cases):

| Metric | Full Pipeline (Flagged) | Full Pipeline (High-Risk Only) | Keyword-Only Baseline |
|---|---|---|---|
| **Held-Out Precision** | **71.4%** | **100.0%** | 66.7% |
| **Held-Out Recall** | **100.0%** | **100.0%** | 80.0% |
| **Held-Out F1 Score** | **83.3%** | **100.0%** | 72.7% |
| **Held-Out Accuracy** | **80.0%** | **100.0%** | 70.0% |
| **Average Latency** | **90.81 ms** | **90.81 ms** | < 1 ms |

---

## 4. Implementation Status

| Section | Status | Evidence | Notes |
|---|---|---|---|
| Privacy Boundary Architecture | Implemented | `frontend/src/pages/AboutPage.tsx`, `ConsentSheet.tsx` | All screenshot and text data stays local |
| Rule Engine (R1–R14) | Implemented | `frontend/src/engines/ruleEngine.ts` | 14 hard rules + look-alike trap tests passing |
| Intent Engine | Implemented | `frontend/src/engines/intentEngine.ts` | Direction & amount alignment checks |
| Reference Engine & Storage | Implemented | `frontend/src/engines/referenceEngine.ts`, `references.ts` | IndexedDB persistent reference store |
| Browser ML Language Model | Implemented | `frontend/src/engines/languageEngine.ts` | Platt-calibrated logreg classifier |
| Online Reputation Proxy | Implemented | `backend/app/routers/reputation.py` | GSB and VT domain lookup with TTL cache |
| Backend Observability | Implemented | `backend/app/security.py`, `stats_service.py` | Structured JSON logs, `/ready`, `/stats` |
| React Error Boundary | Implemented | `frontend/src/components/ErrorBoundary.tsx` | Plain-English error mapping & reset data |
| PWA Web Share Target | Implemented | `frontend/vite.config.ts`, `shareTarget.ts` | `POST /share-target` pre-fills `/check` |
| Search Engine Layer | Planned | None | External search API provider not available |
| Reddit Reputation | Planned | None | Requires Reddit API credentials not included |
| Phone / Email Reputation | Planned | None | External carrier lookup APIs not available |
| Redirect Fetching | Planned | None | Requires external sandbox crawler |
| Telemetry | Planned | None | Event tracking disabled for user privacy |
| Shared Community DB | Planned | None | Requires centralized sync infrastructure |
| Federated Learning | Planned | None | Future roadmap for on-device tuning |
| Graph Fraud Detection | Planned | None | Transaction graph unavailable in client scan |
| Native App | Planned | None | Available as Progressive Web App |
| Extension | Planned | None | Browser extension wrapper planned for future release |
