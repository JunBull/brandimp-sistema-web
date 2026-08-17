import { describe, it, expect } from 'vitest';
import {
  validateNombre,
  validateDocIdentidad,
  validateTelefono,
  validateFechaEntrega,
  validateCantidad,
  validatePrecio,
  validateAdelanto,
  validateArchivo
} from '../validators';

describe('Suite de Pruebas de Validación de Entrada - Brandimp', () => {

  describe('1. validateNombre (Nombre de Solicitante y Marcas)', () => {
    // Data Type & Format
    it('debe aceptar nombres estándar con caracteres válidos y tildes', () => {
      expect(validateNombre('Juan Pérez').isValid).toBe(true);
      expect(validateNombre('Gamarra Textiles S.A.C.').isValid).toBe(true);
      expect(validateNombre('Confecciones D&G').isValid).toBe(true);
    });

    // Equivalence Partitioning
    it('debe rechazar nombres vacíos o de tipo inválido', () => {
      expect(validateNombre('').isValid).toBe(false);
      expect(validateNombre('   ').isValid).toBe(false);
      expect(validateNombre(null as any).isValid).toBe(false);
    });

    // Boundary Value Analysis (BVA)
    it('BVA: debe rechazar 1 caracter y aceptar 2 caracteres (límite inferior)', () => {
      expect(validateNombre('A').isValid).toBe(false);
      expect(validateNombre('AB').isValid).toBe(true);
    });

    it('BVA: debe aceptar 150 caracteres y rechazar 151 caracteres (límite superior)', () => {
      const char150 = 'A'.repeat(150);
      const char151 = 'A'.repeat(151);
      expect(validateNombre(char150).isValid).toBe(true);
      expect(validateNombre(char151).isValid).toBe(false);
    });

    // Negative Testing
    it('Negative: debe rechazar cadenas con caracteres sospechosos o código script', () => {
      expect(validateNombre('<script>alert(1)</script>').isValid).toBe(false);
      expect(validateNombre('DELETE FROM pedidos WHERE 1=1;').isValid).toBe(false); // Semicolon y equals no permitidos
      expect(validateNombre('$$$###%%%').isValid).toBe(false);
    });
  });

  describe('2. validateDocIdentidad (DNI, RUC y Doc Extranjero)', () => {
    // Equivalence Partitioning
    it('EP: debe aceptar vacío o null (carácter estrictamente opcional - RN-02)', () => {
      expect(validateDocIdentidad('').isValid).toBe(true);
      expect(validateDocIdentidad(null).isValid).toBe(true);
      expect(validateDocIdentidad(undefined).isValid).toBe(true);
      expect(validateDocIdentidad('   ').isValid).toBe(true);
    });

    // Format & BVA
    it('Format & BVA: debe validar DNI peruano de exactamente 8 dígitos', () => {
      expect(validateDocIdentidad('72345678').isValid).toBe(true);
      expect(validateDocIdentidad('1234567').isValid).toBe(false); // 7 dígitos
    });

    it('Format & BVA: debe validar RUC peruano de exactamente 11 dígitos', () => {
      expect(validateDocIdentidad('20601234567').isValid).toBe(true);
      expect(validateDocIdentidad('10456789012').isValid).toBe(true);
    });

    it('Format: debe aceptar documentos extranjeros de 9 a 12 caracteres alfanuméricos', () => {
      expect(validateDocIdentidad('PAS12345678').isValid).toBe(true);
      expect(validateDocIdentidad('EXT998877665').isValid).toBe(true);
    });

    // Negative Testing
    it('Negative: debe rechazar formatos no numéricos en DNI/RUC o longitudes fuera de rango', () => {
      expect(validateDocIdentidad('123456789').isValid).toBe(false); // 9 dígitos numéricos
      expect(validateDocIdentidad('20601234567890').isValid).toBe(false); // 14 caracteres
      expect(validateDocIdentidad('DNI-12345').isValid).toBe(false); // Símbolos
    });
  });

  describe('3. validateTelefono (Internacional E.164)', () => {
    // Equivalence Partitioning
    it('EP: debe aceptar teléfono vacío (campo opcional)', () => {
      expect(validateTelefono('+51', '').isValid).toBe(true);
      expect(validateTelefono('+51', '   ').isValid).toBe(true);
    });

    // Format & País específico
    it('Format: debe validar 9 dígitos para Perú (+51)', () => {
      expect(validateTelefono('+51', '987654321').isValid).toBe(true);
      expect(validateTelefono('+51', '98765432').isValid).toBe(false); // 8 dígitos
      expect(validateTelefono('+51', '9876543210').isValid).toBe(false); // 10 dígitos
    });

    it('Format: debe validar 10 dígitos para Estados Unidos (+1)', () => {
      expect(validateTelefono('+1', '2025550143').isValid).toBe(true);
      expect(validateTelefono('+1', '202555014').isValid).toBe(false);
    });

    it('Format: debe validar 9 dígitos para Chile (+56)', () => {
      expect(validateTelefono('+56', '912345678').isValid).toBe(true);
    });

    // Negative Testing
    it('Negative: debe rechazar caracteres no numéricos o letras', () => {
      expect(validateTelefono('+51', '987-abc-123').isValid).toBe(false);
      expect(validateTelefono('+51', 'telefono12').isValid).toBe(false);
    });
  });

  describe('4. validateFechaEntrega (Fecha Límite Acordada)', () => {
    const today = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    // BVA
    it('BVA: debe aceptar la fecha de hoy y de mañana', () => {
      expect(validateFechaEntrega(todayStr).isValid).toBe(true);
      expect(validateFechaEntrega(tomorrowStr).isValid).toBe(true);
    });

    it('BVA / Negative: debe rechazar fechas del pasado', () => {
      expect(validateFechaEntrega(yesterdayStr).isValid).toBe(false);
      expect(validateFechaEntrega('2020-01-01').isValid).toBe(false);
    });

    it('BVA: debe rechazar fechas más allá de 2 años en el futuro', () => {
      const future = new Date(today);
      future.setFullYear(future.getFullYear() + 3);
      const futureStr = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(future.getDate())}`;
      expect(validateFechaEntrega(futureStr).isValid).toBe(false);
    });

    // Format & Negative Testing
    it('Negative: debe rechazar fechas inválidas en el calendario o con formato erróneo', () => {
      expect(validateFechaEntrega('2026-02-30').isValid).toBe(false); // No existe 30 de feb
      expect(validateFechaEntrega('14/08/2026').isValid).toBe(false); // Formato no ISO
      expect(validateFechaEntrega('fecha-invalida').isValid).toBe(false);
      expect(validateFechaEntrega('').isValid).toBe(false);
    });
  });

  describe('5. validateCantidad (Cantidad de Items)', () => {
    // Equivalence Partitioning
    it('EP: debe aceptar cantidades enteras válidas', () => {
      expect(validateCantidad(1).isValid).toBe(true);
      expect(validateCantidad(10).isValid).toBe(true);
      expect(validateCantidad(500).isValid).toBe(true);
      expect(validateCantidad('50').isValid).toBe(true);
    });

    // Boundary Value Analysis (BVA)
    it('BVA: debe rechazar 0 o menores y aceptar 1 (límite inferior)', () => {
      expect(validateCantidad(0).isValid).toBe(false);
      expect(validateCantidad(-1).isValid).toBe(false);
      expect(validateCantidad(1).isValid).toBe(true);
    });

    it('BVA: debe aceptar 100,000 y rechazar mayores (límite superior)', () => {
      expect(validateCantidad(100000).isValid).toBe(true);
      expect(validateCantidad(100001).isValid).toBe(false);
    });

    // Negative & Format Testing
    it('Negative: debe rechazar números decimales o valores no numéricos', () => {
      expect(validateCantidad(1.5).isValid).toBe(false);
      expect(validateCantidad('abc').isValid).toBe(false);
      expect(validateCantidad(NaN).isValid).toBe(false);
      expect(validateCantidad('').isValid).toBe(false);
    });
  });

  describe('6. validatePrecio (Precio Acordado)', () => {
    // Equivalence Partitioning
    it('EP: debe aceptar precios estándar válidos', () => {
      expect(validatePrecio(100.50).isValid).toBe(true);
      expect(validatePrecio('250.00').isValid).toBe(true);
    });

    // Boundary Value Analysis (BVA)
    it('BVA: debe aceptar 0.00 (Muestra/Cortesía) y rechazar negativos', () => {
      expect(validatePrecio(0).isValid).toBe(true);
      expect(validatePrecio(0.00).isValid).toBe(true);
      expect(validatePrecio(-0.01).isValid).toBe(false);
      expect(validatePrecio(-50).isValid).toBe(false);
    });

    it('BVA: debe aceptar hasta 999,999.99 y rechazar montos superiores', () => {
      expect(validatePrecio(999999.99).isValid).toBe(true);
      expect(validatePrecio(1000000.00).isValid).toBe(false);
    });

    // Negative Testing
    it('Negative: debe rechazar valores vacíos o no numéricos', () => {
      expect(validatePrecio('').isValid).toBe(false);
      expect(validatePrecio('gratis').isValid).toBe(false);
      expect(validatePrecio(NaN).isValid).toBe(false);
    });
  });

  describe('7. validateAdelanto (Monto de Pago Inicial)', () => {
    const total = 500.00;

    // Boundary Value Analysis (BVA)
    it('BVA: debe aceptar adelanto 0 (sin pago inicial)', () => {
      expect(validateAdelanto(0, total).isValid).toBe(true);
      expect(validateAdelanto('', total).isValid).toBe(true);
    });

    it('BVA: debe aceptar pago parcial (0 < Adelanto < Total)', () => {
      expect(validateAdelanto(250.00, total).isValid).toBe(true);
      expect(validateAdelanto(499.99, total).isValid).toBe(true);
    });

    it('BVA: debe aceptar pago total del 100% (Adelanto == Total)', () => {
      expect(validateAdelanto(500.00, total).isValid).toBe(true);
    });

    it('BVA / Negative: debe rechazar adelantos mayores al total (Sobrepago)', () => {
      expect(validateAdelanto(500.01, total).isValid).toBe(false);
      expect(validateAdelanto(600.00, total).isValid).toBe(false);
    });

    it('Negative: debe rechazar adelantos negativos', () => {
      expect(validateAdelanto(-10, total).isValid).toBe(false);
    });
  });

  describe('8. validateArchivo (Extensiones y Tamaños)', () => {
    // Vectoriales
    it('debe aceptar extensiones vectoriales permitidas (.cdr, .ai, .pdf, .eps, .svg)', () => {
      const mockFileCdr = new File([''], 'logo.cdr', { type: 'application/octet-stream' });
      const mockFilePdf = new File([''], 'diseno.pdf', { type: 'application/pdf' });
      const mockFileSvg = new File([''], 'vector.svg', { type: 'image/svg+xml' });

      expect(validateArchivo(mockFileCdr, 'vectorial').isValid).toBe(true);
      expect(validateArchivo(mockFilePdf, 'vectorial').isValid).toBe(true);
      expect(validateArchivo(mockFileSvg, 'vectorial').isValid).toBe(true);
    });

    it('BVA & Negative: debe rechazar archivos vectoriales mayores a 25MB o formatos no permitidos', () => {
      const mockFileExe = new File([''], 'virus.exe', { type: 'application/x-msdownload' });
      expect(validateArchivo(mockFileExe, 'vectorial').isValid).toBe(false);

      // Simular archivo > 25MB
      const bigFile = new File([''], 'enorme.ai');
      Object.defineProperty(bigFile, 'size', { value: 26 * 1024 * 1024 });
      expect(validateArchivo(bigFile, 'vectorial').isValid).toBe(false);
    });

    // Fotografías
    it('debe aceptar extensiones de fotografía permitidas (.jpg, .jpeg, .png, .webp)', () => {
      const mockJpg = new File([''], 'foto.jpg', { type: 'image/jpeg' });
      const mockPng = new File([''], 'muestra.png', { type: 'image/png' });
      expect(validateArchivo(mockJpg, 'foto').isValid).toBe(true);
      expect(validateArchivo(mockPng, 'foto').isValid).toBe(true);
    });

    it('BVA & Negative: debe rechazar fotos mayores a 10MB', () => {
      const bigPhoto = new File([''], 'pesada.png');
      Object.defineProperty(bigPhoto, 'size', { value: 11 * 1024 * 1024 });
      expect(validateArchivo(bigPhoto, 'foto').isValid).toBe(false);
    });
  });

});
