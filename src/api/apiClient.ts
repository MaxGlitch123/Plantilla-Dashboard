import axios, { InternalAxiosRequestConfig } from "axios";

// Extender la configuración de Axios para soportar la propiedad _retry
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

// Función para obtener el token (la seteás desde AppRoutes o App)
let tokenGetter: (() => Promise<string>) | null = null;

export const setTokenGetter = (getter: () => Promise<string>) => {
  tokenGetter = getter;
};

// Función para verificar si hay un tokenGetter disponible
export const hasTokenGetter = (): boolean => {
  return tokenGetter !== null;
};

// Ya no necesitamos acceder al store directamente en apiClient.ts

// Función para obtener el token (solo para uso interno)
export const getToken = async (): Promise<string | null> => {
  // Si no hay tokenGetter configurado, no podemos obtener el token
  if (!tokenGetter) return null;
  
  try {
    // Usamos directamente el tokenGetter para obtener el token
    const token = await tokenGetter();
    return token;
  } catch (err) {
    return null;
  }
};

// Determinar la URL base usando las variables de entorno o fallback a proxy
const getBaseUrl = () => {
  // Si estamos en desarrollo, usar el proxy
  if (import.meta.env.DEV) {
    console.log('🔧 Modo desarrollo - Usando proxy /api-proxy');
    return '/api-proxy';
  }
  
  // Si hay una variable de entorno definida, usarla
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    console.log('🔧 Usando VITE_API_URL:', envApiUrl);
    return envApiUrl;
  }
  
  console.log('🔧 Fallback - Usando proxy /api-proxy');
  // Fallback al proxy
  return '/api-proxy';
};

// Instancia Axios configurada
const apiClient = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

console.log('🔧 ApiClient configurado con baseURL:', apiClient.defaults.baseURL);

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use(
  async (config) => {
    // Solo usar tokenGetter para obtener token
    if (tokenGetter) {
      try {
        const token = await tokenGetter();
        if (token) {
          // Asegurarnos que la autorización se envíe en formato correcto
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
          
          // Decodificar el token para obtener roles
          try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const payload = JSON.parse(jsonPayload);
            
            // Agregar roles como header adicional
            const roles = payload['https://buensabor/roles'] || [];
            if (roles.length > 0) {
              const roleValue = roles[0].toUpperCase();
              
              // Enviar el header con ambas variaciones (mayúsculas y minúsculas) para compatibilidad
              config.headers['x-user-role'] = roleValue;
              config.headers['X-User-Role'] = roleValue;
            }
          } catch (e) {
            // Error silencioso al decodificar token
          }
        }
      } catch (err) {
        // Error silencioso
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Variable para evitar intentos de refresco múltiples
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
let refreshFailCount = 0;
const maxRefreshAttempts = 3;

// Función para refrescar token
const refreshToken = async (): Promise<string | null> => {
  if (!tokenGetter) return null;
  
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  
  // Controlar intentos máximos pero sin redirección automática
  if (refreshFailCount >= maxRefreshAttempts) {
    return null;
  }
  
  try {
    isRefreshing = true;
    refreshPromise = tokenGetter();
    const token = await refreshPromise;
    refreshFailCount = 0; // Reiniciar contador si fue exitoso
    return token;
  } catch (error) {
    refreshFailCount++;
    return null;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
};

// Interceptor de respuesta para manejar errores
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      
      // Si es un error de autenticación, intentar refrescar el token y reintentar
      if ((status === 401 || status === 403) && error.config) {
        // Evitar ciclos de reintento si ya estamos reintentando
        if (error.config._retry) {
          return Promise.reject(error);
        }
        
        // Marcar esta solicitud como reintento
        error.config._retry = true;
        
        try {
          // Intentar refrescar el token
          const newToken = await refreshToken();
          
          if (newToken) {
            // Actualizar el header de autorización con el nuevo token
            error.config.headers = error.config.headers || {};
            error.config.headers.Authorization = `Bearer ${newToken}`;
            
            // Volver a hacer la solicitud con el nuevo token
            return apiClient(error.config);
          } else {
            return Promise.reject(error);
          }
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
