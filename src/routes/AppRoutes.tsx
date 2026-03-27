import React, { useEffect, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0, GetTokenSilentlyOptions } from '@auth0/auth0-react';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import ChangePasswordPage from '../pages/auth/ChangePasswordPage';
import DashboardPage from '../pages/DashboardPage';
import NotFoundPage from '../pages/NotFoundPage';
import CustomersPage from '../pages/CustomersPage';
import EmployeesPage from '../pages/EmployeesPage';
import WebOrdersPage from '../pages/WebOrdersPage'; // Renombrado de OrdersPage
import DeliveryPage from '../pages/DeliveryPage';
import ReportsPage from '../pages/ReportsPage';
import SettingsPage from '../pages/SettingsPage';
import { CallbackPage } from '../pages/CallbackPage';
import ProductsPage from '../pages/ProductsPage';
import ProductCategoriesPage from '../pages/ProductCategoriesPage';
import UnitMeasurePage from '../pages/UnitMeasurePage';
import PromotionsPage from '../pages/PromotionsPage';
import SessionExpiredPage from '../pages/SessionEXpiredPage';
import NoRolePage from '../pages/NoRolePage';
import ClientAccessDeniedPage from '../pages/ClientAccessDeniedPage';

// POS Pages
import POSPage from '../pages/POSPage';
import POSSalesPage from '../pages/POSSalesPage';
import POSProductsPage from '../pages/POSProductsPage';

// Component
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { setTokenGetter } from '../api/apiClient';
import SuppliesPage from '../pages/SuppliesPage';
import EmployeeRolesPage from '../pages/EmployeeRolesPage';
// Removed UpdateDetector import

// Store
import { useAuthStore } from '../store/useAuthStore';

// Roles
const ALL_ROLES = ['admin', 'chef', 'delivery', 'cajero'];
const POS_ROLES = ['admin', 'cajero']; // Roles con acceso al POS

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth0();
  
  console.log('🌍 PublicRoute: Checking access', { isAuthenticated, isLoading });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (isAuthenticated) {
    console.log('🌍 PublicRoute: User already authenticated, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { getAccessTokenSilently, user, isAuthenticated, isLoading } = useAuth0();

  console.log('🔄 AppRoutes renderizando - Estado auth:', { 
    isAuthenticated, 
    isLoading, 
    user: user?.email,
    pathname: window.location.pathname
  });

  // Usar un selector estable para evitar regeneraciones
  const setToken = useAuthStore(state => state.setToken);
  
  // Memoize el tokenGetter para evitar recreaciones innecesarias
  const tokenGetterWrapper = useMemo(() => {
    return async () => {
      try {
        // Obtener el token actual usando la API de Zustand
        const currentToken = useAuthStore.getState().token;
        
        if (currentToken && currentToken.length > 20) {
          console.log('🎫 AppRoutes: Using cached token');
          return currentToken;
        }
        
        // Si no hay token o no es válido, intentamos obtenerlo
        if (isAuthenticated) {
          console.log('🎫 AppRoutes: Fetching new token from Auth0');
          const options: GetTokenSilentlyOptions = {
            authorizationParams: {
              audience: "https://buensabor/",
              scope: 'openid profile email',
            },
            cacheMode: "off",
          };
          
          const newToken = await getAccessTokenSilently(options);
          if (newToken) {
            console.log('🎫 AppRoutes: New token obtained and stored');
            setToken(newToken);
            return newToken;
          }
        }
        
        throw new Error('No se pudo obtener el token');
      } catch (error) {
        console.error('🎫 AppRoutes: Token acquisition failed', error);
        throw error;
      }
    };
  }, [getAccessTokenSilently, isAuthenticated, setToken]);
  
  // Configurar el token getter una sola vez
  useEffect(() => {
    console.log('⚙️ AppRoutes: Configuring token getter');
    setTokenGetter(tokenGetterWrapper);
  }, [tokenGetterWrapper]);

  // ⚠️ Asumimos que los roles están en una claim personalizada, como:
  const audienceKey = import.meta.env.VITE_AUTH0_AUDIENCE?.endsWith('/') 
    ? import.meta.env.VITE_AUTH0_AUDIENCE + 'roles'
    : import.meta.env.VITE_AUTH0_AUDIENCE + '/roles';
  
  const roles: string[] = user?.[audienceKey] || [];
  
  console.log('👤 Usuario y roles:', { 
    email: user?.email, 
    roles, 
    audienceKey,
    isAuthenticated,
    isLoading
  });

  if (isLoading) {
    console.log('⏳ Cargando autenticación...');
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Application</h2>
          <p className="text-gray-600">Setting up your authentication...</p>
        </div>
      </div>
    );
  }

  // 👇 Si está autenticado pero no tiene roles → página especial
  if (isAuthenticated && roles.length === 0) {
    console.log('❌ Usuario sin roles - Redirigiendo a NoRolePage');
    return (
      <Routes>
        <Route path="*" element={<NoRolePage />} />
      </Routes>
    );
  }

  console.log('✅ Renderizando rutas principales');

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={<PublicRoute><LoginPage /></PublicRoute>} 
        />
        <Route 
          path="/callback" 
          element={<CallbackPage />} 
        />
        <Route 
          path="/change-password" 
          element={<ChangePasswordPage />} 
        />

        {/* Authentication Problem Route - accessible to all */}
        <Route 
          path="/session-expired" 
          element={<SessionExpiredPage />} 
        />

        {/* Client Access Denied Route */}
        <Route 
          path="/client-access-denied" 
          element={<ClientAccessDeniedPage />} 
        />

        {/* Special Routes */}
        <Route 
          path="/no-role" 
          element={<NoRolePage />} 
        />

        {/* Protected Routes with Advanced Authentication Guard */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute 
              allowedRoles={ALL_ROLES}
              enableAdvancedGuard={true}
              validationInterval={0} // Disabled
            >
              <DashboardPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/customers" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <CustomersPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/employees" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <EmployeesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/employees/roles" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <EmployeeRolesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute 
              allowedRoles={ALL_ROLES}
              enableAdvancedGuard={true}
              validationInterval={0} // Disabled
            >
              <WebOrdersPage />
            </ProtectedRoute>
          } 
        />

        {/* Rutas del POS */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute 
              allowedRoles={POS_ROLES}
              enableAdvancedGuard={true}
            >
              <POSPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/pos/sales" 
          element={
            <ProtectedRoute 
              allowedRoles={POS_ROLES}
              enableAdvancedGuard={true}
            >
              <POSSalesPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/pos/products" 
          element={
            <ProtectedRoute 
              allowedRoles={POS_ROLES}
              enableAdvancedGuard={true}
            >
              <POSProductsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/supplies" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin', 'chef']}
              enableAdvancedGuard={true}
            >
              <SuppliesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/products" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin', 'chef']}
              enableAdvancedGuard={true}
            >
              <ProductsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/products/categories" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <ProductCategoriesPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/promotions" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <PromotionsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/unit-measures" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <UnitMeasurePage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/delivery" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin', 'delivery']}
              enableAdvancedGuard={true}
              validationInterval={0} // Disabled
            >
              <DeliveryPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/reports" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute 
              allowedRoles={['admin']}
              enableAdvancedGuard={true}
            >
              <SettingsPage />
            </ProtectedRoute>
          } 
        />

        {/* Redirects */}
        <Route 
          path="/" 
          element={<Navigate to="/dashboard" replace />} 
        />
        
        <Route 
          path="*" 
          element={<NotFoundPage />} 
        />
      </Routes>
    </>
  );
};

export default AppRoutes;
