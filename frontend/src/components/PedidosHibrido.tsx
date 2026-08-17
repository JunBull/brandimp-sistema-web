import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, getStoredUser } from '../utils/apiFetch';
import KanbanBoard from './KanbanBoard';
import { showToast } from './Toast';
import { generarPdfPedidoV2 } from '../utils/generarPdfPedidoV2.ts';
import { 
  Table as TableIcon, 
  Kanban as KanbanIcon, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  X, 
  ChevronDown, 
  PackageSearch, 
  PlusCircle, 
  RotateCcw, 
  Inbox,
  FileDown
} from 'lucide-react';

interface DetallePedido {
  id?: string;
  detalle_id?: string;
  tipo_producto_nombre?: string;
  producto_nombre?: string;
  categoria_nombre?: string;
  cantidad: number;
  unidad_medida: string;
  precio_base_calculado?: string;
  precio_final_acordado: string;
  url_vectorial?: string | null;
  url_fotografia?: string | null;
  tamano_nombre?: string | null;
  color_nombre?: string | null;
  tipo_servicio?: string | null;
  num_colores_estampado?: number | null;
}

interface Marca {
  id: string;
  nombre: string;
  ruc_dni: string | null;
}

interface Pedido {
  id: string;
  codigo_correlativo: string;
  marca?: string | Marca;
  marca_nombre?: string;
  solicitante_nombre: string;
  solicitante_telefono?: string;
  fecha_entrega_acordada: string;
  estado_actual: string;
  monto_total: string;
  total_pagado?: string;
  saldo_pendiente?: string;
  created_at: string;
  detalles: DetallePedido[];
}

interface Categoria {
  id: string;
  nombre: string;
}

const ESTADOS_SECUENCIA: Record<string, string> = {
  'Registrado': 'Espera material',
  'Espera material': 'En producción',
  'En producción': 'En el taller',
  'En el taller': 'En la tienda',
  'En la tienda': 'Entregado'
};

