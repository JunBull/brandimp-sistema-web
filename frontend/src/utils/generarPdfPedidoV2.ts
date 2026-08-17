import { jsPDF } from 'jspdf';
import { fondoPdfBase64 } from '../assets/fondoPdfBase64';
import { pdfPedidoConfig } from './pdfPedidoConfig';

export interface DetallePdf {
  tipo_producto_nombre?: string | null;
  producto_nombre?: string | null;
  categoria_nombre?: string | null;
  cantidad?: number | string | null;
  unidad_medida?: string | null;
  precio_final_acordado?: number | string | null;
  tamano_nombre?: string | null;
  color_nombre?: string | null;
  num_colores_estampado?: number | null;
  tipo_servicio?: string | null;
}

export interface PedidoPdf {
  codigo_correlativo?: string | null;
  marca_nombre?: string | null;
  solicitante_nombre?: string | null;
  solicitante_telefono?: string | number | null;
  fecha_entrega_acordada?: string | null;
  monto_total?: string | number | null;
  total_pagado?: string | number | null;
  saldo_pendiente?: string | number | null;
  detalles?: DetallePdf[] | null;
}

/**
 * Convierte cualquier valor a string de forma segura sin fallar jamás
 */
function safeString(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

/**
 * Formatea un número con comas de millar usando solo caracteres ASCII seguros (0-9 y comas)
 */
function formatearNumeroAscii(num: number): string {
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Convierte la cantidad según la unidad de medida:
 * Millar -> cantidad * 1000
 * Ciento -> cantidad * 100
 * Unidad -> cantidad
 */
function calcularCantidadNumerica(cantidadRaw: any, unidadMedidaRaw: any): string {
  const cantidad = parseFloat(safeString(cantidadRaw)) || 0;
  const unidadLower = safeString(unidadMedidaRaw).toLowerCase().trim();

  if (unidadLower.includes('millar')) {
    return formatearNumeroAscii(cantidad * 1000);
  }
  if (unidadLower.includes('ciento')) {
    return formatearNumeroAscii(cantidad * 100);
  }
  return formatearNumeroAscii(cantidad);
}

export function generarPdfPedidoV2(pedido: PedidoPdf) {
  try {
    if (!pedido) {
      console.error('generarPdfPedidoV2: Objeto pedido es nulo o indefinido.');
      return;
    }

    const cfg = pdfPedidoConfig;

    // 1. Crear documento PDF A4 Horizontal
    const doc = new jsPDF({
      orientation: cfg.page.orientation,
      unit: cfg.page.unit,
      format: cfg.page.format,
    });

    // 2. Colocar imagen de fondo (Base64 síncrono garantizado)
    doc.addImage(fondoPdfBase64, 'JPEG', 0, 0, cfg.page.width, cfg.page.height);

    // Helper para aplicar estilos de fuente y color
    const aplicarEstilo = (campo: {
      fontSize: number;
      fontWeight: 'normal' | 'bold';
      color: [number, number, number];
    }) => {
      doc.setFont('helvetica', campo.fontWeight || 'normal');
      doc.setFontSize(campo.fontSize || 10);
      const [r, g, b] = campo.color || [0, 0, 0];
      doc.setTextColor(r, g, b);
    };

    // Helper para escribir texto garantizando SIEMPRE tipo string puro
    const escribirTexto = (
      val: any,
      campo: {
        x: number;
        y: number;
        fontSize: number;
        fontWeight: 'normal' | 'bold';
        color: [number, number, number];
        align?: 'left' | 'center' | 'right';
        maxWidth?: number;
      }
    ) => {
      const strVal = safeString(val).trim();
      if (!strVal) return;

      aplicarEstilo(campo);
      const options: { align?: 'left' | 'center' | 'right'; maxWidth?: number } = {};
      if (campo.align) options.align = campo.align;
      if (campo.maxWidth) options.maxWidth = campo.maxWidth;

      doc.text(strVal, campo.x, campo.y, options);
    };

    // 3. Marca X en checkbox CONTRATO (Usando 'X' ASCII estándar)
    escribirTexto('X', cfg.checkContrato);

    // 4. Código Correlativo
    escribirTexto(pedido.codigo_correlativo, cfg.codigoCorrelativo);

    // 5. Señor/a (Nombre Solicitante)
    escribirTexto(pedido.solicitante_nombre, cfg.solicitanteNombre);

    // 6. Fecha actual (DD/MM/YYYY)
    const fechaHoy = new Date().toLocaleDateString('es-PE');
    escribirTexto(fechaHoy, cfg.fecha);

    // 7. Marca
    escribirTexto(pedido.marca_nombre, cfg.marcaNombre);

    // 8. Celular
    if (pedido.solicitante_telefono) {
      escribirTexto(pedido.solicitante_telefono, cfg.celular);
    }

    // 9. Tabla de Productos (hasta máximo 5 filas)
    const detallesList = Array.isArray(pedido.detalles) ? pedido.detalles : [];
    const detallesMax = detallesList.slice(0, cfg.tabla.maxFilas);

    detallesMax.forEach((det, idx) => {
      const filaCfg = cfg.tabla.filas[idx];
      if (!filaCfg || !det) return;

      aplicarEstilo(cfg.tabla);

      // Cantidad convertida (garantizado string)
      const cantidadNumStr = calcularCantidadNumerica(det.cantidad, det.unidad_medida);
      doc.text(safeString(cantidadNumStr), filaCfg.cantidadX, filaCfg.y, { align: 'center' });

      // Descripción del producto
      const prodNombre = safeString(det.tipo_producto_nombre || det.producto_nombre).trim();
      const catNombre = safeString(det.categoria_nombre).trim();
      let desc = prodNombre || catNombre || 'Producto';

      const extraSpecs: string[] = [];
      if (det.tamano_nombre) {
        extraSpecs.push(safeString(det.tamano_nombre));
      }
      if (det.color_nombre) {
        extraSpecs.push(safeString(det.color_nombre));
      }
      if (det.tipo_servicio) {
        extraSpecs.push(`Servicio: ${safeString(det.tipo_servicio)}`);
      }
      if (det.num_colores_estampado && Number(det.num_colores_estampado) > 0) {
        extraSpecs.push(`Estampado: ${det.num_colores_estampado} col.`);
      }
      if (extraSpecs.length > 0) {
        desc += ` (${extraSpecs.join(', ')})`;
      }

      doc.text(safeString(desc), filaCfg.descripcionX, filaCfg.y, {
        align: 'left',
        maxWidth: filaCfg.descripcionMaxWidth,
      });

      // Precio
      const precioVal = parseFloat(safeString(det.precio_final_acordado)) || 0;
      const precioFormatted = `S/ ${precioVal.toFixed(2)}`;
      doc.text(safeString(precioFormatted), filaCfg.precioX, filaCfg.y, { align: 'right' });
    });

    // 10. Totales (Monto Total, Adelanto/A Cuenta, Saldo Pendiente)
    const total = parseFloat(safeString(pedido.monto_total)) || 0;

    const totalPagadoVal = pedido.total_pagado !== undefined && pedido.total_pagado !== null
      ? parseFloat(safeString(pedido.total_pagado))
      : (total / 2);
    const totalPagado = isNaN(totalPagadoVal) ? 0 : totalPagadoVal;

    const saldoVal = pedido.saldo_pendiente !== undefined && pedido.saldo_pendiente !== null
      ? parseFloat(safeString(pedido.saldo_pendiente))
      : (total - totalPagado);
    const saldoPendiente = isNaN(saldoVal) ? 0 : saldoVal;

    escribirTexto(`S/ ${total.toFixed(2)}`, cfg.total);
    escribirTexto(`S/ ${totalPagado.toFixed(2)}`, cfg.aCuenta);
    escribirTexto(`S/ ${saldoPendiente.toFixed(2)}`, cfg.saldo);

    // 11. DESCARGA DIRECTA GARANTIZADA + Intento de Pestaña de Previsualización
    const nombreArchivo = `${safeString(pedido.codigo_correlativo || 'pedido')}_comprobante.pdf`;

    // A. Forzar siempre la descarga directa del archivo PDF (100% confiable frente a bloqueadores de popups)
    doc.save(nombreArchivo);

    // B. Intentar también abrir la vista previa en nueva pestaña si el navegador no lo bloquea
    try {
      const pdfBlobUrl = doc.output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    } catch (e) {
      // Si el navegador bloquea la pestaña, no importa porque doc.save ya descargó el archivo
    }
  } catch (err: any) {
    console.error('Error durante la generación del PDF V2:', err);
  }
}
