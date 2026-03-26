import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useAuth0 } from '@auth0/auth0-react';


const App: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth0();

  console.log('🟢 App.tsx montado');
  console.log('🔍 Estado Auth0:', { isAuthenticated, isLoading, user: user ? user.email : 'No user' });

  useEffect(() => {
    console.log('🔄 App.tsx useEffect - Auth cambió:', { isAuthenticated, isLoading });
    if (isAuthenticated && user) {
      console.log('✅ Usuario autenticado:', user.email);
      document.title = `El Buen Sabor | Sistema de Gestión`;
    } else {
      console.log('❌ Usuario no autenticado');
      document.title = `El Buen Sabor | Iniciar sesión`;
    }
  }, [isAuthenticated, user, isLoading]);

  console.log('📋 App.tsx renderizando...');

  return (
    <div className="App">
      <AppRoutes />
    </div>
  );
};

export default App;
