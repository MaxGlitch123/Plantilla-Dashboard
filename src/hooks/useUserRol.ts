// src/hooks/useUserRol.ts
import { useAuth0 } from '@auth0/auth0-react';

export const useUserRol = (): 'ADMIN' | 'CHEF' | 'DELIVERY' | 'CAJERO' | undefined => {
  const { user, isAuthenticated } = useAuth0();
  
  // Si no hay usuario autenticado o no hay objeto user, devolver undefined
  if (!isAuthenticated || !user) {
    console.warn('useUserRol: No user authenticated');
    return undefined;
  }

  // Buscar la clave que contiene los roles
  const rolesKey = Object.keys(user).find(key => key.includes('roles'));
  if (!rolesKey) {
    console.warn('useUserRol: No roles key found in user object');
    return 'ADMIN'; // Fallback a ADMIN si no hay clave de roles
  }

  // Verificar que los roles sean un array
  const roles = user[rolesKey];
  if (!Array.isArray(roles) || roles.length === 0) {
    console.warn('useUserRol: Roles is not an array or is empty');
    return 'ADMIN'; // Fallback a ADMIN si no hay roles
  }
  
  const roleStr = typeof roles[0] === 'string' ? roles[0] : '';
  const role = roleStr.toUpperCase();

  switch (role) {
    case 'ADMIN':
      return 'ADMIN';
    case 'CHEF':
      return 'CHEF';
    case 'DELIVERY':
      return 'DELIVERY';
    case 'CAJERO':
      return 'CAJERO'; // ✅ Agregado soporte para CAJERO
    default:
      console.warn('Role not recognized:', role);
      return 'ADMIN'; // Fallback a ADMIN para cualquier otro rol
  }
};
