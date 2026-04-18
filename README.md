# 🍔 City Fast – Dashboard Administrativo

Panel administrativo avanzado para la gestión integral del sistema **City Fast**, orientado a la administración de pedidos, stock, productos, personal y métricas en tiempo real.

Desarrollado como una **Single Page Application (SPA)** moderna, este dashboard se integra con un backend en **Spring Boot**, utilizando comunicación REST y WebSockets para ofrecer una experiencia dinámica, reactiva y escalable.

---

## 🚀 Tecnologías Utilizadas

### 🖥️ Frontend
- React 18 + Vite
- TypeScript
- Tailwind CSS

### 🧠 Estado y Arquitectura
- Zustand
- Context API

### 🌐 Comunicación
- Axios (con interceptores)

### 🔄 Tiempo Real
- WebSocket + STOMP.js

### 🔐 Seguridad
- Auth0 (OAuth2)
- JWT
- RBAC (roles)

### 📊 Visualización
- Chart.js + React-ChartJS-2

### 🏗️ Backend e Infraestructura
- Spring Boot
- MySQL
- Cloudinary

---

## 📦 Estructura del Proyecto

```
src/
├── api/            # Definición de endpoints y cliente HTTP
├── components/     # Componentes reutilizables
│   ├── auth/       # Login, protección de rutas
│   ├── dashboard/  # KPIs, gráficos, widgets
│   ├── layout/     # Sidebar, Navbar, Footer
│   └── ui/         # Componentes base (Button, Modal, etc.)
├── context/        # Contextos globales
├── hooks/          # Hooks personalizados
├── pages/          # Vistas principales
├── routes/         # Rutas y permisos
├── services/       # Lógica intermedia de datos
├── store/          # Zustand (estado global)
├── types/          # Interfaces TypeScript
└── utils/          # Funciones auxiliares
```

---

## 🛠️ Scripts de Desarrollo

```bash
# Instalar dependencias
npm install

# Servidor de desarrollo (HMR)
npm run dev

# Build de producción
npm run build

# Linting
npm run lint

# Formateo automático
npm run format
```

---

## 🏗️ Arquitectura del Sistema

Frontend (React SPA) → API REST (Spring Boot) → MySQL  
↕  
WebSocket (tiempo real)

---

## 📊 Funcionalidades

### Dashboard
- Métricas en tiempo real
- Gráficos dinámicos
- Alertas de stock

### Productos e Insumos
- CRUD completo
- Control de stock
- Sistema de recetas
- Categorías jerárquicas
- Imágenes con Cloudinary

### Promociones
- Descuentos configurables
- Programación por fechas

### Personal
- Gestión de empleados
- Roles:
  - Administrador
  - Cocinero
  - Repartidor

### POS
- Apertura y cierre de caja

### Alertas
- Notificaciones en tiempo real

---

## 🔐 Seguridad y Performance

- Auth0 + JWT
- Control de accesos
- Lazy Loading
- Code Splitting
- Manejo de errores global

---

## 🧠 Buenas Prácticas

- Tipado fuerte (TypeScript)
- Arquitectura por capas
- Componentes reutilizables
- Código modular

---

## 🚀 Setup

```bash
# Clonar repositorio
git clone <repo-url>

cd <nombre-del-proyecto>

# Instalar dependencias
npm install

# Levantar entorno
npm run dev
```

---

## 🧑‍💻 Autor

- Líder: Máximo Bazán Leiva Agustín
- Desarrollo: Máximo Bazán Leiva Agustín, Jeremías Daniel Luzuriaga, David Exequiel Álvarez

---
