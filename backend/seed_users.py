import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth.models import User
from api.models import PerfilUsuario, RolUsuario, Pedido, DetallePedido, HistorialEstadosPedido, PagoPedido

def reset_pedidos_y_configurar_admin_unico():
    print("=" * 60)
    print("SANEAMIENTO DE BASE DE DATOS Y CONFIGURACIÓN DE USUARIO ÚNICO")
    print("=" * 60)

    # 1. Vaciar pedidos y datos operacionales asociados
    pagos_count = PagoPedido.objects.all().count()
    hist_count = HistorialEstadosPedido.objects.all().count()
    det_count = DetallePedido.objects.all().count()
    pedidos_count = Pedido.objects.all().count()

    PagoPedido.objects.all().delete()
    HistorialEstadosPedido.objects.all().delete()
    DetallePedido.objects.all().delete()
    Pedido.objects.all().delete()

    print(f"-> Pedidos eliminados: {pedidos_count}")
    print(f"-> Detalles eliminados: {det_count}")
    print(f"-> Historiales de estado eliminados: {hist_count}")
    print(f"-> Pagos eliminados: {pagos_count}")

    # 2. Configurar usuario Administrador único
    admin_username = 'admin'
    admin_email = 'admin@brandimp.com'
    admin_password = os.environ.get('INITIAL_ADMIN_PASSWORD', 'admin123')

    # Eliminar todos los usuarios excepto 'admin'
    eliminados, _ = User.objects.exclude(username=admin_username).delete()
    print(f"-> Usuarios no administradores eliminados: {eliminados}")

    # Crear o actualizar el administrador único
    admin_user, created = User.objects.get_or_create(username=admin_username, defaults={
        'email': admin_email,
        'is_superuser': True,
        'is_staff': True,
        'is_active': True
    })

    admin_user.set_password(admin_password)
    admin_user.email = admin_email
    admin_user.is_superuser = True
    admin_user.is_staff = True
    admin_user.is_active = True
    admin_user.save()

    perfil, _ = PerfilUsuario.objects.get_or_create(user=admin_user)
    perfil.rol = RolUsuario.ADMIN
    perfil.nombre_completo = 'Administrador General'
    perfil.activo = True
    perfil.save()

    print(f"-> Usuario Administrador: {admin_user.username} (Rol: {perfil.get_rol_display()}) [LISTO]")
    print("=" * 60)
    print("Base de datos de pedidos restablecida a 0 y Administrador único configurado.")

if __name__ == '__main__':
    reset_pedidos_y_configurar_admin_unico()