const ESTADOS_BADGES: Record<string, { bg: string; text: string }> = {
  'Registrado': { bg: 'bg-[#59BFCB]/10 border-[#59BFCB]/30', text: 'text-[#59BFCB]' },
  'Espera material': { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-600 dark:text-amber-400' },
  'En producción': { bg: 'bg-[#9478B3]/10 border-[#9478B3]/30', text: 'text-[#9478B3]' },
  'En el taller': { bg: 'bg-[#EF8367]/10 border-[#EF8367]/30', text: 'text-[#EF8367]' },
  'En la tienda': { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400' }
};

export default function PedidosHibrido() {
  const [viewMode, setViewMode] = useState<'tabla' | 'kanban'>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('pedidos-view-mode');
      if (saved === 'kanban' || saved === 'tabla') return saved;
    }
    return 'tabla';
  });

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstado, setSelectedEstado] = useState<string>('todos');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('todas');
  const [sortBy, setSortBy] = useState<'urgencia' | 'reciente' | 'codigo'>('urgencia');

  // Pedido seleccionado para modal
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [dataPed, dataCat] = await Promise.all([
        apiFetch('/pedidos/?activos=true'),
        apiFetch('/categorias/')
      ]);

      setPedidos(Array.isArray(dataPed) ? dataPed : dataPed.results || []);
      setCategorias(Array.isArray(dataCat) ? dataCat : dataCat.results || []);
    } catch (err) {
      console.warn('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const targetId = params.get('id');
      if (targetId && pedidos.length > 0) {
        const match = pedidos.find(p => p.id === targetId);
        if (match) setSelectedPedido(match);
      }
    }
  }, []);

  const handleToggleView = (mode: 'tabla' | 'kanban') => {
    setViewMode(mode);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pedidos-view-mode', mode);
    }
  };

  const calcularDiasHabiles = (fechaEntregaStr: string) => {
    if (!fechaEntregaStr) return 999;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaObj = new Date(fechaEntregaStr + 'T00:00:00');
    fechaObj.setHours(0, 0, 0, 0);
    const diffTime = fechaObj.getTime() - hoy.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleAvanzarEstado = async (e: React.MouseEvent, pedido: Pedido) => {
    e.stopPropagation();
    const siguienteEstado = ESTADOS_SECUENCIA[pedido.estado_actual];
    if (!siguienteEstado) return;

    const currentUser = getStoredUser();
    const userName = currentUser?.nombre_completo || currentUser?.username || 'Sistema';
    const estadoAnterior = pedido.estado_actual;

    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, estado_actual: siguienteEstado } : p));

    showToast({
      title: 'Estado Actualizado',
      message: `El pedido ${pedido.codigo_correlativo} avanzó a "${siguienteEstado}".`,
      type: 'success'
    });

    try {
      await apiFetch(`/pedidos/${pedido.id}/cambiar-estado/`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: siguienteEstado, ejecutado_por: userName })
      });
    } catch (err) {
      console.error('Error al avanzar estado:', err);
      // Rollback
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, estado_actual: estadoAnterior } : p));
    }
  };

  const getMarcaNombre = (p: Pedido) => {
    if (p.marca_nombre) return p.marca_nombre;
    if (typeof p.marca === 'object' && p.marca?.nombre) return p.marca.nombre;
    return 'Sin Marca';
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedEstado('todos');
    setSelectedCategoria('todas');
  };

  // Pedidos filtrados y ordenados
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter(p => {
      // Filtro de búsqueda libre
      const q = searchTerm.toLowerCase().trim();
      if (q) {
        const matchCodigo = p.codigo_correlativo.toLowerCase().includes(q);
        const matchMarca = getMarcaNombre(p).toLowerCase().includes(q);
        const matchSolicitante = p.solicitante_nombre?.toLowerCase().includes(q);
        if (!matchCodigo && !matchMarca && !matchSolicitante) return false;
      }

      // Filtro de estado
      if (selectedEstado !== 'todos' && p.estado_actual !== selectedEstado) {
        return false;
      }

      // Filtro de categoría
      if (selectedCategoria !== 'todas') {
        const tieneCategoria = p.detalles?.some(d => d.categoria_nombre === selectedCategoria);
        if (!tieneCategoria) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgencia') {
        const diasA = calcularDiasHabiles(a.fecha_entrega_acordada);
        const diasB = calcularDiasHabiles(b.fecha_entrega_acordada);
        return diasA - diasB;
      } else if (sortBy === 'reciente') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return a.codigo_correlativo.localeCompare(b.codigo_correlativo);
      }
    });
  }, [pedidos, searchTerm, selectedEstado, selectedCategoria, sortBy]);

  const hasActiveFilters = searchTerm !== '' || selectedEstado !== 'todos' || selectedCategoria !== 'todas';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Bar con Título y Switch Tabla / Kanban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-default)] shadow-xs">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-[var(--text-primary)]">
            Gestión de Pedidos
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {pedidosFiltrados.length} pedidos activos encontrados
          </p>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center bg-[var(--bg-muted)] p-1 rounded-2xl border border-[var(--border-subtle)] self-start sm:self-auto">
          <button
            onClick={() => handleToggleView('tabla')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
              viewMode === 'tabla'
                ? 'bg-gradient-to-r from-brand-turquoise to-brand-lavender text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <TableIcon className="w-4 h-4" /> Tabla Listado
          </button>
          <button
            onClick={() => handleToggleView('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer ${
              viewMode === 'kanban'
                ? 'bg-gradient-to-r from-brand-turquoise to-brand-lavender text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <KanbanIcon className="w-4 h-4" /> Tablero Kanban
          </button>
        </div>
      </div>

      {/* Render si es Modo Kanban */}
      {viewMode === 'kanban' ? (
        <KanbanBoard />
      ) : (
        /* Render Modo Tabla Listado */
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Buscador */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por código, marca..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#59BFCB]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Estado */}
            <div className="relative">
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#59BFCB] cursor-pointer appearance-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="Registrado">Registrado</option>
                <option value="Espera material">Espera material</option>
                <option value="En producción">En producción</option>
                <option value="En el taller">En el taller</option>
                <option value="En la tienda">En la tienda</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            {/* Filtro por Categoría */}
            <div className="relative">
              <select
                value={selectedCategoria}
                onChange={(e) => setSelectedCategoria(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#59BFCB] cursor-pointer appearance-none"
              >
                <option value="todas">Todas las Categorías</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>

            {/* Ordenamiento */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#59BFCB] cursor-pointer appearance-none font-semibold"
              >
                <option value="urgencia">Ordenar por Urgencia ⚠️</option>
                <option value="reciente">Ordenar por Más Reciente 🕒</option>
                <option value="codigo">Ordenar por Código 🔢</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] shadow-xs overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3 animate-pulse">
                <div className="h-10 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
                ))}
              </div>
            ) : pedidos.length === 0 ? (
              /* Sin pedidos en el sistema */
              <div className="p-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-brand-turquoise/10 flex items-center justify-center text-brand-turquoise">
                  <Inbox className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">No hay pedidos registrados</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  Aún no se han creado órdenes de producción activas en la base de datos.
                </p>
                <a
                  href="/nuevo-pedido"
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold text-xs shadow-sm transition-all"
                >
                  <PlusCircle className="w-4 h-4" /> Registrar Primer Pedido
                </a>
              </div>
            ) : pedidosFiltrados.length === 0 ? (
              /* Con filtros que no coinciden */
              <div className="p-12 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <PackageSearch className="w-8 h-8" />
                </div>
                <h3 className="font-display font-bold text-base text-[var(--text-primary)]">Sin resultados para los filtros actuales</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm">
                  Ningún pedido activo coincide con el término de búsqueda o estados seleccionados.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold text-xs cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-brand-turquoise" /> Restablecer Todos los Filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-muted)] border-b border-[var(--border-default)] text-[var(--text-muted)] uppercase tracking-wider font-bold text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">Urgencia</th>
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Marca / Solicitante</th>
                      <th className="py-3.5 px-4">Producto(s)</th>
                      <th className="py-3.5 px-4">Estado Actual</th>
                      <th className="py-3.5 px-4">Fecha Entrega</th>
                      <th className="py-3.5 px-4 text-right">Monto Total</th>
                      <th className="py-3.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {pedidosFiltrados.map((p) => {
                      const dias = calcularDiasHabiles(p.fecha_entrega_acordada);
                      let urgenciaTag = { label: `${dias}d`, style: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' };

                      if (dias < 0) {
                        urgenciaTag = { label: `⚠️ Vencido`, style: 'bg-red-500/15 text-red-600 font-extrabold border-red-500/30' };
                      } else if (dias === 0) {
                        urgenciaTag = { label: `🔴 Hoy`, style: 'bg-orange-500/15 text-orange-600 font-bold border-orange-500/30' };
                      } else if (dias <= 2) {
                        urgenciaTag = { label: `🟡 ${dias} días`, style: 'bg-amber-500/15 text-amber-600 font-semibold border-amber-500/30' };
                      }

                      const badgeStyle = ESTADOS_BADGES[p.estado_actual] || { bg: 'bg-gray-500/10', text: 'text-gray-500' };
                      const siguienteEstado = ESTADOS_SECUENCIA[p.estado_actual];
                      const primerDetalle = p.detalles?.[0];

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPedido(p)}
                          className="hover:bg-brand-turquoise/5 hover:shadow-xs transition-all duration-200 cursor-pointer group"
                        >
                          {/* Urgencia */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 text-[10px] rounded-full border ${urgenciaTag.style}`}>
                              {urgenciaTag.label}
                            </span>
                          </td>

                          {/* Código */}
                          <td className="py-3.5 px-4 font-bold text-[var(--text-primary)] group-hover:text-brand-turquoise">
                            {p.codigo_correlativo}
                          </td>

                          {/* Marca & Solicitante */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-[var(--text-primary)]">{getMarcaNombre(p)}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{p.solicitante_nombre}</div>
                          </td>

                          {/* Productos */}
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            {primerDetalle ? (
                              <span>
                                {primerDetalle.tipo_producto_nombre || primerDetalle.producto_nombre || 'Producto'} ({primerDetalle.cantidad} {primerDetalle.unidad_medida})
                                {p.detalles.length > 1 && (
                                  <span className="ml-1 px-1.5 py-0.2 text-[9px] font-bold rounded-md bg-[var(--bg-muted)] text-[var(--text-muted)]">
                                    +{p.detalles.length - 1} más
                                  </span>
                                )}
                              </span>
                            ) : (
                              'Sin ítems'
                            )}
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${badgeStyle.bg} ${badgeStyle.text}`}>
                              {p.estado_actual}
                            </span>
                          </td>

                          {/* Fecha Entrega */}
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] font-medium">
                            {p.fecha_entrega_acordada}
                          </td>

                          {/* Monto Total */}
                          <td className="py-3.5 px-4 text-right font-bold text-[var(--text-primary)]">
                            S/ {parseFloat(p.monto_total || '0').toFixed(2)}
                          </td>

                          {/* Botón Avanzar Estado */}
                          <td className="py-3.5 px-4 text-center">
                            {siguienteEstado ? (
                              <button
                                onClick={(e) => handleAvanzarEstado(e, p)}
                                className="px-3 py-1 text-[11px] font-bold rounded-xl bg-[var(--bg-muted)] hover:bg-brand-turquoise hover:text-white border border-[var(--border-default)] transition-all flex items-center gap-1 mx-auto cursor-pointer"
                                title={`Avanzar a: ${siguienteEstado}`}
                              >
                                Avanzar <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-500 font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Completado
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Detalle Pedido (Reutilizable) */}
      {selectedPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
          <div className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-default)] shadow-2xl max-w-lg w-full p-6 space-y-6 overflow-hidden animate-fade-in-scale">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#59BFCB]">Detalle del Pedido</span>
                <h3 className="font-display text-xl font-extrabold text-[var(--text-primary)]">
                  {selectedPedido.codigo_correlativo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPedido(null)}
                className="p-2 rounded-xl hover:bg-[var(--bg-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)]">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Marca Comercial</span>
                  <span className="font-bold text-sm text-[var(--text-primary)]">{getMarcaNombre(selectedPedido)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Solicitante</span>
                  <span className="font-bold text-sm text-[var(--text-primary)]">{selectedPedido.solicitante_nombre}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Fecha de Entrega</span>
                  <span className="font-semibold text-[var(--text-primary)]">{selectedPedido.fecha_entrega_acordada}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Estado Actual</span>
                  <span className="font-bold text-[#59BFCB]">{selectedPedido.estado_actual}</span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[var(--text-secondary)] mb-2">Ítems del Pedido</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedPedido.detalles?.map((d, idx) => (
                    <div key={d.id || d.detalle_id || idx} className="p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] flex items-center justify-between">
                      <div>
                        <p className="font-bold text-[var(--text-primary)]">{d.tipo_producto_nombre || d.producto_nombre || 'Producto'}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">Cat: {d.categoria_nombre || 'General'} • Cant: {d.cantidad} {d.unidad_medida}</p>
                      </div>
                      <div className="font-bold text-[var(--text-primary)]">
                        S/ {parseFloat(d.precio_final_acordado || '0').toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] font-bold text-sm">
                <span>Total de la Orden:</span>
                <span className="text-base text-[#59BFCB]">S/ {parseFloat(selectedPedido.monto_total || '0').toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => generarPdfPedidoV2({
                  codigo_correlativo: selectedPedido.codigo_correlativo,
                  marca_nombre: getMarcaNombre(selectedPedido),
                  solicitante_nombre: selectedPedido.solicitante_nombre,
                  solicitante_telefono: selectedPedido.solicitante_telefono,
                  fecha_entrega_acordada: selectedPedido.fecha_entrega_acordada,
                  monto_total: selectedPedido.monto_total,
                  total_pagado: selectedPedido.total_pagado,
                  saldo_pendiente: selectedPedido.saldo_pendiente,
                  detalles: selectedPedido.detalles
                })}
                className="px-5 py-2.5 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                📄 Descargar Comprobante PDF
              </button>
              <button
                onClick={() => setSelectedPedido(null)}
                className="px-5 py-2.5 rounded-2xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] font-bold text-xs cursor-pointer border border-[var(--border-default)]"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
