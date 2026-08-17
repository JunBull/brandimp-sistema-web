import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Loader2, 
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react';
import Modal from './Modal';
import ButtonPremium from './ButtonPremium';
import { showToast } from './Toast';

interface Producto {
  id: string;
  nombre: string;
  precio_millar: string | null;
  precio_ciento: string | null;
  precio_unidad: string | null;
  activo?: boolean;
  tamanos_asignados?: string[];
  colores_asignados?: string[];
}

interface Tamano {
  id: string;
  categoria: string;
  nombre: string;
  unidad_medida: string;
  orden: number;
}

interface ColorProducto {
  id: string;
  categoria: string;
  nombre: string;
  codigo_hex: string | null;
  orden: number;
}

interface Categoria {
  id: string;
  nombre: string;
  productos: Producto[];
  tamanos?: Tamano[];
  colores?: ColorProducto[];
}

export default function CatalogoConfig() {
  const [catalogo, setCatalogo] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarOcultos, setMostrarOcultos] = useState(false);

  // Modal nueva categoría
  const [showModalCat, setShowModalCat] = useState(false);
  const [nuevoCatNombre, setNuevoCatNombre] = useState('');
  const [creandoCat, setCreandoCat] = useState(false);

  // Modal nuevo producto
  const [showModalProd, setShowModalProd] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [nuevoProdNombre, setNuevoProdNombre] = useState('');
  const [nuevoPrecioMillar, setNuevoPrecioMillar] = useState('');
  const [nuevoPrecioCiento, setNuevoPrecioCiento] = useState('');
  const [nuevoPrecioUnidad, setNuevoPrecioUnidad] = useState('');
  const [creandoProd, setCreandoProd] = useState(false);

  // Modal características por categoría
  const [showModalConfigCat, setShowModalConfigCat] = useState(false);
  const [activeCatTab, setActiveCatTab] = useState<'tamanos' | 'colores'>('tamanos');
  const [selectedCatConfig, setSelectedCatConfig] = useState<Categoria | null>(null);

  // Modal características por producto
  const [showModalProdConfig, setShowModalProdConfig] = useState(false);
  const [activeProdConfigTab, setActiveProdConfigTab] = useState<'tamanos' | 'colores'>('tamanos');
  const [selectedProdConfig, setSelectedProdConfig] = useState<Producto | null>(null);
  const [categoriaOfProdConfig, setCategoriaOfProdConfig] = useState<Categoria | null>(null);
  const [prodConfigTamanos, setProdConfigTamanos] = useState<string[]>([]);
  const [prodConfigColores, setProdConfigColores] = useState<string[]>([]);
  const [selectedTamanoToAdd, setSelectedTamanoToAdd] = useState<string>('');
  const [selectedColorToAdd, setSelectedColorToAdd] = useState<string>('');
  const [guardandoProdConfig, setGuardandoProdConfig] = useState(false);

  // Formulario nuevo tamaño
  const [nuevoSizeNombre, setNuevoSizeNombre] = useState('');
  const [nuevoSizeUnidad, setNuevoSizeUnidad] = useState('pulgadas');
  const [agregandoSize, setAgregandoSize] = useState(false);

  // Formulario nuevo color
  const [nuevoColorNombre, setNuevoColorNombre] = useState('');
  const [nuevoColorHex, setNuevoColorHex] = useState('#59BFCB');
  const [agregandoColor, setAgregandoColor] = useState(false);

  const fetchCatalogo = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<Categoria[]>('/categorias/todos-completos/');
      setCatalogo(Array.isArray(data) ? data : []);
    } catch (e) {
      // Fallback en caso de error
      try {
        const categoriasRaw = await apiFetch<Categoria[]>('/categorias/');
        const fullCatalogo = await Promise.all(
          (Array.isArray(categoriasRaw) ? categoriasRaw : []).map(cat =>
            apiFetch<Categoria>(`/categorias/${cat.id}/completo/`).catch(() => ({ ...cat, productos: [], tamanos: [], colores: [] }))
          )
        );
        setCatalogo(fullCatalogo);
      } catch (err) {
        setCatalogo([]);
        showToast({ type: 'error', title: 'Error', message: 'No se pudo conectar con el catálogo del servidor.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalogo();
  }, []);

  const handleCrearCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCatNombre.trim()) return;

    try {
      setCreandoCat(true);
      await apiFetch('/categorias/', {
        method: 'POST',
        body: JSON.stringify({ nombre: nuevoCatNombre.trim() })
      });
      
      await fetchCatalogo();
      setShowModalCat(false);
      setNuevoCatNombre('');
      showToast({ type: 'success', title: 'Categoría Creada', message: 'Categoría guardada con éxito.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo registrar la categoría.' });
    } finally {
      setCreandoCat(false);
    }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatId || !nuevoProdNombre.trim()) return;

    const pMillar = nuevoPrecioMillar.trim() ? parseFloat(nuevoPrecioMillar) : null;
    const pCiento = nuevoPrecioCiento.trim() ? parseFloat(nuevoPrecioCiento) : null;
    const pUnidad = nuevoPrecioUnidad.trim() ? parseFloat(nuevoPrecioUnidad) : null;

    try {
      setCreandoProd(true);
      await apiFetch('/tipos-producto/', {
        method: 'POST',
        body: JSON.stringify({
          categoria: selectedCatId,
          nombre: nuevoProdNombre.trim(),
          precio_millar: pMillar,
          precio_ciento: pCiento,
          precio_unidad: pUnidad
        })
      });

      await fetchCatalogo();
      setShowModalProd(false);
      setNuevoProdNombre('');
      setNuevoPrecioMillar('');
      setNuevoPrecioCiento('');
      setNuevoPrecioUnidad('');
      showToast({ type: 'success', title: 'Producto Creado', message: 'Producto guardado con éxito.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo registrar el tipo de producto.' });
    } finally {
      setCreandoProd(false);
    }
  };

  const handleToggleProductActive = async (prod: Producto) => {
    try {
      const nuevoEstado = prod.activo === false ? true : false;
      await apiFetch(`/tipos-producto/${prod.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: nuevoEstado })
      });
      await fetchCatalogo();
      showToast({ 
        type: 'info', 
        title: 'Estado Actualizado', 
        message: `${prod.nombre} estado modificado.` 
      });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'Error al cambiar el estado del producto.' });
    }
  };

  const handleEliminarProducto = async (prod: Producto) => {
    if (!confirm(`¿Seguro de eliminar el producto "${prod.nombre}"?`)) return;

    try {
      await apiFetch(`/tipos-producto/${prod.id}/`, { method: 'DELETE' });
      await fetchCatalogo();
      showToast({ type: 'info', title: 'Producto Eliminado', message: 'Producto removido exitosamente.' });
    } catch (err) {
      showToast({ type: 'error', title: 'Error', message: 'No se pudo eliminar el producto.' });
    }
  };

  // CONFIGURACIÓN DE CARACTERÍSTICAS (TAMAÑOS Y COLORES POR CATEGORÍA)
  const handleOpenConfigCat = (cat: Categoria) => {
    setSelectedCatConfig(cat);
    setActiveCatTab('tamanos');
    setShowModalConfigCat(true);
  };

  const handleAgregarSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatConfig || !nuevoSizeNombre.trim()) return;

    try {
      setAgregandoSize(true);
      await apiFetch('/tamanos/', {
        method: 'POST',
        body: JSON.stringify({
          categoria: selectedCatConfig.id,
          nombre: nuevoSizeNombre.trim(),
          unidad_medida: nuevoSizeUnidad,
          orden: selectedCatConfig.tamanos?.length || 0
        })
      });

      setNuevoSizeNombre('');
      try {
        const catComp = await apiFetch(`/categorias/${selectedCatConfig.id}/completo/`);
        setSelectedCatConfig(catComp);
      } catch (e) {}
      fetchCatalogo();
      showToast({ type: 'success', title: 'Dimensión Agregada', message: 'Dimensión registrada con éxito.' });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Error al agregar dimensión/tamaño.' });
    } finally {
      setAgregandoSize(false);
    }
  };

  const handleEliminarSize = async (sizeId: string) => {
    if (!confirm('¿Seguro de eliminar este tamaño/dimensión?')) return;
    if (!selectedCatConfig) return;

    try {
      await apiFetch(`/tamanos/${sizeId}/`, { method: 'DELETE' });
      try {
        const catComp = await apiFetch(`/categorias/${selectedCatConfig.id}/completo/`);
        setSelectedCatConfig(catComp);
      } catch (e) {}
      fetchCatalogo();
      showToast({ type: 'info', title: 'Dimensión Removida', message: 'Dimensión eliminada correctamente.' });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Error al eliminar tamaño.' });
    }
  };

  const handleAgregarColor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCatConfig || !nuevoColorNombre.trim()) return;

    try {
      setAgregandoColor(true);
      await apiFetch('/colores-producto/', {
        method: 'POST',
        body: JSON.stringify({
          categoria: selectedCatConfig.id,
          nombre: nuevoColorNombre.trim(),
          codigo_hex: nuevoColorHex,
          orden: selectedCatConfig.colores?.length || 0
        })
      });

      setNuevoColorNombre('');
      try {
        const catComp = await apiFetch(`/categorias/${selectedCatConfig.id}/completo/`);
        setSelectedCatConfig(catComp);
      } catch (e) {}
      fetchCatalogo();
      showToast({ type: 'success', title: 'Color Agregado', message: 'Color registrado con éxito.' });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Error al agregar color.' });
    } finally {
      setAgregandoColor(false);
    }
  };

  const handleEliminarColor = async (colorId: string) => {
    if (!confirm('¿Seguro de eliminar este color?')) return;
    if (!selectedCatConfig) return;

    try {
      await apiFetch(`/colores-producto/${colorId}/`, { method: 'DELETE' });
      try {
        const catComp = await apiFetch(`/categorias/${selectedCatConfig.id}/completo/`);
        setSelectedCatConfig(catComp);
      } catch (e) {}
      fetchCatalogo();
      showToast({ type: 'info', title: 'Color Removido', message: 'Color eliminado correctamente.' });
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Error al eliminar color.' });
    }
  };

  // --- HANDLERS PARA CARACTERÍSTICAS POR PRODUCTO ---
  const handleOpenProdConfig = (cat: Categoria, prod: Producto) => {
    setCategoriaOfProdConfig(cat);
    setSelectedProdConfig(prod);
    setProdConfigTamanos(prod.tamanos_asignados || []);
    setProdConfigColores(prod.colores_asignados || []);
    setSelectedTamanoToAdd('');
    setSelectedColorToAdd('');
    setShowModalProdConfig(true);
  };

  const handleAgregarTamanoProd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTamanoToAdd) return;
    if (prodConfigTamanos.includes(selectedTamanoToAdd)) {
      showToast({ type: 'warning', title: 'Dimensión Ya Agregada', message: 'Esa dimensión ya está asignada al producto.' });
      return;
    }
    setProdConfigTamanos(prev => [...prev, selectedTamanoToAdd]);
    setSelectedTamanoToAdd('');
  };

  const handleEliminarTamanoProd = (tamanoId: string) => {
    setProdConfigTamanos(prev => prev.filter(id => id !== tamanoId));
  };

  const handleAgregarColorProd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedColorToAdd) return;
    if (prodConfigColores.includes(selectedColorToAdd)) {
      showToast({ type: 'warning', title: 'Color Ya Agregado', message: 'Ese color ya está asignado al producto.' });
      return;
    }
    setProdConfigColores(prev => [...prev, selectedColorToAdd]);
    setSelectedColorToAdd('');
  };

  const handleEliminarColorProd = (colorId: string) => {
    setProdConfigColores(prev => prev.filter(id => id !== colorId));
  };

  const handleGuardarProdConfig = async () => {
    if (!selectedProdConfig || !categoriaOfProdConfig) return;

    try {
      setGuardandoProdConfig(true);
      await apiFetch(`/tipos-producto/${selectedProdConfig.id}/guardar-asignaciones/`, {
        method: 'POST',
        body: JSON.stringify({
          tamanos_ids: prodConfigTamanos,
          colores_ids: prodConfigColores
        })
      });

      showToast({ type: 'success', title: 'Asignaciones Guardadas', message: `Características actualizadas para ${selectedProdConfig.nombre}.` });
      setShowModalProdConfig(false);
      fetchCatalogo();
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'No se pudieron guardar las asignaciones.' });
    } finally {
      setGuardandoProdConfig(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-20 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)]"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-[var(--bg-surface-raised)] rounded-lg w-1/4"></div>
                <div className="h-8 bg-[var(--bg-surface-raised)] rounded-lg w-1/5"></div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-12 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
                <div className="h-12 bg-[var(--bg-surface-raised)] rounded-xl w-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-default)] shadow-sm">
        <div>
          <h1 className="text-xl font-bold font-display text-[var(--text-primary)] flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#59BFCB]/15 flex items-center justify-center text-[#59BFCB]">
              <FolderOpen className="w-5 h-5" />
            </div>
            Catálogo y Precios de Referencia
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 ml-11">
            Gestión de categorías, precios sugeridos y características informativas para los comprobantes PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setMostrarOcultos(!mostrarOcultos)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
              mostrarOcultos 
                ? 'bg-[var(--bg-surface-raised)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-muted)]' 
                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-raised)]'
            }`}
          >
            {mostrarOcultos ? <Eye className="w-4 h-4 text-[#59BFCB]" /> : <EyeOff className="w-4 h-4 text-[var(--text-muted)]" />}
            {mostrarOcultos ? 'Ocultar Inactivos' : 'Mostrar Ocultos'}
          </button>

          <ButtonPremium
            onClick={() => setShowModalCat(true)}
            hasGradient
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Nueva Categoría
          </ButtonPremium>
        </div>
      </div>

      {/* LISTA DE CATEGORÍAS */}
      <div className="space-y-6">
        {catalogo.length === 0 ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center rounded-2xl border border-dashed border-[var(--border-default)] text-[var(--text-muted)] space-y-3 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-[#59BFCB]/10 flex items-center justify-center text-[#59BFCB]">
              <FolderOpen className="w-8 h-8 opacity-60" />
            </div>
            <p className="text-sm font-bold text-[var(--text-primary)]">No hay categorías registradas en el catálogo</p>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm">Haz clic en "Nueva Categoría" para comenzar a configurar productos y listas de precios.</p>
            <ButtonPremium
              onClick={() => setShowModalCat(true)}
              hasGradient
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Crear Primera Categoría
            </ButtonPremium>
          </div>
        ) : (
          catalogo.map(cat => {
            const productosVisibles = cat.productos.filter(p => mostrarOcultos || p.activo !== false);

            return (
              <div key={cat.id} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-default)] shadow-sm overflow-hidden transition-all hover:border-[var(--border-default)]">
                {/* ENCABEZADO DE CATEGORÍA */}
                <div className="bg-[var(--bg-surface-raised)] px-6 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-lg font-bold font-display text-[var(--text-primary)]">
                        {cat.nombre}
                      </h2>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#59BFCB]/15 text-[#59BFCB] font-extrabold">
                        {cat.productos.length} {cat.productos.length === 1 ? 'producto' : 'productos'}
                      </span>
                    </div>
                    
                    {/* Badges de características configuradas */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      {cat.tamanos && cat.tamanos.length > 0 && (
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-muted)] px-2.5 py-0.5 rounded-md border border-[var(--border-subtle)]">
                          📏 {cat.tamanos.length} dimensiones
                        </span>
                      )}
                      {cat.colores && cat.colores.length > 0 && (
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-muted)] px-2.5 py-0.5 rounded-md border border-[var(--border-subtle)]">
                          🎨 {cat.colores.length} colores
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleOpenConfigCat(cat)}
                      className="px-3.5 py-2 text-xs font-bold text-[#9478B3] bg-[#9478B3]/10 hover:bg-[#9478B3]/20 border border-[#9478B3]/30 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Características ({cat.tamanos?.length || 0} dim, {cat.colores?.length || 0} col)
                    </button>

                    <button
                      onClick={() => {
                        setSelectedCatId(cat.id);
                        setShowModalProd(true);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-[#59BFCB] bg-[#59BFCB]/10 hover:bg-[#59BFCB]/20 border border-[#59BFCB]/30 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Agregar Producto
                    </button>
                  </div>
                </div>

                {/* TABLA DE PRODUCTOS */}
                <div className="divide-y divide-[var(--border-subtle)]">
                  {productosVisibles.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-muted)] font-medium flex flex-col items-center justify-center space-y-2">
                      <p>No hay productos activos visibles en esta categoría.</p>
                      <button
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          setShowModalProd(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[var(--bg-muted)] hover:bg-[var(--bg-surface-raised)] border border-[var(--border-default)] text-xs font-bold text-[#59BFCB] cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Agregar primer producto a {cat.nombre}
                      </button>
                    </div>
                  ) : (
                    productosVisibles.map(prod => (
                      <div 
                        key={prod.id} 
                        className={`p-4 md:px-6 flex flex-wrap items-center justify-between gap-4 hover:bg-[var(--bg-surface-raised)] transition ${
                          prod.activo === false ? 'opacity-50 bg-[var(--bg-muted)]/50' : ''
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                            {prod.nombre}
                            {prod.activo === false && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                                Inactivo
                              </span>
                            )}
                          </div>
                          
                          {/* Precios referenciales */}
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                            <span>Millar: <strong className="text-[var(--text-primary)] font-bold">{prod.precio_millar ? `S/ ${parseFloat(prod.precio_millar).toFixed(2)}` : 'N/A'}</strong></span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span>Ciento: <strong className="text-[var(--text-primary)] font-bold">{prod.precio_ciento ? `S/ ${parseFloat(prod.precio_ciento).toFixed(2)}` : 'N/A'}</strong></span>
                            <span className="text-[var(--text-muted)]">•</span>
                            <span>Unidad: <strong className="text-[var(--text-primary)] font-bold">{prod.precio_unidad ? `S/ ${parseFloat(prod.precio_unidad).toFixed(2)}` : 'N/A'}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenProdConfig(cat, prod)}
                            title="Configurar Tamaños y Colores específicos de este producto"
                            className="px-3 py-1.5 text-xs font-bold text-[#59BFCB] bg-[#59BFCB]/10 hover:bg-[#59BFCB]/20 border border-[#59BFCB]/30 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>
                              {((prod.tamanos_asignados && prod.tamanos_asignados.length > 0) || (prod.colores_asignados && prod.colores_asignados.length > 0))
                                ? `${prod.tamanos_asignados?.length || 0} dim, ${prod.colores_asignados?.length || 0} col`
                                : 'Todas las caract.'
                              }
                            </span>
                          </button>
                          <button
                            onClick={() => handleToggleProductActive(prod)}
                            title={prod.activo === false ? "Activar producto" : "Desactivar producto"}
                            className="p-2 text-[var(--text-muted)] hover:text-[#59BFCB] hover:bg-[#59BFCB]/10 rounded-xl transition cursor-pointer"
                          >
                            {prod.activo === false ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#59BFCB]" />}
                          </button>
                          <button
                            onClick={() => handleEliminarProducto(prod)}
                            title="Eliminar producto"
                            className="p-2 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL CREAR CATEGORÍA */}
      <Modal isOpen={showModalCat} onClose={() => setShowModalCat(false)} title="Nueva Categoría">
        <form onSubmit={handleCrearCategoria} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              value={nuevoCatNombre}
              onChange={e => setNuevoCatNombre(e.target.value)}
              placeholder="Ej. Bolsas, Etiquetas, Cajas, Cuero..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              type="button"
              variant="outline"
              onClick={() => setShowModalCat(false)}
            >
              Cancelar
            </ButtonPremium>
            <ButtonPremium
              type="submit"
              isLoading={creandoCat}
              hasGradient
            >
              Guardar Categoría
            </ButtonPremium>
          </div>
        </form>
      </Modal>

      {/* MODAL CREAR PRODUCTO */}
      <Modal isOpen={showModalProd} onClose={() => setShowModalProd(false)} title="Nuevo Tipo de Producto">
        <form onSubmit={handleCrearProducto} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Nombre del Producto *
            </label>
            <input
              type="text"
              value={nuevoProdNombre}
              onChange={e => setNuevoProdNombre(e.target.value)}
              placeholder="Ej. Bolsas Kraft con asa, Etiquetas satinadas..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Precio Millar (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevoPrecioMillar}
                onChange={e => setNuevoPrecioMillar(e.target.value)}
                placeholder="120.00"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Precio Ciento (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevoPrecioCiento}
                onChange={e => setNuevoPrecioCiento(e.target.value)}
                placeholder="15.00"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Precio Unidad (S/)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={nuevoPrecioUnidad}
                onChange={e => setNuevoPrecioUnidad(e.target.value)}
                placeholder="0.20"
                className="w-full px-3 py-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring"
              />
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] italic">
            Los precios referenciales sirven como sugerencia inicial al cotizar. El precio final siempre es editable.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              type="button"
              variant="outline"
              onClick={() => setShowModalProd(false)}
            >
              Cancelar
            </ButtonPremium>
            <ButtonPremium
              type="submit"
              isLoading={creandoProd}
              hasGradient
            >
              Guardar Producto
            </ButtonPremium>
          </div>
        </form>
      </Modal>

      {/* MODAL CONFIGURACIÓN DE CARACTERÍSTICAS DE CATEGORÍA */}
      <Modal 
        isOpen={showModalConfigCat} 
        onClose={() => setShowModalConfigCat(false)} 
        title={`Características: ${selectedCatConfig?.nombre || ''}`}
      >
        <div className="space-y-5">
          {/* TABS */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveCatTab('tamanos')}
              className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeCatTab === 'tamanos'
                  ? 'border-[#59BFCB] text-[#59BFCB]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              📏 Tamaños / Dimensiones ({selectedCatConfig?.tamanos?.length || 0})
            </button>
            <button
              onClick={() => setActiveCatTab('colores')}
              className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeCatTab === 'colores'
                  ? 'border-[#59BFCB] text-[#59BFCB]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              🎨 Colores del Material ({selectedCatConfig?.colores?.length || 0})
            </button>
          </div>

          {/* TAB TAMAÑOS */}
          {activeCatTab === 'tamanos' && (
            <div className="space-y-4 pt-1">
              <form onSubmit={handleAgregarSize} className="flex gap-3 items-end bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Dimensión / Tamaño
                  </label>
                  <input
                    type="text"
                    value={nuevoSizeNombre}
                    onChange={e => setNuevoSizeNombre(e.target.value)}
                    placeholder="Ej: 12x17, 14x20 o Ancho 2cm"
                    className="w-full px-3.5 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Unidad
                  </label>
                  <select
                    value={nuevoSizeUnidad}
                    onChange={e => setNuevoSizeUnidad(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none"
                  >
                    <option value="pulgadas">Pulgadas</option>
                    <option value="cm">cm</option>
                  </select>
                </div>
                <ButtonPremium
                  type="submit"
                  isLoading={agregandoSize}
                  hasGradient
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Agregar
                </ButtonPremium>
              </form>

              <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                {!selectedCatConfig?.tamanos || selectedCatConfig.tamanos.length === 0 ? (
                  <p className="p-6 text-center text-xs text-[var(--text-muted)] font-medium">
                    No hay dimensiones/tamaños configurados para esta categoría.
                  </p>
                ) : (
                  selectedCatConfig.tamanos.map(t => (
                    <div key={t.id} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-[var(--bg-surface-raised)] transition">
                      <span className="font-semibold text-[var(--text-primary)]">
                        {t.nombre} <span className="text-xs text-[var(--text-muted)]">({t.unidad_medida})</span>
                      </span>
                      <button
                        onClick={() => handleEliminarSize(t.id)}
                        className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                        title="Eliminar tamaño"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB COLORES */}
          {activeCatTab === 'colores' && (
            <div className="space-y-4 pt-1">
              <form onSubmit={handleAgregarColor} className="flex gap-3 items-end bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Nombre del Color
                  </label>
                  <input
                    type="text"
                    value={nuevoColorNombre}
                    onChange={e => setNuevoColorNombre(e.target.value)}
                    placeholder="Ej: Kraft Natural, Blanco, Negro..."
                    className="w-full px-3.5 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Muestra Hex
                  </label>
                  <input
                    type="color"
                    value={nuevoColorHex}
                    onChange={e => setNuevoColorHex(e.target.value)}
                    className="w-12 h-9 p-1 border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl cursor-pointer"
                  />
                </div>
                <ButtonPremium
                  type="submit"
                  isLoading={agregandoColor}
                  hasGradient
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Agregar
                </ButtonPremium>
              </form>

              <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                {!selectedCatConfig?.colores || selectedCatConfig.colores.length === 0 ? (
                  <p className="p-6 text-center text-xs text-[var(--text-muted)] font-medium">
                    No hay colores configurados para esta categoría.
                  </p>
                ) : (
                  selectedCatConfig.colores.map(c => (
                    <div key={c.id} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-[var(--bg-surface-raised)] transition">
                      <div className="flex items-center gap-3 font-semibold text-[var(--text-primary)]">
                        <span 
                          className="w-4 h-4 rounded-full border border-[var(--border-default)] inline-block shadow-xs"
                          style={{ backgroundColor: c.codigo_hex || '#ffffff' }}
                        />
                        {c.nombre}
                      </div>
                      <button
                        onClick={() => handleEliminarColor(c.id)}
                        className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                        title="Eliminar color"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              onClick={() => setShowModalConfigCat(false)}
              variant="outline"
            >
              Cerrar
            </ButtonPremium>
          </div>
        </div>
      </Modal>

      {/* MODAL CARACTERÍSTICAS POR PRODUCTO */}
      <Modal 
        isOpen={showModalProdConfig} 
        onClose={() => setShowModalProdConfig(false)} 
        title={`Asignar Características: ${selectedProdConfig?.nombre || ''}`}
      >
        <div className="space-y-5">
          <p className="text-xs text-[var(--text-secondary)]">
            Selecciona qué tamaños y colores de la categoría <strong>{categoriaOfProdConfig?.nombre}</strong> estarán disponibles específicamente para este producto.
          </p>

          {/* TABS */}
          <div className="flex border-b border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveProdConfigTab('tamanos')}
              className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeProdConfigTab === 'tamanos'
                  ? 'border-[#59BFCB] text-[#59BFCB]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              📏 Tamaños Asignados ({prodConfigTamanos.length})
            </button>
            <button
              onClick={() => setActiveProdConfigTab('colores')}
              className={`px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
                activeProdConfigTab === 'colores'
                  ? 'border-[#59BFCB] text-[#59BFCB]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              🎨 Colores Asignados ({prodConfigColores.length})
            </button>
          </div>

          {/* TAB TAMAÑOS */}
          {activeProdConfigTab === 'tamanos' && (
            <div className="space-y-4 pt-1">
              <form onSubmit={handleAgregarTamanoProd} className="flex gap-3 items-end bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Seleccionar Tamaño de {categoriaOfProdConfig?.nombre}
                  </label>
                  <select
                    value={selectedTamanoToAdd}
                    onChange={e => setSelectedTamanoToAdd(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                  >
                    <option value="">-- Selecciona un tamaño --</option>
                    {(categoriaOfProdConfig?.tamanos || [])
                      .filter(t => !prodConfigTamanos.includes(t.id))
                      .map(t => (
                        <option key={t.id} value={t.id}>
                          {t.nombre} ({t.unidad_medida})
                        </option>
                      ))
                    }
                  </select>
                </div>
                <ButtonPremium
                  type="submit"
                  disabled={!selectedTamanoToAdd}
                  hasGradient
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Agregar
                </ButtonPremium>
              </form>

              {prodConfigTamanos.length === 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs">
                  💡 <strong>Sin asignación específica:</strong> Al dejar esta lista vacía, este producto heredará automáticamente <strong>todos los tamaños ({categoriaOfProdConfig?.tamanos?.length || 0})</strong> de la categoría {categoriaOfProdConfig?.nombre}.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                  {prodConfigTamanos.map(tid => {
                    const tamObj = categoriaOfProdConfig?.tamanos?.find(t => t.id === tid);
                    if (!tamObj) return null;

                    return (
                      <div key={tid} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-[var(--bg-surface-raised)] transition">
                        <span className="font-semibold text-[var(--text-primary)]">
                          📏 {tamObj.nombre} <span className="text-xs text-[var(--text-muted)]">({tamObj.unidad_medida})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarTamanoProd(tid)}
                          className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                          title="Quitar tamaño"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB COLORES */}
          {activeProdConfigTab === 'colores' && (
            <div className="space-y-4 pt-1">
              <form onSubmit={handleAgregarColorProd} className="flex gap-3 items-end bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Seleccionar Color de {categoriaOfProdConfig?.nombre}
                  </label>
                  <select
                    value={selectedColorToAdd}
                    onChange={e => setSelectedColorToAdd(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                  >
                    <option value="">-- Selecciona un color --</option>
                    {(categoriaOfProdConfig?.colores || [])
                      .filter(c => !prodConfigColores.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))
                    }
                  </select>
                </div>
                <ButtonPremium
                  type="submit"
                  disabled={!selectedColorToAdd}
                  hasGradient
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Agregar
                </ButtonPremium>
              </form>

              {prodConfigColores.length === 0 ? (
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 rounded-xl text-xs">
                  💡 <strong>Sin asignación específica:</strong> Al dejar esta lista vacía, este producto heredará automáticamente <strong>todos los colores ({categoriaOfProdConfig?.colores?.length || 0})</strong> de la categoría {categoriaOfProdConfig?.nombre}.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto border border-[var(--border-default)] rounded-xl bg-[var(--bg-surface)]">
                  {prodConfigColores.map(cid => {
                    const colorObj = categoriaOfProdConfig?.colores?.find(c => c.id === cid);
                    if (!colorObj) return null;

                    return (
                      <div key={cid} className="p-3 px-4 flex items-center justify-between text-sm hover:bg-[var(--bg-surface-raised)] transition">
                        <div className="flex items-center gap-3 font-semibold text-[var(--text-primary)]">
                          <span 
                            className="w-4 h-4 rounded-full border border-[var(--border-default)] inline-block shadow-xs"
                            style={{ backgroundColor: colorObj.codigo_hex || '#ffffff' }}
                          />
                          {colorObj.nombre}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleEliminarColorProd(cid)}
                          className="text-[var(--text-muted)] hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                          title="Quitar color"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              type="button"
              variant="outline"
              onClick={() => setShowModalProdConfig(false)}
            >
              Cancelar
            </ButtonPremium>
            <ButtonPremium
              type="button"
              onClick={handleGuardarProdConfig}
              isLoading={guardandoProdConfig}
              hasGradient
            >
              Guardar Asignaciones
            </ButtonPremium>
          </div>
        </div>
      </Modal>
    </div>
  );
}
