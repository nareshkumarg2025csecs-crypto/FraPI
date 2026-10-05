import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface HoverRowProps {
  stepNumber: string | number;
  title: string;
  description: string;
  badge?: string;
  icon?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const HoverRow: React.FC<HoverRowProps> = ({
  stepNumber,
  title,
  description,
  badge,
  icon,
  rightSlot,
  className = '',
  onClick,
}) => {
  const shouldReduceMotion = useReducedMotion();

  const motionProps = shouldReduceMotion
    ? {}
    : {
        whileHover: { y: -2 },
        transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
      };

  return (
    <motion.div
      {...motionProps}
      onClick={onClick}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group w-full p-4 md:p-6 rounded-2xl bg-[#131d2e] border border-[#233044] hover:border-sky-500/40 hover:bg-[#1e293b]/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 select-none ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start md:items-center gap-4">
        {/* Step Index Badge */}
        <div className="w-9 h-9 rounded-xl bg-slate-800 text-sky-400 border border-slate-700 font-mono font-bold text-sm flex items-center justify-center shrink-0">
          {stepNumber}
        </div>

        {/* Text Content */}
        <div>
          <div className="flex items-center gap-2.5 mb-1 flex-wrap">
            <h4 className="font-bold text-base md:text-lg text-[#f8fafc] group-hover:text-sky-300 transition-colors">
              {title}
            </h4>
            {badge && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-950 text-sky-300 border border-sky-800">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-[#94a3b8] leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      {/* Right Side Slot / Icon */}
      {rightSlot ? (
        <div className="shrink-0 self-end md:self-center">{rightSlot}</div>
      ) : icon ? (
        <div className="shrink-0 text-[#64748b] group-hover:text-sky-400 transition-colors self-end md:self-center">
          {icon}
        </div>
      ) : null}
    </motion.div>
  );
};
