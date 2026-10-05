import React, { useState } from 'react';
import { ExternalLink, Copy, Check, PhoneCall, AlertCircle } from 'lucide-react';
import { PillButton } from './PillButton';

export interface I4CCardProps {
  searchTerms?: string[];
  vpa?: string;
  phone?: string;
  url?: string;
  className?: string;
}

export const I4CCard: React.FC<I4CCardProps> = ({
  searchTerms = [],
  vpa,
  phone,
  url,
  className = '',
}) => {
  const [copiedTerm, setCopiedTerm] = useState<string | null>(null);

  const copyToClipboard = (term: string) => {
    navigator.clipboard.writeText(term);
    setCopiedTerm(term);
    setTimeout(() => setCopiedTerm(null), 2000);
  };

  const termsToDisplay = Array.from(
    new Set([
      ...searchTerms,
      ...(vpa ? [vpa] : []),
      ...(phone ? [phone] : []),
      ...(url ? [url] : []),
    ])
  ).filter(Boolean);

  return (
    <div
      className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:p-6 space-y-4 ${className}`}
      data-testid="i4c-card"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30">
              Official Indian Cybercrime Repository (I4C)
            </span>
          </div>
          <h3 className="text-base md:text-lg font-bold text-[var(--color-text-primary)] mt-1.5">
            Verify Identifier on National Suspect Registry
          </h3>
          <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-0.5">
            Cross-check suspect VPAs, phone numbers, and URLs with the Citizen Financial Cyber Fraud Reporting System (CFCFRS).
          </p>
        </div>

        <a
          href="https://cybercrime.gov.in/Webform/suspect_search_repository.aspx"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <PillButton variant="secondary" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
            Open I4C Portal
          </PillButton>
        </a>
      </div>

      {/* Disclaimers */}
      <div className="p-3.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] space-y-2 text-xs">
        <div className="flex items-start gap-2 text-[var(--color-text-secondary)]">
          <AlertCircle className="w-4 h-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--color-text-primary)]">
              Important: Search for this on the official portal.
            </p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
              The portal does not pre-fill this information and FraPI does not automatically file reports on your behalf.
              You must copy the suspect identifier and paste it into the search bar on the official portal.
            </p>
          </div>
        </div>
      </div>

      {/* Identifiers with Copy button */}
      {termsToDisplay.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)]">
            Identified Suspect Values (Click to Copy):
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {termsToDisplay.map((term, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-xs font-mono text-[var(--color-text-primary)]"
              >
                <span className="truncate mr-2">{term}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(term)}
                  className="p-1.5 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
                  aria-label={`Copy ${term}`}
                >
                  {copiedTerm === term ? (
                    <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emergency Helpline Banner */}
      <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center gap-2.5 text-xs text-[var(--color-text-secondary)]">
        <PhoneCall className="w-4 h-4 text-[var(--color-danger)] shrink-0" />
        <span>
          If money was already sent, call <strong className="text-[var(--color-text-primary)]">1930</strong> (National Cybercrime Helpline) immediately and report at <strong className="text-[var(--color-text-primary)]">cybercrime.gov.in</strong>.
        </span>
      </div>
    </div>
  );
};
