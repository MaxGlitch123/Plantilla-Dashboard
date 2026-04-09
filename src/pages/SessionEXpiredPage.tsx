import { useEffect , useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut, RefreshCw, AlertTriangle, Home, Clock, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { sessionCleanupService } from '../services/SessionCleanupService';

interface SessionProblem {
    type : 'not_authenticated' | 'missing_user' | 'auth_error' | 'session_corrupt' | 'invalid_token' | 'storage_inconsistent' | 'manual' ;
    message : string ;
    severity : 'low' | 'medium' | 'high' | 'critical';
    recommendation : string ;
}

const SessionExpiredPage: React.FC = () => {

    const { logout, loginWithRedirect, isAuthenticated, isLoading, user, error } = useAuth0();
    const [countdown, setCountdown] = useState(600); // 600 seconds countdown
    const [autoLogoutEnabled, setAutoLogoutEnabled] = useState(true);
    const [sessionProblem, setSessionProblem] = useState<SessionProblem | null>(null);

    console.log('🚪 === SESSION EXPIRED PAGE LOADED ===')
    console.log('📊 Auth0 State:', { 
        isAuthenticated, 
        isLoading, 
        user: user?.email,
        error: error?.message
  });

    useEffect(() => {
        const problem = analyzeSessionProblem();
        setSessionProblem(problem);
        console.log('🔍 Session problem analyzed:', problem);
    }, [isAuthenticated, isLoading, user, error]);

    useEffect(() => {
        if (autoLogoutEnabled && countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }else if (autoLogoutEnabled && countdown === 0){
            console.log('⏰ Auto-logout triggered after countdown')
            handleCompleteLogout();
        }

}, [countdown, autoLogoutEnabled]);

const analyzeSessionProblem = (): SessionProblem => {
    console.log('🔍 Analizando problema de sesión...', {
        isAuthenticated,
        isLoading,
        hasUser: !!user,
        hasError: !!error,
        userEmail: user?.email
    });

    // 1. Error explícito de Auth0
    if (error) {
        console.log('❌ Error de Auth0 detectado:', error.message);
        return {
            type: 'auth_error',
            message: `Error de autenticación: ${error.message}`,
            severity: 'critical',
            recommendation: 'Intente iniciar sesión nuevamente. Si el problema persiste, contacte al soporte.'
        };
    }

    // 2. No autenticado (después de cargar)
    if (!isLoading && !isAuthenticated) {
        console.log('❌ Usuario no autenticado');
        return {
            type: 'not_authenticated',
            message: 'No está autenticado. Su sesión ha expirado o no ha iniciado sesión.',
            severity: 'high',
            recommendation: 'Por favor, inicie sesión para continuar.'
        };
    }

    // 3. Autenticado pero sin datos de usuario
    if (!isLoading && isAuthenticated && !user) {
        console.log('❌ Autenticado pero sin datos de usuario');
        return {
            type: 'missing_user',
            message: 'No se pudo obtener la información del usuario.',
            severity: 'medium',
            recommendation: 'Intente cerrar sesión e iniciar sesión nuevamente.'
        };
    }

    // 4. Sesión corrupta (autenticado con usuario pero sin datos esenciales)
    if (!isLoading && isAuthenticated && user && (!user.sub || !user.email)) {
        console.log('❌ Sesión corrupta detectada - faltan datos esenciales');
        return {
            type: 'session_corrupt',
            message: 'La sesión está corrupta. Faltan datos esenciales del usuario.',
            severity: 'critical',
            recommendation: 'Cierre sesión y vuelva a iniciar sesión para corregir la sesión corrupta.'
        };
    }

    // 5. Verificar inconsistencia en el storage
    if (!isLoading && isAuthenticated && user) {
        try {
            const auth0Keys = Object.keys(localStorage).filter(key => 
                key.startsWith('@@auth0spajs@@') || key.includes('auth0')
            );
            
            if (auth0Keys.length === 0) {
                console.log('❌ Storage inconsistente - datos Auth0 faltantes');
                return {
                    type: 'storage_inconsistent',
                    message: 'Los datos de autenticación en el navegador están inconsistentes.',
                    severity: 'medium',
                    recommendation: 'Reinicie la sesión para sincronizar correctamente los datos.'
                };
            }
        } catch (storageError) {
            console.warn('⚠️ Error verificando storage:', storageError);
        }
    }

    // 6. Caso por defecto - llegada manual a la página
    console.log('ℹ️ Llegada manual a página de sesión expirada');
    return {
        type: 'manual',
        message: 'Ha llegado a la página de gestión de sesión.',
        severity: 'low',
        recommendation: 'Si experimentó problemas de autenticación, puede cerrar sesión y volver a iniciar sesión.'
    };
};

const handleCompleteLogout = async () => {

    console.log('🚪 User initiated complete logout');

    try {
      // Usar el SessionCleanupService para limpieza completa
      console.log('🧹 Iniciando limpieza completa con SessionCleanupService...');
      
      const cleanupResult = await sessionCleanupService.performCompleteCleanup({
        clearLocalStorage: true,
        clearSessionStorage: true,
        clearCookies: true,
        clearCache: true,
        clearAuth0Storage: true,
        preserveKeys: ['pos-sales', 'pos-storage', 'pos-last-sale'],
        logCleanup: true
      });

      if (cleanupResult.success) {
        console.log('✅ Limpieza completa exitosa:', cleanupResult.clearedItems);
      } else {
        console.warn('⚠️ Limpieza completa con algunos errores:', cleanupResult.errors);
      }

      // Logout de Auth0 con limpieza federada
      console.log('🚪 Ejecutando logout de Auth0...');
      logout({
        logoutParams: {
          returnTo: `${window.location.origin}/login`,
          federated: true // Cierra sesión también en el proveedor de identidad
        }
      });

    } catch (error) {
      console.error('❌ Error durante logout completo:', error);
      
      // Fallback: intentar limpieza de emergencia
      try {
        console.log('🚨 Intentando limpieza de emergencia...');
        await sessionCleanupService.emergencyCleanup();
      } catch (emergencyError) {
        console.error('❌ Error en limpieza de emergencia:', emergencyError);
      }
      
      // Fallback final: logout básico de Auth0
      logout({
        logoutParams: {
          returnTo: `${window.location.origin}/login`
        }
      });
    }
};

const handleRetryAuth = async () => {
    console.log('🔄 Usuario reintentando autenticación');
    setAutoLogoutEnabled(false);
    
    try {
        // Usar limpieza suave para preservar algunas preferencias
        console.log('🧹 Limpieza suave antes de reintentar...');
        await sessionCleanupService.gentleCleanup(['theme', 'language', 'user-preferences']);
        
        console.log('✅ Limpieza suave completada, redirigiendo a login...');
        
        loginWithRedirect({
            appState: {
                returnTo: window.location.pathname,
                retryAttempt: true
            }
        });
    } catch (error) {
        console.error('❌ Error durante reintento:', error);
        
        // Fallback: limpiar manualmente y reintentar
        localStorage.removeItem('auth_retry_count');
        sessionStorage.clear();
        
        loginWithRedirect({
            appState: {
                returnTo: window.location.pathname,
                retryAttempt: true
            }
        });
    }
};

const handleCancelAutoLogout = () => {
    console.log('❌ Auto-logout cancelado por el usuario');
    setAutoLogoutEnabled(false);
    setCountdown(0);
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'yellow';
      case 'low': return 'blue';
      default: return 'gray';
    }
};

const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-5 w-5" />;
      case 'high': return <Shield className="h-5 w-5" />;
      case 'medium': return <Clock className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
};

