import React, { useEffect } from 'react';
import AppRoutes from './routes/AppRoutes';
import { useAuth0 } from '@auth0/auth0-react';
//test

const App: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth0();

  useEffect(() => {
    if (isAuthenticated && user) {
      document.title = `City Fast | Sistema de Gestión`;
    } else {
      document.title = `City Fast | Iniciar sesión`;
    }
  }, [isAuthenticated, user, isLoading]);

  return (
    <div className="App">
      <AppRoutes />
    </div>
  );
};

export default App;
