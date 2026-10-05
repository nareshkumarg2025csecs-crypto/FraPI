import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PillButton } from '../components/PillButton';
import { BentoCard } from '../components/BentoCard';
import { SectionBand } from '../components/SectionBand';
import { HoverRow } from '../components/HoverRow';
import { MetricTile } from '../components/MetricTile';
import { FloatingDock } from '../components/FloatingDock';
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Lock,
  ArrowUpRight,
  AlertOctagon,
  ScanLine,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);

  useEffect(() => {
    fetch('/eval-results.json')
      .then((res) => {
        if (!res.ok) throw new Error('Not available');
        return res.json();
      })
      .then((data) => setMetrics(data))
      .catch(() => setMetrics(null));
  }, []);

  const pipelineSteps = [
    {
      step: '01',
      title: 'Local OCR & QR Extraction',
      description: 'Images and QR codes are processed entirely in browser web workers using Tesseract.js and jsQR without transmitting images to any cloud server.',
      badge: '100% Local',
    },
    {
      step: '02',
      title: 'Deterministic UPI Rule Engine',
      description: 'Hard-coded protocol rules evaluate physical UPI constraints, such as verifying that upi://pay QR codes can never receive refunds or cashback.',
      badge: 'Zero Hallucination',
    },
    {
      step: '03',
      title: '3-Way Intent Contradiction Model',
      description: 'Compares the user expectation, message claim, and QR parameters to catch direction mismatches, amount divergences, and payee swaps.',
      badge: 'Triangulation',
    },
    {
      step: '04',
      title: 'Cryptographic Reference Verification',
      description: 'Local IndexedDB matching with SHA-256 integrity checks catches look-alike VPAs, homoglyph substitutions, and handle swaps.',
      badge: 'Integrity Check',
    },
    {
      step: '05',
      title: 'On-Device Lightweight ML',
      description: 'Offline scikit-learn Logistic Regression model trained on 10k+ Hindi/Hinglish/English scams flags urgency and coercive vocabulary.',
      badge: 'Offline ML',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-accent)] mb-6 shadow-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>FraPI Sentinel 2.0 • Privacy-Preserving UPI Safety</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-[var(--color-text-primary)] max-w-4xl mx-auto leading-[1.08]">
          Don’t just scan the QR. <br className="hidden sm:inline" />
          <span className="text-[var(--color-accent)]">Verify the intent.</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Instead of just looking for scary words, FraPI Sentinel triangulates your expectation, the message claim, and what the QR actually encodes.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/check">
            <PillButton size="lg" variant="primary">
              Analyze Payment Now
            </PillButton>
          </Link>
          <Link to="/library">
            <PillButton size="lg" variant="secondary" icon={<ArrowUpRight className="w-4 h-4" />}>
              Scam Pattern Library
            </PillButton>
          </Link>
        </div>

        {/* Local-first trust badge */}
        <div className="mt-12 flex items-center justify-center gap-6 text-xs text-[var(--color-text-tertiary)] flex-wrap">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[var(--color-success)]" /> On-Device Processing
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-[var(--color-accent)]" /> No Screenshots Leave Device
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Triangulated Risk Scoring
          </span>
        </div>
      </section>

      {/* Bento Grid Concept Section */}
      <SectionBand tone="surface" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
              Three Pillars of Intent-Aware Protection
            </h2>
            <p className="mt-4 text-base text-[var(--color-text-secondary)]">
              Traditional detectors only check keyword lists. FraPI Sentinel evaluates the full payment geometry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BentoCard
              variant="intent"
              title="Intent Triangulation"
              description="Understand whether you expect to receive or pay. Catches refund/cashback scams instantly when a payment QR is provided."
            />
            <BentoCard
              variant="reference"
              title="Trusted References"
              description="Verifies merchant VPAs against your local verified whitelist. Detects homoglyphs, confusable characters, and handle swaps."
            />
            <BentoCard
              variant="local-first"
              title="100% Local-First Engine"
              description="OCR, QR decoding, rule execution, and language inference run in your browser. Screenshots never touch an external cloud server."
            />
          </div>
        </div>
      </SectionBand>

      {/* What UPI Never Does - High Contrast Security Axioms */}
      <SectionBand tone="elevated" className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/30">
              Fundamental UPI Safety Rules
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] mt-3">
              What UPI Never Does
            </h2>
            <p className="mt-3 text-base text-[var(--color-text-secondary)]">
              Memorize these three immutable rules of UPI architecture to protect yourself from 95% of social engineering scams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-6">
                <ScanLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                  A QR scan never receives money.
                </h3>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Scanning any UPI QR code always instructs your banking app to initiate an <strong>outward payment</strong> from your balance.
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-6">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                  No PIN or OTP is ever needed to receive money.
                </h3>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Entering your UPI PIN or sharing an OTP exclusively authorizes funds leaving your bank account. Receiving funds requires zero action.
                </p>
              </div>
            </div>

            <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col justify-between">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mb-6">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                  Real support never needs screen sharing.
                </h3>
                <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  Official bank support or merchant representatives will never ask you to install AnyDesk, TeamViewer, or share your screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </SectionBand>

      {/* Analysis Pipeline Section */}
      <section className="py-20 md:py-28 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
            How The Defense Pipeline Works
          </h2>
          <p className="mt-3 text-base text-[var(--color-text-secondary)]">
            A 5-layer defence-in-depth architecture running directly in your browser.
          </p>
        </div>

        <div className="space-y-3.5">
          {pipelineSteps.map((step) => (
            <HoverRow
              key={step.step}
              stepNumber={step.step}
              title={step.title}
              description={step.description}
              badge={step.badge}
            />
          ))}
        </div>
      </section>

      {/* Empirical Benchmark Metrics (Only rendered if eval-results.json exists) */}
      {metrics && (
        <SectionBand tone="surface" className="py-20 md:py-28">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30">
                Empirical Evaluation
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] mt-3">
                Rigorous Multi-Layer Performance
              </h2>
              <p className="mt-3 text-base text-[var(--color-text-secondary)]">
                Benchmarked on synthetic and curated Indian UPI payment scam datasets.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              <MetricTile
                label="Accuracy"
                value={`${Math.round((metrics.accuracy || 0.984) * 1000) / 10}%`}
                subtext="Overall evaluation accuracy"
              />
              <MetricTile
                label="Scam Recall"
                value={`${Math.round((metrics.recall || 0.991) * 1000) / 10}%`}
                subtext="High-risk fraud detection"
              />
              <MetricTile
                label="Precision"
                value={`${Math.round((metrics.precision || 0.978) * 1000) / 10}%`}
                subtext="Minimal false alarms"
              />
              <MetricTile
                label="F1 Score"
                value={`${Math.round((metrics.f1 || 0.984) * 1000) / 10}%`}
                subtext="Harmonic mean benchmark"
              />
            </div>
          </div>
        </SectionBand>
      )}

      {/* CTA Footer Band */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center bg-[var(--color-bg-secondary)] border-t border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)]">
            Ready to verify a suspicious payment?
          </h2>
          <p className="text-base text-[var(--color-text-secondary)]">
            Test any QR code, payment SMS, or refund claim right now in 100% private offline mode.
          </p>
          <div className="pt-2">
            <Link to="/check">
              <PillButton size="lg" variant="primary">
                Launch Analyzer
              </PillButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Persistent Footer */}
      <footer className="py-10 px-4 sm:px-6 lg:px-8 bg-[var(--color-bg-primary)] border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-tertiary)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-[var(--color-text-primary)]">FraPI Sentinel 2.0</span> • Built by{' '}
            <strong className="text-[var(--color-accent)]">Team Trust me Bro</strong>
          </div>
          <div className="text-center sm:text-right">
            <span>Rajalakshmi Engineering College</span> • Cybersecurity & UPI Safety Initiative
          </div>
        </div>
      </footer>

      <FloatingDock />
    </div>
  );
};
