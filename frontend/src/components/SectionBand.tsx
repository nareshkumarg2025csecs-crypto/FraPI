import React from 'react';

export interface SectionBandProps {
  id?: string;
  variant?: 'dark' | 'dark-elevated' | 'light';
  tone?: 'default' | 'primary' | 'surface' | 'elevated' | 'highlighted' | 'light' | 'dark';
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export const SectionBand: React.FC<SectionBandProps> = ({
  id,
  variant,
  tone,
  children,
  className = '',
  containerClassName = '',
}) => {
  const resolvedTone = tone || (variant === 'light' ? 'light' : variant === 'dark-elevated' ? 'elevated' : 'primary');
  const toneStyles: Record<string, string> = {
    primary: 'bg-[#0b0f17] text-[#f8fafc] border-t border-[#1e293b]',
    default: 'bg-[#0b0f17] text-[#f8fafc] border-t border-[#1e293b]',
    surface: 'bg-[#131d2e] text-[#f8fafc] border-t border-[#233044]',
    elevated: 'bg-[#1e293b] text-[#f8fafc] border-t border-[#334155]',
    highlighted: 'bg-[#131d2e] text-[#f8fafc] border-t border-sky-500/40',
    light: 'bg-[#f8fafc] text-[#0f172a] border-t border-[#e2e8f0]',
    dark: 'bg-[#0b0f17] text-[#f8fafc] border-t border-[#1e293b]',
  };

  const style = toneStyles[resolvedTone] || toneStyles.primary;

  return (
    <section id={id} className={`w-full py-16 md:py-24 lg:py-32 ${style} ${className}`}>
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full ${containerClassName}`}>
        {children}
      </div>
    </section>
  );
};
