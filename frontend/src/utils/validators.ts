/**
 * Utilidades de validación para el módulo Nuevo Pedido de Brandimp
 * Aplica: Data Type & Format, Equivalence Partitioning, Negative Testing, BVA
 */

export interface CountryCode {
  code: string;
  country: string;
  flag: string;
  minLength: number;
  maxLength: number;
  placeholder: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: '+51', country: 'Perú', flag: '🇵🇪', minLength: 9, maxLength: 9, placeholder: '987654321' },
  { code: '+1', country: 'Estados Unidos / Canadá', flag: '🇺🇸', minLength: 10, maxLength: 10, placeholder: '2025550143' },
  { code: '+56', country: 'Chile', flag: '🇨🇱', minLength: 9, maxLength: 9, placeholder: '912345678' },
  { code: '+57', country: 'Colombia', flag: '🇨🇴', minLength: 10, maxLength: 10, placeholder: '3001234567' },
  { code: '+54', country: 'Argentina', flag: '🇦🇷', minLength: 10, maxLength: 11, placeholder: '1123456789' },
  { code: '+52', country: 'México', flag: '🇲🇽', minLength: 10, maxLength: 10, placeholder: '5512345678' },
  { code: '+34', country: 'España', flag: '🇪🇸', minLength: 9, maxLength: 9, placeholder: '612345678' },
  { code: '+591', country: 'Bolivia', flag: '🇧🇴', minLength: 8, maxLength: 8, placeholder: '71234567' },
  { code: '+593', country: 'Ecuador', flag: '🇪🇨', minLength: 9, maxLength: 9, placeholder: '991234567' },
  { code: '+55', country: 'Brasil', flag: '🇧🇷', minLength: 10, maxLength: 11, placeholder: '11987654321' },
  { code: '+507', country: 'Panamá', flag: '🇵🇦', minLength: 8, maxLength: 8, placeholder: '61234567' }
];

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Valida nombres de personas o marcas
 * BVA: [2, 150] caracteres
 */
export function validateNombre(nombre: string, campo: string = 'El nombre'): ValidationResult {
  if (!nombre || typeof nombre !== 'string') {
    return { isValid: false, error: `${campo} es requerido.` };
  }
  const trimmed = nombre.trim();
  if (trimmed.length < 2) {
    return { isValid: false, error: `${campo} debe tener al menos 2 caracteres.` };
  }
  if (trimmed.length > 150) {
    return { isValid: false, error: `${campo} no puede exceder los 150 caracteres.` };
  }
  // Verificar que contenga al menos una letra válida (evitar solo símbolos extraños)
  if (!/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s.,&'-]+$/.test(trimmed)) {
    return { isValid: false, error: `${campo} contiene caracteres inválidos.` };
  }
  return { isValid: true };
}

/**
 * Valida Documento de Identidad (DNI, RUC o Doc Extranjero)
 * Opcional: si está vacío o null, es válido (RN-02).
 */
export function validateDocIdentidad(doc: string | null | undefined): ValidationResult {
  if (!doc || doc.trim() === '') {
    return { isValid: true }; // Opcional
  }
  const cleanDoc = doc.trim();
  
  // DNI: 8 dígitos numéricos
  if (/^\d{8}$/.test(cleanDoc)) {
    return { isValid: true };
  }
  // RUC: 11 dígitos numéricos (usualmente comienza con 10, 15, 17, 20)
  if (/^\d{11}$/.test(cleanDoc)) {
    return { isValid: true };
  }
  // Documento extranjero / Carnet de Extranjería / Pasaporte: 9 a 12 caracteres alfanuméricos (que contengan al menos una letra)
  if (/^(?=.*[a-zA-Z])[A-Za-z0-9]{9,12}$/.test(cleanDoc)) {
    return { isValid: true };
  }

  return {
    isValid: false,
    error: 'El documento debe ser un DNI (8 dígitos), RUC (11 dígitos) o ID extranjero válido (9-12 caracteres con letras y números).'
  };
}

/**
 * Valida teléfono internacional (E.164)
 * Opcional si número está vacío.
 */
export function validateTelefono(prefijo: string, numero: string): ValidationResult {
  if (!numero || numero.trim() === '') {
    return { isValid: true }; // Opcional
  }
  const cleanNum = numero.trim().replace(/[\s-]/g, '');
  
  // Solo dígitos
  if (!/^\d+$/.test(cleanNum)) {
    return { isValid: false, error: 'El teléfono solo debe contener números.' };
  }

  const country = COUNTRY_CODES.find(c => c.code === prefijo);
  if (country) {
    if (cleanNum.length < country.minLength || cleanNum.length > country.maxLength) {
      if (country.minLength === country.maxLength) {
        return { isValid: false, error: `Para ${country.country}, el número debe tener ${country.minLength} dígitos.` };
      }
      return { isValid: false, error: `Para ${country.country}, el número debe tener entre ${country.minLength} y ${country.maxLength} dígitos.` };
    }
  } else {
    // Validación genérica E.164: 6 a 12 dígitos
    if (cleanNum.length < 6 || cleanNum.length > 12) {
      return { isValid: false, error: 'El número de teléfono debe tener entre 6 y 12 dígitos.' };
    }
  }

  const fullPhone = `${prefijo}${cleanNum}`;
  if (fullPhone.length > 15) {
    return { isValid: false, error: 'El teléfono completo no debe exceder 15 caracteres (estándar E.164).' };
  }

  return { isValid: true };
}

