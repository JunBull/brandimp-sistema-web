export interface CampoConfig {
  x: number;          // Posición X en mm
  y: number;          // Posición Y en mm
  fontSize: number;   // Tamaño de fuente en pt
  fontWeight: 'normal' | 'bold';
  color: [number, number, number]; // RGB
  align?: 'left' | 'center' | 'right';
  maxWidth?: number;  // Ancho máximo en mm
}

export interface FilaTablaConfig {
  y: number;
  cantidadX: number;
  descripcionX: number;
  descripcionMaxWidth: number;
  precioX: number;
}

export const pdfPedidoConfig = {
  // Dimensiones de la página A4 Horizontal
  page: {
    orientation: 'landscape' as const,
    unit: 'mm' as const,
    format: 'a4' as const,
    width: 297,
    height: 210,
  },

  // Checkbox de CONTRATO (Marca ✓)
  checkContrato: {
    x: 277,
    y: 23.5,
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: [89, 191, 203] as [number, number, number], // Turquesa
    align: 'center' as const,
  },

  // Código Correlativo (PED-2026-0001) en recuadro rosado
  codigoCorrelativo: {
    x: 241,
    y: 58.5,
    fontSize: 19,
    fontWeight: 'bold' as const,
    color: [148, 120, 180] as [number, number, number],
    align: 'center' as const,
  },

  // Señor/a (Nombre del Solicitante)
  solicitanteNombre: {
    x: 38.5,
    y: 79.5,
    fontSize: 13.5,
    fontWeight: 'bold' as const,
    color: [98, 87, 114] as [number, number, number],
    align: 'left' as const,
    maxWidth: 145,
  },

  // Fecha (Formateada DD/MM/YYYY)
  fecha: {
    x: 218.5,
    y: 80,
    fontSize: 14.5,
    fontWeight: 'bold' as const,
    color: [98, 87, 114] as [number, number, number],
    align: 'center' as const,
  },

  // Marca
  marcaNombre: {
    x: 34,
    y: 91.5,
    fontSize: 13.5,
    fontWeight: 'bold' as const,
    color: [98, 87, 114] as [number, number, number],
    align: 'left' as const,
    maxWidth: 145,
  },

  // Celular
  celular: {
    x: 211.5,
    y: 91.5,
    fontSize: 14.5,
    fontWeight: 'bold' as const,
    color: [98, 87, 114] as [number, number, number],
    align: 'left' as const,
    maxWidth: 70,
  },

  // Tabla de Productos (hasta 5 filas)
  tabla: {
    fontSize: 15,
    fontWeight: 'normal' as const,
    color: [98, 87, 114] as [number, number, number],
    maxFilas: 6,
    filas: [
      { y: 112.4, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
      { y: 121.2, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
      { y: 130, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
      { y: 138.7, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
      { y: 147.5, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
      { y: 156.2, cantidadX: 29.5, descripcionX: 49.5, descripcionMaxWidth: 175, precioX: 281 },
    ] as FilaTablaConfig[],
  },

  // Totales (Derecha abajo)
  total: {
    x: 276.5,
    y: 170,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: [148, 120, 180] as [number, number, number],
    align: 'right' as const,
  },

  aCuenta: {
    x: 276.5,
    y: 182.5,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: [148, 120, 180] as [number, number, number], // Verde
    align: 'right' as const,
  },

  saldo: {
    x: 276.5,
    y: 194.5,
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: [148, 120, 180] as [number, number, number], // Rojo
    align: 'right' as const,
  },
};
