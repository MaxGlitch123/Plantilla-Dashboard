import { useAuth0 } from "@auth0/auth0-react";
import { ReactNode, useEffect, useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { getRoleFromUser } from "../layout/Sidebar";
import AuthenticationGuard from "./AuthenticationGuard";

interface Props {
  children: ReactNode;
  allowedRoles: string[];
  enableAdvancedGuard?: boolean;
  validationInterval?: number;
}

/* const VITE_AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE; */

// 🧠 Mapeo de nombres de roles de Auth0 a los internos del frontend
const mapRole = (raw: string): string => {
  const upperRole = raw.toUpperCase();
  
  switch (upperRole) {
    case "ADMIN": 
    case "ADMINISTRADOR":
      return "admin";
    case "CHEF": 
    case "COCINERO":
      return "chef";
    case "DELIVERY": 
    case "REPARTIDOR":
      return "delivery";
    case "CLIENTE": 
      return "client";
    case "CAJERO":
      return "cashier";
    default: return raw.toLowerCase();
  }
};

export const ProtectedRoute = ({ 
  children, 
  allowedRoles,
  enableAdvancedGuard = true,
  validationInterval = 0 // Disabled by default
}: Props) => {
  const {
    isAuthenticated,
    user,
    isLoading,
    getAccessTokenSilently,
  } = useAuth0();

  const location = useLocation();

  // Usar selectores individuales y estables con Zustand para evitar warning de getSnapshot
  const setToken = useAuthStore(state => state.setToken);
  const setRol = useAuthStore(state => state.setRol);
  const token = useAuthStore(state => state.token);
  const rolFromStore = useAuthStore(state => state.rol);

  console.log('🔐 ProtectedRoute: Checking access for', location.pathname, {
    allowedRoles,
    userAuthenticated: isAuthenticated,
    hasUser: !!user,
    enableAdvancedGuard
  });

  // Obtener y mapear el rol del usuario desde el token de Auth0
  const userRole: string | null = useMemo(() => {
    if (!user) return null;
    
    // La clave precisa para los roles en nuestro caso es https://buensabor/roles
    const rolesFromClaim = user['https://buensabor/roles'];

    // Si tenemos roles en el claim principal, los usamos directamente
    if (Array.isArray(rolesFromClaim) && rolesFromClaim.length > 0) {
      const role = rolesFromClaim[0];
      const mappedRole = typeof role === "string" ? mapRole(role) : null;
      console.log('🎭 ProtectedRoute: Role from claim:', role, '→', mappedRole);
      return mappedRole;
    }
    
    // Fallback: buscar en otras propiedades del usuario
    const key = Object.keys(user).find((k) => k.includes("roles") || k.includes("role"));
    const raw = key && user[key];
    const role = Array.isArray(raw) ? raw[0] : raw;
    const mappedRole = typeof role === "string" ? mapRole(role) : null;
    console.log('🎭 ProtectedRoute: Role from fallback:', role, '→', mappedRole);

    return mappedRole;
  }, [user]);

  // Actualizar el rol si cambia (separado para evitar un loop de dependencias)
  useEffect(() => {
    if (user && userRole && rolFromStore !== userRole) {
      console.log('🔄 ProtectedRoute: Updating role in store:', userRole);
      setRol(userRole);
    }
  }, [user, userRole, rolFromStore, setRol]);
  
  // Gestionar el token solo cuando sea necesario
  useEffect(() => {
    // Flag para evitar actualizaciones cuando el componente se desmonta
    let isMounted = true;
    
    // Solo continuar si hay un usuario y no tenemos token válido
    if (!user || (token && token.length > 20)) {
      return;
    }
    
    // Obtener el token una sola vez
    const getToken = async () => {
      try {
        console.log('🎫 ProtectedRoute: Getting access token...');
        const newToken = await getAccessTokenSilently({
          authorizationParams: {
            audience: "https://buensabor/",
          }
        });
        
        // Verificar que el componente siga montado antes de actualizar el estado
        if (isMounted && newToken) {
          console.log('🎫 ProtectedRoute: Token obtained and stored');
          setToken(newToken);
        }
      } catch (err) {
        console.warn('🎫 ProtectedRoute: Failed to get token', err);
        // Error silencioso, no hacer nada más
      }
    };

    getToken();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [user, token, setToken, getAccessTokenSilently]);

  // Role validation logic
  const validateRoleAccess = (): { canAccess: boolean; redirectTo?: string; reason?: string } => {
    // Basic role validation
    const role = getRoleFromUser(user);

    if (role === 'guest') {
      console.log('❌ ProtectedRoute: User has guest role, redirecting to /no-role');
      return { canAccess: false, redirectTo: '/no-role', reason: 'guest_role' };
    }

    // Validaciones defensivas
    if (!allowedRoles || !Array.isArray(allowedRoles)) {
      console.log('⚠️ ProtectedRoute: Invalid allowed roles configuration, redirecting to dashboard');
      return { canAccess: false, redirectTo: '/dashboard', reason: 'invalid_config' };
    }

    // Detectar si es un cliente intentando acceder a área administrativa
    if (userRole === 'client' && !allowedRoles.includes('client')) {
      console.log('🚫 ProtectedRoute: Client attempting admin access, redirecting to access denied');
      return { canAccess: false, redirectTo: '/client-access-denied', reason: 'client_admin_access' };
    }

    if (!userRole || !allowedRoles.includes(userRole)) {
      console.log('❌ ProtectedRoute: User role not allowed', { userRole, allowedRoles });
      return { canAccess: false, redirectTo: '/dashboard', reason: 'insufficient_role' };
    }

    console.log('✅ ProtectedRoute: Role access granted', { userRole, allowedRoles });
    return { canAccess: true };
  };

  // If using advanced authentication guard
  if (enableAdvancedGuard) {
    return (
      <AuthenticationGuard
        validationInterval={validationInterval}
        enableStorageValidation={true}
        enableTokenValidation={true}
        onProblemDetected={(problem) => {
          console.warn('🚨 ProtectedRoute: Authentication problem detected in guard:', problem);
        }}
      >
        {/* Once authenticated, validate roles */}
        {(() => {
          // Loading
          if (isLoading) {
            return (
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading user permissions...</p>
                </div>
              </div>
            );
          }

          // Basic auth check (the guard handles this, but double-check)
          if (!isAuthenticated || !user) {
            console.log('❌ ProtectedRoute: Not authenticated, redirecting to login');
            return <Navigate to="/login" replace />;
          }

          // Role validation
          const roleCheck = validateRoleAccess();
          if (!roleCheck.canAccess) {
            return <Navigate to={roleCheck.redirectTo || '/dashboard'} replace />;
          }

          // All checks passed
          return <>{children}</>;
        })()}
      </AuthenticationGuard>
    );
  }

  // Legacy mode - without advanced guard
  console.log('ℹ️ ProtectedRoute: Using legacy authentication mode');

  // Loading
  if (isLoading) return <p>Cargando...</p>;

  // No autenticado
  if (!isAuthenticated || !user) return <Navigate to="/login" />;

  // Role validation
  const roleCheck = validateRoleAccess();
  if (!roleCheck.canAccess) {
    return <Navigate to={roleCheck.redirectTo || '/dashboard'} />;
  }

  return <>{children}</>;
};
