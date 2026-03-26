
# 🍔 El Buen Sabor – Dashboard Administrativo

Panel administrativo para la gestión integral del sistema **El Buen Sabor**, una aplicación web para la gestión de pedidos de comida en modalidad **delivery** y **retiro en local**. Desarrollado en **React + TypeScript + Vite**, con integración a backend **Spring Boot**, **MySQL** y autenticación a través de **Auth0**.

## 🚀 Tecnologías Utilizadas

- **Frontend**: [Vite](https://vitejs.dev/) + [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Estilos**: [TailwindCSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/)
- **Estado**: [Zustand](https://zustand.docs.pmnd.rs/) para gestión de estado global
- **HTTP**: [Axios](https://axios-http.com/) con interceptores automáticos
- **Autenticación**: [Auth0](https://auth0.com/) con OAuth2 y roles dinámicos
- **Tiempo Real**: WebSocket + [STOMP.js](https://stomp-js.github.io/) para actualizaciones live
- **Gráficos**: [Chart.js](https://www.chartjs.org/) + [React-ChartJS-2](https://react-chartjs-2.js.org/)
- **Backend**: [Spring Boot](https://spring.io/projects/spring-boot) REST API
- **Base de datos**: [MySQL](https://www.mysql.com/)
- **Almacenamiento**: [Cloudinary](https://cloudinary.com/) para imágenes
- **Responsive**: Compatibilidad móvil, tablet y desktop

---

## 📦 Estructura del Proyecto

```

el-buen-sabor-dashboard
├─ src
│  ├─ api                # Llamadas HTTP agrupadas por entidad (empleados, insumos, roles, etc.)
│  ├─ components         # Componentes reutilizables del sistema
│  │  ├─ auth            # Componentes relacionados con autenticación (login, rutas protegidas)
│  │  ├─ dashboard       # Widgets del panel principal
│  │  ├─ employees       # Modales de gestión de empleados y roles
│  │  ├─ layout          # Estructura general de la interfaz (Sidebar, Header, etc.)
│  │  ├─ products        # Modales de productos y subcategorías
│  │  ├─ supplies        # Modal de insumos
│  │  └─ ui              # Componentes visuales reutilizables (Input, Button, etc.)
│  ├─ context            # Contextos globales (Auth)
│  ├─ pages              # Vistas principales del sistema (Dashboard, Pedidos, Productos, etc.)
│  ├─ routes             # Ruteo principal de la aplicación
│  ├─ store              # Zustand store para manejo de sesión
│  ├─ types              # Definiciones de tipos (TypeScript)
│  ├─ utils              # Funciones auxiliares

````

---

## 🚀 Tecnologías

- **React + Vite**
- **TypeScript**
- **TailwindCSS**
- **Zustand** para gestión de estado
- **Axios** para consumo de API
- **Auth0** para autenticación de usuarios
- **Spring Boot** como backend REST

## 🛠️ Scripts de Desarrollo

```bash
# 📦 Instalar dependencias
npm install

# 🚀 Servidor de desarrollo (puerto 5173)
npm run dev

# 🏗️ Build de producción
npm run build

# 👀 Preview del build
npm run preview

# 🧹 Linting y formato
npm run lint
```

---

## 🏗️ Arquitectura del Sistema

### **Frontend (Este Dashboard)**
```
Dashboard Admin (React + TS) → Backend API (Spring Boot) → MySQL
       ↕                              ↕
   WebSocket ←-------------------- WebSocket Server
```

### **Endpoints del Backend**
- **Autenticación**: `/api/admin/users`, `/api/admin/roles`
- **Productos**: `/articuloManufacturado/*`, `/articuloInsumo/*`
- **Categorías**: `/categoria/*`, `/subCategoria/*`
- **Promociones**: `/promocion/*`
- **Dashboard**: `/api/dashboard/*`
- **Imágenes**: `/images/uploadToEntity`
- **WebSocket**: `/ws/pedidos`, `/ws/stock`

## 🔄 Integración con Frontend Cliente

Este dashboard se complementa con:
- **Frontend Cliente**: Interfaz para pedidos de clientes
- **App Móvil**: Para delivery y clientes *(futuro)*
- **Sistema POS**: Para punto de venta físico *(futuro)*

---

## 👥 Roles y Accesos Implementados

- **👑 Administrador**: Control total del sistema
  - Dashboard con métricas en tiempo real
  - Gestión completa de productos, insumos y categorías
  - ABM de empleados y roles
  - Configuración de promociones y happy hours
  - Control de stock crítico con alertas
  - Acceso a todos los módulos

- **👨‍🍳 Chef/Cocinero**: Gestión operativa de cocina
  - Dashboard con estado de stock
  - Gestión de productos manufacturados
  - Control de insumos y recetas
  - Vista de pedidos en preparación *(en desarrollo)*

- **🚚 Repartidor**: Gestión de entregas
  - Dashboard básico
  - Gestión de entregas *(en desarrollo)*
  - Estados de pedidos delivery *(en desarrollo)*

---

## ✅ Funcionalidades Implementadas

### 🔐 **Autenticación y Seguridad**
- **Login/Logout** con Auth0 y Google OAuth
- **Protección de rutas** según roles y permisos
- **Validación de tokens** automática con renovación
- **Páginas de error** especializadas (sin rol, acceso denegado, sesión expirada)

### 📊 **Dashboard en Tiempo Real**
- **Métricas clave**: ventas totales, pedidos, productos vendidos
- **WebSocket**: Actualizaciones automáticas sin refresh
- **Alertas críticas**: Stock mínimo con notificaciones visuales
- **Gráficos interactivos**: Productos más vendidos (Chart.js)
- **Estado de inventario**: Barras de progreso por insumo
- **Indicador de conexión**: Estado de WebSocket en tiempo real

### 🏪 **Gestión de Productos e Insumos**
- **CRUD completo de insumos**: Denominación, stock, precios, unidades
- **CRUD de productos manufacturados**: Con ingredientes y recetas
- **Gestión jerárquica**: Categorías y subcategorías
- **Unidades de medida**: Configurables y reutilizables
- **Upload de imágenes**: Integración con Cloudinary
- **Control automático de stock**: Alertas y validaciones
- **Precios dinámicos**: Según tipo de insumo (elaborar/comprar)
- **Validaciones MercadoPago**: Límites automáticos ($1 - $999,999) para compatibilidad con pagos online
- **Navegación inteligente**: Links directos desde alertas de stock crítico a insumos específicos

### 🎉 **Sistema de Promociones**
- **CRUD avanzado**: Crear, editar, eliminar promociones
- **Tipos configurables**: Happy Hour, promociones especiales, ofertas limitadas
- **Programación temporal**: Fechas y horarios específicos
- **Descuentos flexibles**: Porcentaje o precio fijo
- **Alcance configurable**: Todos los productos, por categorías, productos específicos o tags
- **Estados dinámicos**: Activa, programada, expirada con badges visuales
- **Validaciones**: Fechas, rangos de descuento, límites

### 👨‍👩‍👧‍👦 **Gestión de Personal**
- **CRUD de empleados**: Alta, modificación, baja con validaciones
- **Gestión de roles**: Creación y asignación con auth0RoleId
- **Permisos dinámicos**: Actualización inmediata sin recarga
- **Estados de empleado**: Activo/inactivo

## 🛠️ Scripts útiles

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm run dev

# Compilar build de producción
npm run build

# Formatear código
npm run format

# Lint del proyecto
npm run lint
```

---

## 🧠 Patrones de Desarrollo

- **Separación por dominio**: Código organizado por entidades (empleados, insumos, productos)
- **Componentes reutilizables**: Sistema de Design System con Button, Input, Card, Badge
- **API centralizada**: Cliente HTTP con interceptores y manejo de errores
- **Estado global**: Zustand para auth y datos críticos
- **Tipado fuerte**: TypeScript con interfaces bien definidas
- **Real-time**: WebSocket con reconexión automática
- **Validaciones**: Frontend y backend con feedback visual

---

## �️ Seguridad y Performance

### **Autenticación**
- **Auth0** con tokens JWT seguros
- **Renovación silenciosa** de tokens
- **Roles granulares** con permisos específicos
- **Timeout de sesión** configurable

### **Performance**
- **Lazy loading** de rutas y componentes
- **Memoización** de componentes pesados
- **Debounce** en búsquedas y filtros
- **Optimización de re-renders** con Zustand

### **Monitoreo**
- **Logging detallado** en consola (desarrollo)
- **Estado de WebSocket** visible
- **Manejo de errores** con feedback al usuario

---


### **Setup del Entorno**
```bash
# Clonar repositorio
git clone [repo-url]
cd Front_BuenSabor_Dashboard

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con valores reales

# Levantar desarrollo
npm run dev
```

### **Estructura de Commits**
```
feat(módulo): nueva funcionalidad
fix(módulo): corrección de bug
refactor(módulo): mejora de código
style: cambios de formato
docs: actualización de documentación
test: añadir o corregir tests
```

## 🌟 Características Destacadas

### ⚡ **Tiempo Real**
- Actualizaciones automáticas de pedidos y stock
- WebSocket con reconexión automática
- Notificaciones push para eventos críticos

### 🎨 **UX/UI Optimizada**
- Diseño responsivo mobile-first
- Dark mode support *(futuro)*
- Componentes accesibles (WCAG)
- Animaciones fluidas con Tailwind

### 🔄 **Escalabilidad**
- Arquitectura modular extensible
- Lazy loading de rutas
- Caché inteligente de datos
- Preparado para microfrontends

---

## 🚀 Deployment

### **Desarrollo**
```bash
npm run dev
# http://localhost:5173
```

### **Producción**
```bash
npm run build
npm run preview
# O deploy en Vercel/Netlify
```

### **Docker** *(Opcional)*
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5173
CMD ["npm", "run", "preview"]
```

---

## 🧑‍💻 Autor

**Máximo Bazán Leiva Agustín**  
*El Buen Sabor - Dashboard Administrativo*  
© 2025

---

## 📝 Licencia

Este proyecto es parte de un trabajo académico. Todos los derechos reservados.

---

*Última actualización: Septiembre 2025*

