import React from 'react';
import { Check } from 'lucide-react';

export interface StepperProps {
  currentStep: number; // 1 to 5
  steps?: string[];
  onStepClick?: (step: number) => void;
  className?: string;
}

const DEFAULT_STEPS = ['Input', 'Expectation', 'Review', 'Privacy', 'Verdict'];

export const Stepper: React.FC<StepperProps> = ({
  currentStep,
  steps = DEFAULT_STEPS,
  onStepClick,
  className = '',
}) => {
  return (
    <nav aria-label="Progress Stepper" className={`w-full max-w-3xl mx-auto px-2 py-4 ${className}`}>
      {/* Desktop Stepper */}
      <ol className="hidden sm:flex items-center justify-between w-full relative">
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[2px] bg-[#233044] -z-0" />
        {steps.map((label, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;

          return (
            <li key={label} className="relative z-10 flex flex-col items-center">
              <button
                type="button"
                disabled={!onStepClick || stepNum > currentStep}
                onClick={() => onStepClick && onStepClick(stepNum)}
                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs transition-all duration-200 ${
                  isCompleted
                    ? 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/20'
                    : isCurrent
                    ? 'bg-[#131d2e] text-sky-400 border-2 border-sky-400 ring-4 ring-sky-500/10'
                    : 'bg-[#1e293b] text-[#64748b] border border-[#334155]'
                } ${onStepClick && stepNum <= currentStep ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${stepNum}: ${label}`}
              >
                {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : stepNum}
              </button>
              <span
                className={`mt-2 text-xs font-semibold tracking-tight transition-colors ${
                  isCurrent ? 'text-sky-400' : isCompleted ? 'text-[#f8fafc]' : 'text-[#64748b]'
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile Compact Stepper (390px Optimized) */}
      <div className="sm:hidden flex items-center justify-between px-3 py-2.5 bg-[#131d2e] border border-[#233044] rounded-2xl">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-sky-500 text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
            {currentStep}
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748b]">
              Step {currentStep} of {steps.length}
            </div>
            <div className="text-sm font-bold text-[#f8fafc]">
              {steps[currentStep - 1] || 'Current Step'}
            </div>
          </div>
        </div>

        {/* Mini Step Dots */}
        <div className="flex items-center gap-1.5">
          {steps.map((_, idx) => {
            const stepNum = idx + 1;
            return (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-200 ${
                  stepNum === currentStep
                    ? 'w-5 bg-sky-400'
                    : stepNum < currentStep
                    ? 'w-2 bg-sky-600'
                    : 'w-2 bg-slate-800'
                }`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
};
