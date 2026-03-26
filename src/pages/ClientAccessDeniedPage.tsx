import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Shield, LogOut, AlertTriangle, UserX, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const ClientAccessDeniedPage: React.FC = () => {
  const { logout, user } = useAuth0();

  console.log('🚫 ClientAccessDeniedPage: Client attempting to access admin area', {
    user: user?.email,
    userRoles: user?.['https://buensabor/roles']
  });

  const handleLogoutAndRequestAdmin = async () => {
    console.log('🔄 Client requesting logout to use admin credentials');
    
    // Logout y redirigir al login
    logout({
      logoutParams: {
        returnTo: `${window.location.origin}/login?hint=admin`,
        federated: true
      }
    });
  };

  const handleStayAsClient = () => {
    console.log('👤 Client choosing to stay with current role');
    // Redirigir a donde corresponda para clientes (puedes cambiar esta URL)
    window.location.href = '/'; // O la página que tengas para clientes
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="p-8">
          {/* Header con icono */}
          <div className="text-center mb-8">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-orange-100 mb-4">
              <Shield className="h-10 w-10 text-orange-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Acceso de Administrador Requerido
            </h1>
            <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
              <UserX className="h-4 w-4 mr-2" />
              Rol actual: Cliente
            </div>
          </div>

          {/* Información del usuario actual */}
          <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
              <h3 className="font-medium text-blue-800">Usuario Actual</h3>
            </div>
            <p className="text-blue-700 text-sm mb-2">
              <strong>Email:</strong> {user?.email}
            </p>
            <p className="text-blue-700 text-sm">
              <strong>Rol:</strong> Cliente (acceso limitado)
            </p>
          </div>

          {/* Explicación */}
          <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center mb-3">
              <Lock className="h-5 w-5 text-orange-600 mr-2" />
              <h3 className="font-medium text-orange-800">¿Por qué veo esto?</h3>
            </div>
            <p className="text-orange-700 text-sm mb-3">
              Estás intentando acceder al <strong>panel administrativo</strong> de El Buen Sabor, 
              pero tu cuenta actual tiene rol de <strong>Cliente</strong>.
            </p>
            <p className="text-orange-700 text-sm">
              Para acceder a las funciones administrativas, necesitas iniciar sesión con 
              credenciales de <strong>Administrador, Chef o Delivery</strong>.
            </p>
          </div>

          {/* Opciones */}
          <div className="space-y-4">
            {/* Opción principal: Cerrar sesión e iniciar como admin */}
            <Button
              onClick={handleLogoutAndRequestAdmin}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white"
              icon={<LogOut className="h-5 w-5" />}
            >
              Cerrar Sesión e Iniciar como Administrador
            </Button>

            {/* Opción secundaria: Mantener sesión de cliente */}
            <Button
              onClick={handleStayAsClient}
              variant="outline"
              className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Continuar como Cliente
            </Button>
          </div>

          {/* Información adicional */}
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-800 mb-2">ℹ️ Información</h4>
            <ul className="text-gray-600 text-sm space-y-1">
              <li>• Los <strong>Clientes</strong> pueden realizar pedidos y ver su historial</li>
              <li>• Los <strong>Administradores</strong> gestionan todo el sistema</li>
              <li>• Los <strong>Chefs</strong> manejan productos y cocina</li>
              <li>• Los <strong>Delivery</strong> gestionan entregas</li>
            </ul>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Si crees que deberías tener acceso administrativo, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ClientAccessDeniedPage;