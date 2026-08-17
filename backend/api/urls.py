from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoriaViewSet, TipoProductoViewSet, MarcaViewSet, 
    PedidoViewSet, PagoPedidoViewSet, TamanoViewSet, 
    ColorProductoViewSet, DashboardView, BusquedaGlobalView,
    LoginView, LogoutView, MeView, UsuarioViewSet
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categoria')
router.register(r'tipos-producto', TipoProductoViewSet, basename='tipo-producto')
router.register(r'marcas', MarcaViewSet, basename='marca')
router.register(r'pedidos', PedidoViewSet, basename='pedido')
router.register(r'pagos', PagoPedidoViewSet, basename='pago')
router.register(r'tamanos', TamanoViewSet, basename='tamano')
router.register(r'colores-producto', ColorProductoViewSet, basename='color-producto')
router.register(r'usuarios', UsuarioViewSet, basename='usuario')

urlpatterns = [
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/me/', MeView.as_view(), name='auth-me'),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('busqueda-global/', BusquedaGlobalView.as_view(), name='busqueda-global'),
    path('', include(router.urls)),
]
