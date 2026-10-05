import React, { useState } from 'react';
import { PillButton } from '../components/PillButton';
import { StatusPill } from '../components/StatusPill';
import { BentoCard } from '../components/BentoCard';
import { MetricTile } from '../components/MetricTile';
import { SectionBand } from '../components/SectionBand';
import { HoverRow } from '../components/HoverRow';
import { Stepper } from '../components/Stepper';
import { DropZone } from '../components/DropZone';
import { ConsentSheet } from '../components/ConsentSheet';
import { VerdictCard } from '../components/VerdictCard';
import { EvidenceRow } from '../components/EvidenceRow';
import { I4CCard } from '../components/I4CCard';
import { Toast, type ToastType } from '../components/Toast';
import { FloatingDock } from '../components/FloatingDock';
import type { Verdict } from '../engines/riskEngine';
import { Palette } from 'lucide-react';

const mockVerdictHigh: Verdict = {
  riskLevel: 'HIGH_RISK',
  score: 0.95,
  scorePercentage: 95,
  label: 'High risk: potential scam detected',
  confidence: 'good',
  reasons: [
    {
      layer: 'rule',
      severity: 'critical',
      title: 'QR Code is an Outward Payment (R2)',
      detail: 'The message claims you will receive a refund, but scanning this QR will initiate an outward transfer of ₹3,000.',
      evidence: ['upi://pay?pa=refunds@okaxis&am=3000'],
    },
    {
      layer: 'intent',
      severity: 'critical',
      title: 'Direction Contradiction Mismatch',
      detail: 'User intent is INCOMING (Receive), while QR payload encodes OUTGOING (Pay).',
      evidence: ['User: receive', 'QR: upi://pay'],
    },
  ],
  unknowns: ['Payee identity not present in local whitelist'],
  privacy: {
    sentOnline: [],
    localOnly: true,
  },
  layerBreakdown: {
    rule: { available: true, score: 95, reasons: [], unknowns: [] },
    intent: { available: true, score: 90, reasons: [], unknowns: [] },
    reference: { available: false, score: 0, reasons: [], unknowns: [] },
    language: { available: true, score: 85, reasons: [], unknowns: [] },
    web: { available: false, score: 0, reasons: [], unknowns: [] },
  },
};

const mockVerdictLow: Verdict = {
  riskLevel: 'LOW_RISK',
  score: 0.05,
  scorePercentage: 5,
  label: 'Low risk: no red flags found',
  confidence: 'good',
  reasons: [
    {
      layer: 'reference',
      severity: 'info',
      title: 'Verified Merchant Match',
      detail: 'The VPA swiggy@hdfcbank perfectly matches a known trusted merchant in your local whitelist.',
      evidence: ['swiggy@hdfcbank'],
    },
  ],
  unknowns: [],
  privacy: {
    sentOnline: [],
    localOnly: true,
  },
  layerBreakdown: {
    rule: { available: true, score: 0, reasons: [], unknowns: [] },
    intent: { available: true, score: 0, reasons: [], unknowns: [] },
    reference: { available: true, score: 0, reasons: [], unknowns: [] },
    language: { available: true, score: 0, reasons: [], unknowns: [] },
    web: { available: false, score: 0, reasons: [], unknowns: [] },
  },
};

