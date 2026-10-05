import React from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import type { RiskLevel, Severity } from '../engines/types';

export interface StatusPillProps {
  level?: RiskLevel | Severity | 'VERIFIED' | 'TAMPERED';
  riskLevel?: RiskLevel | Severity | 'VERIFIED' | 'TAMPERED';
  customLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  level,
  riskLevel,
  customLabel,
  size = 'md',
  className = '',
}) => {
  const norm = String(level || riskLevel || 'INFO').toUpperCase();

  let icon = <Info className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  let label = customLabel || 'Information';
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  if (norm === 'LOW_RISK' || norm === 'LOW' || norm === 'VERIFIED') {
    icon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" aria-hidden="true" />;
    label = customLabel || (norm === 'VERIFIED' ? 'Verified' : 'Low Risk');
    badgeStyle = 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60';
  } else if (norm === 'REVIEW' || norm === 'MEDIUM' || norm === 'WARNING') {
    icon = <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden="true" />;
    label = customLabel || 'Review Needed';
    badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-800/60';
  } else if (norm === 'HIGH_RISK' || norm === 'HIGH' || norm === 'CRITICAL' || norm === 'TAMPERED') {
    icon = <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-red-400" aria-hidden="true" />;
    label = customLabel || (norm === 'TAMPERED' ? 'Tampered' : 'High Risk');
    badgeStyle = 'bg-red-950/60 text-red-300 border-red-800/60';
  }

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1 gap-1.5',
    md: 'text-xs px-3.5 py-1.5 gap-2 font-semibold',
    lg: 'text-sm px-4 py-2 gap-2.5 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses[size]} ${badgeStyle} ${className}`}
      role="status"
    >
      {icon}
      <span>{label}</span>
    </span>
  );
};
