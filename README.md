# 🚁 Piloto de Drones - Plataforma Profesional

Una plataforma web moderna para conectar pilotos de drones certificados con clientes que necesitan servicios aéreos especializados en Chile.

[![Desarrollado por Alvaro Cofré](https://img.shields.io/badge/Desarrollado%20por-Alvaro%20Cofré-blue?style=flat&logo=github)](https://www.alvarocofre.dev)
[![React](https://img.shields.io/badge/React-18.3.1-blue?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green?style=flat&logo=supabase)](https://supabase.com/)

## 🎯 Descripción del Proyecto

**Piloto de Drones** es una plataforma web desarrollada para facilitar la conexión entre pilotos de drones certificados y clientes que requieren servicios aéreos especializados. La plataforma está diseñada específicamente para el mercado chileno, ofreciendo una solución completa para la industria de servicios con drones.

### 🌟 Características Principales

- **🔍 Búsqueda Avanzada**: Encuentra pilotos por zona geográfica, tipo de servicio y especialización
- **👤 Perfiles Profesionales**: Sistema completo de perfiles para pilotos y empresas
- **🔐 Sistema de Roles**: Administración granular con diferentes niveles de acceso
- **📊 Dashboard Inteligente**: Panel de control con métricas en tiempo real
- **🔒 Autenticación Segura**: Login/registro con Google OAuth y validación por email
- **📱 Diseño Responsivo**: Optimizado para dispositivos móviles y desktop
- **⚡ Rendimiento Optimizado**: Carga rápida y experiencia fluida

## 🛠️ Stack Tecnológico

### Frontend
- **React 18** - Biblioteca de interfaz de usuario
- **TypeScript** - Tipado estático para mayor robustez
- **Vite** - Herramienta de construcción ultra-rápida
- **Tailwind CSS** - Framework de CSS utilitario
- **shadcn/ui** - Componentes de interfaz modernos
- **React Router** - Navegación del lado del cliente
- **TanStack Query** - Manejo de estado del servidor
- **React Hook Form** - Manejo de formularios
- **Zod** - Validación de esquemas

### Backend
- **Supabase** - Backend as a Service (BaaS)
- **PostgreSQL** - Base de datos relacional
- **Row Level Security (RLS)** - Seguridad a nivel de fila
- **Supabase Auth** - Sistema de autenticación
- **Supabase Storage** - Almacenamiento de archivos

### Herramientas de Desarrollo
- **ESLint** - Linter para JavaScript/TypeScript
- **Prettier** - Formateador de código
- **Git** - Control de versiones

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** 18.0 o superior
- **npm** 9.0 o superior
- **Git** para clonar el repositorio

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/alvarocofre/pilotodedrones.git
cd pilotodedrones

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# 4. Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno

Crea un archivo `.env.local` con las siguientes variables:

```env
# Supabase Configuration
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase

# App Configuration
VITE_APP_NAME=Piloto de Drones
VITE_APP_URL=http://localhost:8081
VITE_APP_VERSION=1.0.0

# Flow Payments
VITE_FLOW_ENV=sandbox
FLOW_API_BASE_SANDBOX=https://sandbox.flow.cl/api
FLOW_API_BASE_PRODUCTION=https://www.flow.cl/api
FLOW_API_KEY=tu_api_key_de_flow
FLOW_SECRET_KEY=tu_secret_key_de_flow
FLOW_WEBHOOK_SECRET=secreto_webhook
```

## 📜 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo (puerto 8080)
npm run build        # Build optimizado para producción
npm run build:dev    # Build de desarrollo con source maps
npm run preview      # Preview del build de producción
npm run lint         # Ejecutar linter
```

## 🗄️ Arquitectura de la Base de Datos

El proyecto utiliza Supabase como Backend as a Service. La estructura de la base de datos está definida en las migraciones ubicadas en `supabase/migrations/`.

### Tablas Principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuarios (pilotos/empresas) |
| `user_roles` | Sistema de roles y permisos |
| `pilots` | Información específica de pilotos |
| `pilot_services` | Servicios ofrecidos por pilotos |
| `user_certifications` | Certificaciones y validaciones |
| `user_subscriptions` | Planes de suscripción |

### Sistema de Roles

- **`super_admin`** - Acceso completo al sistema
- **`admin`** - Administración general de la plataforma
- **`pilot`** - Piloto de drones certificado
- **`company`** - Empresa cliente

## 🎨 Diseño y UX

### Principios de Diseño
- **Mobile First**: Diseño optimizado para dispositivos móviles
- **Accesibilidad**: Cumple con estándares WCAG 2.1
- **Performance**: Carga rápida y experiencia fluida
- **Usabilidad**: Interfaz intuitiva y fácil de usar

### Paleta de Colores
- **Primario**: Azul corporativo (#2FB8FF)
- **Secundario**: Grises neutros
- **Acento**: Verde para elementos de éxito
- **Fondo**: Gradientes suaves y glassmorphism

## 📱 Funcionalidades por Tipo de Usuario

### 👥 Para Visitantes
- Búsqueda de pilotos por zona geográfica
- Filtros por tipo de servicio y especialización
- Visualización de pilotos destacados
- Información sobre la plataforma y servicios

### 👨‍💼 Para Administradores
- Dashboard con métricas en tiempo real
- Gestión completa de usuarios y pilotos
- Configuración del sistema
- Monitoreo de actividad y estadísticas
- Gestión de roles y permisos

### 🚁 Para Pilotos
- Perfil profesional personalizable
- Gestión de servicios ofrecidos
- Sistema de certificaciones y validaciones
- Dashboard de estadísticas personales
- Gestión de disponibilidad

### 🏢 Para Empresas
- Perfil corporativo
- Búsqueda de pilotos especializados
- Sistema de contratación
- Historial de servicios

## 🔒 Seguridad

- **Autenticación JWT** con Supabase Auth
- **Row Level Security (RLS)** en todas las tablas
- **Validación de entrada** con Zod
- **Sanitización** de datos de usuario
- **HTTPS** obligatorio en producción

## 🚀 Despliegue

### Build de Producción

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/` y están listos para desplegar en cualquier hosting estático como:

- **Vercel** (recomendado)
- **Netlify**
- **GitHub Pages**
- **AWS S3 + CloudFront**

### Variables de Entorno de Producción

```env
VITE_SUPABASE_URL=tu_url_de_supabase_produccion
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase_produccion
VITE_APP_URL=https://pilotodedrones.com
```

## 🤝 Contribución

¡Las contribuciones son bienvenidas! Si quieres contribuir al proyecto:

1. **Fork** el repositorio
2. **Crea** una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la rama (`git push origin feature/AmazingFeature`)
5. **Abre** un Pull Request

### Guías de Contribución

- Sigue las convenciones de código existentes
- Añade tests para nuevas funcionalidades
- Actualiza la documentación cuando sea necesario
- Usa commits descriptivos

## 📄 Licencia

Este proyecto está bajo la **Licencia MIT**. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 👨‍💻 Desarrollador

**Alvaro Cofré**
- 🌐 **Website**: [www.alvarocofre.dev](https://www.alvarocofre.dev)
- 📧 **Email**: web@alvarocofre.dev
- 💼 **LinkedIn**: [Alvaro Cofré](https://linkedin.com/in/alvarocofre)

## 📞 Contacto y Soporte

- **Proyecto**: Piloto de Drones
- **Desarrollador**: Alvaro Cofré
- **Email**: web@alvarocofre.dev
- **Website**: [www.alvarocofre.dev](https://www.alvarocofre.dev)

## 🙏 Agradecimientos

- Comunidad de React y TypeScript
- Equipo de Supabase por la excelente plataforma
- Comunidad de pilotos de drones en Chile
- Todos los contribuidores del proyecto

---

**Desarrollado con ❤️ por [Alvaro Cofré](https://www.alvarocofre.dev) para la comunidad de pilotos de drones en Chile**

*Última actualización: Diciembre 2024*