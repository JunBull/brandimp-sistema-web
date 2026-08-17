import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { generarPdfPedidoV2 } from '../utils/generarPdfPedidoV2.ts';
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  X, 
  ChevronRight, 
  ChevronDown,
  Phone, 
  ClipboardList, 
  FileSpreadsheet, 
  ImageIcon,
  Tags,
  ShoppingBag,
  SearchX,
  RotateCcw,
  FileDown
} from 'lucide-react';
import Modal from './Modal';

interface Marca {
  id: string;
  nombre: string;
  ruc_dni: string | null;
  created_at: string;
}

interface DetallePedidoHistorial {
  detalle_id: string;
  producto_nombre: string;
  categoria_nombre: string;
  cantidad: number;
  unidad_medida: string;
  precio_base_calculado: string;
  precio_final_acordado: string;
  url_vectorial?: string | null;
  url_fotografia?: string | null;
}

interface PedidoResumen {
  id: string;
  codigo_correlativo: string;
  fecha_pedido: string;
  estado_actual: string;
  monto_total: string;
  solicitante: string;
  solicitante_telefono?: string | null;
  detalles: DetallePedidoHistorial[];
}

const getBadgeStyleEstado = (estado: string) => {
  switch (estado) {
    case 'Registrado':
      return 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border-[var(--border-default)] rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    case 'Espera material':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    case 'En producción':
      return 'bg-brand-lavender/10 text-brand-lavender border-brand-lavender/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    case 'En el taller':
      return 'bg-brand-peach/10 text-brand-peach border-brand-peach/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    case 'En la tienda':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    case 'Entregado':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
    default:
      return 'bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] border-[var(--border-default)] rounded-full px-2.5 py-0.5 text-[10px] font-bold border';
  }
};

