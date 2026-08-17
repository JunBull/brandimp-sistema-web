import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonPremiumProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  hasRipple?: boolean;
  hasGradient?: boolean;
  hasPulse?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
}

export default function ButtonPremium({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  hasGradient = false,
  hasPulse = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonPremiumProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs rounded-xl gap-1.5',
    md: 'px-4 py-2 text-sm rounded-xl gap-2',
    lg: 'px-6 py-3 text-base rounded-2xl gap-2.5',
  };

  const variantClasses = {
    primary: hasGradient
      ? 'bg-gradient-to-r from-[#59BFCB] to-[#9478B3] text-white hover:opacity-95 shadow-md'
      : 'bg-[#59BFCB] hover:bg-[#47A3AD] text-white shadow-md',
    secondary: 'bg-[#9478B3] hover:bg-[#7D649E] text-white shadow-md',
    outline: 'border-2 border-[#59BFCB] text-[#59BFCB] hover:bg-[#59BFCB]/10',
    ghost: 'text-[var(--text-primary)] hover:bg-[var(--bg-muted)]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md',
  };

  const pulseClass = hasPulse ? 'animate-pulse-glow shadow-[0_0_20px_rgba(89,191,203,0.4)]' : '';

  return (
    <button
      disabled={disabled || isLoading}
      className={`relative overflow-hidden font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 flex items-center justify-center cursor-pointer ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${pulseClass} ${className}`}
      {...props}
    >

      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Procesando...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