/**
 * Valida Fecha de Entrega acordada
 * BVA: fecha >= hoy (en hora local) y <= hoy + 2 años
 */
export function validateFechaEntrega(fechaStr: string): ValidationResult {
  if (!fechaStr || fechaStr.trim() === '') {
    return { isValid: false, error: 'La fecha de entrega es requerida.' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
    return { isValid: false, error: 'Formato de fecha inválido (debe ser YYYY-MM-DD).' };
  }

  const [year, month, day] = fechaStr.split('-').map(Number);
  const inputDate = new Date(year, month - 1, day);
  
  // Validar existencia de fecha real (ej. no 2026-02-30)
  if (inputDate.getFullYear() !== year || inputDate.getMonth() !== month - 1 || inputDate.getDate() !== day) {
    return { isValid: false, error: 'La fecha ingresada no existe en el calendario.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (inputDate < today) {
    return { isValid: false, error: 'La fecha de entrega no puede ser anterior a hoy.' };
  }

  const maxDate = new Date(today);
  maxDate.setFullYear(maxDate.getFullYear() + 2);

  if (inputDate > maxDate) {
    return { isValid: false, error: 'La fecha de entrega no puede superar 2 años a partir de hoy.' };
  }

  return { isValid: true };
}

/**
 * Valida Cantidad de Producto
 * BVA: entero >= 1, <= 1,000,000
 */
export function validateCantidad(cant: any): ValidationResult {
  if (cant === '' || cant === null || cant === undefined) {
    return { isValid: false, error: 'La cantidad es requerida.' };
  }
  const num = Number(cant);
  if (isNaN(num)) {
    return { isValid: false, error: 'La cantidad debe ser un número válido.' };
  }
  if (!Number.isInteger(num)) {
    return { isValid: false, error: 'La cantidad debe ser un número entero (sin decimales).' };
  }
  if (num < 1) {
    return { isValid: false, error: 'La cantidad debe ser mayor o igual a 1.' };
  }
  if (num > 100000) {
    return { isValid: false, error: 'La cantidad no puede superar 100,000 unidades.' };
  }
  return { isValid: true };
}

/**
 * Valida Precio Acordado
 * BVA: decimal >= 0.00, <= 999,999.99
 */
export function validatePrecio(precio: any): ValidationResult {
  if (precio === '' || precio === null || precio === undefined) {
    return { isValid: false, error: 'El precio es requerido.' };
  }
  const num = Number(precio);
  if (isNaN(num)) {
    return { isValid: false, error: 'El precio debe ser un número válido.' };
  }
  if (num < 0) {
    return { isValid: false, error: 'El precio no puede ser negativo.' };
  }
  if (num > 999999.99) {
    return { isValid: false, error: 'El precio no puede superar S/. 999,999.99.' };
  }
  return { isValid: true };
}

/**
 * Valida Adelanto de Pago vs Monto Total
 * BVA: decimal >= 0.00, <= total
 */
export function validateAdelanto(adelanto: any, montoTotal: number): ValidationResult {
  if (adelanto === '' || adelanto === null || adelanto === undefined) {
    return { isValid: true }; // Se interpreta como 0
  }
  const num = Number(adelanto);
  if (isNaN(num)) {
    return { isValid: false, error: 'El adelanto debe ser un número válido.' };
  }
  if (num < 0) {
    return { isValid: false, error: 'El adelanto no puede ser negativo.' };
  }
  // Tolerancia de redondeo por centavos
  const totalRedondeado = Math.round((montoTotal + Number.EPSILON) * 100) / 100;
  const adelantoRedondeado = Math.round((num + Number.EPSILON) * 100) / 100;

  if (adelantoRedondeado > totalRedondeado) {
    return {
      isValid: false,
      error: `El adelanto (S/. ${adelantoRedondeado.toFixed(2)}) no puede exceder el monto total (S/. ${totalRedondeado.toFixed(2)}).`
    };
  }
  return { isValid: true };
}

/**
 * Valida Archivos Adjuntos (Formato y Tamaño)
 * Vectorial: .cdr, .ai, .pdf, .eps, .svg <= 25MB
 * Foto: .jpg, .jpeg, .png, .webp <= 10MB
 */
export function validateArchivo(file: File, tipo: 'vectorial' | 'foto'): ValidationResult {
  if (!file) return { isValid: true };

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  
  if (tipo === 'vectorial') {
    const validExts = ['cdr', 'ai', 'pdf', 'eps', 'svg'];
    if (!validExts.includes(ext)) {
      return {
        isValid: false,
        error: `Formato ".${ext}" no permitido para diseño vectorial. Formatos aceptados: .cdr, .ai, .pdf, .eps, .svg`
      };
    }
    const maxBytes = 25 * 1024 * 1024; // 25 MB
    if (file.size > maxBytes) {
      return {
        isValid: false,
        error: `El archivo vectorial (${(file.size / (1024 * 1024)).toFixed(1)} MB) supera el límite máximo de 25 MB.`
      };
    }
  } else if (tipo === 'foto') {
    const validExts = ['jpg', 'jpeg', 'png', 'webp'];
    if (!validExts.includes(ext)) {
      return {
        isValid: false,
        error: `Formato ".${ext}" no permitido para fotografía. Formatos aceptados: .jpg, .jpeg, .png, .webp`
      };
    }
    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxBytes) {
      return {
        isValid: false,
        error: `La fotografía (${(file.size / (1024 * 1024)).toFixed(1)} MB) supera el límite máximo de 10 MB.`
      };
    }
  }

  return { isValid: true };
}
