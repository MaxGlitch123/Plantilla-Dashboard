import apiClient from './apiClient';
import { Role } from '../types/employee';

interface RolePayload {
  name: string;
  description: string;
  auth0RoleId?: string; // Hacelo opcional para crear, requerido para update
}

// Trae todos los roles desde el backend
export const fetchRoles = async (): Promise<Role[]> => {
  try {
    const response = await apiClient.get('/api/admin/roles');
    return response.data;
  } catch (error: any) { // Usamos any para poder acceder a las propiedades de axios
    console.error('Error al obtener roles:', error.message);
    throw error;
  }
};

// Crea un nuevo rol
export const createRole = async (data: RolePayload): Promise<Role> => {
  try {
    // Asegurarse de que los campos requeridos estén presentes
    if (!data.name || !data.description) {
      throw new Error('El nombre y la descripción son obligatorios');
    }

    // Preparar payload sin el campo auth0RoleId
    const payload = {
      name: data.name,
      description: data.description
    };
    
    // Configuración de timeout más largo para posibles problemas de red
    const response = await apiClient.post('/api/admin/roles/createRole', payload, {
      timeout: 15000, // 15 segundos para permitir tiempo suficiente
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });
    
    // Mejor manejo de respuestas vacías o no válidas
    if (!response.data) {
      // Si el status es 2xx, asumimos éxito incluso sin datos y devolvemos un objeto genérico
      if (response.status >= 200 && response.status < 300) {
        // Crear un objeto con los datos enviados + id simulado para evitar errores en UI
        return { 
          id: Date.now(), // ID temporal hasta refrescar
          name: data.name,
          description: data.description,
          auth0RoleId: 'pendiente',
          deleted: false
        };
      } else {
        throw new Error('La respuesta del servidor no contiene datos');
      }
    }
    
    return response.data;
  } catch (error: any) {
    // Registramos un mensaje simplificado del error
    console.error('Error al crear rol:', error.message);
    
    // Agregamos información básica para diagnosticar según el tipo de error
    if (error.response) {
      console.error(`Error de respuesta: ${error.response.status}`);
    } else if (error.request) {
      console.error('No se recibió respuesta del servidor');
    }
    
    throw error;
  }
};

// Modifica un rol existente
export const updateRole = async (
  id: number,
  data: { name: string; description: string; auth0RoleId: string }
): Promise<Role> => {
  const response = await apiClient.put('/api/admin/roles/modifyRole', {
    id,
    name: data.name,
    description: data.description,
    auth0RoleId: data.auth0RoleId,
  });
  return response.data;
};

// Elimina un rol por ID (borrado lógico)
export const deleteRole = async (id: number): Promise<void> => {
  try {
    // Intentar obtener todos los roles primero para encontrar el que queremos eliminar
    const roles = await fetchRoles();
    const roleToDelete = roles.find(r => r.id === id);
    
    if (!roleToDelete) {
      throw new Error(`No se encontró un rol con ID ${id}`);
    }
    
    // Usar el auth0RoleId para eliminar
    if (roleToDelete.auth0RoleId) {
      await apiClient.delete(`/api/admin/roles/deleteRole?id=${roleToDelete.auth0RoleId}`);
      return;
    } else {
      // Intentar con el ID normal como último recurso
      await apiClient.delete(`/api/admin/roles/deleteRole?id=${id}`);
    }
  } catch (error: any) {
    console.error('Error al eliminar rol:', error.message);
    
    // Si el mensaje de error incluye "No existe la entidad", registrar mensaje más claro
    if (error.response?.data?.message === "No existe la entidad") {
      console.error('El rol no existe en la base de datos o está siendo usado por empleados.');
    }
    
    // Re-lanzamos el error para que se maneje en el componente
    throw error;
  }
};