export default function MarcaHistorial() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMarca, setSelectedMarca] = useState<Marca | null>(null);
  const [pedidos, setPedidos] = useState<PedidoResumen[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [expandedPedidoId, setExpandedPedidoId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Formulario de nueva marca
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [nuevaNombre, setNuevaNombre] = useState('');
  const [nuevaRuc, setNuevaRuc] = useState('');
  const [creando, setCreando] = useState(false);

  const fetchMarcas = async (query = '') => {
    try {
      setLoading(true);
      setErrorMsg('');
      const url = query ? `/marcas/?search=${encodeURIComponent(query)}` : '/marcas/';
      const data = await apiFetch(url);
      const list = Array.isArray(data) ? data : (data.results || []);
      setMarcas(list);
      return list as Marca[];
    } catch (error: any) {
      setErrorMsg(error.message || 'Error al cargar marcas del servidor.');
      setMarcas([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidos = async (marcaId: string) => {
    try {
      setLoadingPedidos(true);
      setExpandedPedidoId(null);
      const data = await apiFetch(`/marcas/${marcaId}/pedidos/`);
      setPedidos(Array.isArray(data) ? data : []);
    } catch (err) {
      setPedidos([]);
    } finally {
      setLoadingPedidos(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      const searchParam = params.get('search');
      
      const queryToUse = searchParam || '';
      if (searchParam) {
        setSearchQuery(searchParam);
      }
      
      const loadedMarcas = await fetchMarcas(queryToUse);
      
      if (idParam && loadedMarcas && loadedMarcas.length > 0) {
        const match = loadedMarcas.find(m => m.id === idParam || m.nombre.toLowerCase().includes(idParam.toLowerCase()));
        if (match) {
          setSelectedMarca(match);
          fetchPedidos(match.id);
        }
      }
    };
    init();
  }, []);

  const handleSelectMarca = (marca: Marca) => {
    setSelectedMarca(marca);
    fetchPedidos(marca.id);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    fetchMarcas(val);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMarcas(searchQuery);
  };

  const toggleExpandPedido = (id: string) => {
    setExpandedPedidoId(prev => prev === id ? null : id);
  };

  const handleDescargarPdf = (pedido: PedidoResumen, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    generarPdfPedidoV2({
      codigo_correlativo: pedido.codigo_correlativo,
      marca_nombre: selectedMarca?.nombre || 'Marca Comercial',
      solicitante_nombre: pedido.solicitante,
      solicitante_telefono: pedido.solicitante_telefono,
      fecha_entrega_acordada: pedido.fecha_pedido ? new Date(pedido.fecha_pedido).toISOString().split('T')[0] : '',
      monto_total: pedido.monto_total,
      total_pagado: pedido.monto_total,
      saldo_pendiente: '0.00',
      detalles: pedido.detalles.map(d => ({
        tipo_producto_nombre: d.producto_nombre,
        producto_nombre: d.producto_nombre,
        categoria_nombre: d.categoria_nombre,
        cantidad: d.cantidad,
        unidad_medida: d.unidad_medida,
        precio_final_acordado: d.precio_final_acordado
      }))
    });
  };

  const handleCrearMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNombre.trim()) {
      alert('El nombre de la marca es requerido');
      return;
    }

    try {
      setCreando(true);
      const data = await apiFetch('/marcas/', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nuevaNombre,
          ruc_dni: nuevaRuc.trim() || null
        })
      });

      setMarcas(prev => [data, ...prev]);
      setShowModalNueva(false);
      setNuevaNombre('');
      setNuevaRuc('');
      alert('Marca registrada con éxito.');
      setSelectedMarca(data);
      fetchPedidos(data.id);
    } catch (err: any) {
      alert(err.message || 'Error al registrar marca.');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Error si falla la conexión */}
      {errorMsg && (
        <div className="bg-amber-400/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-fade-in" role="alert">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => fetchMarcas(searchQuery)}
            className="flex items-center gap-1 font-semibold hover:underline cursor-pointer text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* Grid General */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Columna Izquierda: Buscador y Listado de Marcas */}
        <div className="lg:col-span-1 bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-2xl shadow-xs flex flex-col space-y-4 h-auto lg:h-[75vh]">
          <div className="flex justify-between items-center shrink-0">
            <h3 className="font-display font-bold text-[var(--text-primary)] text-base">Directorio de Marcas</h3>
            <button 
              onClick={() => setShowModalNueva(true)}
              className="px-3.5 py-2 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva Marca
            </button>
          </div>

          {/* Campo de búsqueda con icono */}
          <div className="relative shrink-0">
            <span className="absolute left-3.5 top-3 text-[var(--text-muted)]">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text" 
              placeholder="Buscar por nombre o RUC..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl pl-10 pr-9 py-2.5 text-sm outline-none focus:border-brand-turquoise focus:bg-[var(--bg-surface)] focus:ring-3 focus:ring-brand-turquoise/20 focus:shadow-[0_0_15px_rgba(89,191,203,0.2)] transition-all text-[var(--text-primary)]"
              aria-label="Buscar marcas por nombre o RUC"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  fetchMarcas('');
                }}
                className="absolute right-3 top-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Lista de Marcas */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map(idx => (
                  <div key={idx} className="h-14 rounded-xl skeleton"></div>
                ))}
              </div>
            ) : marcas.length === 0 ? (
              searchQuery ? (
                <div className="text-center py-8 text-xs border border-dashed border-[var(--border-default)] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2 bg-[var(--bg-surface-raised)]/30">
                  <SearchX className="w-8 h-8 text-amber-500 opacity-80" />
                  <p className="font-semibold text-[var(--text-primary)]">Sin resultados para "{searchQuery}"</p>
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      fetchMarcas('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-[11px] font-bold text-brand-turquoise flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-3 h-3" /> Limpiar búsqueda
                  </button>
                </div>
              ) : (
                <div className="text-center py-10 text-xs border border-dashed border-[var(--border-default)] rounded-2xl p-4 flex flex-col items-center justify-center space-y-2">
                  <p className="text-[var(--text-muted)]">No hay marcas registradas aún.</p>
                  <button
                    onClick={() => setShowModalNueva(true)}
                    className="px-3 py-1.5 rounded-xl bg-brand-turquoise text-white text-[11px] font-bold cursor-pointer"
                  >
                    + Registrar Marca
                  </button>
                </div>
              )
            ) : (
              marcas.map(marca => {
                const esSeleccionado = selectedMarca && selectedMarca.id === marca.id;
                return (
                  <button
                    key={marca.id}
                    onClick={() => handleSelectMarca(marca)}
                    className={`w-full text-left p-3.5 rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex justify-between items-center cursor-pointer ${
                      esSeleccionado 
                        ? 'bg-brand-turquoise/10 border-brand-turquoise text-brand-turquoise-pressed dark:text-brand-turquoise ring-2 ring-brand-turquoise/20 shadow-xs' 
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-muted)] text-[var(--text-primary)]'
                    }`}
                    aria-current={esSeleccionado ? 'true' : 'false'}
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm truncate pr-2">{marca.nombre}</h4>
                      <p className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase mt-1 tracking-wider">
                        {marca.ruc_dni ? `RUC: ${marca.ruc_dni}` : 'Sin RUC / Boleta'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Columna Derecha: Vista del Historial de Pedidos por Nivel (Pedidos -> Detalles expandidos) */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-2xl shadow-xs h-auto lg:h-[75vh] flex flex-col min-h-[400px]">
          {!selectedMarca ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <Tags className="w-12 h-12 mb-4 opacity-40 text-brand-turquoise" />
              <h3 className="font-display font-extrabold text-lg text-[var(--text-primary)]">Consulta de Historial Comercial</h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mt-1.5">
                Selecciona una marca del directorio lateral para ver el listado de pedidos anteriormente realizados y sus detalles.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full min-h-0">
              {/* Información de Marca Seleccionada */}
              <div className="border-b border-[var(--border-subtle)] pb-4 mb-4 flex justify-between items-center shrink-0">
                <div className="min-w-0">
                  <h3 className="font-display font-extrabold text-xl text-[var(--text-primary)] truncate">
                    {selectedMarca.nombre}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                    {selectedMarca.ruc_dni ? `Número de Identificación Fiscal: ${selectedMarca.ruc_dni}` : 'Marca Registrada sin Factura obligatoria (Boleta / Nulo)'}
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-full font-bold text-xs bg-brand-lavender/10 text-brand-lavender-pressed dark:text-brand-lavender border border-brand-lavender/20 shrink-0 ml-3">
                  {pedidos.length} {pedidos.length === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>

              {/* Listado de Pedidos (Nivel 1 -> Nivel 2 expandible) */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {loadingPedidos ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(idx => (
                      <div key={idx} className="h-20 rounded-xl skeleton"></div>
                    ))}
                  </div>
                ) : pedidos.length === 0 ? (
                  <div className="text-center py-20 border border-dashed border-[var(--border-default)] rounded-2xl flex flex-col items-center justify-center p-6">
                    <ClipboardList className="w-10 h-10 mb-2 opacity-40 text-brand-turquoise" />
                    <h4 className="font-bold text-sm text-[var(--text-primary)]">Aún no hay pedidos</h4>
                    <p className="text-xs text-[var(--text-secondary)] max-w-xs mt-1">
                      Esta marca no registra compras previas. Los nuevos pedidos se verán reflejados aquí automáticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3" aria-live="polite">
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-brand-turquoise" /> Selecciona un pedido para ver los detalles y precios por unidad:
                    </p>
                    
                    {pedidos.map((pedido) => {
                      const fechaStr = new Date(pedido.fecha_pedido).toLocaleDateString('es-PE', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      });

                      const isExpanded = expandedPedidoId === pedido.id;
                      
                      return (
                        <div 
                          key={pedido.id}
                          className={`border rounded-2xl transition-all duration-300 ease-in-out overflow-hidden ${
                            isExpanded 
                              ? 'border-brand-turquoise/40 bg-[var(--bg-surface-raised)] shadow-md' 
                              : 'border-[var(--border-subtle)] bg-[var(--bg-surface-raised)] hover:border-[var(--text-muted)] shadow-xs'
                          }`}
                        >
                          {/* Cabecera del Pedido (Nivel 1) */}
                          <button
                            onClick={() => toggleExpandPedido(pedido.id)}
                            className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left cursor-pointer transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-brand-turquoise/10 text-brand-turquoise shrink-0">
                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-extrabold text-brand-turquoise-pressed dark:text-brand-turquoise bg-brand-turquoise/10 px-2 py-0.5 rounded-md border border-brand-turquoise/20">
                                    {pedido.codigo_correlativo}
                                  </span>
                                  <span className={getBadgeStyleEstado(pedido.estado_actual)}>
                                    {pedido.estado_actual}
                                  </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] font-medium mt-1 flex items-center gap-2">
                                  <span>📅 {fechaStr}</span>
                                  <span>•</span>
                                  <span>👤 {pedido.solicitante}</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 border-[var(--border-subtle)] pt-2 sm:pt-0">
                              <div className="text-left sm:text-right">
                                <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider block font-semibold">Total del Pedido:</span>
                                <span className="font-extrabold text-base text-emerald-600 dark:text-emerald-400">
                                  S/ {parseFloat(pedido.monto_total).toFixed(2)}
                                </span>
                              </div>
                              <button
                                onClick={(e) => handleDescargarPdf(pedido, e)}
                                className="p-2.5 rounded-xl bg-brand-turquoise/10 hover:bg-brand-turquoise text-brand-turquoise hover:text-white border border-brand-turquoise/20 transition-all cursor-pointer shadow-xs flex items-center justify-center shrink-0 ml-1"
                                title="Descargar Comprobante PDF"
                                aria-label="Descargar Comprobante PDF"
                              >
                                <FileDown className="w-4 h-4" />
                              </button>
                            </div>
                          </button>

                          {/* Detalle del Pedido Expandido (Nivel 2) */}
                          {isExpanded && (
                            <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 space-y-3 animate-fade-in">
                              <h5 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <ClipboardList className="w-4 h-4 text-brand-turquoise" /> Productos solicitados en este pedido:
                              </h5>

                              {pedido.detalles.length === 0 ? (
                                <p className="text-xs text-[var(--text-muted)] italic">No hay productos registrados en este pedido.</p>
                              ) : (
                                <div className="space-y-2.5">
                                  {pedido.detalles.map((det) => {
                                    const cant = det.cantidad > 0 ? det.cantidad : 1;
                                    const precioAcordadoNum = parseFloat(det.precio_final_acordado) || 0;
                                    const precioPorUnidad = (precioAcordadoNum / cant).toFixed(2);
                                    const esMillar = det.unidad_medida === 'Millar';

                                    return (
                                      <div 
                                        key={det.detalle_id}
                                        className="p-3.5 bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-3"
                                      >
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-brand-lavender/10 text-brand-lavender border border-brand-lavender/20">
                                              {det.categoria_nombre}
                                            </span>
                                            <h6 className="font-bold text-sm text-[var(--text-primary)] truncate">
                                              {det.producto_nombre}
                                            </h6>
                                          </div>

                                          <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">
                                            Cantidad solicitada: <strong className="text-[var(--text-primary)]">{det.cantidad} {det.unidad_medida}(es)</strong>
                                          </p>

                                          <div className="flex gap-4 mt-2">
                                            {det.url_vectorial && (
                                              <a 
                                                href={det.url_vectorial} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-bold text-brand-turquoise-hover hover:text-brand-turquoise-pressed flex items-center gap-1 hover:underline"
                                              >
                                                <FileSpreadsheet className="w-3.5 h-3.5" /> Archivo Vectorial
                                              </a>
                                            )}
                                            {det.url_fotografia && (
                                              <a 
                                                href={det.url_fotografia} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[11px] font-bold text-brand-lavender hover:text-brand-lavender-pressed flex items-center gap-1 hover:underline"
                                              >
                                                <ImageIcon className="w-3.5 h-3.5" /> Foto Muestra
                                              </a>
                                            )}
                                          </div>
                                        </div>

                                        {/* Precios: Cobro total y Cobro por millar/ciento */}
                                        <div className="flex flex-col items-start md:items-end justify-center border-t md:border-t-0 border-[var(--border-subtle)] pt-2 md:pt-0">
                                          <div className="text-left md:text-right">
                                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                              S/ {parseFloat(det.precio_final_acordado).toFixed(2)} <span className="text-[10px] font-normal text-[var(--text-secondary)]">(Total)</span>
                                            </p>
                                            <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-turquoise/10 border border-brand-turquoise/20 text-brand-turquoise-pressed dark:text-brand-turquoise font-bold text-xs">
                                              <span>💰 S/ {precioPorUnidad} por {esMillar ? 'millar' : 'ciento'}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Botón de Descarga de PDF en Detalle Expandido */}
                              <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
                                <button
                                  onClick={() => handleDescargarPdf(pedido)}
                                  className="px-4 py-2 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                                >
                                  <FileDown className="w-4 h-4" /> Descargar Comprobante PDF
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Creación de Nueva Marca */}
      <Modal isOpen={showModalNueva} onClose={() => setShowModalNueva(false)} maxWidth="md">
        <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
          <h3 id="new-brand-title" className="font-display font-extrabold text-lg text-[var(--text-primary)]">Registrar Nueva Marca</h3>
          <button 
            onClick={() => setShowModalNueva(false)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
            aria-label="Cerrar modal de nueva marca"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCrearMarca} className="p-6 space-y-5">
          <div className="floating-label-group">
            <input 
              type="text" 
              id="new-brand-name"
              required
              placeholder=" "
              value={nuevaNombre}
              onChange={(e) => setNuevaNombre(e.target.value)}
              aria-required="true"
            />
            <label htmlFor="new-brand-name">Nombre Comercial (Marca)*</label>
          </div>

          <div className="floating-label-group">
            <input 
              type="text" 
              id="new-brand-ruc"
              maxLength={11}
              placeholder=" "
              value={nuevaRuc}
              onChange={(e) => setNuevaRuc(e.target.value.replace(/\D/g, ''))}
            />
            <label htmlFor="new-brand-ruc">Número de RUC / DNI (Opcional)</label>
            <span className="text-[10px] text-[var(--text-muted)] mt-1.5 block font-medium">
              💡 RN-02: Deja en blanco si la marca no solicita Factura comercial.
            </span>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setShowModalNueva(false)}
              className="flex-1 py-2.5 bg-[var(--bg-muted)] hover:bg-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl text-sm transition-all cursor-pointer border border-[var(--border-default)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creando}
              className="flex-1 py-2.5 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold rounded-xl text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              {creando ? 'Registrando...' : 'Registrar Marca'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
