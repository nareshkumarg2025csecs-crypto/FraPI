# FraPI Sentinel 2.0 — Design Specification & Visual System

## 1. Vision & Visual Identity
FraPI Sentinel 2.0 is an intent-aware, privacy-preserving UPI scam detector built by **Team Trust me Bro** (Rajalakshmi Engineering College).
Tagline: *"Don't just scan the QR. Verify the intent."*

The visual language is:
- **Calm, trustworthy, minimal, and technology-focused**
- **Sleek dark-slate foundation** with high-contrast text and luminous cyan/sky interactive accents
- **Alternating tonal section bands** (deep slate obsidian `#0B0F17` / dark navy `#111827` and clean elevated slate `#F1F5F9`)
- **Accessible risk presentation**: Risk is communicated via **Icon + Text + Semantic Badge**, never color alone.
- **Brand CTA accent** (`#38BDF8` / `#0284C7`) is strictly separated from the semantic `HIGH_RISK` indicator (`#EF4444`).

---

## 2. Color Palette & Design Tokens (`frontend/src/design/tokens.css`)

```css
:root {
  /* Backgrounds */
  --color-bg-primary: #0b0f17;
  --color-bg-secondary: #111827;
  --color-bg-tertiary: #1e293b;

  /* Surfaces & Cards */
  --color-surface: #131d2e;
  --color-surface-elevated: #1e293b;
  --color-surface-muted: #0d1522;

  /* Text Typography */
  --color-text-primary: #f8fafc;
  --color-text-secondary: #94a3b8;
  --color-text-tertiary: #64748b;

  /* Borders */
  --color-border: #233044;
  --color-border-subtle: #1e293b;

  /* Brand Interactive Accent (Sky/Cyan - Never Confused with Risk) */
  --color-accent: #38bdf8;
  --color-accent-hover: #0284c7;
  --color-accent-soft: rgba(56, 189, 248, 0.12);

  /* Semantic State Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #38bdf8;

  /* Light Section Band Variations */
  --color-light-bg: #f8fafc;
  --color-light-surface: #ffffff;
  --color-light-border: #e2e8f0;
  --color-light-text-primary: #0f172a;
  --color-light-text-secondary: #475569;
}
```

---

## 3. Typography Hierarchy (Plus Jakarta Sans)
- **H1 (Hero)**: Desktop 64–72px (700 bold, line-height 1.08, -0.03em letter spacing), Mobile 36–42px
- **H2 (Section)**: 40–48px (700 bold, line-height 1.15)
- **H3 (Card Title)**: 22–26px (600 semi-bold)
- **Body Regular**: 16–18px (line-height 1.6)
- **Labels / Badges**: 12–14px (600 font-weight, tracking-wide)

---

## 4. Spacing & Grid System
- **Base Grid**: 8px (p-2, p-4, p-6, p-8, p-12, p-16)
- **Max Content Width**: 1280px–1360px centered
- **Card Radius**: 20px–28px
- **Pill Radius**: 9999px (fully rounded)
- **Breakpoints**:
  - `390px`: Mobile primary (compact single column, zero horizontal overflow, 44px+ touch targets)
  - `768px`: Tablet (2-column collapse)
  - `1024px`: Desktop compact (2x2 bento grids)
  - `1440px`: Immersive full-width section bands

---

## 5. Risk & Safety UX Principles
1. **Never communicate risk through color alone**:
   - `LOW_RISK`: CheckCircle icon + "Low risk: no red flags found" + emerald badge
   - `REVIEW`: AlertTriangle icon + "Review needed" + amber badge
   - `HIGH_RISK`: ShieldAlert icon + "High risk: potential scam detected" + red badge + "Do not proceed" banner
2. **Never claim "Verified Safe"**:
   - Low risk is strictly labeled *"Low risk: no red flags found"*.
3. **Privacy Transparency**:
   - Web reputation is **OFF** by default.
   - All OCR, QR decoding, rules, intent, and language inferences execute 100% locally in-browser.
