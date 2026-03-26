// src/pages/NoRolePage.tsx
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';

const NoRolePage: React.FC = () => {
  const { logout, user } = useAuth0();

  return (
    <Layout>
      <div className="max-w-md mx-auto mt-20 p-6 bg-white shadow-lg rounded-lg text-center">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Hola {user?.name || 'usuario'} 👋
        </h2>
        <p className="text-gray-600 mb-6">
          Tu cuenta aún no tiene un rol asignado. Por favor, contactá con un administrador para que te habiliten el acceso.
        </p>
        <Button
          variant="primary"
          onClick={() => logout({ returnTo: window.location.origin } as any)}
        >
          Cerrar sesión
        </Button>
      </div>
    </Layout>
  );
};

export default NoRolePage;
