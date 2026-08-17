import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { Search, X, Package, Tag, Loader2, ArrowRight } from 'lucide-react';

interface PedidoResultado {
  id: string;
  codigo_correlativo: string;
  marca_nombre: string;
  solicitante_nombre: string;
  estado_actual: string;
  tipo: 'pedido';
}

interface MarcaResultado {
  id: string;
  nombre: string;
  ruc_dni: string | null;
  tipo: 'marca';
}

interface SearchResults {
  pedidos: PedidoResultado[];
  marcas: MarcaResultado[];
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ pedidos: [], marcas: [] });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search fetch
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ pedidos: [], marcas: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiFetch(`/busqueda-global/?q=${encodeURIComponent(trimmed)}`);
        setResults({
          pedidos: Array.isArray(data?.pedidos) ? data.pedidos : [],
          marcas: Array.isArray(data?.marcas) ? data.marcas : []
        });
        setIsOpen(true);
      } catch (err) {
        setResults({ pedidos: [], marcas: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const hasResults = results.pedidos.length > 0 || results.marcas.length > 0;

  return (
    <div ref={searchRef} className="relative w-full max-w-xs md:max-w-sm">
      {/* Input container */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setIsOpen(true);
          }}
          placeholder="Buscar pedido, marca... (Ctrl+K)"
          className="w-full pl-9 pr-8 py-1.5 text-xs md:text-sm rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-turquoise/30 focus:border-brand-turquoise focus:shadow-[0_0_15px_rgba(89,191,203,0.2)] transition-all"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 w-4 h-4 text-brand-turquoise animate-spin" />
        ) : query ? (
          <button
            onClick={() => {
              setQuery('');
              setIsOpen(false);
            }}
            className="absolute right-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd className="hidden md:inline-block absolute right-2.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-default)] rounded">
            Ctrl+K
          </kbd>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto animate-fade-in-scale">
          {!loading && !hasResults && (
            <div className="p-4 text-center text-xs text-[var(--text-muted)]">
              No se encontraron resultados para "<span className="font-semibold text-[var(--text-primary)]">{query}</span>"
            </div>
          )}

          {/* Pedidos Results */}
          {results.pedidos.length > 0 && (
            <div className="p-2 border-b border-[var(--border-subtle)]">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3 h-3 text-brand-turquoise" /> Pedidos
              </div>
              <div className="space-y-0.5">
                {results.pedidos.map((p) => (
                  <a
                    key={p.id}
                    href={`/pedidos?id=${p.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-brand-turquoise/5 hover:translate-x-1 transition-all duration-150 group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div>
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-brand-turquoise">
                        {p.codigo_correlativo}
                      </span>
                      <span className="ml-2 text-[var(--text-secondary)]">— {p.marca_nombre}</span>
                      <p className="text-[10px] text-[var(--text-muted)]">Solicita: {p.solicitante_nombre}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-[var(--bg-muted)] border border-[var(--border-default)] text-[var(--text-secondary)]">
                        {p.estado_actual}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Marcas Results */}
          {results.marcas.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-brand-lavender" /> Marcas
              </div>
              <div className="space-y-0.5">
                {results.marcas.map((m) => (
                  <a
                    key={m.id}
                    href={`/marcas?id=${m.id}`}
                    className="flex items-center justify-between px-3 py-2 rounded-xl text-xs hover:bg-brand-turquoise/5 hover:translate-x-1 transition-all duration-150 group"
                    onClick={() => setIsOpen(false)}
                  >
                    <div>
                      <span className="font-bold text-[var(--text-primary)] group-hover:text-brand-lavender">
                        {m.nombre}
                      </span>
                      {m.ruc_dni && (
                        <span className="ml-2 text-[10px] text-[var(--text-muted)]">RUC/DNI: {m.ruc_dni}</span>
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
