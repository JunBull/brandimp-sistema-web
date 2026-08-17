import React from 'react';
import { COUNTRY_CODES } from '../utils/validators';
import { ChevronDown } from 'lucide-react';

interface PhoneInputProps {
  prefijo: string;
  setPrefijo: (val: string) => void;
  numero: string;
  setNumero: (val: string) => void;
  error?: string;
  disabled?: boolean;
}

export default function PhoneInput({
  prefijo,
  setPrefijo,
  numero,
  setNumero,
  error,
  disabled = false
}: PhoneInputProps) {
  const selectedCountry = COUNTRY_CODES.find(c => c.code === prefijo) || COUNTRY_CODES[0];

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permitir solo dígitos y espacios
    const rawVal = e.target.value.replace(/[^0-9\s]/g, '');
    setNumero(rawVal);
  };

  return (
    <div className="w-full">
      <div className={`flex rounded-xl overflow-hidden border ${error ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/20 transition-all bg-[var(--bg-surface)]`}>
        {/* Selector de País Compacto (Estilo Pro Max UI) */}
        <div className="relative flex items-center gap-1.5 bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-surface-hover,var(--bg-surface))] border-r border-[var(--border-default)] px-3 py-2.5 shrink-0 cursor-pointer group transition-colors select-none">
          <span className="text-sm">{selectedCountry.flag}</span>
          <span className="text-xs font-semibold text-[var(--text-primary)] font-mono">{selectedCountry.code}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors pointer-events-none" />

          {/* Select nativo accesible superpuesto para disparar el picker del sistema */}
          <select
            value={prefijo}
            onChange={(e) => setPrefijo(e.target.value)}
            disabled={disabled}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
            title="Cambiar código de país"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code} className="bg-[var(--bg-surface)] text-[var(--text-primary)] py-1">
                {c.flag} {c.country} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* Input Numérico */}
        <input
          type="tel"
          value={numero}
          onChange={handleNumberChange}
          disabled={disabled}
          placeholder={selectedCountry.placeholder}
          maxLength={15}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none"
        />
      </div>

      {error && (
        <p className="text-xs text-red-500 mt-1 animate-fade-in flex items-center gap-1 font-medium">
          <span>⚠️</span> {error}
        </p>
      )}
    </div>
  );
}
