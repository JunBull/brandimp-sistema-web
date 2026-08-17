import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { 
  Search, 
  DollarSign, 
  User, 
  Calendar, 
  Plus, 
  Loader2, 
  Wallet, 
  Receipt, 
  History, 
  X, 
  AlertTriangle, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  SearchX, 
  RotateCcw 
} from 'lucide-react';
import Modal from './Modal';

interface Pago {
  id: string;
  monto: string;
  metodo_pago: string;
  tipo_pago: string;
  fecha: string;
  notas?: string;
}

interface PedidoConDeuda {
  id: string;
  codigo_correlativo: string;
  marca: string;
  marca_nombre: string;
  solicitante_nombre: string;
  solicitante_telefono?: string | null;
  fecha_entrega_acordada: string;
  estado_actual: string;
  monto_total: string;
  total_pagado: string;
  saldo_pendiente: string;
  pagos: Pago[];
}

export default function CuentasPorCobrar() {
  const [cuentas, setCuentas] = useState<PedidoConDeuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filtro, setFiltro] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<PedidoConDeuda | null>(null);

  // Estados del Formulario de Abono
  const [montoAbono, setMontoAbono] = useState<number | ''>(0);
  const [metodoAbono, setMetodoAbono] = useState('Efectivo');
  const [notasAbono, setNotasAbono] = useState('');
  const [registrando, setRegistrando] = useState(false);

  const fetchCuentas = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await apiFetch('/pedidos/cuentas-por-cobrar/');
      setCuentas(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErrorMsg(e.message || 'No se pudo conectar al servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  const handleOpenAbonoModal = (pedido: PedidoConDeuda) => {
    setSelectedPedido(pedido);
    setMontoAbono(parseFloat(pedido.saldo_pendiente));
    setMetodoAbono('Efectivo');
    setNotasAbono('');
  };

  const handleRegistrarAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;

    const abonoNum = montoAbono === '' ? 0 : montoAbono;
    if (abonoNum <= 0) {
      alert('El monto del abono debe ser mayor a 0.');
      return;
    }

    const saldoMax = parseFloat(selectedPedido.saldo_pendiente);
    if (abonoNum > saldoMax) {
      alert(`El abono no puede exceder el saldo pendiente de S/ ${saldoMax.toFixed(2)}.`);
      return;
    }

    try {
      setRegistrando(true);
      await apiFetch(`/pedidos/${selectedPedido.id}/pagos/`, {
        method: 'POST',
        body: JSON.stringify({
          monto: abonoNum,
          metodo_pago: metodoAbono,
          tipo_pago: 'Abono',
          notas: notasAbono
        })
      });

      alert('Abono registrado con éxito!');
      setSelectedPedido(null);
      fetchCuentas();
    } catch (err: any) {
      alert(err.message || 'Error de conexión.');
    } finally {
      setRegistrando(false);
    }
  };

  const cuentasFiltradas = cuentas.filter(c => 
    c.codigo_correlativo.toLowerCase().includes(filtro.toLowerCase()) ||
    c.marca_nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    c.solicitante_nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  const totalPendienteGeneral = cuentas.reduce((sum, c) => sum + parseFloat(c.saldo_pendiente), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alerta de Error de Conexión */}
      {errorMsg && (
        <div className="bg-amber-400/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-4 rounded-2xl flex items-center justify-between text-sm shadow-xs animate-fade-in" role="alert">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={fetchCuentas}
            className="flex items-center gap-1 font-semibold hover:underline cursor-pointer text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas de Resumen Financiero General */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-5 rounded-2xl h-24"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-5">
          <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Deuda Pendiente Total</span>
              <p className="text-xl font-extrabold text-red-600 dark:text-red-400 mt-0.5">S/ {totalPendienteGeneral.toFixed(2)}</p>
            </div>
          </div>
          <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-brand-turquoise/10 flex items-center justify-center text-brand-turquoise-pressed dark:text-brand-turquoise shrink-0">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Cuentas por Cobrar</span>
              <p className="text-xl font-extrabold text-[var(--text-primary)] mt-0.5">{cuentas.length} Pedidos</p>
            </div>
          </div>
          <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] p-5 rounded-2xl flex items-center gap-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <History className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Estado Financiero</span>
              <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {cuentas.length > 0 ? 'Activo con deudas' : '100% al día'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Buscador e Inputs de Control */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div>
            <h3 className="font-display font-extrabold text-base text-[var(--text-primary)]">Pedidos con Saldos Pendientes</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">Haz click en un pedido para registrar amortizaciones o abonos parciales.</p>
          </div>
        </div>

        {/* Campo de búsqueda */}
        <div className="relative max-w-md">
          <span className="absolute left-3.5 top-3 text-[var(--text-muted)]">
            <Search className="w-4 h-4" />
          </span>
          <input 
            type="text"
            placeholder="Buscar por código, marca o solicitante..."
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="w-full bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl py-2 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-brand-turquoise/25 focus:border-brand-turquoise focus:shadow-[0_0_15px_rgba(89,191,203,0.2)] transition-all text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium"
          />
          {filtro && (
            <button
              onClick={() => setFiltro('')}
              className="absolute right-3 top-2.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabla de Cuentas / Feedback de Carga / Estados Vacíos */}
        {loading ? (
          <div className="space-y-3 p-4 rounded-xl border border-[var(--border-default)] animate-pulse">
            <div className="h-10 bg-[var(--bg-surface-raised)] rounded-lg w-full"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-[var(--bg-surface-raised)] rounded-lg w-full"></div>
            ))}
          </div>
        ) : cuentas.length === 0 ? (
          /* Estado Vacío Absoluto: Todo Liquidado */
          <div className="text-center py-16 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-default)] rounded-2xl flex flex-col justify-center items-center p-6 bg-[var(--bg-surface-raised)]/30">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 border border-emerald-500/20">
              <CheckCircle className="w-8 h-8" />
            </div>
            <p className="font-display font-bold text-base text-[var(--text-primary)]">¡Todo al día! Sin cuentas pendientes</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
              No existen órdenes con saldo deudor. Todos los pedidos entregados han sido completamente liquidados.
            </p>
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          /* Estado Vacío por Filtro de Búsqueda */
          <div className="text-center py-12 text-[var(--text-muted)] text-sm border border-dashed border-[var(--border-default)] rounded-2xl flex flex-col justify-center items-center p-6 bg-[var(--bg-surface-raised)]/30">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-3 border border-amber-500/20">
              <SearchX className="w-6 h-6" />
            </div>
            <p className="font-display font-bold text-sm text-[var(--text-primary)]">
              No se encontraron coincidencias para "{filtro}"
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
              Verifica el código correlativo, nombre de marca o solicitante.
            </p>
            <button
              onClick={() => setFiltro('')}
              className="mt-4 px-4 py-2 rounded-xl bg-[var(--bg-surface-raised)] hover:bg-[var(--bg-muted)] border border-[var(--border-default)] text-xs font-bold text-brand-turquoise flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpiar Filtro de Búsqueda
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-default)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[var(--bg-surface-raised)] border-b border-[var(--border-default)] text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  <th className="p-4 font-bold">Código</th>
                  <th className="p-4 font-bold">Marca</th>
                  <th className="p-4 font-bold">Solicitante</th>
                  <th className="p-4 font-bold">F. Entrega</th>
                  <th className="p-4 text-right font-bold">Total</th>
                  <th className="p-4 text-right font-bold">Pagado</th>
                  <th className="p-4 text-right font-bold">Saldo Pendiente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-sm font-semibold">
                {cuentasFiltradas.map(c => {
                  const sPendiente = parseFloat(c.saldo_pendiente);
                  const isVencido = new Date(c.fecha_entrega_acordada + 'T00:00:00') < new Date();
                  
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => handleOpenAbonoModal(c)}
                      className="hover:bg-brand-turquoise/5 hover:scale-[1.001] transition-all duration-200 cursor-pointer group"
                    >
                      <td className="p-4 font-mono font-bold text-brand-turquoise-pressed dark:text-brand-turquoise group-hover:underline">
                        {c.codigo_correlativo}
                      </td>
                      <td className="p-4 text-[var(--text-primary)] font-bold">{c.marca_nombre}</td>
                      <td className="p-4">
                        <div className="text-[var(--text-primary)]">{c.solicitante_nombre}</div>
                        {c.solicitante_telefono && (
                          <div className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5">{c.solicitante_telefono}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 text-xs py-0.5 px-2 rounded-lg ${
                          isVencido 
                            ? 'animate-pulse bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold'
                            : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                        }`}>
                          <Calendar className="w-3 h-3" /> {c.fecha_entrega_acordada}
                        </span>
                      </td>
                      <td className="p-4 text-right text-[var(--text-secondary)]">S/ {parseFloat(c.monto_total).toFixed(2)}</td>
                      <td className="p-4 text-right text-emerald-600 dark:text-emerald-400">S/ {parseFloat(c.total_pagado).toFixed(2)}</td>
                      <td className="p-4 text-right text-red-600 dark:text-red-400 font-extrabold">
                        S/ {sPendiente.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Abono e Historial */}
      <Modal isOpen={!!selectedPedido} onClose={() => setSelectedPedido(null)} maxWidth="xl">
        {selectedPedido && (
          <>
            {/* Header del Modal */}
            <div className="p-6 border-b border-[var(--border-subtle)] flex justify-between items-center shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Historial y Abono</span>
                <h3 id="modal-abono-title" className="font-display font-extrabold text-lg text-[var(--text-primary)] mt-0.5">
                  Cuenta: {selectedPedido.codigo_correlativo} - {selectedPedido.marca_nombre}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedPedido(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-muted)] transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Resumen Financiero Actual */}
              <div className="grid grid-cols-3 gap-3 bg-[var(--bg-surface-raised)] p-4 rounded-2xl border border-[var(--border-default)] text-center">
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Total Pedido</span>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-0.5">S/ {parseFloat(selectedPedido.monto_total).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase font-extrabold">Total Cobrado</span>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">S/ {parseFloat(selectedPedido.total_pagado).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase font-extrabold">Saldo Restante</span>
                  <p className="text-sm font-extrabold text-red-600 dark:text-red-400 mt-0.5">S/ {parseFloat(selectedPedido.saldo_pendiente).toFixed(2)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Formulario de Registro de Abono */}
                <form onSubmit={handleRegistrarAbono} className="space-y-4">
                  <h4 className="font-display font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                    <Plus className="w-3.5 h-3.5 text-brand-turquoise" /> Registrar Nuevo Abono
                  </h4>

                  {/* Input de Monto */}
                  <div>
                    <label htmlFor="monto-abono-input" className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                      Monto del Abono (S/)*
                    </label>
                    <div className="relative rounded-xl overflow-hidden border border-brand-turquoise bg-brand-turquoise/5 focus-within:ring-2 focus-within:ring-brand-turquoise/20">
                      <span className="absolute left-3 top-2.5 text-brand-turquoise-pressed font-bold text-sm">S/</span>
                      <input 
                        type="number" 
                        id="monto-abono-input"
                        step="0.01"
                        min={0.01}
                        max={parseFloat(selectedPedido.saldo_pendiente)}
                        value={montoAbono}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setMontoAbono('');
                          } else {
                            const num = parseFloat(val) || 0;
                            const maxVal = parseFloat(selectedPedido.saldo_pendiente);
                            setMontoAbono(Math.min(maxVal, num));
                          }
                        }}
                        onBlur={() => {
                          if (montoAbono === '' || montoAbono <= 0) {
                            setMontoAbono(parseFloat(selectedPedido.saldo_pendiente));
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
                      id="metodo-abono-select"
                      value={metodoAbono}
                      onChange={(e) => setMetodoAbono(e.target.value)}
                    >
                      <option value="Efectivo">Efectivo</option>
                      <option value="Yape/Plin">Yape/Plin</option>
                      <option value="Transferencia">Transferencia</option>
                    </select>
                    <label htmlFor="metodo-abono-select">Método de Pago</label>
                  </div>

                  {/* Notas */}
                  <div className="floating-label-group">
                    <textarea 
                      id="notas-abono-input"
                      placeholder=" "
                      value={notasAbono}
                      onChange={(e) => setNotasAbono(e.target.value)}
                      rows={2}
                      className="resize-none"
                    />
                    <label htmlFor="notas-abono-input">Notas / Concepto (Opcional)</label>
                  </div>

                  <button 
                    type="submit"
                    disabled={registrando || montoAbono === '' || montoAbono <= 0}
                    className="w-full py-2.5 bg-brand-turquoise hover:bg-brand-turquoise-hover text-white font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {registrando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registrando...
                      </>
                    ) : (
                      <>
                        <DollarSign className="w-3.5 h-3.5" /> Procesar Abono
                      </>
                    )}
                  </button>
                </form>

                {/* Historial de Pagos */}
                <div className="space-y-4">
                  <h4 className="font-display font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5 border-b border-[var(--border-subtle)] pb-2">
                    <History className="w-3.5 h-3.5 text-brand-lavender" /> Historial de Pagos
                  </h4>

                  {selectedPedido.pagos.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)] text-xs border border-dashed border-[var(--border-default)] rounded-xl flex flex-col justify-center items-center">
                      <Clock className="w-6 h-6 mb-1.5 opacity-40" />
                      <p>No hay abonos registrados.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                      {selectedPedido.pagos.map((p, idx) => {
                        const dateObj = new Date(p.fecha);
                        const formattedDate = dateObj.toLocaleDateString('es-PE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div 
                            key={p.id || idx} 
                            className="bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] p-3 rounded-xl flex justify-between items-start text-xs font-semibold"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-[9px] font-extrabold py-0.5 px-1.5 rounded-sm ${
                                  p.tipo_pago === 'Adelanto'
                                    ? 'bg-blue-500/10 text-blue-600 border border-blue-500/10'
                                    : p.tipo_pago === 'Pago Entrega'
                                      ? 'bg-purple-500/10 text-purple-600 border border-purple-500/10'
                                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10'
                                }`}>
                                  {p.tipo_pago}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)] font-medium">{p.metodo_pago}</span>
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)] font-medium block mt-1">{formattedDate}</span>
                              {p.notas && (
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate max-w-[200px]" title={p.notas}>
                                  "{p.notas}"
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-extrabold text-[var(--text-primary)]">S/ {parseFloat(p.monto).toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-[var(--bg-surface-raised)] border-t border-[var(--border-subtle)] flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedPedido(null)}
                className="px-5 py-2 bg-[var(--bg-muted)] hover:bg-[var(--border-default)] text-[var(--text-primary)] font-bold rounded-xl text-xs transition-all cursor-pointer border border-[var(--border-default)]"
              >
                Cerrar
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
