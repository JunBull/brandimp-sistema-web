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
