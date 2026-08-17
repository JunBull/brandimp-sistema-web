import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { 
  ClipboardList, 
  Clock, 
  Cog, 
  Factory, 
  Store, 
  Sparkles, 
  AlertTriangle, 
  PlusCircle, 
  Package, 
  Tag, 
  CreditCard,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface PedidoUrgente {
  id: string;
  codigo_correlativo: string;
  marca_nombre: string;
  solicitante_nombre: string;
  fecha_entrega_acordada: string;
  estado_actual: string;
  monto_total: string;
  dias_restantes: number;
}

interface DashboardData {
  contadores_estado: Record<string, number>;
  pedidos_hoy: number;
  pedidos_urgentes: PedidoUrgente[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await apiFetch('/dashboard/');
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con la API de operaciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-[var(--bg-surface-raised)] rounded-2xl w-1/3"></div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-28 bg-[var(--bg-surface-raised)] rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-[var(--bg-surface-raised)] rounded-2xl"></div>
          <div className="h-64 bg-[var(--bg-surface-raised)] rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const contadores = data?.contadores_estado || {};
  const pedidosHoy = data?.pedidos_hoy || 0;
  const urgentes = data?.pedidos_urgentes || [];
  const totalActivos = Object.entries(contadores)
    .filter(([estado]) => estado !== 'Entregado')
    .reduce((acc, [_, count]) => acc + count, 0);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Banner de Error si falla la conexión */}
      {error && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="flex items-center gap-1 font-semibold hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* Encabezado Bienvenida */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-default)] shadow-md hover:shadow-lg transition-all duration-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-[var(--text-primary)]">
              Resumen Operativo
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-brand-turquoise/10 text-brand-turquoise border border-brand-turquoise/20">
              Brandimp V1.0
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Gestión comercial y control en tiempo real de la producción.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs">
            <TrendingUp className="w-4 h-4 text-brand-turquoise" />
            <span className="text-[var(--text-secondary)] font-medium">Pedidos Activos:</span>
            <span className="font-bold text-[var(--text-primary)] text-sm">{totalActivos}</span>
          </div>
          <a
            href="/nuevo-pedido"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-turquoise to-brand-lavender text-white font-bold text-xs shadow-md hover:opacity-95 transition-all hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" /> Nuevo Pedido
          </a>
        </div>
      </div>

      {/* Grid Tarjetas de Estado */}
      <div>
        <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
          Estado de la Producción
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* 1. Registrado */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-turquoise/60 hover:shadow-[0_4px_20px_rgba(89,191,203,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Registrados</span>
              <div className="p-2 rounded-xl bg-brand-turquoise/10 text-brand-turquoise">
                <ClipboardList className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-[var(--text-primary)]">
                {contadores['Registrado'] || 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">pedidos pendientes</span>
            </div>
          </div>

          {/* 2. Espera Material */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-amber-500/60 hover:shadow-[0_4px_20px_rgba(245,158,11,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Espera Material</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-[var(--text-primary)]">
                {contadores['Espera material'] || 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">en espera</span>
            </div>
          </div>

          {/* 3. En producción */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-lavender/60 hover:shadow-[0_4px_20px_rgba(148,120,179,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">En Producción</span>
              <div className="p-2 rounded-xl bg-brand-lavender/10 text-brand-lavender">
                <Cog className="w-4 h-4 animate-spin-slow" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-[var(--text-primary)]">
                {contadores['En producción'] || 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">en proceso</span>
            </div>
          </div>

          {/* 4. En el Taller */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-peach/60 hover:shadow-[0_4px_20px_rgba(247,193,179,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">En el Taller</span>
              <div className="p-2 rounded-xl bg-brand-peach/10 text-brand-peach">
                <Factory className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-[var(--text-primary)]">
                {contadores['En el taller'] || 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">listos en taller</span>
            </div>
          </div>

          {/* 5. En la Tienda */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-emerald-500/60 hover:shadow-[0_4px_20px_rgba(16,185,129,0.18)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">En la Tienda</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-[var(--text-primary)]">
                {contadores['En la tienda'] || 0}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">listos para entrega</span>
            </div>
          </div>

          {/* 6. Pedidos Hoy */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xs flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:scale-[1.01] hover:border-brand-turquoise/60 hover:shadow-[0_4px_20px_rgba(89,191,203,0.22)] bg-gradient-to-br from-[var(--bg-surface)] to-brand-turquoise/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Creados Hoy</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="font-display text-2xl font-black text-brand-turquoise">
                {pedidosHoy}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">órdenes del día</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal: Pedidos Urgentes + Accesos Directos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pedidos Urgentes (2 cols) */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-default)] shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Pedidos Urgentes / Próximos a Vencer
                </h2>
                {urgentes.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                    {urgentes.length}
                  </span>
                )}
              </div>
              <a 
                href="/pedidos" 
                className="text-xs font-semibold text-brand-turquoise hover:underline flex items-center gap-1"
              >
                Ver todos <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {urgentes.length === 0 ? (
              <div className="p-8 text-center bg-[var(--bg-muted)] rounded-2xl border border-[var(--border-subtle)] my-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <p className="font-semibold text-sm text-[var(--text-primary)]">¡Todo al día!</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">No hay pedidos urgentes o con fecha vencida en este momento.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentes.map((u) => {
                  let badgeBg = 'bg-amber-500/10 text-amber-600 border-amber-500/30';
                  let statusText = `Próximo (${u.dias_restantes} d)`;

                  if (u.dias_restantes < 0) {
                    badgeBg = 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30 font-extrabold';
                    statusText = `⚠️ VENCIDO (${Math.abs(u.dias_restantes)} d)`;
                  } else if (u.dias_restantes === 0) {
                    badgeBg = 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 font-bold';
                    statusText = '🔴 ENTREGA HOY';
                  }

                  return (
                    <a
                      key={u.id}
                      href={`/pedidos?id=${u.id}`}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] transition-all hover:scale-[1.005] group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xs text-brand-turquoise group-hover:border-brand-turquoise">
                          📦
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-brand-turquoise">
                              {u.codigo_correlativo}
                            </span>
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                              — {u.marca_nombre}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            Solicitante: {u.solicitante_nombre} • Estado: <span className="font-medium text-[var(--text-secondary)]">{u.estado_actual}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 text-xs rounded-xl border ${badgeBg}`}>
                          {statusText}
                        </span>
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Accesos Directos (1 col) */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-default)] shadow-md hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[var(--text-primary)] mb-4">
              Accesos Directos
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {/* Nuevo Pedido */}
              <a
                href="/nuevo-pedido"
                className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-brand-turquoise/10 to-brand-turquoise/5 border border-brand-turquoise/30 hover:border-brand-turquoise transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-turquoise text-white shadow-sm">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-brand-turquoise">
                      Registrar Nuevo Pedido
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Alta rápida de órdenes comerciales</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-brand-turquoise group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Pedidos */}
              <a
                href="/pedidos"
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] hover:border-brand-lavender transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-lavender text-white shadow-sm">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-brand-lavender">
                      Gestión de Pedidos
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Vista Híbrida (Tabla / Kanban)</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Marcas */}
              <a
                href="/marcas"
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] hover:border-brand-peach transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-peach text-white shadow-sm">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-brand-peach">
                      Marcas e Historial
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Consulta de clientes y precios acordados</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </a>

              {/* Cuentas por Cobrar */}
              <a
                href="/cuentas-por-cobrar"
                className="flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-muted)] border border-[var(--border-subtle)] hover:border-emerald-500 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--text-primary)] group-hover:text-emerald-500">
                      Cuentas por Cobrar
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Saldos pendientes y liquidaciones</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
