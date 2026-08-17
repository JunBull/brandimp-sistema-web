import uuid
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User

class RolUsuario(models.TextChoices):
    ADMIN = 'ADMIN', 'Administrador'
    VENDEDOR = 'VENDEDOR', 'Vendedor'
    OPERARIO = 'OPERARIO', 'Operario'

class PerfilUsuario(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='perfil')
    rol = models.CharField(max_length=20, choices=RolUsuario.choices, default=RolUsuario.VENDEDOR)
    nombre_completo = models.CharField(max_length=150, blank=True, default='')
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'perfiles_usuario'
        ordering = ['user__username']

    def __str__(self):
        return f"{self.user.username} ({self.get_rol_display()})"

class Categoria(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'categorias'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class TipoProducto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    categoria = models.ForeignKey(Categoria, on_delete=models.RESTRICT, related_name='productos')
    nombre = models.CharField(max_length=120)
    precio_millar = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_ciento = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    precio_unidad = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    activo = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'tipos_producto'
        unique_together = ('categoria', 'nombre')
        ordering = ['nombre']

    def __str__(self):
        return f"{self.categoria.nombre} - {self.nombre}"

class Marca(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nombre = models.CharField(max_length=150, unique=True)
    ruc_dni = models.CharField(max_length=11, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'marcas'
        ordering = ['nombre']

    def __str__(self):
        return self.nombre

class EstadoProduccion(models.TextChoices):
    REGISTRADO = 'Registrado', 'Registrado'
    ESPERA_MATERIAL = 'Espera material', 'Espera material'
    EN_PRODUCCION = 'En producción', 'En producción'
    EN_TALLER = 'En el taller', 'En el taller'
    EN_TIENDA = 'En la tienda', 'En la tienda'
    ENTREGADO = 'Entregado', 'Entregado'

class Pedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_correlativo = models.CharField(max_length=20, unique=True)
    marca = models.ForeignKey(Marca, on_delete=models.RESTRICT, related_name='pedidos')
    solicitante_nombre = models.CharField(max_length=150, blank=True, default='')
    solicitante_telefono = models.CharField(max_length=15, null=True, blank=True)
    fecha_entrega_acordada = models.DateField()
    estado_actual = models.CharField(
        max_length=50, 
        choices=EstadoProduccion.choices, 
        default=EstadoProduccion.REGISTRADO
    )
    monto_total = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'pedidos'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.codigo_correlativo} - {self.marca.nombre}"

class UnidadMedida(models.TextChoices):
    UNIDAD = 'Unidad', 'Unidad'
    CIENTO = 'Ciento', 'Ciento'
    MILLAR = 'Millar', 'Millar'

class DetallePedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='detalles')
    tipo_producto = models.ForeignKey(TipoProducto, on_delete=models.RESTRICT)
    cantidad = models.IntegerField()
    unidad_medida = models.CharField(
        max_length=20,
        choices=UnidadMedida.choices,
        default=UnidadMedida.MILLAR
    )
    precio_base_calculado = models.DecimalField(max_digits=10, decimal_places=2)
    precio_final_acordado = models.DecimalField(max_digits=10, decimal_places=2)
    url_vectorial = models.CharField(max_length=512, null=True, blank=True)
    url_fotografia = models.CharField(max_length=512, null=True, blank=True)
    
    # Campos de características informativas para el PDF (snapshots)
    tamano_nombre = models.CharField(max_length=50, null=True, blank=True)
    color_nombre = models.CharField(max_length=100, null=True, blank=True)
    num_colores_estampado = models.IntegerField(null=True, blank=True)
    tipo_servicio = models.CharField(max_length=50, null=True, blank=True)  # Solo para Cuero
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'detalles_pedido'

    def __str__(self):
        return f"{self.pedido.codigo_correlativo} - {self.tipo_producto.nombre}"

class HistorialEstadosPedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='historial')
    estado_anterior = models.CharField(
        max_length=50, 
        choices=EstadoProduccion.choices, 
        null=True, 
        blank=True
    )
    estado_nuevo = models.CharField(
        max_length=50, 
        choices=EstadoProduccion.choices
    )
    fecha_cambio = models.DateTimeField(default=timezone.now, editable=False)
    ejecutado_por = models.CharField(max_length=100, default='Sistema')

    class Meta:
        db_table = 'historial_estados_pedido'
        ordering = ['-fecha_cambio']

    def __str__(self):
        return f"{self.pedido.codigo_correlativo}: {self.estado_anterior} -> {self.estado_nuevo}"

class MetodoPago(models.TextChoices):
    EFECTIVO = 'Efectivo', 'Efectivo'
    YAPE_PLIN = 'Yape/Plin', 'Yape/Plin'
    TRANSFERENCIA = 'Transferencia', 'Transferencia'

class TipoPago(models.TextChoices):
    ADELANTO = 'Adelanto', 'Adelanto'
    PAGO_ENTREGA = 'Pago Entrega', 'Pago Entrega'
    ABONO = 'Abono', 'Abono'

class PagoPedido(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='pagos')
    monto = models.DecimalField(max_digits=12, decimal_places=2)
    metodo_pago = models.CharField(max_length=20, choices=MetodoPago.choices)
    tipo_pago = models.CharField(max_length=20, choices=TipoPago.choices)
    fecha = models.DateTimeField(auto_now_add=True)
    notas = models.TextField(blank=True, default='')

    class Meta:
        db_table = 'pagos_pedido'
        ordering = ['fecha']

    def __str__(self):
        return f"{self.pedido.codigo_correlativo} - {self.tipo_pago}: S/ {self.monto} ({self.metodo_pago})"

class Tamano(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='tamanos')
    nombre = models.CharField(max_length=50)  # ej. "12x17" o "Ancho 2cm"
    unidad_medida = models.CharField(max_length=20, default='pulgadas')  # "pulgadas" o "cm"
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'tamanos'
        ordering = ['orden', 'nombre']
        unique_together = ('categoria', 'nombre', 'unidad_medida')

    def __str__(self):
        return f"{self.nombre} ({self.unidad_medida})"

class ColorProducto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    categoria = models.ForeignKey(Categoria, on_delete=models.CASCADE, related_name='colores')
    nombre = models.CharField(max_length=100)  # ej. "Transparente", "Dorado"
    codigo_hex = models.CharField(max_length=7, null=True, blank=True)  # ej. "#FF0000"
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'colores_producto'
        ordering = ['orden', 'nombre']
        unique_together = ('categoria', 'nombre')

    def __str__(self):
        return self.nombre


class TipoProductoTamano(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo_producto = models.ForeignKey(TipoProducto, on_delete=models.CASCADE, related_name='tamanos_rel')
    tamano = models.ForeignKey(Tamano, on_delete=models.CASCADE, related_name='productos_rel')
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'tipo_producto_tamanos'
        ordering = ['orden']
        unique_together = ('tipo_producto', 'tamano')

    def __str__(self):
        return f"{self.tipo_producto.nombre} - {self.tamano.nombre}"


class TipoProductoColor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tipo_producto = models.ForeignKey(TipoProducto, on_delete=models.CASCADE, related_name='colores_rel')
    color = models.ForeignKey(ColorProducto, on_delete=models.CASCADE, related_name='productos_rel')
    orden = models.IntegerField(default=0)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = 'tipo_producto_colores'
        ordering = ['orden']
        unique_together = ('tipo_producto', 'color')

    def __str__(self):
        return f"{self.tipo_producto.nombre} - {self.color.nombre}"



