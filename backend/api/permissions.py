from rest_framework import permissions

def get_user_rol(user):
    if not user or not user.is_authenticated:
        return None
    if user.is_superuser:
        return 'ADMIN'
    if hasattr(user, 'perfil') and user.perfil:
        return user.perfil.rol
    return 'ADMIN'  # fallback if no profile exists for superuser/default

class IsAdminUserRole(permissions.BasePermission):
    """
    Permite acceso únicamente a usuarios con el rol ADMINISTRADOR.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and get_user_rol(request.user) == 'ADMIN'

class IsVendedorUserRole(permissions.BasePermission):
    """
    Permite acceso a VENDEDORES y ADMINISTRADORES.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and get_user_rol(request.user) in ['ADMIN', 'VENDEDOR']

class CatalogoPermission(permissions.BasePermission):
    """
    Solo el ADMIN puede ver y editar categorías directamente.
    Vendedores leen productos y catálogo.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR' and request.method in permissions.SAFE_METHODS:
            return True
        return False

class TamanoColorPermission(permissions.BasePermission):
    """
    Admin: Todo (GET, POST, PUT, PATCH, DELETE).
    Vendedor: GET (lectura) y POST (crear nuevos tamaños o colores en catálogo). No PUT, PATCH, DELETE.
    Operario: Ninguno.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR':
            if request.method in permissions.SAFE_METHODS or request.method == 'POST':
                return True
            return False
        return False

class TipoProductoPermission(permissions.BasePermission):
    """
    Admin: Todo.
    Vendedor: GET (lectura) y POST exclusivamente a la acción 'guardar-asignaciones'.
              No puede crear productos, ni PUT, PATCH, DELETE.
    Operario: Ninguno.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR':
            if request.method in permissions.SAFE_METHODS:
                return True
            if getattr(view, 'action', None) == 'guardar_asignaciones' and request.method == 'POST':
                return True
            return False
        return False

class MarcaPermission(permissions.BasePermission):
    """
    Admin: Todo.
    Vendedor: GET, POST (crear marcas). No PUT, PATCH, DELETE.
    Operario: Ninguno.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR':
            if request.method in ['GET', 'POST']:
                return True
            return False
        return False

class PedidoPermission(permissions.BasePermission):
    """
    Admin: Todo.
    Vendedor: GET, POST, PATCH (solo en estado 'Registrado'), no DELETE.
    Operario: GET (solo kanban/detalles), PATCH cambiar-estado (solo avanzar).
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR':
            if request.method in ['GET', 'POST', 'PATCH', 'PUT']:
                return True
            return False
        if rol == 'OPERARIO':
            if request.method in ['GET', 'PATCH']:
                return True
            return False
        return False

class CuentasPorCobrarPermission(permissions.BasePermission):
    """
    Admin y Vendedor pueden ver cuentas por cobrar y registrar pagos.
    Solo Admin puede editar/eliminar pagos.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        rol = get_user_rol(request.user)
        if rol == 'ADMIN':
            return True
        if rol == 'VENDEDOR':
            if request.method in ['GET', 'POST']:
                return True
            return False
        return False
