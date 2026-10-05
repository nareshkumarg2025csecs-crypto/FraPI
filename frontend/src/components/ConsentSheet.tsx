import React from 'react';
import { Globe, AlertTriangle, Lock } from 'lucide-react';

export interface ConsentSheetProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  detectedUrls?: string[];
  detectedDomains?: string[];
  className?: string;
}

export const ConsentSheet: React.FC<ConsentSheetProps> = ({
  enabled,
  onToggle,
  detectedUrls = [],
  detectedDomains = [],
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 transition-colors ${className}`}
      data-testid="consent-sheet"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-secondary)] text-[var(--color-accent)] border border-[var(--color-border)]">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-bold text-[var(--color-text-primary)]">
              External Web Reputation Lookup
            </h3>
            <p className="text-xs md:text-sm text-[var(--color-text-secondary)]">
              Optional external threat check for detected web links.
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
            aria-label="Toggle external web reputation lookup"
          />
          <div className="w-12 h-6 bg-[var(--color-bg-secondary)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent)] border border-[var(--color-border)]"></div>
        </label>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--color-border-subtle)] space-y-3">
        <div className="flex items-center gap-2 text-xs md:text-sm font-semibold">
          <span className="text-[var(--color-text-tertiary)]">Status:</span>
          {enabled ? (
            <span className="text-[var(--color-warning)] flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> Enabled (URLs sent to backend)
            </span>
          ) : (
            <span className="text-[var(--color-success)] flex items-center gap-1 font-medium">
              <Lock className="w-3.5 h-3.5" /> Disabled (100% Local Processing)
            </span>
          )}
        </div>

        <div className="text-xs text-[var(--color-text-secondary)] leading-relaxed space-y-1.5">
          <p>
            By default, FraPI Sentinel 2.0 operates in <strong>100% local-first mode</strong>. No OCR text, screenshot,
            VPA, payment amount, or user data ever leaves your browser.
          </p>
          {enabled ? (
            <div className="mt-3 p-3 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-2">
              <p className="font-semibold text-[var(--color-text-primary)]">
                Explicit Destinations (Only URLs & domains are sent, never personal/payment data):
              </p>
              <ul className="list-disc pl-5 space-y-1 font-mono text-[11px] text-[var(--color-text-secondary)]">
                <li>
                  <strong className="text-[var(--color-accent)]">FraPI Backend Proxy:</strong> <code>/api/reputation/check</code>
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">Google Safe Browsing:</strong> <code>safebrowsing.googleapis.com</code> (threat lookup)
                </li>
                <li>
                  <strong className="text-[var(--color-text-primary)]">VirusTotal API:</strong> <code>virustotal.com/api/v3/domains</code> (domain reputation)
                </li>
              </ul>
              {detectedUrls.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                  <p className="font-semibold text-[var(--color-text-primary)] text-xs mb-1">
                    Detected URL(s) that will be queried:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedUrls.map((u, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-accent)] break-all">
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detectedDomains.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--color-border-subtle)]">
                  <p className="font-semibold text-[var(--color-text-primary)] text-xs mb-1">
                    Detected Domain(s):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {detectedDomains.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[var(--color-surface)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-accent)] break-all">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[var(--color-text-tertiary)] italic">
              When disabled, URLs in messages/QRs are validated using offline heuristic syntax only. No network requests are made.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
