import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiFetch, getStoredUser } from '../utils/apiFetch';
import { generarPdfPedidoV2 } from '../utils/generarPdfPedidoV2.ts';
import Modal from './Modal';
import { 
  Inbox, 
  Clock, 
  Settings, 
  Wrench, 
  Store, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  Phone, 
  FileSpreadsheet, 
  Image, 
  X, 
  User, 
  Calendar, 
  DollarSign, 
  RefreshCw,
  ChevronRight,
  Move
} from 'lucide-react';

// Tipado de datos
interface Detalle {
  id: string;
  tipo_producto_nombre: string;
  categoria_nombre: string;
  cantidad: number;
  unidad_medida: string;
  precio_final_acordado: string;
  url_vectorial?: string | null;
  url_fotografia?: string | null;
}

interface Pedido {
  id: string;
  codigo_correlativo: string;
  marca: string;
  marca_nombre: string;
  solicitante_nombre: string;
  solicitante_telefono?: string | null;
  fecha_entrega_acordada: string;
  estado_actual: string;
  monto_total: string;
  detalles: Detalle[];
  total_pagado?: string;
  saldo_pendiente?: string;
}

const ESTADOS = [
  { 
    clave: 'Registrado', 
    nombre: 'Registrado', 
    icon: Inbox,
    color: 'border-brand-turquoise bg-brand-turquoise/5 text-brand-turquoise-pressed dark:text-brand-turquoise',
    cardBorder: 'border-l-brand-turquoise'
  },
  { 
    clave: 'Espera material', 
    nombre: 'Espera Material', 
    icon: Clock,
    color: 'border-amber-400 bg-amber-400/5 text-amber-700 dark:text-amber-400',
    cardBorder: 'border-l-amber-400'
  },
  { 
    clave: 'En producción', 
    nombre: 'En Producción', 
    icon: Settings,
    color: 'border-brand-lavender bg-brand-lavender/5 text-brand-lavender-pressed dark:text-brand-lavender',
    cardBorder: 'border-l-brand-lavender'
  },
  { 
    clave: 'En el taller', 
    nombre: 'En el Taller', 
    icon: Wrench,
    color: 'border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-400',
    cardBorder: 'border-l-violet-500'
  },
  { 
    clave: 'En la tienda', 
    nombre: 'En la Tienda', 
    icon: Store,
    color: 'border-brand-peach bg-brand-peach/5 text-brand-peach-pressed dark:text-brand-peach',
    cardBorder: 'border-l-brand-peach'
  },
  { 
    clave: 'Entregado', 
    nombre: 'Entregado', 
    icon: CheckCircle2,
    color: 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400',
    cardBorder: 'border-l-emerald-500'
  }
];

// Estados visibles en el tablero (oculta solo "Entregado" para archivar)
const ESTADOS_VISIBLES = ESTADOS.filter(e => e.clave !== 'Entregado');

// Estados visibles en el modal de cambio de estado (todos los estados disponibles)
const ESTADOS_MODAL = ESTADOS;

const LONG_PRESS_DURATION = 800;
const TOUCH_MOVE_THRESHOLD = 10;

