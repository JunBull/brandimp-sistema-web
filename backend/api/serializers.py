from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from django.contrib.auth.models import User
from .models import (
    Categoria, TipoProducto, Marca, Pedido, DetallePedido, 
    HistorialEstadosPedido, PagoPedido, Tamano, ColorProducto,
    TipoProductoTamano, TipoProductoColor, PerfilUsuario, RolUsuario
)

class PerfilUsuarioSerializer(serializers.ModelSerializer):
    rol_display = serializers.CharField(source='get_rol_display', read_only=True)

    class Meta:
        model = PerfilUsuario
        fields = ['id', 'rol', 'rol_display', 'nombre_completo', 'activo', 'created_at', 'updated_at']

class UserSerializer(serializers.ModelSerializer):
    perfil = PerfilUsuarioSerializer(read_only=True)
    rol = serializers.CharField(write_only=True, required=False, default=RolUsuario.VENDEDOR)
    nombre_completo = serializers.CharField(write_only=True, required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_active', 'perfil', 'rol', 'nombre_completo']

    def create(self, validated_data):
        rol = validated_data.pop('rol', RolUsuario.VENDEDOR)
        nombre_completo = validated_data.pop('nombre_completo', '')
        password = self.context.get('request').data.get('password') if self.context.get('request') else None
        
        user = User.objects.create_user(**validated_data)
        if password:
            user.set_password(password)
            user.save()
            
        PerfilUsuario.objects.create(
            user=user,
            rol=rol,
            nombre_completo=nombre_completo or f"{user.first_name} {user.last_name}".strip() or user.username
        )
        return user

    def update(self, instance, validated_data):
        rol = validated_data.pop('rol', None)
        nombre_completo = validated_data.pop('nombre_completo', None)
        password = self.context.get('request').data.get('password') if self.context.get('request') else None

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        if hasattr(instance, 'perfil'):
            perfil = instance.perfil
            if rol:
                perfil.rol = rol
            if nombre_completo is not None:
                perfil.nombre_completo = nombre_completo
            perfil.save()
        else:
            PerfilUsuario.objects.create(
                user=instance,
                rol=rol or RolUsuario.VENDEDOR,
                nombre_completo=nombre_completo or instance.username
            )

        return instance

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'created_at', 'updated_at']

class TipoProductoSerializer(serializers.ModelSerializer):
    categoria_nombre = serializers.ReadOnlyField(source='categoria.nombre')
    tamanos_asignados = serializers.SerializerMethodField()
    colores_asignados = serializers.SerializerMethodField()

    class Meta:
        model = TipoProducto
        fields = [
            'id', 'categoria', 'categoria_nombre', 'nombre', 
            'precio_millar', 'precio_ciento', 'precio_unidad', 'activo',
            'tamanos_asignados', 'colores_asignados',
            'created_at', 'updated_at'
        ]

    def get_tamanos_asignados(self, obj):
        return list(obj.tamanos_rel.values_list('tamano_id', flat=True))

    def get_colores_asignados(self, obj):
        return list(obj.colores_rel.values_list('color_id', flat=True))

class TamanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tamano
        fields = ['id', 'categoria', 'nombre', 'unidad_medida', 'orden']

class ColorProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColorProducto
        fields = ['id', 'categoria', 'nombre', 'codigo_hex', 'orden']

class CatalogoCompletoSerializer(serializers.ModelSerializer):
    productos = TipoProductoSerializer(many=True, read_only=True)
    tamanos = TamanoSerializer(many=True, read_only=True)
    colores = ColorProductoSerializer(many=True, read_only=True)

    class Meta:
        model = Categoria
        fields = ['id', 'nombre', 'productos', 'tamanos', 'colores']

class MarcaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Marca
        fields = ['id', 'nombre', 'ruc_dni', 'created_at', 'updated_at']

    def validate_nombre(self, value):
        clean_val = value.strip()
        if len(clean_val) < 2:
            raise serializers.ValidationError("El nombre de la marca debe tener al menos 2 caracteres.")
        if len(clean_val) > 150:
            raise serializers.ValidationError("El nombre de la marca no puede superar 150 caracteres.")
        return clean_val

    def validate_ruc_dni(self, value):
        if not value or not str(value).strip():
            return None
        clean_val = str(value).strip()
        import re
        if re.match(r'^\d{8}$', clean_val):
            return clean_val
        if re.match(r'^\d{11}$', clean_val):
            return clean_val
        if re.match(r'^(?=.*[a-zA-Z])[A-Za-z0-9]{9,12}$', clean_val):
            return clean_val
        raise serializers.ValidationError(
            "El documento debe ser un DNI (8 dígitos), RUC (11 dígitos) o ID extranjero válido (9-12 caracteres con letras y números)."
        )

class HistorialEstadosPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = HistorialEstadosPedido
        fields = ['id', 'estado_anterior', 'estado_nuevo', 'fecha_cambio', 'ejecutado_por']

class DetallePedidoSerializer(serializers.ModelSerializer):
    tipo_producto_nombre = serializers.ReadOnlyField(source='tipo_producto.nombre')
    categoria_nombre = serializers.ReadOnlyField(source='tipo_producto.categoria.nombre')
    precio_base_calculado = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, default=0
    )

    class Meta:
        model = DetallePedido
        fields = [
            'id', 'tipo_producto', 'tipo_producto_nombre', 'categoria_nombre',
            'cantidad', 'unidad_medida', 'precio_base_calculado',
            'precio_final_acordado', 'url_vectorial', 'url_fotografia',
            'tamano_nombre', 'color_nombre', 
            'num_colores_estampado', 'tipo_servicio'
        ]

    def validate_cantidad(self, value):
        if value < 1:
            raise serializers.ValidationError("La cantidad debe ser mayor o igual a 1.")
        if value > 100000:
            raise serializers.ValidationError("La cantidad no puede superar 100,000 unidades.")
        return value

    def validate_precio_final_acordado(self, value):
        if value < 0:
            raise serializers.ValidationError("El precio acordado no puede ser negativo.")
        if value > 999999.99:
            raise serializers.ValidationError("El precio acordado no puede superar S/ 999,999.99.")
        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            from .permissions import get_user_rol
            if get_user_rol(request.user) == 'OPERARIO':
                data['precio_base_calculado'] = None
                data['precio_final_acordado'] = None
        return data

class PagoPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = PagoPedido
        fields = ['id', 'pedido', 'monto', 'metodo_pago', 'tipo_pago', 'fecha', 'notas']
        read_only_fields = ['id', 'fecha']

