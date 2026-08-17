from django.db.models import Prefetch, F, Count, Q
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import viewsets, filters, status
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

from .models import (
    Categoria, TipoProducto, Marca, Pedido, DetallePedido, 
    EstadoProduccion, HistorialEstadosPedido, PagoPedido,
    Tamano, ColorProducto, TipoProductoTamano, TipoProductoColor,
    PerfilUsuario, RolUsuario
)
from .serializers import (
    CategoriaSerializer, 
    TipoProductoSerializer, 
    MarcaSerializer, 
    PedidoSerializer,
    PagoPedidoSerializer,
    TamanoSerializer,
    ColorProductoSerializer,
    CatalogoCompletoSerializer,
    UserSerializer,
    PerfilUsuarioSerializer
)
from .permissions import (
    get_user_rol, IsAdminUserRole, IsVendedorUserRole,
    CatalogoPermission, MarcaPermission, PedidoPermission, CuentasPorCobrarPermission
)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '').strip()

        if not username or not password:
            return Response({'error': 'Debe proporcionar usuario y contraseña.'}, status=status.HTTP_400_BAD_REQUEST)

        user = authenticate(username=username, password=password)
        if not user:
            return Response({'error': 'Credenciales inválidas. Verifique usuario y contraseña.'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'error': 'Esta cuenta de usuario está desactivada.'}, status=status.HTTP_403_FORBIDDEN)

        if not hasattr(user, 'perfil'):
            PerfilUsuario.objects.create(
                user=user,
                rol=RolUsuario.ADMIN if user.is_superuser else RolUsuario.VENDEDOR,
                nombre_completo=user.username
            )

        refresh = RefreshToken.for_user(user)
        rol = get_user_rol(user)

        response = Response({
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'nombre_completo': user.perfil.nombre_completo or user.username,
                'rol': rol,
                'rol_display': user.perfil.get_rol_display()
            }
        })
        
        # Configurar Cookies Seguras (SameSite='None' para cross-origin Vercel <-> Render en HTTPS)
        secure_cookie = getattr(settings, 'JWT_AUTH_SECURE', False)
        samesite_val = 'None' if secure_cookie else 'Lax'
        
        response.set_cookie(
            key=getattr(settings, 'JWT_AUTH_COOKIE', 'access_token'),
            value=str(refresh.access_token),
            httponly=True,
            secure=secure_cookie,
            samesite=samesite_val
        )
        response.set_cookie(
            key=getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token'),
            value=str(refresh),
            httponly=True,
            secure=secure_cookie,
            samesite=samesite_val
        )
        return response

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"detail": "Successfully logged out."})
        secure_cookie = getattr(settings, 'JWT_AUTH_SECURE', False)
        samesite_val = 'None' if secure_cookie else 'Lax'
        response.delete_cookie(
            getattr(settings, 'JWT_AUTH_COOKIE', 'access_token'),
            samesite=samesite_val,
            secure=secure_cookie
        )
        response.delete_cookie(
            getattr(settings, 'JWT_AUTH_REFRESH_COOKIE', 'refresh_token'),
            samesite=samesite_val,
            secure=secure_cookie
        )
        return response

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not hasattr(user, 'perfil'):
            PerfilUsuario.objects.create(
                user=user,
                rol=RolUsuario.ADMIN if user.is_superuser else RolUsuario.VENDEDOR,
                nombre_completo=user.username
            )

        rol = get_user_rol(user)
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'nombre_completo': user.perfil.nombre_completo or user.username,
            'rol': rol,
            'rol_display': user.perfil.get_rol_display()
        })

