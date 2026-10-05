import React from 'react';
import {
  Lock,
  AlertTriangle,
  CheckCircle2,
  GraduationCap
} from 'lucide-react';
import { PillButton } from '../components/PillButton';
import { Link } from 'react-router-dom';

import { resetDatabase, getDb } from '../storage/db';
import { Database, Trash2 } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const [resetStatus, setResetStatus] = React.useState<string | null>(null);

  const handleResetData = async () => {
    try {
      setResetStatus('Deleting all local data...');
      await resetDatabase();
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      setResetStatus('All local data deleted successfully.');
    } catch {
      setResetStatus('Failed to delete all local data.');
    }
  };

  const handleClearRepCache = async () => {
    try {
      setResetStatus('Clearing reputation cache...');
      const db = await getDb();
      await db.clear('reputationCache');
      setResetStatus('Reputation cache cleared successfully.');
    } catch {
      setResetStatus('Failed to clear reputation cache.');
    }
  };

  const privacyData = [
    {
      category: 'Uploaded Screenshots & Images',
      local: '100% Local (Tesseract.js / jsQR in browser worker)',
      optIn: 'Never sent online under any condition',
      status: 'local',
    },
    {
      category: 'Extracted Message Text / SMS',
      local: '100% Local (Client-side regex & ML language classifier)',
      optIn: 'Never sent online under any condition',
      status: 'local',
    },
    {
      category: 'User Intent & Expected Amounts',
      local: '100% Local (Rule & Intent triangulation engine)',
      optIn: 'Never sent online under any condition',
      status: 'local',
    },
    {
      category: 'Payee VPA & Merchant Name',
      local: '100% Local (Matched against local IndexedDB whitelist)',
      optIn: 'Never sent online under any condition',
      status: 'local',
    },
    {
      category: 'Extracted Web URLs & Domains',
      local: 'Validated with offline heuristic regular expressions',
      optIn: 'Google Safe Browsing, VirusTotal, your local list',
      status: 'hybrid',
    },
    {
      category: 'Local Analysis History',
      local: 'Saved in IndexedDB (Text redacted, can be disabled/cleared)',
      optIn: 'Never sent online under any condition',
      status: 'local',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] pt-28 pb-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-12">
      {/* Title */}
      <div className="text-center max-w-2xl mx-auto">
        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          Privacy & Engineering Transparency
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] mt-3">
          Zero-Compromise Privacy Architecture
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-2">
          How FraPI Sentinel 2.0 ensures your sensitive financial conversations and payment QR codes never leave your device.
        </p>
      </div>

      {/* Privacy Data Table */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-accent)] border border-[var(--color-border)]">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-primary)]">
              Data Boundary Table
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Explicit breakdown of where data resides and when network calls are made.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-text-tertiary)] uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Information Type</th>
                <th className="py-3 px-3">Stays Local (Default)</th>
                <th className="py-3 px-3">Sent Only If Opted In</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-subtle)]">
              {privacyData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[var(--color-bg-secondary)]/50 transition-colors">
                  <td className="py-3.5 px-3 font-semibold text-[var(--color-text-primary)]">
                    {row.category}
                  </td>
                  <td className="py-3.5 px-3 text-[var(--color-success)] flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{row.local}</span>
                  </td>
                  <td className="py-3.5 px-3 text-[var(--color-text-secondary)]">
                    {row.optIn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Limitations & Transparency */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-warning)] border border-[var(--color-border)]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-primary)]">
              System Limitations & Disclaimers
            </h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Honest boundaries of what client-side machine learning and heuristics can provide.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5">
            <h4 className="font-bold text-[var(--color-text-primary)]">OCR Limitations</h4>
            <p>
              Client-side Tesseract.js recognizes text from screenshots. Low resolution, stylized fonts, or compression artifacts may produce typos in phone numbers or VPAs. Always review the extracted text.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5">
            <h4 className="font-bold text-[var(--color-text-primary)]">QR Code Decoding</h4>
            <p>
              jsQR decodes standard 2D matrices. Highly warped or blurry physical stickers may fail decoding. If automatic scan fails, you can paste the UPI payload manually.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5">
            <h4 className="font-bold text-[var(--color-text-primary)]">I4C National Portal</h4>
            <p>
              FraPI does not automatically file police complaints. We provide direct links to the official Citizen Financial Cyber Fraud Reporting System and copy tools to search suspect identifiers.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5">
            <h4 className="font-bold text-[var(--color-text-primary)]">Reputation Lookups</h4>
            <p>
              Google Safe Browsing, VirusTotal, your local list only evaluate web domains and URLs. Note: No remote phone reputation API is used; phone number checks are purely local. Reputation is OFF by default. Note: The VirusTotal public API and the Safe Browsing Lookup API have usage terms and quotas (intended for light, non-commercial use).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-1.5 sm:col-span-2">
            <h4 className="font-bold text-[var(--color-text-primary)]">Web Share Target Compatibility</h4>
            <p>
              Share-to-app works on Android Chrome with the PWA installed; iOS Safari doesn't support share targets.
            </p>
          </div>
        </div>
      </div>


      {/* Local Storage Management & Recovery */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-accent)] border border-[var(--color-border)]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[var(--color-text-primary)]">
                Local Storage & Database Management
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Reset your on-device IndexedDB storage if schema upgrades or local data become corrupted.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <PillButton onClick={handleClearRepCache} variant="secondary" size="sm">
              <Trash2 className="w-4 h-4 mr-1.5" />
              Clear reputation cache
            </PillButton>
            <PillButton onClick={handleResetData} variant="secondary" size="sm">
              <Trash2 className="w-4 h-4 mr-1.5 text-red-500" />
              Delete all local data
            </PillButton>
          </div>
        </div>
        {resetStatus && (
          <p className="text-xs font-mono text-[var(--color-accent)]">{resetStatus}</p>
        )}
      </div>

      {/* Team Credits */}
      <div className="p-6 md:p-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--color-bg-secondary)] text-[var(--color-accent)] text-xs font-bold border border-[var(--color-border)]">
            <GraduationCap className="w-4 h-4" />
            <span>Cybersecurity Initiative</span>
          </div>
          <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
            Team Trust me Bro
          </h3>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Rajalakshmi Engineering College • Built for Indian UPI safety and scam prevention.
          </p>
        </div>

        <Link to="/check" className="shrink-0">
          <PillButton variant="primary" size="md">
            Test The Analyzer
          </PillButton>
        </Link>
      </div>
    </div>
  );
};
