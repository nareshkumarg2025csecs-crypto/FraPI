import React from 'react';
import type { Verdict } from '../engines/riskEngine';
import { StatusPill } from './StatusPill';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Info,
  ShieldX
} from 'lucide-react';

export interface VerdictCardProps {
  verdict: Verdict;
  onReport?: () => void;
  className?: string;
}

export const VerdictCard: React.FC<VerdictCardProps> = ({
  verdict,
  onReport,
  className = '',
}) => {
  const { riskLevel, label, confidence, scorePercentage, reasons, unknowns, privacy, layerBreakdown } = verdict;

  // Derive which layers failed: use state === 'failed' from layerBreakdown
  const LAYER_DISPLAY_NAMES: Record<string, string> = {
    rule: 'Rule Layer',
    intent: 'Intent Layer',
    reference: 'Reference Layer',
    language: 'Language Layer',
    web: 'Web Layer',
  };
  const failedLayers: string[] = layerBreakdown
    ? Object.entries(layerBreakdown)
        .filter(([, r]) => r.state === 'failed')
        .map(([key]) => LAYER_DISPLAY_NAMES[key] ?? key)
    : [];

  const getRecommendedAction = () => {
    switch (riskLevel) {
      case 'HIGH_RISK':
        return 'Do not proceed. Do not scan this QR, approve collect requests, or enter your UPI PIN. If someone is on a call with you, hang up.';
      case 'REVIEW':
        return 'Pause and independently verify the recipient through official channels before proceeding with any payment.';
      case 'LOW_RISK':
      default:
        return 'No immediate red flags detected. Always double-check the recipient name on your UPI payment confirmation screen.';
    }
  };

  const getHeaderIcon = () => {
    switch (riskLevel) {
      case 'HIGH_RISK':
        return <ShieldX className="w-8 h-8 text-[var(--color-danger)] animate-pulse" />;
      case 'REVIEW':
        return <AlertTriangle className="w-8 h-8 text-[var(--color-warning)]" />;
      case 'LOW_RISK':
      default:
        return <ShieldCheck className="w-8 h-8 text-[var(--color-success)]" />;
    }
  };

  return (
    <div
      aria-live="polite"
      className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
        riskLevel === 'HIGH_RISK'
          ? 'border-[var(--color-danger)]/50 bg-[var(--color-danger)]/5 shadow-2xl shadow-[var(--color-danger)]/10'
          : riskLevel === 'REVIEW'
          ? 'border-[var(--color-warning)]/50 bg-[var(--color-warning)]/5 shadow-xl shadow-[var(--color-warning)]/10'
          : 'border-[var(--color-success)]/40 bg-[var(--color-success)]/5'
      } ${className}`}
      data-testid="verdict-card"
    >
      {/* Failed Layers Banner */}
      {failedLayers.length > 0 && (
        <div
          role="alert"
          data-testid="failed-layers-banner"
          className="px-5 py-3 bg-amber-500/15 border-b border-amber-500/30 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs md:text-sm">
            <span className="font-bold text-amber-300">Some checks could not run: </span>
            <span className="text-amber-200">{failedLayers.join(', ')}</span>
          </div>
        </div>
      )}

      {/* High Risk Critical Warning Banner */}
      {riskLevel === 'HIGH_RISK' && (
        <div className="bg-[var(--color-danger)] text-white px-5 py-3.5 flex items-center justify-between gap-3 font-bold text-sm md:text-base">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>CRITICAL RISK DETECTED — DO NOT PROCEED</span>
          </div>
          <span className="text-xs uppercase px-2 py-0.5 rounded bg-black/30 font-mono tracking-wide">
            High Danger
          </span>
        </div>
      )}

      <div className="p-6 md:p-8 space-y-6">
        {/* Header summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-4">
            <div className="p-3 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0">
              {getHeaderIcon()}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <StatusPill riskLevel={riskLevel} size="md" />
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                  Confidence: {confidence.toUpperCase()}
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-tertiary)] font-mono">
                  Risk Score: {scorePercentage}%
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-[var(--color-text-primary)] mt-2">
                {label}
              </h2>
            </div>
          </div>
        </div>

        {/* Action Callout */}
        <div
          className={`p-4 md:p-5 rounded-2xl border ${
            riskLevel === 'HIGH_RISK'
              ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-text-primary)]'
              : riskLevel === 'REVIEW'
              ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30 text-[var(--color-text-primary)]'
              : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-start gap-3">
            <Info className={`w-5 h-5 shrink-0 mt-0.5 ${
              riskLevel === 'HIGH_RISK'
                ? 'text-[var(--color-danger)]'
                : riskLevel === 'REVIEW'
                ? 'text-[var(--color-warning)]'
                : 'text-[var(--color-success)]'
            }`} />
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
                Recommended Action
              </h4>
              <p className="text-sm md:text-base font-semibold leading-relaxed">
                {getRecommendedAction()}
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Headline for HIGH_RISK / REVIEW */}
        {(riskLevel === 'HIGH_RISK' || riskLevel === 'REVIEW') && reasons.length > 0 && (
          <div className="text-[var(--color-text-primary)] font-semibold text-lg leading-relaxed border-l-4 pl-4 border-[var(--color-warning)] py-1">
            {reasons[0].detail}
          </div>
        )}

        {/* Reasons Section */}
        {reasons.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5">
              <span>Why this verdict</span>
              <span className="text-xs font-normal">({Math.min(reasons.length, 3)} of {reasons.length} findings)</span>
            </h3>
            <div className="space-y-2.5">
              {reasons.slice(0, 3).map((reason, idx) => {
                const isCrit = reason.severity === 'critical';
                const isHigh = reason.severity === 'high';
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-colors ${
                      isCrit
                        ? 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30'
                        : isHigh
                        ? 'bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isCrit || isHigh ? (
                          <XCircle className="w-4 h-4 text-[var(--color-danger)] shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] shrink-0" />
                        )}
                        <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
                          {reason.title}
                        </h4>
                      </div>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-tertiary)]">
                        {reason.layer} · {reason.severity}
                      </span>
                    </div>
                    <p className="text-xs md:text-sm text-[var(--color-text-secondary)] mt-1.5 leading-relaxed pl-6">
                      {reason.detail}
                    </p>
                    {reason.evidence && reason.evidence.length > 0 && (
                      <div className="mt-2.5 pl-6 flex flex-wrap gap-1.5">
                        {reason.evidence.map((ev, evIdx) => (
                          <span
                            key={evIdx}
                            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border-subtle)]"
                          >
                            {ev}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unknowns / Missing Info */}
        {unknowns.length > 0 && (
          <details open className="group p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-subtle)]">
            <summary className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-tertiary)] flex items-center gap-1.5 cursor-pointer select-none">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>What we couldn't check ({unknowns.length})</span>
            </summary>
            <ul className="list-disc pl-5 mt-3 text-xs text-[var(--color-text-secondary)] space-y-1">
              {unknowns.map((unk, idx) => (
                <li key={idx}>{unk}</li>
              ))}
            </ul>
          </details>
        )}

        {/* Privacy Note & Local Blocklist Report Button */}
        <div className="pt-4 border-t border-[var(--color-border-subtle)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-tertiary)]">
          <div>
            {privacy.localOnly ? (
              <span className="text-[var(--color-success)] font-medium">
                ✓ 100% locally evaluated on this device.
              </span>
            ) : (
              <span>
                Reputation queried for {privacy.sentOnline.length} URL(s).
              </span>
            )}
          </div>

          {onReport && (
            <button
              onClick={onReport}
              className="px-4 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-danger)] text-[var(--color-text-primary)] hover:text-[var(--color-danger)] text-xs font-bold transition-colors min-h-[44px]"
            >
              Report this (Add to local blocklist)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