class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().select_related('perfil').order_by('username')
    serializer_class = UserSerializer
    permission_classes = [IsAdminUserRole]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response({'error': 'No puedes eliminar tu propia cuenta de administrador.'}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

class CategoriaViewSet(viewsets.ModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [CatalogoPermission]

    @action(detail=True, methods=['get'], url_path='completo')
    def completo(self, request, pk=None):
        try:
            categoria = Categoria.objects.prefetch_related(
                Prefetch('productos', queryset=TipoProducto.objects.prefetch_related('tamanos_rel', 'colores_rel')),
                'tamanos',
                'colores'
            ).get(pk=pk)
            serializer = CatalogoCompletoSerializer(categoria, context={'request': request})
            return Response(serializer.data)
        except Categoria.DoesNotExist:
            return Response({"error": "Categoría no encontrada"}, status=status.HTTP_404_NOT_FOUND)

class TipoProductoViewSet(viewsets.ModelViewSet):
    queryset = TipoProducto.objects.all().prefetch_related('tamanos_rel', 'colores_rel')
    serializer_class = TipoProductoSerializer
    permission_classes = [CatalogoPermission]
    filterset_fields = ['categoria']

    def destroy(self, request, *args, **kwargs):
        from django.db.models.deletion import ProtectedError
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "No se puede eliminar el producto porque tiene pedidos o registros asociados. Te recomendamos desactivarlo (ocultarlo) en su lugar."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], url_path='guardar-asignaciones')
    def guardar_asignaciones(self, request, pk=None):
        producto = self.get_object()
        tamanos_ids = request.data.get('tamanos_ids', [])
        colores_ids = request.data.get('colores_ids', [])

        if not isinstance(tamanos_ids, list) or not isinstance(colores_ids, list):
            return Response({"error": "Los campos tamanos_ids y colores_ids deben ser listas."}, status=status.HTTP_400_BAD_REQUEST)
        
        tamanos_ids_clean = [tid for tid in tamanos_ids if tid]
        colores_ids_clean = [cid for cid in colores_ids if cid]

        if len(tamanos_ids_clean) > 0:
            validos = Tamano.objects.filter(id__in=tamanos_ids_clean).count()
            if validos != len(set(tamanos_ids_clean)):
                return Response({"error": "Uno o más IDs de tamaño no son válidos o han sido eliminados."}, status=status.HTTP_400_BAD_REQUEST)
        
        if len(colores_ids_clean) > 0:
            validos = ColorProducto.objects.filter(id__in=colores_ids_clean).count()
            if validos != len(set(colores_ids_clean)):
                return Response({"error": "Uno o más IDs de color no son válidos o han sido eliminados."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            TipoProductoTamano.objects.filter(tipo_producto=producto).delete()
            for idx, tid in enumerate(tamanos_ids_clean):
                TipoProductoTamano.objects.create(tipo_producto=producto, tamano_id=tid, orden=idx)
            
            TipoProductoColor.objects.filter(tipo_producto=producto).delete()
            for idx, cid in enumerate(colores_ids_clean):
                TipoProductoColor.objects.create(tipo_producto=producto, color_id=cid, orden=idx)

        return Response({
            "ok": True,
            "status": "Asignaciones guardadas con éxito",
            "tamanos_ids": tamanos_ids_clean,
            "colores_ids": colores_ids_clean
        })

class TamanoViewSet(viewsets.ModelViewSet):
    queryset = Tamano.objects.all()
    serializer_class = TamanoSerializer
    permission_classes = [CatalogoPermission]
    filterset_fields = ['categoria']

class ColorProductoViewSet(viewsets.ModelViewSet):
    queryset = ColorProducto.objects.all()
    serializer_class = ColorProductoSerializer
    permission_classes = [CatalogoPermission]
    filterset_fields = ['categoria']

class MarcaViewSet(viewsets.ModelViewSet):
    queryset = Marca.objects.all()
    serializer_class = MarcaSerializer
    permission_classes = [MarcaPermission]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre', 'ruc_dni']

    def update(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede editar marcas existentes.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede editar marcas existentes.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede eliminar marcas.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['get'], url_path='pedidos')
    def pedidos_marca(self, request, pk=None):
        marca = self.get_object()
        pedidos = Pedido.objects.filter(marca=marca).prefetch_related(
            Prefetch('detalles', queryset=DetallePedido.objects.select_related('tipo_producto', 'tipo_producto__categoria'))
        ).order_by('-created_at')
        data = []
        is_operario = get_user_rol(request.user) == 'OPERARIO'
        for p in pedidos:
            detalles = []
            for d in p.detalles.all():
                detalles.append({
                    "detalle_id": d.id, "producto_nombre": d.tipo_producto.nombre,
                    "categoria_nombre": d.tipo_producto.categoria.nombre,
                    "cantidad": d.cantidad, "unidad_medida": d.unidad_medida,
                    "precio_base_calculado": None if is_operario else str(d.precio_base_calculado),
                    "precio_final_acordado": None if is_operario else str(d.precio_final_acordado),
                    "url_vectorial": d.url_vectorial, "url_fotografia": d.url_fotografia,
                })
            data.append({
                "id": str(p.id), "codigo_correlativo": p.codigo_correlativo,
                "fecha_pedido": p.created_at, "estado_actual": p.estado_actual,
                "monto_total": None if is_operario else str(p.monto_total),
                "solicitante": p.solicitante_nombre,
                "solicitante_telefono": p.solicitante_telefono, "detalles": detalles,
            })
        return Response(data)

class PedidoViewSet(viewsets.ModelViewSet):
    queryset = Pedido.objects.all().select_related('marca').prefetch_related(
        Prefetch('detalles', queryset=DetallePedido.objects.select_related('tipo_producto', 'tipo_producto__categoria')),
        'historial', 'pagos'
    )
    serializer_class = PedidoSerializer
    permission_classes = [PedidoPermission]

    def get_queryset(self):
        queryset = Pedido.objects.all().select_related('marca').prefetch_related(
            Prefetch('detalles', queryset=DetallePedido.objects.select_related('tipo_producto', 'tipo_producto__categoria')),
            'historial', 'pagos'
        )
        activos = self.request.query_params.get('activos', None)
        if activos == 'true':
            queryset = queryset.exclude(estado_actual=EstadoProduccion.ENTREGADO)
        marca_id = self.request.query_params.get('marca', None)
        if marca_id:
            queryset = queryset.filter(marca_id=marca_id)
        return queryset

    def update(self, request, *args, **kwargs):
        rol = get_user_rol(request.user)
        instance = self.get_object()
        if rol == 'VENDEDOR' and instance.estado_actual != EstadoProduccion.REGISTRADO:
            return Response({'error': 'Los vendedores solo pueden editar pedidos en estado "Registrado".'}, status=status.HTTP_400_BAD_REQUEST)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        rol = get_user_rol(request.user)
        instance = self.get_object()
        if rol == 'VENDEDOR' and instance.estado_actual != EstadoProduccion.REGISTRADO:
            return Response({'error': 'Los vendedores solo pueden editar pedidos en estado "Registrado".'}, status=status.HTTP_400_BAD_REQUEST)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede eliminar pedidos.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['patch'], url_path='cambiar-estado')
    def cambiar_estado(self, request, pk=None):
        nuevo_estado = request.data.get('estado')
        ejecutado_por = request.data.get('ejecutado_por') or (request.user.perfil.nombre_completo if hasattr(request.user, 'perfil') and request.user.perfil.nombre_completo else request.user.username)
        monto_pago = request.data.get('monto_pago', None)
        metodo_pago = request.data.get('metodo_pago', 'Efectivo')
        notas_pago = request.data.get('notas_pago', 'Pago registrado al entregar el pedido.')

        if not nuevo_estado:
            return Response({"error": "El campo 'estado' es requerido."}, status=status.HTTP_400_BAD_REQUEST)
        if nuevo_estado not in EstadoProduccion.values:
            return Response({"error": f"Estado inválido. Valores permitidos: {', '.join(EstadoProduccion.values)}"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            pedido = Pedido.objects.get(pk=pk)
            estado_anterior = pedido.estado_actual
        except Pedido.DoesNotExist:
            return Response({"error": "Pedido no encontrado."}, status=status.HTTP_404_NOT_FOUND)

        # Validación de avance de estado para Operarios
        rol = get_user_rol(request.user)
        if rol == 'OPERARIO':
            secuencia_estados = [
                EstadoProduccion.REGISTRADO,
                EstadoProduccion.ESPERA_MATERIAL,
                EstadoProduccion.EN_PRODUCCION,
                EstadoProduccion.EN_TALLER,
                EstadoProduccion.EN_TIENDA,
                EstadoProduccion.ENTREGADO
            ]
            idx_anterior = secuencia_estados.index(estado_anterior) if estado_anterior in secuencia_estados else -1
            idx_nuevo = secuencia_estados.index(nuevo_estado) if nuevo_estado in secuencia_estados else -1

            if idx_nuevo <= idx_anterior:
                return Response({"error": "Los operarios solo pueden avanzar el estado del pedido a una fase posterior."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            Pedido.objects.filter(pk=pk).update(estado_actual=nuevo_estado)
            HistorialEstadosPedido.objects.create(
                pedido_id=pk, estado_anterior=estado_anterior,
                estado_nuevo=nuevo_estado, ejecutado_por=ejecutado_por
            )

            if nuevo_estado == 'Entregado' and monto_pago is not None and rol != 'OPERARIO':
                from decimal import Decimal
                try:
                    monto_decimal = Decimal(str(monto_pago))
                    if monto_decimal > 0:
                        PagoPedido.objects.create(
                            pedido_id=pk, monto=monto_decimal,
                            metodo_pago=metodo_pago, tipo_pago='Pago Entrega',
                            notas=notas_pago
                        )
                except Exception:
                    pass

        return Response({
            "id": str(pk), "estado_actual": nuevo_estado,
            "estado_anterior": estado_anterior, "ok": True
        })

    @action(detail=True, methods=['get', 'post'], url_path='pagos')
    def pagos(self, request, pk=None):
        if get_user_rol(request.user) == 'OPERARIO':
            return Response({'error': 'Los operarios no tienen acceso a información de pagos.'}, status=status.HTTP_403_FORBIDDEN)

        if request.method == 'GET':
            pagos = PagoPedido.objects.filter(pedido_id=pk)
            serializer = PagoPedidoSerializer(pagos, many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            data = request.data.copy()
            data['pedido'] = pk
            if 'tipo_pago' not in data:
                data['tipo_pago'] = 'Abono'
            serializer = PagoPedidoSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='cuentas-por-cobrar')
    def cuentas_por_cobrar(self, request):
        if get_user_rol(request.user) == 'OPERARIO':
            return Response({'error': 'Los operarios no tienen acceso a cuentas por cobrar.'}, status=status.HTTP_403_FORBIDDEN)

        from django.db.models import Sum, DecimalField
        from django.db.models.functions import Coalesce
        from decimal import Decimal

        queryset = self.get_queryset()
        queryset = queryset.annotate(
            total_pagado_db=Coalesce(Sum('pagos__monto'), Decimal('0.00'), output_field=DecimalField())
        )
        queryset = queryset.filter(monto_total__gt=F('total_pagado_db'))

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

class PagoPedidoViewSet(viewsets.ModelViewSet):
    queryset = PagoPedido.objects.all()
    serializer_class = PagoPedidoSerializer
    permission_classes = [CuentasPorCobrarPermission]

    def get_queryset(self):
        queryset = PagoPedido.objects.all()
        pedido_id = self.request.query_params.get('pedido', None)
        if pedido_id:
            queryset = queryset.filter(pedido_id=pedido_id)
        return queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if 'tipo_pago' not in data:
            data['tipo_pago'] = 'Abono'
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede modificar pagos registrados.'}, status=status.HTTP_403_FORBIDDEN)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede modificar pagos registrados.'}, status=status.HTTP_403_FORBIDDEN)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if get_user_rol(request.user) != 'ADMIN':
            return Response({'error': 'Solo el Administrador puede eliminar pagos.'}, status=status.HTTP_403_FORBIDDEN)
        return super().destroy(request, *args, **kwargs)

class DashboardView(APIView):
    permission_classes = [IsVendedorUserRole]

    def get(self, request):
        hoy = timezone.now().date()
        limite_urgente = hoy + timedelta(days=2)
        contadores_raw = Pedido.objects.values('estado_actual').annotate(total=Count('id'))
        contadores = {e.value: 0 for e in EstadoProduccion}
        for item in contadores_raw:
            contadores[item['estado_actual']] = item['total']

        pedidos_hoy = Pedido.objects.filter(created_at__date=hoy).count()
        pedidos_urgentes_qs = Pedido.objects.exclude(
            estado_actual=EstadoProduccion.ENTREGADO
        ).filter(
            fecha_entrega_acordada__lte=limite_urgente
        ).select_related('marca').order_by('fecha_entrega_acordada')[:10]

        pedidos_urgentes_data = []
        is_vendedor = get_user_rol(request.user) == 'VENDEDOR'
        for p in pedidos_urgentes_qs:
            dias_restantes = (p.fecha_entrega_acordada - hoy).days
            pedidos_urgentes_data.append({
                "id": str(p.id), "codigo_correlativo": p.codigo_correlativo,
                "marca_nombre": p.marca.nombre, "solicitante_nombre": p.solicitante_nombre,
                "fecha_entrega_acordada": str(p.fecha_entrega_acordada),
                "estado_actual": p.estado_actual,
                "monto_total": str(p.monto_total) if not is_vendedor else str(p.monto_total), # Operational only if needed
                "dias_restantes": dias_restantes
            })
        return Response({
            "contadores_estado": contadores,
            "pedidos_hoy": pedidos_hoy,
            "pedidos_urgentes": pedidos_urgentes_data
        })

class BusquedaGlobalView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q or len(q) < 2:
            return Response({"pedidos": [], "marcas": []})

        pedidos_qs = Pedido.objects.filter(
            Q(codigo_correlativo__icontains=q) |
            Q(solicitante_nombre__icontains=q) |
            Q(marca__nombre__icontains=q)
        ).select_related('marca').order_by('-created_at')[:5]

        pedidos_res = []
        for p in pedidos_qs:
            pedidos_res.append({
                "id": str(p.id), "codigo_correlativo": p.codigo_correlativo,
                "marca_nombre": p.marca.nombre, "solicitante_nombre": p.solicitante_nombre,
                "estado_actual": p.estado_actual, "tipo": "pedido"
            })

        marcas_res = []
        if get_user_rol(request.user) != 'OPERARIO':
            marcas_qs = Marca.objects.filter(
                Q(nombre__icontains=q) | Q(ruc_dni__icontains=q)
            ).order_by('nombre')[:5]
            for m in marcas_qs:
                marcas_res.append({
                    "id": str(m.id), "nombre": m.nombre,
                    "ruc_dni": m.ruc_dni, "tipo": "marca"
                })

        return Response({"pedidos": pedidos_res, "marcas": marcas_res})