if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Analizando sesión...
            </h2>
            <p className="text-gray-600 text-sm">
              Verificando el estado de tu autenticación
            </p>
          </div>
        </Card>
      </div>
    );
}

const severityColor = getSeverityColor(sessionProblem?.severity || 'low');

return (
    <div className={`min-h-screen bg-gradient-to-br from-${severityColor}-50 to-${severityColor}-100 flex items-center justify-center p-4`}>
      <Card className="w-full max-w-lg">
        <div className="p-6">
          {/* Header con icono y título */}
          <div className="text-center mb-6">
            <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-${severityColor}-100 mb-4`}>
              {sessionProblem && getSeverityIcon(sessionProblem.severity)}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Problema de Sesión
            </h1>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-${severityColor}-100 text-${severityColor}-800`}>
              Severidad: {sessionProblem?.severity?.toUpperCase()}
            </div>
          </div>

          {/* Descripción del problema */}
          {sessionProblem && (
            <div className={`mb-6 p-4 bg-${severityColor}-50 border border-${severityColor}-200 rounded-lg`}>
              <h3 className={`font-medium text-${severityColor}-800 mb-2`}>
                ¿Qué está pasando?
              </h3>
              <p className={`text-${severityColor}-700 text-sm mb-3`}>
                {sessionProblem.message}
              </p>
              <h4 className={`font-medium text-${severityColor}-800 mb-1`}>
                Recomendación:
              </h4>
              <p className={`text-${severityColor}-700 text-sm`}>
                {sessionProblem.recommendation}
              </p>
            </div>
          )}

          {/* Countdown de auto-logout */}
          {autoLogoutEnabled && countdown > 0 && sessionProblem?.severity !== 'low' && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-orange-600 mr-2" />
                  <span className="text-orange-800 text-sm font-medium">
                    Auto-logout en {countdown} segundos
                  </span>
                </div>
                <button
                  onClick={handleCancelAutoLogout}
                  className="text-orange-600 hover:text-orange-800 text-xs underline"
                >
                  Cancelar
                </button>
              </div>
              <p className="text-orange-700 text-xs">
                Se cerrará la sesión automáticamente para limpiar el estado corrupto
              </p>
            </div>
          )}

          {/* Información de debug (solo desarrollo) */}
          {import.meta.env?.DEV && (
            <div className="mb-6 p-3 bg-gray-100 rounded-lg">
              <details>
                <summary className="text-sm font-medium text-gray-700 cursor-pointer">
                  🔧 Debug Info (DEV)
                </summary>
                <div className="mt-2 text-xs text-gray-600 font-mono space-y-1">
                  <div>• isAuthenticated: {isAuthenticated ? '✅' : '❌'}</div>
                  <div>• isLoading: {isLoading ? '⏳' : '✅'}</div>
                  <div>• user: {user?.email || 'null'}</div>
                  <div>• error: {error?.message || 'null'}</div>
                  <div>• problemType: {sessionProblem?.type}</div>
                  <div>• localStorage keys: {Object.keys(localStorage).length}</div>
                  <div>• sessionStorage keys: {Object.keys(sessionStorage).length}</div>
                </div>
              </details>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-3">
            {/* Botón principal: Logout completo */}
            <Button
              onClick={handleCompleteLogout}
              className={`w-full bg-${severityColor}-600 hover:bg-${severityColor}-700 text-white`}
              icon={<LogOut size={20} />}
            >
              Cerrar Sesión Completa
            </Button>

            {/* Botón secundario: Reintentar (solo si hay problemas técnicos) */}
            {sessionProblem?.severity !== 'low' && (
              <Button
                onClick={handleRetryAuth}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                icon={<RefreshCw size={20} />}
              >
                Reintentar Autenticación
              </Button>
            )}

            {/* Botón terciario: Ir al dashboard */}
            <Link to="/" className="block">
              <Button
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
                icon={<Home size={20} />}
              >
                Intentar Ir al Dashboard
              </Button>
            </Link>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Si el problema persiste, contacta al administrador del sistema.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Esta página te ayuda a resolver problemas comunes de autenticación.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );

};

export default SessionExpiredPage;
