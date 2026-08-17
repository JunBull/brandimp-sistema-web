import datetime
from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from api.models import Categoria, TipoProducto, Marca, Pedido, PerfilUsuario, RolUsuario

class PedidoValidationTests(TestCase):
    """
    Suite de Pruebas de Validación de Entrada para el endpoint /api/pedidos/ y /api/marcas/
    Aplica: Data Type & Format, Equivalence Partitioning, Negative Testing, Boundary Value Analysis (BVA)
    """

    def setUp(self):
        self.client = APIClient()
        
        # Crear usuario vendedor para autenticar
        self.user = User.objects.create_user(username='vendedor_val', password='password123')
        self.perfil = PerfilUsuario.objects.create(user=self.user, rol=RolUsuario.VENDEDOR)
        self.client.force_authenticate(user=self.user)

        # Crear datos maestros base
        self.categoria = Categoria.objects.create(nombre='Bolsas')
        self.tipo_producto = TipoProducto.objects.create(
            categoria=self.categoria,
            nombre='Bolsa Kraft 12x17',
            precio_millar=120.00,
            precio_ciento=15.00,
            precio_unidad=0.20
        )
        self.marca = Marca.objects.create(
            nombre='Textiles Lima',
            ruc_dni='20123456789'
        )

        self.today = timezone.localdate()
        self.tomorrow = self.today + datetime.timedelta(days=1)
        self.yesterday = self.today - datetime.timedelta(days=1)

    # =========================================================================
    # 1. PRUEBAS DE TIPO DE DATO Y FORMATO (DATA TYPE & FORMAT TESTING)
    # =========================================================================
    def test_format_ruc_dni_valido_e_invalido(self):
        # DNI válido (8 dígitos)
        resp_dni = self.client.post('/api/marcas/', {'nombre': 'Marca DNI', 'ruc_dni': '72345678'}, format='json')
        self.assertEqual(resp_dni.status_code, status.HTTP_201_CREATED)

        # RUC válido (11 dígitos)
        resp_ruc = self.client.post('/api/marcas/', {'nombre': 'Marca RUC', 'ruc_dni': '20601234567'}, format='json')
        self.assertEqual(resp_ruc.status_code, status.HTTP_201_CREATED)

        # Doc extranjero válido (letras y números 9-12)
        resp_ext = self.client.post('/api/marcas/', {'nombre': 'Marca Ext', 'ruc_dni': 'PAS12345678'}, format='json')
        self.assertEqual(resp_ext.status_code, status.HTTP_201_CREATED)

        # Formato inválido (letras en RUC o longitud incorrecta)
        resp_bad = self.client.post('/api/marcas/', {'nombre': 'Marca Bad', 'ruc_dni': '123456789'}, format='json')
        self.assertEqual(resp_bad.status_code, status.HTTP_400_BAD_REQUEST)

    def test_format_telefono_internacional(self):
        payload_valid = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Carlos Mendoza',
            'solicitante_telefono': '+51987654321',
            'fecha_entrega_acordada': str(self.tomorrow),
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 1,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 120.00
            }]
        }
        res = self.client.post('/api/pedidos/', payload_valid, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        # Teléfono con letras o formato malicioso
        payload_invalid = payload_valid.copy()
        payload_invalid['solicitante_telefono'] = '+51-abc-999-invalid'
        res_bad = self.client.post('/api/pedidos/', payload_invalid, format='json')
        self.assertEqual(res_bad.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 2. PARTICIÓN DE EQUIVALENCIA (EQUIVALENCE PARTITIONING)
    # =========================================================================
    def test_equivalence_partition_pago_adelanto(self):
        # Clase Válida 1: Sin adelanto (0.00)
        payload_sin_adelanto = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Ana Belén',
            'fecha_entrega_acordada': str(self.tomorrow),
            'adelanto_monto': 0.00,
            'adelanto_metodo_pago': 'Efectivo',
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 2,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 240.00
            }]
        }
        res1 = self.client.post('/api/pedidos/', payload_sin_adelanto, format='json')
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Clase Válida 2: Adelanto parcial (0 < Adelanto < Total)
        payload_parcial = payload_sin_adelanto.copy()
        payload_parcial['adelanto_monto'] = 100.00
        res2 = self.client.post('/api/pedidos/', payload_parcial, format='json')
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)

        # Clase Válida 3: Adelanto 100% total (Adelanto == Total)
        payload_total = payload_sin_adelanto.copy()
        payload_total['adelanto_monto'] = 240.00
        res3 = self.client.post('/api/pedidos/', payload_total, format='json')
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)

        # Clase Inválida: Adelanto > Total (Sobrepago no permitido)
        payload_excedido = payload_sin_adelanto.copy()
        payload_excedido['adelanto_monto'] = 300.00
        res4 = self.client.post('/api/pedidos/', payload_excedido, format='json')
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('adelanto_monto', res4.data)

    # =========================================================================
    # 3. PRUEBAS NEGATIVAS (NEGATIVE TESTING)
    # =========================================================================
    def test_negative_fechas_pasadas_rechazadas(self):
        payload = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Pedro Pascal',
            'fecha_entrega_acordada': str(self.yesterday),  # Fecha de ayer
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 1,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 100.00
            }]
        }
        res = self.client.post('/api/pedidos/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('fecha_entrega_acordada', res.data)

    def test_negative_pedido_sin_detalles(self):
        payload = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Pedro Pascal',
            'fecha_entrega_acordada': str(self.tomorrow),
            'detalles': []
        }
        res = self.client.post('/api/pedidos/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_negative_montos_negativos(self):
        payload = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Lucía Ramos',
            'fecha_entrega_acordada': str(self.tomorrow),
            'adelanto_monto': -50.00,
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 1,
                'unidad_medida': 'Millar',
                'precio_final_acordado': -10.00
            }]
        }
        res = self.client.post('/api/pedidos/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # =========================================================================
    # 4. ANÁLISIS DE VALORES LÍMITE (BOUNDARY VALUE ANALYSIS - BVA)
    # =========================================================================
    def test_bva_cantidad_items(self):
        # Límite inferior inválido: 0
        payload_zero = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Test BVA',
            'fecha_entrega_acordada': str(self.tomorrow),
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 0,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 100.00
            }]
        }
        res_zero = self.client.post('/api/pedidos/', payload_zero, format='json')
        self.assertEqual(res_zero.status_code, status.HTTP_400_BAD_REQUEST)

        # Límite inferior válido: 1
        payload_one = payload_zero.copy()
        payload_one['detalles'] = [{
            'tipo_producto': str(self.tipo_producto.id),
            'cantidad': 1,
            'unidad_medida': 'Millar',
            'precio_final_acordado': 100.00
        }]
        res_one = self.client.post('/api/pedidos/', payload_one, format='json')
        self.assertEqual(res_one.status_code, status.HTTP_201_CREATED)

        # Límite superior válido: 100,000
        payload_max = payload_zero.copy()
        payload_max['detalles'] = [{
            'tipo_producto': str(self.tipo_producto.id),
            'cantidad': 100000,
            'unidad_medida': 'Millar',
            'precio_final_acordado': 100.00
        }]
        res_max = self.client.post('/api/pedidos/', payload_max, format='json')
        self.assertEqual(res_max.status_code, status.HTTP_201_CREATED)

        # Límite superior inválido: 100,001
        payload_overflow = payload_zero.copy()
        payload_overflow['detalles'] = [{
            'tipo_producto': str(self.tipo_producto.id),
            'cantidad': 100001,
            'unidad_medida': 'Millar',
            'precio_final_acordado': 100.00
        }]
        res_overflow = self.client.post('/api/pedidos/', payload_overflow, format='json')
        self.assertEqual(res_overflow.status_code, status.HTTP_400_BAD_REQUEST)

    def test_bva_fecha_hoy_y_futuro(self):
        # Fecha de Hoy (Límite inferior válido)
        payload_today = {
            'marca': str(self.marca.id),
            'solicitante_nombre': 'Límite Fecha Hoy',
            'fecha_entrega_acordada': str(self.today),
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 1,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 50.00
            }]
        }
        res = self.client.post('/api/pedidos/', payload_today, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_solicitante_nombre_opcional(self):
        # Pedido sin solicitante_nombre ni teléfono debe crearse exitosamente
        payload_sin_solicitante = {
            'marca': str(self.marca.id),
            'fecha_entrega_acordada': str(self.tomorrow),
            'detalles': [{
                'tipo_producto': str(self.tipo_producto.id),
                'cantidad': 1,
                'unidad_medida': 'Millar',
                'precio_final_acordado': 120.00
            }]
        }
        res = self.client.post('/api/pedidos/', payload_sin_solicitante, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['solicitante_nombre'], '')

