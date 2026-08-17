import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/apiFetch';
import { createClient } from '@supabase/supabase-js';
import { generarPdfPedidoV2 } from '../utils/generarPdfPedidoV2.ts';
import Modal from './Modal';
import Stepper from './Stepper';
import ButtonPremium from './ButtonPremium';
import PhoneInput from './PhoneInput';
import { showToast } from './Toast';
import { 
  validateNombre, 
  validateDocIdentidad, 
  validateTelefono, 
  validateFechaEntrega, 
  validateCantidad, 
  validatePrecio, 
  validateAdelanto, 
  validateArchivo 
} from '../utils/validators';
import { 
  AlertTriangle, 
  Zap, 
  Save, 
  Plus, 
  Trash2, 
  Loader2,
  User,
  DollarSign,
  CheckCircle2,
  Download,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
  Search,
  Check,
  Palette,
  Ruler
} from 'lucide-react';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '';
const esCredencialReal = supabaseUrl && supabaseAnonKey && !supabaseAnonKey.includes('[YOUR_');
const supabaseClient = esCredencialReal ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface Marca {
  id: string;
  nombre: string;
  ruc_dni: string | null;
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

interface Producto {
  id: string;
  nombre: string;
  precio_millar: string | null;
  precio_ciento: string | null;
  precio_unidad: string | null;
  tamanos_asignados?: string[];
  colores_asignados?: string[];
}

interface Categoria {
  id: string;
  nombre: string;
  productos: Producto[];
  tamanos?: Tamano[];
  colores?: ColorProducto[];
}

interface ItemPedido {
  tipo_producto_id: string;
  producto_ref_precio: number;
  producto_nombre: string;
  categoria_nombre: string;
  cantidad: number;
  unidad_medida: 'Ciento' | 'Millar';
  precio_base_calculado: number;
  precio_final_acordado: number;
  url_vectorial: string | null;
  url_fotografia: string | null;
  archivo_vectorial: File | null;
  archivo_fotografia: File | null;
  // Características informativas para PDF
  tamano_nombre?: string;
  color_nombre?: string;
  num_colores_estampado?: number;
  tipo_servicio?: string;
}

export default function NuevaOrdenForm() {
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [catalogo, setCatalogo] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidoExito, setPedidoExito] = useState<any>(null);

  // Campos de la Orden (Paso 1)
  const [marcaId, setMarcaId] = useState('');
  const [solicitanteNombre, setSolicitanteNombre] = useState('');
  const [solicitantePrefijo, setSolicitantePrefijo] = useState('+51');
  const [solicitanteTelefono, setSolicitanteTelefono] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');

  // Estados de errores de validación
  const [erroresStep1, setErroresStep1] = useState<{ marca?: string; nombre?: string; telefono?: string; fecha?: string }>({});
  const [erroresStep2, setErroresStep2] = useState<{ catProd?: string; cantidad?: string; precio?: string; vectorial?: string; foto?: string }>({});
  const [erroresStep3, setErroresStep3] = useState<{ adelanto?: string }>({});
  const [erroresModalMarca, setErroresModalMarca] = useState<{ nombre?: string; ruc?: string }>({});

  // Campos del Item actual (Paso 2)
  const [selectedCatIdx, setSelectedCatIdx] = useState<number>(-1);
  const [selectedProdIdx, setSelectedProdIdx] = useState<number>(-1);
  const [cantidad, setCantidad] = useState<number | ''>(1);
  const [unidad, setUnidad] = useState<'Ciento' | 'Millar'>('Millar');
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [precioAcordado, setPrecioAcordado] = useState<number | ''>(0);
  const [archivoVec, setArchivoVec] = useState<File | null>(null);
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);

  // Características informativas
  const [selectedTamanoId, setSelectedTamanoId] = useState<string>('');
  const [selectedColorId, setSelectedColorId] = useState<string>('');
  const [numColoresEstampado, setNumColoresEstampado] = useState<number>(1);
  const [tipoServicioCuero, setTipoServicioCuero] = useState<string>('Solo Estampado');

  // Lista de Items agregados
  const [items, setItems] = useState<ItemPedido[]>([]);

  // Pago (Paso 3)
  const [adelantoMonto, setAdelantoMonto] = useState<number | ''>(0);
  const [adelantoMetodo, setAdelantoMetodo] = useState<string>('Efectivo');
  const [guardando, setGuardando] = useState(false);

  // ================= MODALES Y FUNCIONES DE ACCESO RAPIDO =================
  const [isMarcaModalOpen, setIsMarcaModalOpen] = useState(false);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState('');
  const [nuevaMarcaRuc, setNuevaMarcaRuc] = useState('');
  const [guardandoMarca, setGuardandoMarca] = useState(false);

  const [isDimModalOpen, setIsDimModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [filtroDimCol, setFiltroDimCol] = useState('');
  const [guardandoDimCol, setGuardandoDimCol] = useState(false);

  // Estados específicos para Modal de Tamaño
  const [tabModalTamano, setTabModalTamano] = useState<'buscar' | 'crear'>('buscar');
  const [nuevoTamanoNombre, setNuevoTamanoNombre] = useState('');
  const [nuevoTamanoUnidad, setNuevoTamanoUnidad] = useState('pulgadas');

  // Estados específicos para Modal de Color
  const [tabModalColor, setTabModalColor] = useState<'buscar' | 'crear'>('buscar');
  const [nuevoColorNombre, setNuevoColorNombre] = useState('');
  const [nuevoColorHex, setNuevoColorHex] = useState('#59BFCB');
  // ========================================================================

  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [marcasData, catalogoData] = await Promise.all([
          apiFetch<Marca[]>('/marcas/').catch(() => []),
          apiFetch<Categoria[]>('/categorias/todos-completos/').catch(async () => {
            // Fallback
            const cats = await apiFetch<Categoria[]>('/categorias/').catch(() => []);
            return Promise.all(
              (Array.isArray(cats) ? cats : []).map(cat =>
                apiFetch<Categoria>(`/categorias/${cat.id}/completo/`).catch(() => ({ ...cat, productos: [], tamanos: [], colores: [] }))
              )
            );
          })
        ]);
        
        setMarcas(Array.isArray(marcasData) ? marcasData : []);
        setCatalogo(Array.isArray(catalogoData) ? catalogoData : []);
      } catch (e) {
        console.error('Error al conectar con la API backend:', e);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Cálculo de precio sugerido
  useEffect(() => {
    if (selectedCatIdx >= 0 && selectedProdIdx >= 0) {
      const cat = catalogo[selectedCatIdx];
      const prod = cat.productos[selectedProdIdx];
      
      const pMillar = prod.precio_millar ? parseFloat(prod.precio_millar) : null;
      const pCiento = prod.precio_ciento ? parseFloat(prod.precio_ciento) : null;
      const pUnidad = prod.precio_unidad ? parseFloat(prod.precio_unidad) : null;

      const cantVal = cantidad === '' ? 0 : cantidad;
      let baseRate = 0;

      if (unidad === 'Millar') {
        if (pMillar !== null) baseRate = pMillar;
        else if (pCiento !== null) baseRate = pCiento * 10;
        else if (pUnidad !== null) baseRate = pUnidad * 1000;
      } else {
        if (pCiento !== null) baseRate = pCiento;
        else if (pMillar !== null) baseRate = pMillar / 10;
        else if (pUnidad !== null) baseRate = pUnidad * 100;
      }

      let totalSugerido = 0;
      if (unidad === 'Millar') {
        totalSugerido = baseRate * cantVal;
      } else {
        totalSugerido = (baseRate / 10) * cantVal;
      }
      
      totalSugerido = Math.round(totalSugerido * 100) / 100;

      setPrecioBase(totalSugerido);
      setPrecioAcordado(totalSugerido);
    } else {
      setPrecioBase(0);
      setPrecioAcordado(0);
    }
  }, [selectedCatIdx, selectedProdIdx, cantidad, unidad, catalogo]);

  const catActual = selectedCatIdx >= 0 ? catalogo[selectedCatIdx] : null;
  const prodActual = (selectedCatIdx >= 0 && selectedProdIdx >= 0) ? catActual?.productos?.[selectedProdIdx] : null;

  const tamanosDisponibles = React.useMemo(() => {
    if (!catActual || !prodActual) return [];
    if (prodActual.tamanos_asignados && prodActual.tamanos_asignados.length > 0) {
      return (catActual.tamanos || []).filter(t => prodActual.tamanos_asignados!.includes(t.id));
    }
    return catActual.tamanos || [];
  }, [catActual, prodActual]);

  const coloresDisponibles = React.useMemo(() => {
    if (!catActual || !prodActual) return [];
    if (prodActual.colores_asignados && prodActual.colores_asignados.length > 0) {
      return (catActual.colores || []).filter(c => prodActual.colores_asignados!.includes(c.id));
    }
    return catActual.colores || [];
  }, [catActual, prodActual]);

  const esCategoriaCuero = catActual?.nombre.toLowerCase().includes('cuero') || false;
  const esCategoriaCartones = catActual?.nombre.toLowerCase().includes('carton') || false;
  const esCategoriaEtiquetas = catActual?.nombre.toLowerCase().includes('etiqueta') || false;
  const incluyeEstampadoCuero = esCategoriaCuero ? tipoServicioCuero.includes('Estampado') : true;

  const steps = [
    { title: 'Datos Generales', subtitle: 'Marca y Solicitante' },
    { title: 'Productos y Cotización', subtitle: 'Detalles y Archivos' },
    { title: 'Pago y Confirmación', subtitle: 'Adelanto y Registro' }
  ];

  const validateStep1 = (): boolean => {
    const errs: { marca?: string; nombre?: string; telefono?: string; fecha?: string } = {};
    
    if (!marcaId) {
      errs.marca = 'Por favor selecciona una marca cliente.';
    }
    if (solicitanteNombre.trim()) {
      const valNom = validateNombre(solicitanteNombre, 'El nombre del solicitante');
      if (!valNom.isValid) {
        errs.nombre = valNom.error;
      }
    }
    const valTel = validateTelefono(solicitantePrefijo, solicitanteTelefono);
    if (!valTel.isValid) {
      errs.telefono = valTel.error;
    }
    const valFecha = validateFechaEntrega(fechaEntrega);
    if (!valFecha.isValid) {
      errs.fecha = valFecha.error;
    }

    setErroresStep1(errs);

    if (Object.keys(errs).length > 0) {
      const primerError = Object.values(errs)[0];
      showToast({ type: 'warning', title: 'Datos Inválidos', message: primerError });
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (items.length === 0) {
      showToast({ type: 'warning', title: 'Sin Productos', message: 'Debes agregar al menos un producto a la cotización.' });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleCrearMarca = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { nombre?: string; ruc?: string } = {};
    const valNom = validateNombre(nuevaMarcaNombre, 'El nombre de la marca');
    if (!valNom.isValid) errs.nombre = valNom.error;
    const valRuc = validateDocIdentidad(nuevaMarcaRuc);
    if (!valRuc.isValid) errs.ruc = valRuc.error;

    setErroresModalMarca(errs);
    if (Object.keys(errs).length > 0) {
      showToast({ type: 'warning', title: 'Datos Inválidos', message: Object.values(errs)[0] });
      return;
    }

    setGuardandoMarca(true);
    try {
      const resp = await apiFetch('/marcas/', {
        method: 'POST',
        body: JSON.stringify({ nombre: nuevaMarcaNombre.trim(), ruc_dni: nuevaMarcaRuc.trim() || null })
      });
      setMarcas(prev => [...prev, resp]);
      setMarcaId(resp.id);
      setIsMarcaModalOpen(false);
      setNuevaMarcaNombre('');
      setNuevaMarcaRuc('');
      setErroresModalMarca({});
      showToast({ type: 'success', title: 'Marca Creada en BD', message: 'La marca se registró y seleccionó correctamente en la base de datos.' });
    } catch (e: any) {
      console.error('Error al crear marca:', e);
      showToast({ type: 'error', title: 'Error al Guardar Marca', message: e.message || 'No se pudo guardar la marca en el servidor backend.' });
    } finally {
      setGuardandoMarca(false);
    }
  };

  const handleAsignarDimensionColorExistente = async (tipo: 'tamano' | 'color', itemId: string) => {
    if (!catActual || !prodActual) return;

    const currentLen = tipo === 'tamano' ? tamanosDisponibles.length : coloresDisponibles.length;

    let updatedTamanoIds = (prodActual.tamanos_asignados && prodActual.tamanos_asignados.length > 0)
      ? [...prodActual.tamanos_asignados]
      : (catActual.tamanos || []).map(t => t.id);

    let updatedColorIds = (prodActual.colores_asignados && prodActual.colores_asignados.length > 0)
      ? [...prodActual.colores_asignados]
      : (catActual.colores || []).map(c => c.id);

    if (tipo === 'tamano') {
      updatedTamanoIds = [...new Set([...updatedTamanoIds, itemId])];
    } else {
      updatedColorIds = [...new Set([...updatedColorIds, itemId])];
    }

    try {
      await apiFetch(`/tipos-producto/${prodActual.id}/guardar-asignaciones/`, {
        method: 'POST',
        body: JSON.stringify({
          tamanos_ids: updatedTamanoIds,
          colores_ids: updatedColorIds
        })
      });

      setCatalogo(prevCatalogo => {
        return prevCatalogo.map(cat => {
          if (cat.id !== catActual.id) return cat;

          const updatedProductos = cat.productos.map(p => {
            if (p.id !== prodActual.id) return p;
            return { 
              ...p, 
              tamanos_asignados: updatedTamanoIds,
              colores_asignados: updatedColorIds
            };
          });

          return { ...cat, productos: updatedProductos };
        });
      });

      showToast({ 
        type: 'success', 
        title: 'Asignación Guardada en BD', 
        message: 'Se vinculó la opción al producto en la base de datos.' 
      });

      if (tipo === 'tamano') {
        setSelectedTamanoId(itemId);
        setIsDimModalOpen(false);
      } else {
        setSelectedColorId(itemId);
        setIsColorModalOpen(false);
      }
    } catch (e) {
      console.error('Error al guardar asignación en BD:', e);
      showToast({ 
        type: 'error', 
        title: 'Error al Guardar', 
        message: 'No se pudo guardar la asignación en la base de datos.' 
      });
    }
  };

  const handleCrearDimensionColorGlobal = async (tipo: 'tamano' | 'color') => {
    const nombre = tipo === 'tamano' ? nuevoTamanoNombre.trim() : nuevoColorNombre.trim();
    if (!nombre) {
      showToast({ 
        type: 'warning', 
        title: 'Campo Requerido', 
        message: `Por favor ingresa el nombre del ${tipo === 'tamano' ? 'tamaño / dimensión' : 'color'}.` 
      });
      return;
    }
    setGuardandoDimCol(true);
    
    const catActualId = catActual?.id;
    const prodActualId = prodActual?.id;
    if (!catActualId || !prodActualId) {
      setGuardandoDimCol(false);
      return;
    }

    try {
      const endpoint = tipo === 'tamano' ? '/tamanos/' : '/colores_producto/';
      const body = tipo === 'tamano' 
        ? { categoria: catActualId, nombre, unidad_medida: nuevoTamanoUnidad, orden: 0 }
        : { categoria: catActualId, nombre, codigo_hex: nuevoColorHex, orden: 0 };
        
      const respItem = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
      });

      let updatedTamanoIds = (prodActual.tamanos_asignados && prodActual.tamanos_asignados.length > 0)
        ? [...prodActual.tamanos_asignados]
        : (catActual.tamanos || []).map(t => t.id);

      let updatedColorIds = (prodActual.colores_asignados && prodActual.colores_asignados.length > 0)
        ? [...prodActual.colores_asignados]
        : (catActual.colores || []).map(c => c.id);

      if (tipo === 'tamano') {
        updatedTamanoIds = [...new Set([...updatedTamanoIds, respItem.id])];
      } else {
        updatedColorIds = [...new Set([...updatedColorIds, respItem.id])];
      }

      await apiFetch(`/tipos-producto/${prodActualId}/guardar-asignaciones/`, {
        method: 'POST',
        body: JSON.stringify({
          tamanos_ids: updatedTamanoIds,
          colores_ids: updatedColorIds
        })
      });

      setCatalogo(prevCatalogo => {
        return prevCatalogo.map(cat => {
          if (cat.id !== catActualId) return cat;

          const updatedTamanos = tipo === 'tamano' ? [...(cat.tamanos || []), respItem as Tamano] : (cat.tamanos || []);
          const updatedColores = tipo === 'color' ? [...(cat.colores || []), respItem as ColorProducto] : (cat.colores || []);

          const updatedProductos = cat.productos.map(p => {
            if (p.id !== prodActualId) return p;
            return {
              ...p,
              tamanos_asignados: updatedTamanoIds,
              colores_asignados: updatedColorIds
            };
          });

          return {
            ...cat,
            tamanos: updatedTamanos,
            colores: updatedColores,
            productos: updatedProductos
          };
        });
      });

      setFiltroDimCol('');
      if (tipo === 'tamano') {
        setSelectedTamanoId(respItem.id);
        setNuevoTamanoNombre('');
        setNuevoTamanoUnidad('pulgadas');
        setIsDimModalOpen(false);
        showToast({ 
          type: 'success', 
          title: 'Dimensión Creada', 
          message: `"${respItem.nombre} (${respItem.unidad_medida})"` + ' creada y seleccionada.' 
        });
      } else {
        setSelectedColorId(respItem.id);
        setNuevoColorNombre('');
        setNuevoColorHex('#59BFCB');
        setIsColorModalOpen(false);
        showToast({ 
          type: 'success', 
          title: 'Color Creado', 
          message: `Color "${respItem.nombre}" creado y seleccionado.` 
        });
      }
    } catch (err) {
      console.error('Error al crear registro:', err);
      showToast({ type: 'error', title: 'Error al Guardar', message: 'No se pudo guardar la nueva opción en el servidor.' });
    } finally {
      setGuardandoDimCol(false);
    }
  };

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    } else if (step === 2 && currentStep === 1) {
      if (validateStep1()) setCurrentStep(2);
    } else if (step === 3 && currentStep === 2) {
      if (validateStep2()) setCurrentStep(3);
    }
  };

  const handleAgregarItem = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { catProd?: string; cantidad?: string; precio?: string; vectorial?: string; foto?: string } = {};

    if (selectedCatIdx < 0 || selectedProdIdx < 0) {
      errs.catProd = 'Por favor selecciona una categoría y tipo de producto.';
    }

    const valCant = validateCantidad(cantidad);
    if (!valCant.isValid) {
      errs.cantidad = valCant.error;
    }

    const valPrec = validatePrecio(precioAcordado);
    if (!valPrec.isValid) {
      errs.precio = valPrec.error;
    }

    if (archivoVec) {
      const valVec = validateArchivo(archivoVec, 'vectorial');
      if (!valVec.isValid) errs.vectorial = valVec.error;
    }

    if (archivoFoto) {
      const valFoto = validateArchivo(archivoFoto, 'foto');
      if (!valFoto.isValid) errs.foto = valFoto.error;
    }

    setErroresStep2(errs);

    if (Object.keys(errs).length > 0) {
      const primerError = Object.values(errs)[0];
      showToast({ type: 'warning', title: 'Campos Inválidos', message: primerError });
      return;
    }

    const cantVal = Number(cantidad);
    const prod = catalogo[selectedCatIdx].productos[selectedProdIdx];
    const cat = catalogo[selectedCatIdx];

    const pMillar = prod.precio_millar ? parseFloat(prod.precio_millar) : null;
    const pCiento = prod.precio_ciento ? parseFloat(prod.precio_ciento) : null;
    const pUnidad = prod.precio_unidad ? parseFloat(prod.precio_unidad) : null;

    let baseRate = 0;
    if (unidad === 'Millar') {
      baseRate = pMillar !== null ? pMillar : (pCiento !== null ? pCiento * 10 : (pUnidad !== null ? pUnidad * 1000 : 0));
    } else {
      baseRate = pCiento !== null ? pCiento : (pMillar !== null ? pMillar / 10 : (pUnidad !== null ? pUnidad * 100 : 0));
    }

    const nuevoItem: ItemPedido = {
      tipo_producto_id: prod.id,
      producto_ref_precio: baseRate,
      producto_nombre: prod.nombre,
      categoria_nombre: cat.nombre,
      cantidad: cantVal,
      unidad_medida: unidad,
      precio_base_calculado: precioBase,
      precio_final_acordado: precioAcordado === '' ? 0 : Number(precioAcordado),
      url_vectorial: null,
      url_fotografia: null,
      archivo_vectorial: archivoVec,
      archivo_fotografia: archivoFoto,
      tamano_nombre: selectedTamanoId ? tamanosDisponibles.find(t => t.id === selectedTamanoId)?.nombre : undefined,
      color_nombre: selectedColorId ? coloresDisponibles.find(c => c.id === selectedColorId)?.nombre : undefined,
      tipo_servicio: esCategoriaCuero ? tipoServicioCuero : undefined,
      num_colores_estampado: (!esCategoriaCartones && incluyeEstampadoCuero) ? numColoresEstampado : undefined
    };

    setItems(prev => [...prev, nuevoItem]);
    showToast({ type: 'success', title: 'Producto Agregado', message: `${prod.nombre} añadido a la orden.` });

    // Limpiar campos de item y errores
    setSelectedProdIdx(-1);
    setCantidad(1);
    setUnidad('Millar');
    setArchivoVec(null);
    setArchivoFoto(null);
    setSelectedTamanoId('');
    setSelectedColorId('');
    setNumColoresEstampado(1);
    setTipoServicioCuero('Solo Estampado');
    setErroresStep2({});
  };

  const handleEliminarItem = (idx: number) => {
    const itemEliminado = items[idx];
    setItems(prev => prev.filter((_, i) => i !== idx));
    showToast({ type: 'info', title: 'Producto Eliminado', message: `${itemEliminado.producto_nombre} fue removido de la orden.` });
  };

  const subirArchivo = async (file: File, bucketName: string): Promise<string> => {
    if (!supabaseClient) {
      return `https://demo-storage.supabase.co/${bucketName}/${Date.now()}_${file.name}`;
    }

    const ext = file.name.split('.').pop();
    const filePath = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`;

    const { error } = await supabaseClient.storage
      .from(bucketName)
      .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleGuardarPedido = async () => {
    if (!validateStep1() || !validateStep2()) return;

    const totalMontoActual = items.reduce((sum, it) => sum + it.precio_final_acordado, 0);
    const valAdelanto = validateAdelanto(adelantoMonto, totalMontoActual);
    if (!valAdelanto.isValid) {
      setErroresStep3({ adelanto: valAdelanto.error });
      showToast({ type: 'warning', title: 'Adelanto Inválido', message: valAdelanto.error });
      return;
    }
    setErroresStep3({});

    try {
      setGuardando(true);

      const itemsProcesados = [];
      for (const item of items) {
        let urlVec = null;
        let urlFoto = null;

        if (item.archivo_vectorial) {
          try {
            urlVec = await subirArchivo(item.archivo_vectorial, 'pedidos-adjuntos');
          } catch (err: any) {
            console.error('Error al subir diseño vectorial:', err);
          }
        }

        if (item.archivo_fotografia) {
          try {
            urlFoto = await subirArchivo(item.archivo_fotografia, 'pedidos-adjuntos');
          } catch (err: any) {
            console.error('Error al subir foto:', err);
          }
        }

        itemsProcesados.push({
          tipo_producto: item.tipo_producto_id,
          cantidad: item.cantidad,
          unidad_medida: item.unidad_medida,
          precio_final_acordado: item.precio_final_acordado,
          url_vectorial: urlVec,
          url_fotografia: urlFoto,
          tamano_nombre: item.tamano_nombre,
          color_nombre: item.color_nombre,
          num_colores_estampado: item.num_colores_estampado,
          tipo_servicio: item.tipo_servicio
        });
      }

      const cleanPhone = solicitanteTelefono.trim().replace(/[\s-]/g, '');
      const telefonoFormateado = cleanPhone ? `${solicitantePrefijo}${cleanPhone}` : null;

      const pedidoCreado = await apiFetch('/pedidos/', {
        method: 'POST',
        body: JSON.stringify({
          marca: marcaId,
          solicitante_nombre: solicitanteNombre.trim(),
          solicitante_telefono: telefonoFormateado,
          fecha_entrega_acordada: fechaEntrega,
          detalles: itemsProcesados,
          adelanto_monto: Number(adelantoMonto || 0),
          adelanto_metodo_pago: adelantoMetodo
        })
      });

      try {
        generarPdfPedidoV2(pedidoCreado);
      } catch (pdfErr) {
        console.error('Error al generar PDF:', pdfErr);
      }

      setPedidoExito(pedidoCreado);
      showToast({
        type: 'success',
        title: '¡Pedido Registrado con Éxito!',
        message: `Código: ${pedidoCreado.codigo_correlativo || 'OK'}`
      });

      // Reset state
      setItems([]);
      setMarcaId('');
      setSolicitanteNombre('');
      setSolicitanteTelefono('');
      setFechaEntrega('');
      setAdelantoMonto(0);
      setAdelantoMetodo('Efectivo');
      setErroresStep1({});
      setErroresStep2({});
      setErroresStep3({});
      setCurrentStep(1);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error al Registrar',
        message: err.message || 'Ocurrió un problema al guardar la orden.'
      });
    } finally {
      setGuardando(false);
    }
  };

  const totalPedido = items.reduce((sum, item) => sum + item.precio_final_acordado, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-[var(--text-secondary)]">
        <Loader2 className="w-8 h-8 text-[#59BFCB] animate-spin mb-3" />
        <p className="text-sm font-medium">Cargando formulario de orden...</p>
      </div>
    );
  }

  const marcaSeleccionadaObj = marcas.find((m) => m.id === marcaId);

  const assignedTamanoIds = new Set(tamanosDisponibles.map(t => t.id));
  const unassignedTamanos = catActual?.tamanos?.filter(t => !assignedTamanoIds.has(t.id)) || [];

  const assignedColorIds = new Set(coloresDisponibles.map(c => c.id));
  const unassignedColores = catActual?.colores?.filter(c => !assignedColorIds.has(c.id)) || [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Stepper Progress Bar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-2xl p-4 shadow-sm">
        <Stepper steps={steps} currentStep={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* WIZARD STEP 1: Datos Generales */}
      {currentStep === 1 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 md:p-8 rounded-2xl shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-[var(--border-subtle)] pb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#59BFCB]/15 flex items-center justify-center text-[#59BFCB]">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Paso 1: Datos Generales y Cliente</h3>
              <p className="text-xs text-[var(--text-secondary)]">Selecciona la marca cliente e ingresa los detalles del solicitante</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Marca Cliente *
              </label>
              <div className="flex gap-2">
                <select 
                  value={marcaId}
                  onChange={(e) => {
                    setMarcaId(e.target.value);
                    if (erroresStep1.marca) setErroresStep1(prev => ({ ...prev, marca: undefined }));
                  }}
                  className={`flex-1 px-4 py-3 rounded-xl border ${erroresStep1.marca ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors`}
                  required
                >
                  <option value="">-- Selecciona Marca --</option>
                  {marcas.map(m => (
                    <option key={m.id} value={m.id}>{m.nombre} {m.ruc_dni ? `(RUC: ${m.ruc_dni})` : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsMarcaModalOpen(true)}
                  className="w-12 h-12 flex items-center justify-center bg-[#59BFCB]/10 text-[#59BFCB] rounded-xl hover:bg-[#59BFCB]/20 transition-colors border border-[#59BFCB]/30 shrink-0"
                  title="Nueva Marca"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {erroresStep1.marca && (
                <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                  <span>⚠️</span> {erroresStep1.marca}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Nombre del Solicitante <span className="text-[10px] lowercase font-normal opacity-70">(opcional)</span>
              </label>
              <input 
                type="text" 
                value={solicitanteNombre}
                onChange={(e) => {
                  setSolicitanteNombre(e.target.value);
                  if (erroresStep1.nombre) setErroresStep1(prev => ({ ...prev, nombre: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-xl border ${erroresStep1.nombre ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors`}
                placeholder="Nombre de quien encarga (opcional)"
              />
              {erroresStep1.nombre && (
                <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                  <span>⚠️</span> {erroresStep1.nombre}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Teléfono de Contacto
              </label>
              <PhoneInput
                prefijo={solicitantePrefijo}
                setPrefijo={setSolicitantePrefijo}
                numero={solicitanteTelefono}
                setNumero={(val) => {
                  setSolicitanteTelefono(val);
                  if (erroresStep1.telefono) setErroresStep1(prev => ({ ...prev, telefono: undefined }));
                }}
                error={erroresStep1.telefono}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Fecha Límite de Entrega *
              </label>
              <input 
                type="date" 
                min={new Date().toISOString().split('T')[0]}
                value={fechaEntrega}
                onChange={(e) => {
                  setFechaEntrega(e.target.value);
                  if (erroresStep1.fecha) setErroresStep1(prev => ({ ...prev, fecha: undefined }));
                }}
                className={`w-full px-4 py-3 rounded-xl border ${erroresStep1.fecha ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors`}
                required
              />
              {erroresStep1.fecha && (
                <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                  <span>⚠️</span> {erroresStep1.fecha}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              onClick={handleNextStep}
              hasGradient
              hasPulse
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Siguiente: Productos y Cotización
            </ButtonPremium>
          </div>
        </div>
      )}

      {/* WIZARD STEP 2: Selección y Detalles de Productos */}
      {currentStep === 2 && (
        <div className="space-y-6 animate-fade-in">
          {/* Formulario de Agregar Producto */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
            <div className="border-b border-[var(--border-subtle)] pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#59BFCB]/15 flex items-center justify-center text-[#59BFCB]">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--text-primary)]">Paso 2: Selección de Productos y Detalles</h3>
                  <p className="text-xs text-[var(--text-secondary)]">Agrega ítems a la orden especificando cantidades, características y archivos</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-[#59BFCB] bg-[#59BFCB]/10 px-3 py-1.5 rounded-full">
                {items.length} {items.length === 1 ? 'producto en orden' : 'productos en orden'}
              </span>
            </div>

            <form onSubmit={handleAgregarItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Categoría *
                  </label>
                  <select 
                    value={selectedCatIdx}
                    onChange={(e) => {
                      setSelectedCatIdx(parseInt(e.target.value));
                      setSelectedProdIdx(-1);
                      setSelectedTamanoId('');
                      setSelectedColorId('');
                      setNumColoresEstampado(1);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring transition-colors"
                  >
                    <option value={-1}>-- Seleccionar Categoría --</option>
                    {catalogo.map((c, idx) => (
                      <option key={c.id} value={idx}>{c.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Tipo de Producto *
                  </label>
                  <select 
                    value={selectedProdIdx}
                    disabled={selectedCatIdx < 0}
                    onChange={(e) => setSelectedProdIdx(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring disabled:opacity-50 transition-colors"
                  >
                    <option value={-1}>-- Seleccionar Producto --</option>
                    {selectedCatIdx >= 0 && catalogo[selectedCatIdx].productos.map((p, idx) => {
                      const pricesStr = [
                        p.precio_millar ? `M: S/${p.precio_millar}` : '',
                        p.precio_ciento ? `C: S/${p.precio_ciento}` : '',
                        p.precio_unidad ? `U: S/${p.precio_unidad}` : ''
                      ].filter(Boolean).join(', ');
                      return (
                        <option key={p.id} value={idx}>
                          {p.nombre} {pricesStr ? `(${pricesStr})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Características informativas dinámicas */}
              {catActual && (
                <div className="p-5 bg-[var(--bg-surface-raised)] rounded-2xl border border-[var(--border-subtle)] space-y-4">
                  <h4 className="text-xs font-bold text-[#59BFCB] uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" /> Especificaciones de Categoría ({catActual.nombre})
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {tamanosDisponibles.length >= 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                          {esCategoriaEtiquetas ? '📏 Ancho de la Etiqueta' : '📏 Dimensión / Tamaño'}
                        </label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedTamanoId}
                            onChange={e => setSelectedTamanoId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="">Sin tamaño específico</option>
                            {tamanosDisponibles.map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre} ({t.unidad_medida})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { setFiltroDimCol(''); setIsDimModalOpen(true); }}
                            className="w-9 h-9 flex items-center justify-center bg-[#59BFCB]/10 text-[#59BFCB] rounded-xl hover:bg-[#59BFCB]/20 transition-colors border border-[#59BFCB]/30 shrink-0"
                            title="Agregar / Asignar Tamaño"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {coloresDisponibles.length >= 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">🎨 Color del Material</label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedColorId}
                            onChange={e => setSelectedColorId(e.target.value)}
                            className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                          >
                            <option value="">Sin color específico</option>
                            {coloresDisponibles.map((col) => (
                              <option key={col.id} value={col.id}>{col.nombre}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { setFiltroDimCol(''); setIsColorModalOpen(true); }}
                            className="w-9 h-9 flex items-center justify-center bg-[#59BFCB]/10 text-[#59BFCB] rounded-xl hover:bg-[#59BFCB]/20 transition-colors border border-[#59BFCB]/30 shrink-0"
                            title="Agregar / Asignar Color"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}

                    {esCategoriaCuero && (
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">🛠️ Tipo de Servicio</label>
                        <select
                          value={tipoServicioCuero}
                          onChange={e => setTipoServicioCuero(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        >
                          <option value="Solo Estampado">Solo Estampado</option>
                          <option value="Estampado y Repujado">Estampado y Repujado</option>
                          <option value="Solo Repujado">Solo Repujado</option>
                        </select>
                      </div>
                    )}

                    {!esCategoriaCartones && incluyeEstampadoCuero && (
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">🖌️ N° Colores de Estampado</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={numColoresEstampado}
                          onChange={e => setNumColoresEstampado(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {erroresStep2.catProd && (
                <p className="text-xs text-red-500 font-medium flex items-center gap-1 -mt-3">
                  <span>⚠️</span> {erroresStep2.catProd}
                </p>
              )}

              {/* Cantidad y Precios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Cantidad *</label>
                  <input 
                    type="number" 
                    min={1}
                    value={cantidad}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCantidad(val === '' ? '' : parseInt(val) || 0);
                      if (erroresStep2.cantidad) setErroresStep2(prev => ({ ...prev, cantidad: undefined }));
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${erroresStep2.cantidad ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring`}
                  />
                  {erroresStep2.cantidad && (
                    <p className="text-xs text-red-500 mt-1 font-medium">⚠️ {erroresStep2.cantidad}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Unidad Medida</label>
                  <select 
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-raised)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring"
                  >
                    <option value="Millar">Millar (1,000 unids)</option>
                    <option value="Ciento">Ciento (100 unids)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Precio Acordado (S/) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min={0}
                    value={precioAcordado}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPrecioAcordado(val === '' ? '' : parseFloat(val) || 0);
                      if (erroresStep2.precio) setErroresStep2(prev => ({ ...prev, precio: undefined }));
                    }}
                    className={`w-full px-4 py-3 rounded-xl border ${erroresStep2.precio ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[#59BFCB]'} bg-[#59BFCB]/10 text-[var(--text-primary)] font-extrabold text-sm focus:outline-none focus-ring`}
                    required
                  />
                  {erroresStep2.precio && (
                    <p className="text-xs text-red-500 mt-1 font-medium">⚠️ {erroresStep2.precio}</p>
                  )}
                  {precioBase > 0 && !erroresStep2.precio && (
                    <span className="text-[10px] text-[var(--text-muted)] block mt-1">
                      Precio Sugerido: S/ {precioBase.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <ButtonPremium
                  type="submit"
                  variant="primary"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Agregar a la Orden
                </ButtonPremium>
              </div>
            </form>
          </div>

          {/* Tabla / Lista de Items agregados */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 rounded-2xl shadow-sm space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#59BFCB]" /> Lista de Productos en la Orden ({items.length})
            </h4>

            {items.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-[var(--border-default)] rounded-2xl p-6 text-[var(--text-muted)] flex flex-col items-center">
                <Zap className="w-8 h-8 mb-2 opacity-30 text-[#59BFCB]" />
                <p className="text-sm font-medium">No has agregado productos a esta cotización.</p>
                <p className="text-xs mt-1">Usa el formulario arriba para agregar al menos un producto.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-default)] hover:border-[#59BFCB]/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#59BFCB] bg-[#59BFCB]/10 px-2 py-0.5 rounded">
                          #{idx + 1}
                        </span>
                        <h5 className="font-bold text-sm text-[var(--text-primary)] truncate">{item.producto_nombre}</h5>
                        <span className="text-xs text-[var(--text-muted)]">({item.categoria_nombre})</span>
                      </div>
                      
                      <div className="text-xs text-[var(--text-secondary)] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {item.tamano_nombre && <span>📏 Tamaño: <strong>{item.tamano_nombre}</strong></span>}
                        {item.color_nombre && <span>🎨 Color: <strong>{item.color_nombre}</strong></span>}
                        {item.tipo_servicio && <span>🛠️ Servicio: <strong>{item.tipo_servicio}</strong></span>}
                        {item.num_colores_estampado && <span>🖌️ Estampado: <strong>{item.num_colores_estampado} col.</strong></span>}
                        {item.archivo_vectorial && <span className="text-emerald-500 font-semibold">📁 Arte Vectorial</span>}
                        {item.archivo_fotografia && <span className="text-purple-400 font-semibold">🖼️ Referencia Foto</span>}
                      </div>

                      <p className="text-xs text-[var(--text-muted)] font-semibold mt-1">
                        Cantidad: {item.cantidad} {item.unidad_medida === 'Millar' ? 'Millar(es)' : 'Ciento(s)'}
                      </p>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-3 ml-4">
                      <span className="font-extrabold text-base text-emerald-500">S/ {item.precio_final_acordado.toFixed(2)}</span>
                      <button 
                        type="button"
                        onClick={() => handleEliminarItem(idx)}
                        className="text-red-500 hover:text-red-600 p-2 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
                        title="Eliminar producto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              onClick={handlePrevStep}
              variant="outline"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Atrás
            </ButtonPremium>

            <ButtonPremium
              onClick={handleNextStep}
              hasGradient
              hasPulse
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Siguiente: Pago y Confirmación
            </ButtonPremium>
          </div>
        </div>
      )}

      {/* WIZARD STEP 3: Resumen de Pago y Confirmación */}
      {currentStep === 3 && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] p-6 md:p-8 rounded-2xl shadow-sm space-y-6 animate-fade-in">
          <div className="border-b border-[var(--border-subtle)] pb-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-[var(--text-primary)]">Paso 3: Pago y Confirmación de la Orden</h3>
              <p className="text-xs text-[var(--text-secondary)]">Revisa el resumen financiero, establece el pago inicial y registra el pedido</p>
            </div>
          </div>

          {/* Resumen General Read-Only */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs">
            <div>
              <span className="text-[var(--text-muted)] font-medium block">Marca Cliente:</span>
              <span className="font-bold text-[var(--text-primary)] text-sm">{marcaSeleccionadaObj?.nombre || 'No seleccionada'}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-medium block">Solicitante:</span>
              <span className="font-bold text-[var(--text-primary)] text-sm">{solicitanteNombre.trim() || 'Sin especificar'} ({solicitanteTelefono || 'Sin tel.'})</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-medium block">Fecha Límite:</span>
              <span className="font-bold text-[var(--text-primary)] text-sm">{fechaEntrega}</span>
            </div>
          </div>

          {/* Desglose de Productos */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase text-[var(--text-muted)] tracking-wider">Productos Incluidos</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-[var(--bg-surface-raised)] border border-[var(--border-subtle)] text-xs">
                  <div>
                    <span className="font-bold text-[var(--text-primary)]">{it.producto_nombre}</span>
                    <span className="text-[var(--text-muted)] block">
                      {it.cantidad} {it.unidad_medida} | {it.tamano_nombre || 'Sin tamaño'}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-500">S/ {it.precio_final_acordado.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario de Pago de Adelanto */}
          <div className="p-5 rounded-2xl border border-[#59BFCB]/30 bg-[#59BFCB]/5 space-y-4">
            <h4 className="font-bold text-sm text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#59BFCB]" /> Pago Inicial (Adelanto)
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-[var(--text-secondary)]">Adelanto (S/) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setAdelantoMonto(Math.round((totalPedido / 2) * 100) / 100);
                      if (erroresStep3.adelanto) setErroresStep3({});
                    }}
                    className="text-xs font-bold text-[#59BFCB] hover:underline cursor-pointer"
                    disabled={totalPedido === 0}
                  >
                    Sugerir 50% (S/ {(totalPedido / 2).toFixed(2)})
                  </button>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  min={0}
                  max={totalPedido}
                  value={adelantoMonto}
                  onChange={(e) => {
                    const val = e.target.value;
                    setAdelantoMonto(val === '' ? '' : parseFloat(val) || 0);
                    if (erroresStep3.adelanto) setErroresStep3({});
                  }}
                  className={`w-full px-4 py-3 rounded-xl border ${erroresStep3.adelanto ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} bg-[var(--bg-surface)] text-[var(--text-primary)] font-extrabold text-sm focus:outline-none focus-ring`}
                />
                {erroresStep3.adelanto && (
                  <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                    <span>⚠️</span> {erroresStep3.adelanto}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-1">Método de Pago</label>
                <select 
                  value={adelantoMetodo}
                  onChange={(e) => setAdelantoMetodo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm focus:outline-none focus-ring"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Yape/Plin">Yape / Plin</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                </select>
              </div>
            </div>

            {/* Cuadro Resumen Financiero */}
            <div className="bg-[var(--bg-surface)] p-4 rounded-xl border border-[var(--border-default)] space-y-2 text-sm font-semibold">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Monto Total de Orden:</span>
                <span>S/ {totalPedido.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-500">
                <span>A Cuenta (Adelanto):</span>
                <span>S/ {Number(adelantoMonto).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#59BFCB] border-t border-[var(--border-subtle)] pt-2 font-extrabold text-base">
                <span>Saldo Pendiente por Cobrar:</span>
                <span>S/ {(totalPedido - Number(adelantoMonto)).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[var(--border-subtle)]">
            <ButtonPremium
              onClick={handlePrevStep}
              variant="outline"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Atrás
            </ButtonPremium>

            <ButtonPremium
              onClick={handleGuardarPedido}
              isLoading={guardando}
              disabled={items.length === 0}
              hasGradient
              hasPulse
              size="lg"
              leftIcon={<Save className="w-5 h-5" />}
            >
              Registrar Orden de Pedido
            </ButtonPremium>
          </div>
        </div>
      )}

      {/* Modal Éxito con descarga de PDF */}
      <Modal isOpen={!!pedidoExito} onClose={() => setPedidoExito(null)} maxWidth="md">
        {pedidoExito && (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              ¡Pedido Registrado con Éxito!
            </h3>

            <div className="bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl p-4 text-left text-xs space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-subtle)]">
                <span className="text-[var(--text-secondary)] font-medium">Código:</span>
                <span className="font-extrabold text-[#59BFCB] text-sm">{pedidoExito.codigo_correlativo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Solicitante:</span>
                <span className="font-semibold text-[var(--text-primary)]">{pedidoExito.solicitante_nombre || 'Sin especificar'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Monto Total:</span>
                <span className="font-bold text-emerald-500">S/ {parseFloat(pedidoExito.monto_total || '0').toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <ButtonPremium
                onClick={() => generarPdfPedidoV2(pedidoExito)}
                hasGradient
                hasRipple
                leftIcon={<Download className="w-4 h-4" />}
                className="w-full"
              >
                DESCARGAR COMPROBANTE PDF
              </ButtonPremium>

              <ButtonPremium
                onClick={() => setPedidoExito(null)}
                variant="ghost"
                className="w-full text-xs"
              >
                Cerrar y Crear Nuevo Pedido
              </ButtonPremium>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Agregar Nueva Marca */}
      <Modal isOpen={isMarcaModalOpen} onClose={() => setIsMarcaModalOpen(false)} maxWidth="sm">
        <form onSubmit={handleCrearMarca} className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">Agregar Nueva Marca Cliente</h3>
          <p className="text-xs text-[var(--text-secondary)]">Registra rápidamente una marca para este nuevo pedido.</p>
          
          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">Nombre de la Marca *</label>
            <input 
              type="text" 
              required 
              value={nuevaMarcaNombre} 
              onChange={e => {
                setNuevaMarcaNombre(e.target.value);
                if (erroresModalMarca.nombre) setErroresModalMarca(prev => ({ ...prev, nombre: undefined }));
              }}
              placeholder="Ej: Confecciones El Sol"
              className={`w-full px-3 py-2 border ${erroresModalMarca.nombre ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none`}
            />
            {erroresModalMarca.nombre && (
              <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                <span>⚠️</span> {erroresModalMarca.nombre}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-1">RUC o DNI (Opcional)</label>
            <input 
              type="text" 
              value={nuevaMarcaRuc} 
              onChange={e => {
                setNuevaMarcaRuc(e.target.value);
                if (erroresModalMarca.ruc) setErroresModalMarca(prev => ({ ...prev, ruc: undefined }));
              }}
              placeholder="Ej: 20123456789 (11 dígitos) o 72345678 (8 dígitos)"
              className={`w-full px-3 py-2 border ${erroresModalMarca.ruc ? 'border-red-500 ring-1 ring-red-500/30' : 'border-[var(--border-default)]'} rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none`}
            />
            {erroresModalMarca.ruc && (
              <p className="text-xs text-red-500 mt-1 font-medium flex items-center gap-1">
                <span>⚠️</span> {erroresModalMarca.ruc}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <ButtonPremium type="button" variant="ghost" onClick={() => setIsMarcaModalOpen(false)}>Cancelar</ButtonPremium>
            <ButtonPremium type="submit" isLoading={guardandoMarca} hasGradient>Guardar y Seleccionar</ButtonPremium>
          </div>
        </form>
      </Modal>

      {/* Modal Rediseñado Agregar/Buscar Dimensión o Tamaño */}
      <Modal isOpen={isDimModalOpen} onClose={() => setIsDimModalOpen(false)} maxWidth="md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#59BFCB]" />
                Dimensión o Tamaño del Producto
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Categoría: <span className="font-semibold text-[var(--text-primary)]">{catActual?.nombre || 'General'}</span>
              </p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex p-1 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setTabModalTamano('buscar')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tabModalTamano === 'buscar' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Search className="w-3.5 h-3.5" />
              Existentes en Categoría
            </button>
            <button
              type="button"
              onClick={() => setTabModalTamano('crear')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tabModalTamano === 'crear' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Nueva Dimensión
            </button>
          </div>

          {/* Pestaña 1: Buscar y Asignar */}
          {tabModalTamano === 'buscar' && (
            <div className="space-y-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={filtroDimCol}
                  onChange={e => setFiltroDimCol(e.target.value)}
                  placeholder="Filtrar por tamaño..."
                  className="w-full pl-9 pr-4 py-2.5 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus-ring"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[var(--border-subtle)]">
                {unassignedTamanos.filter(t => t.nombre.toLowerCase().includes(filtroDimCol.toLowerCase())).length > 0 ? (
                  unassignedTamanos.filter(t => t.nombre.toLowerCase().includes(filtroDimCol.toLowerCase())).map((t) => (
                    <div 
                      key={t.id}
                      onClick={() => handleAsignarDimensionColorExistente('tamano', t.id)}
                      className="p-3 pt-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl flex justify-between items-center cursor-pointer hover:border-[#59BFCB] transition-all group"
                    >
                      <div>
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{t.nombre}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-1.5 font-mono">({t.unidad_medida})</span>
                      </div>
                      <span className="text-xs text-[#59BFCB] group-hover:underline font-semibold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Asignar al Producto
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface-raised)]/50 rounded-xl border border-dashed border-[var(--border-subtle)]">
                    <p>No se encontraron tamaños disponibles sin asignar.</p>
                    <button 
                      type="button" 
                      onClick={() => setTabModalTamano('crear')} 
                      className="mt-2 text-[#59BFCB] font-semibold hover:underline"
                    >
                      + Crear una nueva dimensión
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pestaña 2: Crear Nuevo */}
          {tabModalTamano === 'crear' && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleCrearDimensionColorGlobal('tamano');
              }}
              className="space-y-4 pt-1"
            >
              <div className="flex gap-3 items-end bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)]">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Dimensión / Tamaño *
                  </label>
                  <input
                    type="text"
                    value={nuevoTamanoNombre}
                    onChange={e => setNuevoTamanoNombre(e.target.value)}
                    placeholder="Ej: 12x17, 14x20 o Ancho 2cm"
                    className="w-full px-3.5 py-2.5 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                    required
                    autoFocus
                  />
                </div>

                <div className="w-36">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Unidad *
                  </label>
                  <select
                    value={nuevoTamanoUnidad}
                    onChange={e => setNuevoTamanoUnidad(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none cursor-pointer"
                  >
                    <option value="pulgadas">Pulgadas (in)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <ButtonPremium 
                  type="submit"
                  isLoading={guardandoDimCol}
                  hasGradient
                  className="w-full"
                >
                  Crear y Seleccionar
                </ButtonPremium>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
            <ButtonPremium type="button" variant="ghost" onClick={() => setIsDimModalOpen(false)}>Cerrar</ButtonPremium>
          </div>
        </div>
      </Modal>

      {/* Modal Rediseñado Agregar/Buscar Color del Material */}
      <Modal isOpen={isColorModalOpen} onClose={() => setIsColorModalOpen(false)} maxWidth="md">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#59BFCB]" />
                Color del Material
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Categoría: <span className="font-semibold text-[var(--text-primary)]">{catActual?.nombre || 'General'}</span>
              </p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex p-1 bg-[var(--bg-surface-raised)] rounded-xl border border-[var(--border-default)]">
            <button
              type="button"
              onClick={() => setTabModalColor('buscar')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tabModalColor === 'buscar' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Search className="w-3.5 h-3.5" />
              Existentes en Categoría
            </button>
            <button
              type="button"
              onClick={() => setTabModalColor('crear')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${tabModalColor === 'crear' ? 'bg-[var(--brand-primary)] text-white shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Crear Nuevo Color
            </button>
          </div>

          {/* Pestaña 1: Buscar y Asignar */}
          {tabModalColor === 'buscar' && (
            <div className="space-y-3 pt-1">
              <div className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  value={filtroDimCol}
                  onChange={e => setFiltroDimCol(e.target.value)}
                  placeholder="Filtrar por color..."
                  className="w-full pl-9 pr-4 py-2.5 border border-[var(--border-default)] rounded-xl text-sm bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus-ring"
                />
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 divide-y divide-[var(--border-subtle)]">
                {unassignedColores.filter(c => c.nombre.toLowerCase().includes(filtroDimCol.toLowerCase())).length > 0 ? (
                  unassignedColores.filter(c => c.nombre.toLowerCase().includes(filtroDimCol.toLowerCase())).map((c) => (
                    <div 
                      key={c.id}
                      onClick={() => handleAsignarDimensionColorExistente('color', c.id)}
                      className="p-3 pt-2.5 bg-[var(--bg-surface-raised)] border border-[var(--border-default)] rounded-xl flex justify-between items-center cursor-pointer hover:border-[#59BFCB] transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-5 h-5 rounded-full border border-white/20 shadow-xs shrink-0" 
                          style={{ backgroundColor: c.codigo_hex || '#888' }} 
                        />
                        <span className="text-sm font-semibold text-[var(--text-primary)]">{c.nombre}</span>
                      </div>
                      <span className="text-xs text-[#59BFCB] group-hover:underline font-semibold flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Asignar al Producto
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-surface-raised)]/50 rounded-xl border border-dashed border-[var(--border-subtle)]">
                    <p>No se encontraron colores disponibles sin asignar.</p>
                    <button 
                      type="button" 
                      onClick={() => setTabModalColor('crear')} 
                      className="mt-2 text-[#59BFCB] font-semibold hover:underline"
                    >
                      + Crear un nuevo color
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pestaña 2: Crear Nuevo */}
          {tabModalColor === 'crear' && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleCrearDimensionColorGlobal('color');
              }}
              className="space-y-4 pt-1"
            >
              <div className="bg-[var(--bg-surface-raised)] p-4 rounded-xl border border-[var(--border-subtle)] space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Nombre del Color *
                  </label>
                  <input
                    type="text"
                    value={nuevoColorNombre}
                    onChange={e => setNuevoColorNombre(e.target.value)}
                    placeholder="Ej: Kraft Natural, Blanco, Negro Mate, Dorado..."
                    className="w-full px-3.5 py-2.5 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl text-sm focus:outline-none focus-ring"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                    Muestra y Código HEX
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={nuevoColorHex}
                      onChange={e => setNuevoColorHex(e.target.value)}
                      className="w-12 h-10 p-1 border border-[var(--border-default)] bg-[var(--bg-surface)] rounded-xl cursor-pointer shrink-0"
                      title="Seleccionar color"
                    />
                    <input
                      type="text"
                      value={nuevoColorHex}
                      onChange={e => setNuevoColorHex(e.target.value)}
                      placeholder="#59BFCB"
                      maxLength={7}
                      className="w-32 px-3 py-2.5 border border-[var(--border-default)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-mono text-sm uppercase rounded-xl focus:outline-none focus-ring"
                    />
                    <div className="flex-1 flex gap-1.5 items-center justify-end flex-wrap">
                      {[
                        { hex: '#c0a384', name: 'Kraft' },
                        { hex: '#ffffff', name: 'Blanco' },
                        { hex: '#1a1a1a', name: 'Negro' },
                        { hex: '#d4af37', name: 'Dorado' },
                        { hex: '#c0c0c0', name: 'Plata' },
                        { hex: '#dc2626', name: 'Rojo' }
                      ].map((preset) => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setNuevoColorHex(preset.hex)}
                          className="w-6 h-6 rounded-full border border-white/20 shadow-xs cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: preset.hex }}
                          title={`${preset.name} (${preset.hex})`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <ButtonPremium 
                  type="submit"
                  isLoading={guardandoDimCol}
                  hasGradient
                  className="w-full"
                >
                  Crear y Seleccionar
                </ButtonPremium>
              </div>
            </form>
          )}

          <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
            <ButtonPremium type="button" variant="ghost" onClick={() => setIsColorModalOpen(false)}>Cerrar</ButtonPremium>
          </div>
        </div>
      </Modal>
    </div>
  );
}