function calcularDiasHabiles(fechaEntregaStr: string): number {
  if (!fechaEntregaStr) return 0;
  
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  const entrega = new Date(fechaEntregaStr + 'T00:00:00');
  entrega.setHours(0, 0, 0, 0);
  
  if (entrega.getTime() < hoy.getTime()) {
    const diffTime = entrega.getTime() - hoy.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
  
  let diasHabiles = 0;
  let temp = new Date(hoy.getTime());
  
  while (temp.getTime() < entrega.getTime()) {
    temp.setDate(temp.getDate() + 1);
    if (temp.getDay() !== 0) { // Excluir Domingo
      diasHabiles++;
    }
  }
  
  return diasHabiles;
}

function getColorUrgencia(diasHabiles: number): { border: string; label?: string } {
  if (diasHabiles < 0) {
    return { 
      border: 'border-l-red-700 dark:border-l-red-600', 
      label: '⚠️ Vencido' 
    };
  } else if (diasHabiles <= 2) {
    return { 
      border: 'border-l-red-500', 
      label: '🔴 1-2 días' 
    };
  } else if (diasHabiles <= 4) {
    return { 
      border: 'border-l-amber-500', 
      label: '🟡 3-4 días' 
    };
  } else {
    return { 
      border: 'border-l-emerald-500', 
      label: '🟢 5+ días' 
    };
  }
}

interface ModalPagoEntregaProps {
  pedido: Pedido;
  onConfirm: (monto: number, metodo: string, entregarSinPagoCompleto: boolean) => void;
  onCancel: () => void;
}

function ModalPagoEntrega({ pedido, onConfirm, onCancel }: ModalPagoEntregaProps) {
  const total = parseFloat(pedido.monto_total);
  const totalPagado = pedido.total_pagado ? parseFloat(pedido.total_pagado) : (total / 2);
  const saldoPendiente = pedido.saldo_pendiente ? parseFloat(pedido.saldo_pendiente) : (total - totalPagado);

  const [montoPago, setMontoPago] = useState<number | ''>(Math.max(0, saldoPendiente));
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [entregarSinPagoCompleto, setEntregarSinPagoCompleto] = useState<boolean>(false);

  const saldoRestante = Math.max(0, saldoPendiente - (montoPago === '' ? 0 : montoPago));
  const requiereAutorizacion = saldoRestante > 0;

  const handleConfirmar = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiereAutorizacion && !entregarSinPagoCompleto) {
      alert('Debes confirmar que autorizas la entrega sin pago completo para proceder.');
      return;
    }
    onConfirm(montoPago === '' ? 0 : montoPago, metodoPago, entregarSinPagoCompleto);
  };

  return (
    <Modal isOpen={true} onClose={onCancel} maxWidth="md">
      <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
        <div>
          <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">ENTREGA DE PEDIDO</span>
          <h3 id="modal-pago-title" className="font-display font-extrabold text-lg text-[var(--text-primary)] mt-0.5">
            Liquidar Saldo: {pedido.codigo_correlativo}
          </h3>
        </div>
        <button 
          onClick={onCancel}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleConfirmar}>
        <div className="p-6 space-y-4">
          {/* Detalle Financiero */}
          <div className="bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-default)] space-y-2 text-xs font-semibold">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>Total del Pedido:</span>
              <span>S/ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
              <span>Total Pagado (Adelanto/Abonos):</span>
              <span>S/ {totalPagado.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-brand-turquoise-pressed dark:text-brand-turquoise border-t border-[var(--border-subtle)] pt-2 font-bold text-sm">
              <span>Saldo Pendiente:</span>
              <span>S/ {saldoPendiente.toFixed(2)}</span>
            </div>
          </div>

          {/* Input de Monto a Pagar */}
          <div>
            <label htmlFor="monto-pago-input" className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Monto que Paga Ahora (S/)*
            </label>
            <div className="relative rounded-xl overflow-hidden border border-brand-turquoise bg-brand-turquoise/5 focus-within:ring-2 focus-within:ring-brand-turquoise/20">
              <span className="absolute left-3 top-2.5 text-brand-turquoise-pressed font-bold text-sm">S/</span>
              <input 
                type="number" 
                id="monto-pago-input"
                step="0.01"
                min={0}
                max={saldoPendiente}
                value={montoPago}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setMontoPago('');
                  } else {
                    const num = parseFloat(val) || 0;
                    setMontoPago(Math.min(saldoPendiente, num));
                  }
                }}
                onBlur={() => {
                  if (montoPago === '' || montoPago < 0) {
                    setMontoPago(saldoPendiente);
                  }
                }}
                className="w-full bg-transparent border-0 px-8 py-2 text-sm outline-none text-[var(--text-primary)] font-bold"
                required
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div className="floating-label-group">
            <select 
              id="metodo-pago-select"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Yape/Plin">Yape/Plin</option>
              <option value="Transferencia">Transferencia</option>
            </select>
            <label htmlFor="metodo-pago-select">Método de Pago</label>
          </div>

          {/* Checkbox para Entrega con Deuda */}
          {requiereAutorizacion && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 rounded-xl space-y-2 animate-fade-in">
              <div className="flex items-start gap-2 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span>Quedará un saldo pendiente de S/ {saldoRestante.toFixed(2)}</span>
                  <p className="text-[10px] font-semibold opacity-90 mt-0.5">El pedido pasará a "Cuentas por Cobrar" para el seguimiento del saldo.</p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold select-none border-t border-amber-500/10 pt-2 block">
                <input 
                  type="checkbox" 
                  checked={entregarSinPagoCompleto}
                  onChange={(e) => setEntregarSinPagoCompleto(e.target.checked)}
                  className="rounded-sm accent-amber-500 cursor-pointer"
                />
                <span>Autorizar entrega con saldo pendiente</span>
              </label>
            </div>
          )}
        </div>

        <div className="p-4 bg-[var(--bg-surface-raised)] border-t border-[var(--border-subtle)] flex justify-end gap-3">
          <button 
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-[var(--bg-muted)] hover:bg-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-all cursor-pointer border border-[var(--border-default)]"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
          >
            Confirmar Entrega
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function KanbanBoard() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [pedidoParaEntregar, setPedidoParaEntregar] = useState<Pedido | null>(null);

  const [draggedPedidoId, setDraggedPedidoId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const [touchSelectedId, setTouchSelectedId] = useState<string | null>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchDragRef = useRef<{ pedidoId: string; element: HTMLElement | null }>({ pedidoId: '', element: null });
  const ghostRef = useRef<HTMLElement | null>(null);

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await apiFetch('/pedidos/?activos=true');
      setPedidos(Array.isArray(data) ? data : (data.results || []));
    } catch (error: any) {
      setErrorMsg(error.message || 'No se pudo conectar al servidor backend.');
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, []);

  const handleCambiarEstado = useCallback((id: string, nuevoEstado: string) => {
    const pedidoOriginal = pedidos.find(p => p.id === id);
    if (!pedidoOriginal || pedidoOriginal.estado_actual === nuevoEstado) return;

    const currentUser = getStoredUser();
    const userRole = currentUser?.rol || 'VENDEDOR';
    const userName = currentUser?.nombre_completo || currentUser?.username || 'Sistema';

    // Validación para Operario (solo avanzar)
    if (userRole === 'OPERARIO') {
      const secuencia = ['Registrado', 'Espera material', 'En producción', 'En el taller', 'En la tienda', 'Entregado'];
      const idxAnterior = secuencia.indexOf(pedidoOriginal.estado_actual);
      const idxNuevo = secuencia.indexOf(nuevoEstado);
      if (idxNuevo <= idxAnterior) {
        alert('Como Operario del Taller solo puedes avanzar el estado del pedido, no retrocederlo.');
        return;
      }
    }

    if (nuevoEstado === 'Entregado' && userRole !== 'OPERARIO') {
      setPedidoParaEntregar(pedidoOriginal);
      return;
    }

    const estadoAnterior = pedidoOriginal.estado_actual;

    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado_actual: nuevoEstado } : p));
    if (selectedPedido && selectedPedido.id === id) {
      setSelectedPedido(prev => prev ? { ...prev, estado_actual: nuevoEstado } : null);
    }

    apiFetch(`/pedidos/${id}/cambiar-estado/`, {
      method: 'PATCH',
      body: JSON.stringify({
        estado: nuevoEstado,
        ejecutado_por: userName
      })
    }).catch(() => {
      console.error('Error al cambiar estado, revirtiendo...');
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado_actual: estadoAnterior } : p));
      if (selectedPedido && selectedPedido.id === id) {
        setSelectedPedido(prev => prev ? { ...prev, estado_actual: estadoAnterior } : null);
      }
    });
  }, [pedidos, selectedPedido]);

  const handleConfirmarEntrega = useCallback(async (montoPago: number, metodoPago: string, entregarSinPagoCompleto: boolean) => {
    if (!pedidoParaEntregar) return;

    const id = pedidoParaEntregar.id;
    const pedidoOriginal = pedidoParaEntregar;
    const currentUser = getStoredUser();
    const userName = currentUser?.nombre_completo || currentUser?.username || 'Sistema';

    setPedidos(prev => prev.filter(p => p.id !== id));
    setSelectedPedido(null);
    setPedidoParaEntregar(null);

    try {
      await apiFetch(`/pedidos/${id}/cambiar-estado/`, {
        method: 'PATCH',
        body: JSON.stringify({
          estado: 'Entregado',
          ejecutado_por: userName,
          monto_pago: montoPago,
          metodo_pago: metodoPago,
          notas_pago: entregarSinPagoCompleto 
            ? `Pago parcial en entrega de S/ ${montoPago.toFixed(2)}. Cliente se lleva el pedido con saldo pendiente.`
            : `Pago del saldo de entrega por S/ ${montoPago.toFixed(2)}.`
        })
      });
      alert(`Pedido entregado con éxito!`);
    } catch (error: any) {
      console.error(error);
      alert(`Error al entregar pedido: ${error.message}. Revirtiendo cambio.`);
      setPedidos(prev => [...prev, pedidoOriginal]);
    }
  }, [pedidoParaEntregar]);

  // DRAG AND DROP - DESKTOP
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>, pedido: Pedido) => {
    setDraggedPedidoId(pedido.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', pedido.id);
    const target = e.currentTarget;
    requestAnimationFrame(() => {
      target.style.opacity = '0.4';
    });
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedPedidoId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, estadoClave: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(estadoClave);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>, nuevoEstado: string) => {
    e.preventDefault();
    const pedidoId = e.dataTransfer.getData('text/plain');
    if (pedidoId) {
      const pedido = pedidos.find(p => p.id === pedidoId);
      if (pedido && pedido.estado_actual !== nuevoEstado) {
        handleCambiarEstado(pedidoId, nuevoEstado);
      }
    }
    setDraggedPedidoId(null);
    setDragOverColumn(null);
  }, [pedidos, handleCambiarEstado]);

  // TOUCH DRAG AND DROP
  const cleanupGhost = useCallback(() => {
    if (ghostRef.current) {
      document.body.removeChild(ghostRef.current);
      ghostRef.current = null;
    }
  }, []);

  const cancelTouchDrag = useCallback(() => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPos.current = null;
    touchDragRef.current = { pedidoId: '', element: null };
    setTouchSelectedId(null);
    setDraggedPedidoId(null);
    setDragOverColumn(null);
    cleanupGhost();
  }, [cleanupGhost]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>, pedido: Pedido) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchDragRef.current = { pedidoId: pedido.id, element: e.currentTarget };

    touchTimerRef.current = setTimeout(() => {
      setTouchSelectedId(pedido.id);
      setDraggedPedidoId(pedido.id);
      
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const ghost = document.createElement('div');
      ghost.className = 'kanban-drag-ghost';
      ghost.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top - 30}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        pointer-events: none;
        z-index: 9999;
        opacity: 0.9;
        transform: scale(1.03);
        border-radius: 12px;
        background: var(--bg-surface, #FFFFFF);
        border: 2px solid var(--color-brand-turquoise, #59BFCB);
        box-shadow: 0 10px 25px rgba(89, 191, 203, 0.25);
        transition: transform 0.1s ease;
      `;
      ghost.innerHTML = e.currentTarget.innerHTML;
      document.body.appendChild(ghost);
      ghostRef.current = ghost;
    }, LONG_PRESS_DURATION);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    
    if (touchTimerRef.current && touchStartPos.current) {
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      
      if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
        return;
      }
    }

    if (touchSelectedId && ghostRef.current) {
      e.preventDefault();

      const ghost = ghostRef.current;
      ghost.style.left = `${touch.clientX - ghost.offsetWidth / 2}px`;
      ghost.style.top = `${touch.clientY - ghost.offsetHeight - 20}px`;

      const elemUnderFinger = document.elementFromPoint(touch.clientX, touch.clientY);
      if (elemUnderFinger) {
        const columnEl = elemUnderFinger.closest('[data-kanban-column]');
        if (columnEl) {
          const targetEstado = columnEl.getAttribute('data-kanban-column');
          setDragOverColumn(targetEstado);
        } else {
          setDragOverColumn(null);
        }
      }
    }
  }, [touchSelectedId]);

  const handleTouchEnd = useCallback(() => {
    if (touchSelectedId && dragOverColumn) {
      const pedido = pedidos.find(p => p.id === touchSelectedId);
      if (pedido && pedido.estado_actual !== dragOverColumn) {
        handleCambiarEstado(touchSelectedId, dragOverColumn);
      }
    }
    cancelTouchDrag();
  }, [touchSelectedId, dragOverColumn, pedidos, handleCambiarEstado, cancelTouchDrag]);

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
      cleanupGhost();
    };
  }, [cleanupGhost]);

  // Loading state (Skeleton Loader)
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 pb-4" role="status" aria-live="polite">
        {[1, 2, 3, 4, 5].map((colIndex) => (
          <div key={colIndex} className="flex flex-col bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-4 rounded-2xl space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-28 skeleton"></div>
              <div className="h-5 w-6 rounded-full skeleton"></div>
            </div>
            <div className="space-y-3">
              {[1, 2].map((cardIndex) => (
                <div key={cardIndex} className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-xl space-y-3">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 skeleton"></div>
                    <div className="h-3 w-12 skeleton"></div>
                  </div>
                  <div className="h-4 w-32 skeleton"></div>
                  <div className="h-3 w-24 skeleton"></div>
                  <div className="border-t border-[var(--border-subtle)] mt-2 pt-2 space-y-1.5">
                    <div className="h-3 w-full skeleton"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Error de Conexión */}
      {errorMsg && (
        <div className="bg-amber-400/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm shadow-xs animate-fade-in" role="alert">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <strong className="font-semibold">Error de Conexión:</strong> {errorMsg}
            </div>
          </div>
          <button 
            onClick={fetchPedidos} 
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-all text-xs shrink-0 cursor-pointer shadow-sm"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Instrucción de Drag (solo visible cuando hay pedidos) */}
      {pedidos.length > 0 && (
        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2 px-1">
          <Lightbulb className="w-4 h-4 text-brand-turquoise shrink-0" />
          <span className="hidden sm:inline">Arrastra las tarjetas para cambiar su estado. En tablet, mantén presionado 1 segundo para seleccionar y luego arrastra o pulsa la columna destino.</span>
          <span className="sm:hidden">Mantén presionado 1 segundo para seleccionar y luego arrastra o pulsa la columna destino.</span>
        </div>
      )}

      {/* Grid del Tablero de Producción - 5 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5 pb-4">
        {ESTADOS_VISIBLES.map(col => {
          const pedidosEnCol = pedidos.filter(p => p.estado_actual === col.clave);
          const isDropTarget = dragOverColumn === col.clave && draggedPedidoId !== null;
          const draggedPedido = pedidos.find(p => p.id === draggedPedidoId);
          const isDragOrigin = draggedPedido?.estado_actual === col.clave;
          const StateIcon = col.icon;
          
          return (
            <div 
              key={col.clave}
              data-kanban-column={col.clave}
              onDragOver={(e) => handleDragOver(e, col.clave)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.clave)}
              onClick={() => {
                if (touchSelectedId) {
                  const pedido = pedidos.find(p => p.id === touchSelectedId);
                  if (pedido && pedido.estado_actual !== col.clave) {
                    handleCambiarEstado(touchSelectedId, col.clave);
                  }
                  cancelTouchDrag();
                }
              }}
              className={`
                flex flex-col min-w-0 bg-[var(--bg-surface-raised)] 
                border p-4 rounded-2xl transition-all duration-200
                ${isDropTarget && !isDragOrigin
                  ? 'border-brand-turquoise bg-brand-turquoise/5 ring-4 ring-brand-turquoise/15 scale-[1.01]'
                  : 'border-[var(--border-default)]'
                }
              `}
            >
              {/* Encabezado de Columna */}
              <div className="flex items-center justify-between mb-4 border-b border-[var(--border-subtle)] pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <StateIcon className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                  <h3 className="font-display font-bold text-sm text-[var(--text-primary)] truncate">{col.nombre}</h3>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-[var(--bg-muted)] text-[var(--text-secondary)] shrink-0 ml-2 border border-[var(--border-default)]">
                  {pedidosEnCol.length}
                </span>
              </div>

              {/* Lista de Tarjetas */}
              <div className="flex-1 space-y-3 min-h-[200px] lg:min-h-[300px] overflow-y-auto pr-0.5">
                {pedidosEnCol.length === 0 ? (
                  <div className={`
                    h-full min-h-[150px] flex flex-col items-center justify-center text-center p-6 
                    border-2 border-dashed rounded-xl text-xs transition-all duration-200
                    ${isDropTarget 
                      ? 'border-brand-turquoise text-brand-turquoise-pressed bg-brand-turquoise/5' 
                      : 'border-[var(--border-default)] text-[var(--text-muted)]'
                    }
                  `}>
                    <Move className="w-5 h-5 mb-2 opacity-50" />
                    {isDropTarget ? 'Soltar aquí' : 'Sin pedidos'}
                  </div>
                ) : (
                  pedidosEnCol.map(pedido => {
                    const isDragging = draggedPedidoId === pedido.id;
                    const isTouchSelected = touchSelectedId === pedido.id;
                    
                    // Colores de urgencia basados en días hábiles
                    let cardBorderClass = col.cardBorder;
                    let urgenciaBadge = null;
                    const aplicarUrgencia = ['Registrado', 'Espera material', 'En producción'].includes(col.clave);
                    
                    if (aplicarUrgencia) {
                      const dias = calcularDiasHabiles(pedido.fecha_entrega_acordada);
                      const urgencia = getColorUrgencia(dias);
                      cardBorderClass = urgencia.border;
                      if (urgencia.label) {
                        urgenciaBadge = (
                          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-[var(--bg-surface-raised)] text-[var(--text-secondary)] ml-2 border border-[var(--border-default)]">
                            {urgencia.label}
                          </span>
                        );
                      }
                    }

                    return (
                      <div 
                        key={pedido.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, pedido)}
                        onDragEnd={handleDragEnd}
                        onTouchStart={(e) => handleTouchStart(e, pedido)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={cancelTouchDrag}
                        onClick={(e) => {
                          e.stopPropagation();
                          
                          if (touchSelectedId) {
                            if (touchSelectedId === pedido.id) {
                              cancelTouchDrag();
                            } else {
                              const pedidoSeleccionado = pedidos.find(p => p.id === touchSelectedId);
                              if (pedidoSeleccionado && pedidoSeleccionado.estado_actual !== pedido.estado_actual) {
                                handleCambiarEstado(touchSelectedId, pedido.estado_actual);
                              }
                              cancelTouchDrag();
                            }
                          } else if (!draggedPedidoId) {
                            setSelectedPedido(pedido);
                          }
                        }}
                        className={`
                          bg-[var(--bg-surface)] border-y border-r border-l-[6px] p-4 rounded-xl shadow-xs 
                          hover:shadow-md transition-all cursor-grab active:cursor-grabbing group
                          select-none overflow-hidden ${cardBorderClass}
                          ${isDragging 
                            ? 'opacity-40 scale-95 border-brand-turquoise' 
                            : 'border-[var(--border-default)] hover:border-[var(--text-muted)]'
                          }
                          ${isTouchSelected 
                            ? 'ring-4 ring-brand-turquoise/20 border-brand-turquoise scale-[1.02] shadow-lg touch-none' 
                            : 'touch-pan-y'
                          }
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center min-w-0">
                            <span className="text-xs font-bold text-brand-turquoise-pressed dark:text-brand-turquoise font-mono tracking-tight shrink-0">
                              {pedido.codigo_correlativo}
                            </span>
                            {urgenciaBadge}
                          </div>
                          <span className="text-[10px] font-semibold text-[var(--text-muted)] shrink-0 ml-2">
                            {pedido.fecha_entrega_acordada}
                          </span>
                        </div>
                        
                        <h4 className="font-display font-bold text-sm text-[var(--text-primary)] group-hover:text-brand-turquoise transition-colors truncate">
                          {pedido.marca_nombre}
                        </h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1 truncate">
                          Pedido de: <span className="font-semibold text-[var(--text-primary)]">{pedido.solicitante_nombre}</span>
                        </p>

                        {/* Lista rápida de productos */}
                        <div className="border-t border-[var(--border-subtle)] mt-3 pt-2">
                          {pedido.detalles.map((det, idx) => (
                            <div key={idx} className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between gap-2 mt-1">
                              <span className="truncate min-w-0">{det.tipo_producto_nombre}</span>
                              <span className="font-bold text-[var(--text-primary)] shrink-0">
                                {det.cantidad} {det.unidad_medida === 'Millar' ? 'Mil' : det.unidad_medida === 'Ciento' ? 'Ciento' : 'Und.'}
                              </span>
                            </div>
                          ))}
                        </div>

                        {isTouchSelected && (
                          <div className="mt-2.5 text-center text-[10px] text-brand-turquoise-pressed dark:text-brand-turquoise font-bold animate-pulse flex items-center justify-center gap-1">
                            <Move className="w-3 h-3" /> Arrastra o toca destino
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal de Detalle de Pedido y Cambio de Estados - Con Accesibilidad */}
      <Modal isOpen={!!selectedPedido} onClose={() => setSelectedPedido(null)} maxWidth="2xl">
        {selectedPedido && (
          <>
            {/* Header del Modal */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-brand-turquoise-pressed dark:text-brand-turquoise font-mono bg-brand-turquoise/5 px-2.5 py-1 rounded-md border border-brand-turquoise/10">
                  {selectedPedido.codigo_correlativo}
                </span>
                <h3 id="modal-title" className="font-display font-extrabold text-xl mt-2 text-[var(--text-primary)]">
                  {selectedPedido.marca_nombre}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPedido(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
                aria-label="Cerrar detalles del pedido"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-default)]">
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Solicitado Por</span>
                  <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                    <User className="w-3.5 h-3.5 opacity-60" /> {selectedPedido.solicitante_nombre}
                  </p>
                  {selectedPedido.solicitante_telefono && (
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-1 font-medium">
                      <Phone className="w-3 h-3 opacity-60" /> {selectedPedido.solicitante_telefono}
                    </p>
                  )}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Fecha Límite</span>
                  <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 opacity-60" /> {selectedPedido.fecha_entrega_acordada}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Estado Actual</span>
                  <p className="text-sm mt-0.5">
                    <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-default)]">
                      {selectedPedido.estado_actual}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Total Acordado</span>
                  <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 mt-0.5">
                    <DollarSign className="w-3.5 h-3.5" /> {selectedPedido.monto_total}
                  </p>
                </div>
              </div>

              {/* Detalles de Productos */}
              <div>
                <h4 className="font-display font-bold text-xs text-[var(--text-secondary)] mb-3 uppercase tracking-wider">
                  Productos del Pedido
                </h4>
                <div className="space-y-3">
                  {selectedPedido.detalles.map((det, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-[var(--bg-surface)] border border-[var(--border-default)] p-4 rounded-xl shadow-xs">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-[var(--text-muted)] font-semibold">{det.categoria_nombre}</p>
                        <p className="font-bold text-sm text-[var(--text-primary)] truncate mt-0.5">{det.tipo_producto_nombre}</p>
                        
                        {/* Enlaces de Archivos Adjuntos */}
                        <div className="flex gap-4 mt-2.5">
                          {det.url_vectorial && (
                            <a 
                              href={det.url_vectorial} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-brand-turquoise-hover hover:text-brand-turquoise-pressed flex items-center gap-1.5 hover:underline"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" /> Diseño Vectorial
                            </a>
                          )}
                          {det.url_fotografia && (
                            <a 
                              href={det.url_fotografia} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-brand-lavender hover:text-brand-lavender-pressed flex items-center gap-1.5 hover:underline"
                            >
                              <Image className="w-3.5 h-3.5" /> Foto Muestra
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="font-bold text-sm text-[var(--text-primary)]">
                          {det.cantidad} {det.unidad_medida}s
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">S/ {det.precio_final_acordado}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Control de Transición de Estados del Pedido (Taller) */}
              <div className="border-t border-[var(--border-subtle)] pt-5">
                <h4 className="font-display font-bold text-xs text-[var(--text-primary)] mb-1 uppercase tracking-wider flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Cambiar Estado Físico del Pedido
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mb-4">
                  Presiona el estado al que quieres pasar el pedido. Los cambios se registran de forma automática.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ESTADOS_MODAL.map(est => {
                    const esActual = selectedPedido.estado_actual === est.clave;
                    const TargetIcon = est.icon;
                    return (
                      <button
                        key={est.clave}
                        onClick={() => handleCambiarEstado(selectedPedido.id, est.clave)}
                        className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border text-center transition-all cursor-pointer ${
                          esActual 
                            ? `${est.color} ring-4 ring-brand-turquoise/15 font-extrabold border-brand-turquoise`
                            : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-default)]'
                        }`}
                        aria-label={`Cambiar estado a ${est.nombre}`}
                      >
                        <TargetIcon className="w-4 h-4 mb-1" />
                        <span className="text-xs font-bold leading-tight">{est.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-[var(--bg-surface-raised)] border-t border-[var(--border-subtle)] flex justify-between items-center">
              <button 
                onClick={() => generarPdfPedidoV2(selectedPedido)}
                className="px-5 py-2.5 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                📄 Descargar Comprobante PDF
              </button>
              <button 
                onClick={() => setSelectedPedido(null)}
                className="px-5 py-2.5 bg-[var(--bg-muted)] hover:bg-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-all cursor-pointer border border-[var(--border-default)]"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Modal>

      {pedidoParaEntregar && (
        <ModalPagoEntrega 
          pedido={pedidoParaEntregar}
          onConfirm={handleConfirmarEntrega}
          onCancel={() => setPedidoParaEntregar(null)}
        />
      )}
    </div>
  );
}
