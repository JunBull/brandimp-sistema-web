from django.contrib import admin
from .models import (
    Categoria, TipoProducto, Marca, Pedido, DetallePedido,
    HistorialEstadosPedido, PagoPedido, Tamano, ColorProducto,
    PerfilUsuario
)

@admin.register(PerfilUsuario)
class PerfilUsuarioAdmin(admin.ModelAdmin):
    list_display = ['user', 'rol', 'nombre_completo', 'activo', 'created_at']
    list_filter = ['rol', 'activo']
    search_fields = ['user__username', 'nombre_completo']

admin.site.register(Categoria)
admin.site.register(TipoProducto)
admin.site.register(Marca)
admin.site.register(Pedido)
admin.site.register(DetallePedido)
admin.site.register(PagoPedido)
admin.site.register(HistorialEstadosPedido)
admin.site.register(Tamano)
admin.site.register(ColorProducto)
