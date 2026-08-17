import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  children: React.ReactNode;
}

const sizeClassesMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full mx-4 sm:mx-6 md:max-w-5xl'
};

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  size,
  maxWidth = 'md',
  children
}: ModalProps) {
  const [isRendered, setIsRendered] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      const animTimer = setTimeout(() => setIsAnimating(true), 10);
      return () => clearTimeout(animTimer);
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsRendered(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isRendered) return;

    const scrollContainer = document.getElementById('main-content-viewport') || document.body;
    const originalOverflow = scrollContainer.style.overflow;
    scrollContainer.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      scrollContainer.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRendered, onClose]);

  if (!isRendered) return null;

  const targetSizeKey = size || maxWidth;
  const resolvedSizeClass = sizeClassesMap[targetSizeKey] || sizeClassesMap.md;

  return createPortal(
    <div 
      className={`fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[100] transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`bg-[var(--bg-surface)] text-[var(--text-primary)] w-full ${resolvedSizeClass} rounded-3xl border border-[var(--border-default)] overflow-hidden shadow-2xl flex flex-col max-h-[90vh] transition-all duration-200 transform ${
          isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
        }`}
        style={{ overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      >
        {(title || subtitle) && (
          <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-start justify-between bg-[var(--bg-surface-raised)] shrink-0">
            <div>
              {title && (
                <h3 className="text-lg font-bold font-display text-[var(--text-primary)] leading-tight">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 -mr-1.5 -mt-1 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-muted)] transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