class PedidoSerializer(serializers.ModelSerializer):
    marca_nombre = serializers.ReadOnlyField(source='marca.nombre')
    detalles = DetallePedidoSerializer(many=True)
    historial = HistorialEstadosPedidoSerializer(many=True, read_only=True)
    pagos = PagoPedidoSerializer(many=True, read_only=True)
    total_pagado = serializers.SerializerMethodField()
    saldo_pendiente = serializers.SerializerMethodField()

    adelanto_monto = serializers.DecimalField(max_digits=12, decimal_places=2, write_only=True, required=False, default=0.00)
    adelanto_metodo_pago = serializers.CharField(write_only=True, required=False, default='Efectivo')
    solicitante_nombre = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = Pedido
        fields = [
            'id', 'codigo_correlativo', 'marca', 'marca_nombre',
            'solicitante_nombre', 'solicitante_telefono', 'fecha_entrega_acordada', 'estado_actual',
            'monto_total', 'total_pagado', 'saldo_pendiente', 'detalles', 'historial', 'pagos',
            'adelanto_monto', 'adelanto_metodo_pago', 'created_at', 'updated_at'
        ]
        read_only_fields = ['codigo_correlativo', 'estado_actual', 'monto_total', 'total_pagado', 'saldo_pendiente']

    def validate_solicitante_nombre(self, value):
        if not value or not str(value).strip():
            return ''
        clean_val = str(value).strip()
        if len(clean_val) > 150:
            raise serializers.ValidationError("El nombre del solicitante no puede superar 150 caracteres.")
        return clean_val

    def validate_solicitante_telefono(self, value):
        if not value or not str(value).strip():
            return None
        clean_val = str(value).strip()
        if len(clean_val) > 15:
            raise serializers.ValidationError("El teléfono no puede superar los 15 caracteres (estándar E.164).")
        import re
        if not re.match(r'^\+?[0-9]{6,14}$', clean_val):
            raise serializers.ValidationError("El formato de teléfono es inválido.")
        return clean_val

    def validate_fecha_entrega_acordada(self, value):
        from django.utils import timezone
        today = timezone.localdate()
        if value < today:
            raise serializers.ValidationError("La fecha de entrega no puede ser anterior a hoy.")
        return value

    def validate_adelanto_monto(self, value):
        if value < 0:
            raise serializers.ValidationError("El monto de adelanto no puede ser negativo.")
        return value

    def validate(self, data):
        detalles = data.get('detalles', [])
        if not detalles:
            raise serializers.ValidationError({"detalles": "Debes agregar al menos un producto al pedido."})
        
        adelanto = data.get('adelanto_monto', 0)
        total = sum(d.get('precio_final_acordado', 0) for d in detalles)
        if adelanto > total:
            raise serializers.ValidationError({
                "adelanto_monto": f"El adelanto (S/ {adelanto}) no puede ser mayor al monto total de la orden (S/ {total})."
            })
        return data

    def get_total_pagado(self, obj):
        from django.db.models import Sum
        from decimal import Decimal
        total = obj.pagos.aggregate(total=Sum('monto'))['total']
        return total if total is not None else Decimal('0.00')

    def get_saldo_pendiente(self, obj):
        total_pagado = self.get_total_pagado(obj)
        return obj.monto_total - total_pagado

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            from .permissions import get_user_rol
            if get_user_rol(request.user) == 'OPERARIO':
                data['monto_total'] = None
                data['total_pagado'] = None
                data['saldo_pendiente'] = None
                data['pagos'] = []
        return data

    def create(self, validated_data):
        detalles_data = validated_data.pop('detalles', [])
        adelanto_monto = validated_data.pop('adelanto_monto', 0.00)
        adelanto_metodo_pago = validated_data.pop('adelanto_metodo_pago', 'Efectivo')
        
        from decimal import Decimal
        current_year = timezone.now().year
        prefix = f"PED-{current_year}-"
        count = Pedido.objects.filter(codigo_correlativo__startswith=prefix).count()
        codigo = f"{prefix}{(count + 1):04d}"
        
        with transaction.atomic():
            pedido = Pedido.objects.create(
                codigo_correlativo=codigo,
                estado_actual='Registrado',
                **validated_data
            )
            
            monto_total = Decimal('0.00')
            for detalle_data in detalles_data:
                cantidad = detalle_data.get('cantidad', 1)
                unidad = detalle_data.get('unidad_medida', 'Millar')
                tipo_producto = detalle_data.get('tipo_producto')
                
                # Calcular precio referencial base normalizado a unidad
                p_millar = Decimal(str(tipo_producto.precio_millar)) if tipo_producto.precio_millar is not None else None
                p_ciento = Decimal(str(tipo_producto.precio_ciento)) if tipo_producto.precio_ciento is not None else None
                p_unidad = Decimal(str(tipo_producto.precio_unidad)) if tipo_producto.precio_unidad is not None else None

                multiplicadores = {'Millar': Decimal('1000'), 'Ciento': Decimal('100'), 'Unidad': Decimal('1')}
                mult = multiplicadores.get(unidad, Decimal('1'))

                if unidad == 'Millar' and p_millar is not None:
                    base_calculado = p_millar * Decimal(str(cantidad))
                elif unidad == 'Ciento' and p_ciento is not None:
                    base_calculado = p_ciento * Decimal(str(cantidad))
                elif unidad == 'Unidad' and p_unidad is not None:
                    base_calculado = p_unidad * Decimal(str(cantidad))
                elif p_unidad is not None:
                    base_calculado = p_unidad * mult * Decimal(str(cantidad))
                elif p_ciento is not None:
                    base_calculado = (p_ciento / Decimal('100')) * mult * Decimal(str(cantidad))
                elif p_millar is not None:
                    base_calculado = (p_millar / Decimal('1000')) * mult * Decimal(str(cantidad))
                else:
                    base_calculado = Decimal('0.00')

                precio_final = Decimal(str(detalle_data.get('precio_final_acordado', base_calculado)))
                
                detalle_data.pop('precio_base_calculado', None)
                
                DetallePedido.objects.create(
                    pedido=pedido,
                    precio_base_calculado=base_calculado.quantize(Decimal('0.01')),
                    precio_final_acordado=precio_final,
                    **{k: v for k, v in detalle_data.items() if k != 'precio_final_acordado'}
                )
                
                monto_total += precio_final
            
            pedido.monto_total = monto_total
            pedido.save()

            PagoPedido.objects.create(
                pedido=pedido,
                monto=adelanto_monto,
                metodo_pago=adelanto_metodo_pago,
                tipo_pago='Adelanto',
                notas='Adelanto inicial registrado al crear el pedido.'
            )
            
        return pedido


