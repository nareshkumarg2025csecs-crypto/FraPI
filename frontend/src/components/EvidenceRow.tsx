import React from 'react';
import { FileText, QrCode, User, Shield, ExternalLink, Cpu } from 'lucide-react';

export interface EvidenceRowProps {
  source: 'ocr' | 'qr' | 'user' | 'rule' | 'reference' | 'language' | 'reputation';
  label: string;
  value: string | React.ReactNode;
  confidence?: number;
  explanation?: string;
  className?: string;
}

export const EvidenceRow: React.FC<EvidenceRowProps> = ({
  source,
  label,
  value,
  confidence,
  explanation,
  className = '',
}) => {
  const getSourceBadge = () => {
    switch (source) {
      case 'ocr':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-accent)] border border-[var(--color-border)]">
            <FileText className="w-3 h-3" /> OCR
          </span>
        );
      case 'qr':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-purple-400 border border-[var(--color-border)]">
            <QrCode className="w-3 h-3" /> QR Payload
          </span>
        );
      case 'user':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-amber-400 border border-[var(--color-border)]">
            <User className="w-3 h-3" /> User Claim
          </span>
        );
      case 'rule':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-rose-400 border border-[var(--color-border)]">
            <Shield className="w-3 h-3" /> Rule Engine
          </span>
        );
      case 'reference':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-emerald-400 border border-[var(--color-border)]">
            <Cpu className="w-3 h-3" /> Reference DB
          </span>
        );
      case 'reputation':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-cyan-400 border border-[var(--color-border)]">
            <ExternalLink className="w-3 h-3" /> Web Reputation
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)]">
            Signal
          </span>
        );
    }
  };

  return (
    <div
      className={`p-3.5 md:p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface)] flex flex-col gap-2 ${className}`}
      data-testid="evidence-row"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {getSourceBadge()}
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{label}</span>
        </div>
        {confidence !== undefined && (
          <span className="text-[11px] font-mono text-[var(--color-text-tertiary)]">
            Confidence: {Math.round(confidence)}%
          </span>
        )}
      </div>

      <div className="text-xs md:text-sm font-mono text-[var(--color-text-primary)] break-all bg-[var(--color-bg-secondary)] p-2 rounded-lg border border-[var(--color-border)]">
        {value}
      </div>

      {explanation && (
        <p className="text-[11px] md:text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {explanation}
        </p>
      )}
    </div>
  );
};