export const DesignPreviewPage: React.FC = () => {
  const [stepperStep, setStepperStep] = useState(3);
  const [consentEnabled, setConsentEnabled] = useState(false);
  const [activeToast, setActiveToast] = useState<{ type: ToastType; title: string; message: string } | null>(null);

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-28">
      {/* Title */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-accent)] mb-3">
          <Palette className="w-3.5 h-3.5" />
          <span>Layer 9 Design System Specification</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-[var(--color-text-primary)]">
          Design System & Component Showcase
        </h1>
        <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mt-2">
          Previewing all 15 reusable design tokens and components in both Reference-Palette Dark and Elevated Tonal Bands.
        </p>
      </div>

      {/* BAND 1: DARK REFERENCE PRIMARY */}
      <SectionBand tone="primary" className="py-12 border-y border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div>
            <span className="text-xs font-mono text-[var(--color-accent)] uppercase">Band 1: Dark Reference Primary</span>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
              Core Interactive Components
            </h2>
          </div>

          {/* 1. PillButton Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              1. PillButton Variants (44px Touch Target Compliant)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <PillButton variant="primary" size="md">
                Primary CTA
              </PillButton>
              <PillButton variant="secondary" size="md">
                Secondary Action
              </PillButton>
              <PillButton variant="ghost" size="md">
                Ghost Button
              </PillButton>
              <PillButton variant="danger" size="md">
                Danger Action
              </PillButton>
              <PillButton variant="primary" size="md" disabled>
                Disabled CTA
              </PillButton>
            </div>
          </div>

          {/* 2. StatusPill Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              2. StatusPill (Risk Never Expressed by Color Alone)
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill riskLevel="LOW_RISK" />
              <StatusPill riskLevel="REVIEW" />
              <StatusPill riskLevel="HIGH_RISK" />
              <StatusPill level="VERIFIED" />
              <StatusPill level="TAMPERED" />
            </div>
          </div>

          {/* 3. MetricTiles Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              3. MetricTile (Empirical Evaluation Tiles)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricTile label="Accuracy" value="98.4%" subtext="10k test sample" />
              <MetricTile label="Scam Recall" value="99.1%" subtext="Zero critical misses" />
              <MetricTile label="Precision" value="97.8%" subtext="Minimal false alarms" />
              <MetricTile label="F1 Benchmark" value="98.4%" subtext="Harmonic mean" />
            </div>
          </div>

          {/* 4. BentoCard Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              4. BentoCard (Three Core Architectures)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BentoCard
                variant="intent"
                title="Intent-Aware Triangulation"
                description="Cross-examines payer expectations against claim semantics."
              />
              <BentoCard
                variant="reference"
                title="Trusted Reference Matching"
                description="Detects homoglyphs and confusable payee handles."
              />
              <BentoCard
                variant="local-first"
                title="100% Local Inference"
                description="Tesseract.js OCR and lightweight Logistic Regression in web worker."
              />
            </div>
          </div>

          {/* 5. Stepper Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              5. Stepper (Desktop & 390px Mobile Responsive)
            </h3>
            <Stepper
              currentStep={stepperStep}
              onStepClick={(s) => setStepperStep(s)}
            />
            <div className="flex gap-2 justify-center">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setStepperStep(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono border ${
                    stepperStep === s ? 'bg-[var(--color-accent)] text-slate-950' : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                  }`}
                >
                  Step {s}
                </button>
              ))}
            </div>
          </div>

          {/* 6. HoverRow Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              6. HoverRow (Pipeline Step with Spring Physics)
            </h3>
            <div className="space-y-3">
              <HoverRow
                stepNumber="01"
                title="Browser-Local OCR & QR Parsing"
                description="Decodes QR payload and reads image text in web worker."
                badge="100% Local"
              />
              <HoverRow
                stepNumber="02"
                title="Hard-Coded UPI Rule Engine"
                description="Evaluates protocol constraints such as upi://pay outward transfer logic."
                badge="Zero Hallucination"
              />
            </div>
          </div>
        </div>
      </SectionBand>

      {/* BAND 2: ELEVATED TONAL SURFACE BAND */}
      <SectionBand tone="surface" className="py-16 border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div>
            <span className="text-xs font-mono text-[var(--color-accent)] uppercase">Band 2: Elevated Surface Tone</span>
            <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
              Safety, Evidence & Verdict Components
            </h2>
          </div>

          {/* 7. DropZone Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              7. DropZone (Image Upload, Drag-and-Drop, Clipboard Paste)
            </h3>
            <DropZone onImageSelected={() => {}} />
          </div>

          {/* 8. ConsentSheet Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              8. ConsentSheet (Reputation Toggle with Explicit Destinations)
            </h3>
            <ConsentSheet
              enabled={consentEnabled}
              onToggle={(v) => setConsentEnabled(v)}
              detectedUrls={['https://fraud-claim-bonus.xyz/pay']}
            />
          </div>

          {/* 9. EvidenceRow Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              9. EvidenceRow (Multi-Layer Signal Inspection)
            </h3>
            <div className="space-y-2.5">
              <EvidenceRow
                source="ocr"
                label="Extracted SMS Text"
                value="Flipkart refund of Rs 3,000 is approved. Scan attached QR code."
                confidence={96}
                explanation="Recognized via local Tesseract OCR engine."
              />
              <EvidenceRow
                source="qr"
                label="Decoded QR Payload"
                value="upi://pay?pa=refunds@okaxis&am=3000&pn=Refund%20Desk"
                explanation="Instructs bank app to send ₹3,000 out."
              />
              <EvidenceRow
                source="reference"
                label="Merchant Reference Check"
                value="Look-alike match: refunds@okaxis resembles official flipkart@axisbank"
                explanation="Homoglyph substitution / handle swap detected."
              />
            </div>
          </div>

          {/* 10. VerdictCard Showcase */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              10. VerdictCard (High Risk with Critical Banner vs Low Risk)
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <VerdictCard verdict={mockVerdictHigh} />
              <VerdictCard verdict={mockVerdictLow} />
            </div>
          </div>

          {/* 11. I4CCard Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              11. I4CCard (Indian Cybercrime Registry Portal & Copy Identifiers)
            </h3>
            <I4CCard
              searchTerms={['refunds@okaxis', '9876543210']}
              vpa="refunds@okaxis"
              phone="9876543210"
              url="fraud-claim-bonus.xyz"
            />
          </div>

          {/* 12. Toast Showcase */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              12. Accessible Toast Notification System
            </h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setActiveToast({ type: 'success', title: 'Reference Saved', message: 'Payee added to local database.' })}
                className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold"
              >
                Trigger Success Toast
              </button>
              <button
                onClick={() => setActiveToast({ type: 'warning', title: 'Review Needed', message: 'VPA handle is not in verified directory.' })}
                className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold"
              >
                Trigger Warning Toast
              </button>
              <button
                onClick={() => setActiveToast({ type: 'error', title: 'Critical Risk', message: 'Do not approve this collect request.' })}
                className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold"
              >
                Trigger Error Toast
              </button>
            </div>
          </div>
        </div>
      </SectionBand>

      {/* Floating Dock Showcase */}
      <FloatingDock />

      {activeToast && (
        <Toast
          type={activeToast.type}
          title={activeToast.title}
          message={activeToast.message}
          onClose={() => setActiveToast(null)}
        />
      )}
    </div>
  );
};
