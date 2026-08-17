import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  title: string;
  subtitle?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStep: number; // 1-indexed (1, 2, 3...)
  onStepClick?: (step: number) => void;
  className?: string;
}

export default function Stepper({ steps, currentStep, onStepClick, className = '' }: StepperProps) {
  const progressWidth = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div className={`w-full py-4 ${className}`}>
      <div className="relative flex items-center justify-between max-w-3xl mx-auto px-4">
        {/* Track Line Background */}
        <div className="absolute top-5 left-8 right-8 h-1 bg-[var(--bg-muted)] z-0 rounded-full" />

        {/* Progress Active Line */}
        <div
          className="absolute top-5 left-8 h-1 bg-gradient-to-r from-[#59BFCB] to-[#9478B3] z-0 rounded-full transition-all duration-500 ease-in-out"
          style={{
            width: `calc(${progressWidth}% * (100% - 4rem) / 100)`,
          }}
        />

        {steps.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isActive = stepNum === currentStep;

          return (
            <div key={idx} className="relative z-10 flex flex-col items-center group">
              <button
                type="button"
                onClick={() => onStepClick && isCompleted && onStepClick(stepNum)}
                disabled={!onStepClick || (!isCompleted && !isActive)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                  onStepClick && isCompleted ? 'cursor-pointer' : 'cursor-default'
                } ${
                  isCompleted
                    ? 'bg-emerald-500 text-white shadow-md hover:scale-105'
                    : isActive
                    ? 'bg-[#59BFCB] text-white ring-4 ring-[#59BFCB]/20 shadow-[0_0_15px_rgba(89,191,203,0.5)] scale-110'
                    : 'bg-[var(--bg-surface-raised)] text-[var(--text-muted)] border-2 border-[var(--border-default)]'
                }`}
              >
                {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : stepNum}
              </button>

              <div className="text-center mt-2">
                <span
                  className={`block text-xs font-bold transition-colors ${
                    isActive
                      ? 'text-[#59BFCB]'
                      : isCompleted
                      ? 'text-emerald-500'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  {step.title}
                </span>
                {step.subtitle && (
                  <span className="block text-[10px] text-[var(--text-muted)] hidden sm:block">
                    {step.subtitle}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
