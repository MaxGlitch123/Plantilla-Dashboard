import React from 'react';
import { Coffee, AlertTriangle } from 'lucide-react';
import LoginForm from '../../components/auth/LoginForm';
import Card from '../../components/ui/Card';

const LoginPage: React.FC = () => {
  // Detectar si viene de acceso denegado por ser cliente
  const urlParams = new URLSearchParams(window.location.search);
  const hint = urlParams.get('hint');
  const isFromClientDenied = hint === 'admin';

  console.log('🔐 LoginPage: Loading', { hint, isFromClientDenied });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-green-50 py-12 flex flex-col justify-center sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center mb-4">
          <Coffee className="h-10 w-10 text-gray-800 mr-2" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">El Buen Sabor</h1>
        <p className="mt-2 text-gray-600">Sistema de Gestión de Restaurante</p>
      </div>
      
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Mensaje para acceso administrativo */}
        {isFromClientDenied && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center mb-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mr-2" />
              <h3 className="font-medium text-orange-800">Acceso Administrativo Requerido</h3>
            </div>
            <p className="text-orange-700 text-sm">
              Inicia sesión con credenciales de <strong>Administrador, Chef o Delivery</strong> 
              para acceder al panel administrativo.
            </p>
          </div>
        )}
        
        <Card className="px-8 py-8 shadow-lg">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-serif font-bold text-gray-900">
              {isFromClientDenied ? 'Acceso Administrativo' : 'Iniciar sesión'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {isFromClientDenied 
                ? 'Usa credenciales con permisos administrativos' 
                : 'Ingresa a tu cuenta para continuar'
              }
            </p>
          </div>
          
          <LoginForm />

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Solo personal autorizado
                </span>
              </div>
            </div>
          </div>
        </Card>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            &copy; {new Date().getFullYear()} El Buen Sabor. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;