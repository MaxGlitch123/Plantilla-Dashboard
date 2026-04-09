// src/api/employees.ts
import apiClient from './apiClient';
import { Employee } from '../types/employee';

export const fetchEmployees = async (): Promise<Employee[]> => {
  const response = await apiClient.get<Employee[]>('/api/admin/users');
  return response.data;
};

// Crea un nuevo empleado
export const createEmployee = async (data: {
  name: string;
  lastName: string;
  userEmail: string;
  nickName: string;
  roles: string[];
  password: string; // 👈 Nuevo campo
}): Promise<Employee> => {
  // Usar los roles seleccionados directamente
  const rolesToSend = [...data.roles];
  
  console.log('🔍 Enviando petición para crear usuario con roles:', rolesToSend);
  console.log('📊 Datos completos del empleado:', {
    ...data,
    roles: rolesToSend,
    email: data.userEmail,
    connection: "Username-Password-Authentication"
  });
  
  try {
    const response = await apiClient.post('/api/admin/users/createUser', {
      ...data,
      roles: rolesToSend,
      email: data.userEmail, // 👈 Corrige el nombre del campo
      connection: "Username-Password-Authentication", // 👈 Agrega este campo
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error al crear empleado:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      rolesSent: rolesToSend
    });
    throw error;
  }
};

// Modifica un empleado existente
export const updateEmployee = async (
  id: number,
  data: {
    name: string;
    lastName: string;
    userEmail: string;
    nickName: string;
    roles: string[];
    auth0Id: string;
  }
): Promise<Employee> => {
  const response = await apiClient.put('/api/admin/users/modifyUser', {
    id,
    ...data,
    email: data.userEmail, // 👈 Corrige el nombre del campo
    auth0Id: data.auth0Id,
  });
  return response.data;
};

// Elimina un empleado (borrado lógico)
export const deleteEmployee = async (auth0Id: string): Promise<void> => {
  await apiClient.delete('/api/admin/users/deleteUserById', {
    data: { auth0Id },
  });
};
