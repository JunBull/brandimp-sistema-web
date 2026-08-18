from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from django.utils import timezone
from datetime import timedelta
from api.models import Marca, Pedido, EstadoProduccion, PerfilUsuario, RolUsuario

class AuthAndRBACTest(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Admin user
        self.admin_user = User.objects.create_user(username='admin', password='admin123')
        PerfilUsuario.objects.create(user=self.admin_user, rol=RolUsuario.ADMIN, nombre_completo='Admin User')

        # Vendedor user
        self.vendedor_user = User.objects.create_user(username='vendedor', password='vendedor123')
        PerfilUsuario.objects.create(user=self.vendedor_user, rol=RolUsuario.VENDEDOR, nombre_completo='Vendedor User')

        # Operario user
        self.operario_user = User.objects.create_user(username='operario', password='operario123')
        PerfilUsuario.objects.create(user=self.operario_user, rol=RolUsuario.OPERARIO, nombre_completo='Operario User')

        self.marca = Marca.objects.create(nombre="Marca Test", ruc_dni="12345678901")
        self.pedido = Pedido.objects.create(
            codigo_correlativo="PED-TEST-0001",
            marca=self.marca,
            solicitante_nombre="Juan Perez",
            fecha_entrega_acordada=timezone.now().date(),
            estado_actual=EstadoProduccion.REGISTRADO,
            monto_total=100.00
        )

    def test_login_success(self):
        response = self.client.post('/api/auth/login/', {'username': 'vendedor', 'password': 'vendedor123'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.cookies)
        self.assertEqual(response.json()['user']['rol'], 'VENDEDOR')

    def test_login_failure(self):
        response = self.client.post('/api/auth/login/', {'username': 'vendedor', 'password': 'wrongpassword'})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_vendedor_allowed(self):
        self.client.force_authenticate(user=self.vendedor_user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_dashboard_operario_forbidden(self):
        self.client.force_authenticate(user=self.operario_user)
        response = self.client.get('/api/dashboard/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_pedido_vendedor_forbidden(self):
        self.client.force_authenticate(user=self.vendedor_user)
        response = self.client.delete(f'/api/pedidos/{self.pedido.id}/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_pedido_admin_allowed(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(f'/api/pedidos/{self.pedido.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_operario_price_masking(self):
        self.client.force_authenticate(user=self.operario_user)
        response = self.client.get(f'/api/pedidos/{self.pedido.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIsNone(data['monto_total'])
        self.assertEqual(data['pagos'], [])

    def test_operario_cannot_rewind_state(self):
        self.client.force_authenticate(user=self.operario_user)
        # Advance to En producción
        self.client.patch(f'/api/pedidos/{self.pedido.id}/cambiar-estado/', {'estado': 'En producción'})
        # Attempt rewind to Registrado
        response = self.client.patch(f'/api/pedidos/{self.pedido.id}/cambiar-estado/', {'estado': 'Registrado'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_vendedor_can_create_tamano_and_color(self):
        from api.models import Categoria, TipoProducto
        cat = Categoria.objects.create(nombre="Bolsas Ecológicas")
        prod = TipoProducto.objects.create(categoria=cat, nombre="Bolsa Notex", precio_millar=150.00)
        
        self.client.force_authenticate(user=self.vendedor_user)

        # 1. Vendedor crea nuevo tamaño
        resp_tam = self.client.post('/api/tamanos/', {
            'categoria': str(cat.id),
            'nombre': '15x25',
            'unidad_medida': 'pulgadas',
            'orden': 0
        }, format='json')
        self.assertEqual(resp_tam.status_code, status.HTTP_201_CREATED)
        tam_id = resp_tam.json()['id']

        # 2. Vendedor crea nuevo color
        resp_col = self.client.post('/api/colores-producto/', {
            'categoria': str(cat.id),
            'nombre': 'Verde Olivo',
            'codigo_hex': '#556B2F',
            'orden': 0
        }, format='json')
        self.assertEqual(resp_col.status_code, status.HTTP_201_CREATED)
        col_id = resp_col.json()['id']

        # 3. Vendedor guarda asignaciones al producto
        resp_asig = self.client.post(f'/api/tipos-producto/{prod.id}/guardar-asignaciones/', {
            'tamanos_ids': [tam_id],
            'colores_ids': [col_id]
        }, format='json')
        self.assertEqual(resp_asig.status_code, status.HTTP_200_OK)

        # 4. Vendedor no puede eliminar tamaño ni producto
        resp_del_tam = self.client.delete(f'/api/tamanos/{tam_id}/')
        self.assertEqual(resp_del_tam.status_code, status.HTTP_403_FORBIDDEN)

        resp_del_prod = self.client.delete(f'/api/tipos-producto/{prod.id}/')
        self.assertEqual(resp_del_prod.status_code, status.HTTP_403_FORBIDDEN)

    def test_operario_cannot_create_tamano_or_color(self):
        from api.models import Categoria
        cat = Categoria.objects.create(nombre="Etiquetas")
        self.client.force_authenticate(user=self.operario_user)

        resp_tam = self.client.post('/api/tamanos/', {
            'categoria': str(cat.id),
            'nombre': '2x5',
            'unidad_medida': 'cm',
            'orden': 0
        }, format='json')
        self.assertEqual(resp_tam.status_code, status.HTTP_403_FORBIDDEN)

        resp_col = self.client.post('/api/colores-producto/', {
            'categoria': str(cat.id),
            'nombre': 'Dorado',
            'codigo_hex': '#D4AF37',
            'orden': 0
        }, format='json')
        self.assertEqual(resp_col.status_code, status.HTTP_403_FORBIDDEN)

