# Sistema Web de Flujo Comercial - Brandimp

Plataforma integral para la gestión, seguimiento y automatización del flujo comercial operativo de **Brandimp**: desde la prospección y cotización de productos publicitarios/merchandising, hasta la aprobación de diseños, órdenes de producción en taller y emisión de facturación.

---

## 🚀 Arquitectura del Sistema

El proyecto está diseñado con una arquitectura desacoplada y moderna:

- **Frontend (`/frontend`)**: Desarrollado con [Astro](https://astro.build/) y TypeScript, proporcionando una interfaz web ligera, reactiva, accesible y de alta velocidad de carga.
- **Backend (`/backend`)**: Desarrollado con [Django](https://www.djangoproject.com/) y [Django REST Framework](https://www.django-rest-framework.org/), proporcionando una API REST robusta, autenticación basada en tokens/sesiones, control de acceso por roles (RBAC) y modelos de datos relacionales (PostgreSQL / SQLite).

```
├── backend/                  # API REST Django & Lógica de Negocio
│   ├── api/                  # Modelos, Vistas, Serializadores y Permisos
│   ├── config/               # Configuración central de Django (settings, wsgi, urls)
│   ├── manage.py             # CLI de administración de Django
│   ├── requirements.txt      # Dependencias de Python
│   └── .env.example          # Plantilla de variables de entorno para backend
│
├── frontend/                 # Aplicación Web Astro & UI
│   ├── src/
│   │   ├── components/       # Componentes reutilizables de interfaz
│   │   ├── layouts/          # Plantillas de layout base
│   │   ├── pages/            # Rutas y páginas del sistema
│   │   └── services/         # Clientes de consumo de la API REST
│   ├── package.json          # Dependencias y scripts de Node.js
│   └── .env.example          # Plantilla de variables de entorno para frontend
│
└── README.md                 # Documentación general del repositorio
```

---

## 🛠️ Módulos y Funcionalidades Principales

1. **Gestión de Clientes & Contactos:** Registro, historial comercial y segmentación de clientes.
2. **Cotizaciones Inteligentes:** Generación de cotizaciones con cálculo de costos, descuentos y exportación a PDF.
3. **Control de Pedidos & Órdenes de Trabajo:** Trazabilidad completa de estados (*Borrador*, *En Aprobación*, *En Producción*, *Listo para Entrega*, *Completado*).
4. **Flujo de Diseño & Aprobación:** Carga y validación de artes gráficos con clientes antes de producción.
5. **Módulo de Taller & Producción:** Asignación de tareas operativas y control de tiempos de fabricación.
6. **Facturación & Cobranzas:** Registro de comprobantes, control de pagos y saldos pendientes.
7. **Control de Acceso basado en Roles (RBAC):** Permisos específicos para Administradores, Vendedores, Diseñadores, Operarios de Taller y Personal de Facturación.

---

## ⚡ Guía de Instalación y Ejecución Local

### Prerrequisitos
- **Python 3.10+** instalado.
- **Node.js 18+** y `npm` instalados.
- **Git** instalado.

---

### 1. Configuración del Backend (Django REST API)

1. Ingresa al directorio del backend:
   ```bash
   cd backend
   ```

2. Crea y activa un entorno virtual de Python:
   ```bash
   # En Windows
   python -m venv venv
   .\venv\Scripts\activate

   # En Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Instala las dependencias:
   ```bash
   pip install -r requirements.txt
   ```

4. Configura las variables de entorno:
   ```bash
   # Copia la plantilla de ejemplo
   cp .env.example .env
   ```
   *(Abre `.env` y ajusta `SECRET_KEY`, `DEBUG` o las credenciales de base de datos según tu entorno).*

5. Aplica las migraciones de base de datos:
   ```bash
   python manage.py migrate
   ```

6. *(Opcional)* Crea un superusuario o ejecuta el sembrador de usuarios de prueba:
   ```bash
   python manage.py createsuperuser
   # o bien: python seed_users.py
   ```

7. Inicia el servidor de desarrollo del backend:
   ```bash
   python manage.py runserver 8000
   ```
   La API estará disponible en `http://localhost:8000/api/`.

---

### 2. Configuración del Frontend (Astro Web App)

1. En una nueva terminal, ingresa al directorio del frontend:
   ```bash
   cd frontend
   ```

2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   ```bash
   cp .env.example .env
   ```
   *(Asegúrate de que `PUBLIC_API_URL` apunte a `http://localhost:8000/api`).*

4. Inicia el servidor de desarrollo del frontend:
   ```bash
   npm run dev
   ```
   El sistema web estará disponible en `http://localhost:4321`.

---

## 🔒 Variables de Entorno y Seguridad

- **Nunca** subas archivos `.env` reales al repositorio.
- Usa siempre `.env.example` para documentar nuevas variables de configuración requeridas.
- En entornos de producción, configura `DEBUG=False` y define orígenes seguros en `ALLOWED_HOSTS` y `CORS_ALLOWED_ORIGINS`.

---

## 📄 Licencia y Derechos

Desarrollado para **Brandimp**. Todos los derechos reservados.
