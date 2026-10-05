import React from 'react';

export interface BentoCardProps {
  title: string;
  description: string;
  tag?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'elevated' | 'highlighted' | 'intent' | 'reference' | 'local-first';
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const BentoCard: React.FC<BentoCardProps> = ({
  title,
  description,
  tag,
  icon,
  variant = 'default',
  children,
  className = '',
  onClick,
}) => {
  const variantStyles: Record<string, string> = {
    default: 'bg-[#131d2e] border-[#233044] text-[#f8fafc]',
    elevated: 'bg-[#1e293b] border-[#334155] text-[#f8fafc]',
    highlighted: 'bg-[#131d2e] border-sky-500/40 shadow-lg shadow-sky-500/5 text-[#f8fafc]',
    intent: 'bg-[#131d2e] border-sky-500/40 shadow-lg shadow-sky-500/5 text-[#f8fafc]',
    reference: 'bg-[#131d2e] border-emerald-500/40 shadow-lg shadow-emerald-500/5 text-[#f8fafc]',
    'local-first': 'bg-[#1e293b] border-[#334155] text-[#f8fafc]',
  };

  return (
    <div
      onClick={onClick}
      className={`relative rounded-3xl p-6 md:p-8 border transition-all duration-200 flex flex-col justify-between overflow-hidden ${variantStyles[variant]} ${
        onClick ? 'cursor-pointer hover:-translate-y-1 hover:border-sky-500/50' : ''
      } ${className}`}
    >
      <div>
        {/* Top bar: Icon & Tag */}
        <div className="flex items-center justify-between mb-6 gap-3">
          {icon ? (
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              {icon}
            </div>
          ) : (
            <div />
          )}

          {tag && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-slate-800/80 text-sky-300 border border-slate-700">
              {tag}
            </span>
          )}
        </div>

        {/* Content */}
        <h3 className="text-xl md:text-2xl font-bold tracking-tight mb-2 text-[#f8fafc]">
          {title}
        </h3>
        <p className="text-sm md:text-base text-[#94a3b8] leading-relaxed mb-6">
          {description}
        </p>
      </div>

      {children && <div className="mt-auto pt-2">{children}</div>}
    </div>
  );
};
