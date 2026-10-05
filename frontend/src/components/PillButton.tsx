import React from 'react';

export interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'primary',
  size = 'md',
  showArrow = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 select-none min-h-[44px] focus-visible:outline-2 focus-visible:outline-sky-400 focus-visible:outline-offset-2';

  const sizeStyles = {
    sm: 'text-xs px-4 py-2 gap-1.5 min-h-[44px]',
    md: 'text-sm px-6 py-2.5 gap-2 min-h-[44px]',
    lg: 'text-base px-8 py-3.5 gap-2.5 min-h-[48px]',
  };

  const variantStyles = {
    primary:
      'bg-[#38bdf8] text-[#0b0f17] hover:bg-[#0284c7] active:scale-[0.98] shadow-sm hover:shadow-sky-500/20 font-bold',
    secondary:
      'bg-[#1e293b] text-[#f8fafc] hover:bg-[#334155] active:scale-[0.98] border border-[#334155]',
    outline:
      'bg-transparent text-[#f8fafc] border border-[#233044] hover:border-[#38bdf8] hover:text-[#38bdf8] active:scale-[0.98]',
    ghost:
      'bg-transparent text-[#94a3b8] hover:text-[#f8fafc] hover:bg-[#1e293b]/50',
    danger:
      'bg-[#ef4444] text-white hover:bg-[#dc2626] active:scale-[0.98] shadow-sm font-bold',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
      {showArrow && <span className="font-bold text-sm tracking-tighter" aria-hidden="true">↗</span>}
    </button>
  );
};
