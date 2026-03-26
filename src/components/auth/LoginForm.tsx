// src/components/auth/LoginForm.tsx
import React, { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Button from '../ui/Button';

const LoginForm: React.FC = () => {
  const { loginWithRedirect, logout, isLoading, isAuthenticated } = useAuth0();

  // Limpiar cookies y localStorage de Auth0 al cargar el componente
  useEffect(() => {
    const cleanAuth0Data = () => {
      // Limpiar cookies relacionadas con Auth0
      document.cookie.split(";").forEach((c) => {
        const cookieName = c.trim().split("=")[0];
        if (cookieName.startsWith("auth0") || cookieName.startsWith("_legacy_auth0")) {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        }
      });
      
      // Limpiar localStorage relacionado con Auth0
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.includes("auth0") || key?.includes("@@auth0spajs@@")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => key && localStorage.removeItem(key));
    };

    // Ejecutar limpieza
    cleanAuth0Data();
    
    // Si hay una sesión activa, cerrarla
    if (isAuthenticated) {
      logout({ 
        logoutParams: { 
          returnTo: window.location.origin + '/login?force=true' 
        } 
      });
    }
  }, [isAuthenticated, logout]);

  // Verificar si estamos en una redirección forzada después de logout
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const force = urlParams.get('force');
    
    if (force === 'true' && !isAuthenticated && !isLoading) {
      // Limpiar el parámetro force de la URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [isAuthenticated, isLoading]);

  const handleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        prompt: 'login', // Forzar la pantalla de login cada vez
      }
    });
  };
  
  return (
    <div className="text-center space-y-4">
      <Button
        onClick={handleLogin}
        isLoading={isLoading}
        variant="primary"
        className="w-full"
      >
        Iniciar sesión con Auth0
      </Button>
    </div>
  );
};

export default LoginForm;
