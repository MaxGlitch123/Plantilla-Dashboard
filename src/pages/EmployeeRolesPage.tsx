import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Plus, Edit, Trash2, ArrowLeft } from 'lucide-react'; // 👈 Agrega ArrowLeft
import { Link } from 'react-router-dom'; // 👈 Asegúrate de importar Link
import { Role } from '../types/employee';
import { fetchRoles, deleteRole, updateRole, createRole } from '../api/roles';
import RoleModal from '../components/employees/RoleModal'; // Asegurate de tener este componente creado

const EmployeeRolesPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        loadRoles();
    }, []);

    const loadRoles = async () => {
        try {
            setLoading(true);
            const data = await fetchRoles();
            setRoles(data.filter(r => !r.deleted));
        } catch (error) {
            alert('Error al cargar la lista de roles. Intente recargar la página.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (roleId: number) => {
        // Buscar el rol completo para mostrar información detallada
        const roleToDelete = roles.find(r => r.id === roleId);
        if (!roleToDelete) {
            alert('No se encontró el rol que intentas eliminar.');
            return;
        }
        
        // Mostrar confirmación antes de eliminar con detalles del rol
        if (!window.confirm(`¿Estás seguro que deseas eliminar el rol "${roleToDelete.name}"? Esta acción no se puede deshacer.`)) {
            return; // Si el usuario cancela, no hacemos nada
        }
        
        try {
            await deleteRole(roleId);
            
            // Actualizar el estado después de eliminar exitosamente
            setRoles(prev => prev.filter(r => r.id !== roleId));
            
            // Notificar al usuario
            alert(`Rol "${roleToDelete.name}" eliminado correctamente`);
            
            // Recargar la lista de roles para asegurarse de que esté actualizada
            loadRoles();
        } catch (error: any) {
            // Mostrar mensaje de error amigable al usuario
            let errorMessage = 'No se pudo eliminar el rol.';
            
            if (error.response && error.response.data && error.response.data.message) {
                errorMessage = `Error: ${error.response.data.message}`;
            } else if (error.message) {
                errorMessage = `Error: ${error.message}`;
            }
            
            alert(`${errorMessage}\n\nEste rol podría estar siendo utilizado por empleados activos o podría haber un problema con los identificadores en la base de datos.\n\nPor favor, contacta al administrador del sistema.`);
        }
    };

    const handleSave = async (data: { name: string; description: string }) => {
        try {
            let savedRole: Role;
            
            setLoading(true); // Mostrar indicador de carga

            if (selectedRole?.id) {
                savedRole = await updateRole(selectedRole.id, {
                    name: data.name,
                    description: data.description,
                    auth0RoleId: selectedRole.auth0RoleId,
                });
            } else {
                // Para crear un rol, solo necesitamos el nombre y la descripción
                const roleData = {
                    name: data.name,
                    description: data.description
                };
                
                savedRole = await createRole(roleData);
                
                // Si llegamos aquí, la petición fue exitosa aunque la respuesta podría ser vacía
                if (!savedRole || !savedRole.id) {
                    // Refresca la lista de roles en lugar de confiar en la respuesta
                    setIsModalOpen(false);
                    setSelectedRole(null);
                    await loadRoles();
                    
                    // Mostrar notificación
                    alert(`Rol "${data.name}" posiblemente creado. Se ha actualizado la lista.`);
                    setLoading(false);
                    return;
                }
            }

            // Actualiza la lista de roles solo si tenemos una respuesta válida
            if (savedRole && savedRole.id) {
                setRoles(prev => {
                    const exists = prev.find(r => r.id === savedRole.id);
                    return exists
                        ? prev.map(r => (r.id === savedRole.id ? savedRole : r))
                        : [...prev, savedRole];
                });
            }

            // Cierra el modal y resetea la selección
            setIsModalOpen(false);
            setSelectedRole(null);
            
            // Muestra una notificación de éxito
            alert(`Rol "${data.name}" guardado correctamente.`);
            
            // Refresca la lista de roles
            await loadRoles();
        } catch (error: any) {
            // Muestra mensaje de error más detallado si está disponible
            let errorMessage = 'No se pudo guardar el rol.';
            let additionalInfo = '';
            
            if (error.response) {
                errorMessage = error.response.data?.message || `Error ${error.response.status}`;
                
                // Si es error de CORS, proporcionar información adicional
                if (error.response.status === 0 || (error.message && error.message.includes('CORS'))) {
                    errorMessage = 'Error de CORS: El servidor no permite esta solicitud.';
                    additionalInfo = '\nVerifica la configuración CORS del servidor y los headers de la solicitud.';
                }
            } else if (error.request) {
                errorMessage = 'No se recibió respuesta del servidor.';
                additionalInfo = '\nVerifica la conexión de red o si el servidor está en funcionamiento.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            alert(`Error: ${errorMessage}${additionalInfo}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="mb-8">
                <Link to="/employees" className="text-gray-500 hover:text-gray-700">
                    <Button variant="ghost" size="sm" icon={<ArrowLeft size={18} />}>
                        Volver a Empleados
                    </Button>
                </Link>
            </div>
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-serif font-bold text-gray-800">Roles de Empleados</h1>
                    <p className="text-gray-600">Gestioná los roles disponibles para los usuarios</p>
                </div>
                <Button
                    variant="primary"
                    icon={<Plus size={18} />}
                    onClick={() => {
                        setSelectedRole(null);
                        setIsModalOpen(true);
                    }}
                >
                    Nuevo Rol
                </Button>
            </div>

            <Card>
                {loading ? (
                    <p className="text-gray-500">Cargando roles...</p>
                ) : roles.length === 0 ? (
                    <p className="text-gray-500">No hay roles disponibles.</p>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth0 Role ID</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {roles.map((role) => (
                                <tr key={role.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{role.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{role.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{role.auth0RoleId}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                icon={<Edit size={16} />}
                                                onClick={() => {
                                                    setSelectedRole(role);
                                                    setIsModalOpen(true);
                                                }}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                icon={<Trash2 size={16} />}
                                                onClick={() => handleDelete(role.id)}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>

            {isModalOpen && (
                <RoleModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedRole(null);
                    }}
                    onSave={handleSave}
                    role={selectedRole || undefined}
                />
            )}

        </Layout>
    );
};

export default EmployeeRolesPage;
