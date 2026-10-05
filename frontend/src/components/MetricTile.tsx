import React from 'react';

export interface MetricTileProps {
  label: string;
  value: string | number;
  description?: string;
  subtext?: string;
  trend?: string;
  className?: string;
}

export const MetricTile: React.FC<MetricTileProps> = ({
  label,
  value,
  description,
  subtext,
  trend,
  className = '',
}) => {
  const displayDesc = subtext || description;
  return (
    <div className={`p-6 md:p-8 rounded-3xl bg-[#131d2e] border border-[#233044] flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">
            {label}
          </span>
          {trend && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
              {trend}
            </span>
          )}
        </div>
        <div className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#f8fafc] mb-2 font-mono">
          {value}
        </div>
      </div>
      {displayDesc && (
        <p className="text-xs md:text-sm text-[#64748b] leading-relaxed mt-2">
          {displayDesc}
        </p>
      )}
    </div>
  );
};
