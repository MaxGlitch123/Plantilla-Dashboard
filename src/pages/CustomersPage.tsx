import React from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchCustomers } from '../api/customers';
import { Customer } from '../types/customer';



const CustomersPage: React.FC = () => {

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const itemsPerPage = 5;

  const totalPages = Math.ceil((customers?.length || 0) / itemsPerPage);
  const paginatedCustomers = customers ? customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  ) : [];

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchCustomers();
        setCustomers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error al cargar clientes:', error);
        setError('Error al cargar los clientes');
        setCustomers([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Layout>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Gestión de Clientes</h1>
          <p className="text-gray-600">Administra la información de los clientes</p>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente por nombre, email o teléfono"
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="flex gap-2">
            <select className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500">
              <option value="">Todos los clientes</option>
              <option value="recent">Clientes recientes</option>
              <option value="frequent">Clientes frecuentes</option>
            </select>
            <Button variant="outline">Filtrar</Button>
          </div>
        </div>
      </Card>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-center text-gray-600">Cargando clientes...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : !customers || customers.length === 0 ? (
          <div className="p-4 text-center text-gray-600">No hay clientes registrados</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contacto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Dirección
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedidos
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último pedido
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedCustomers.map((customer) => {
                    if (!customer) return null;
                    const fullName = `${customer.nombre || ''} ${customer.apellido || ''}`.trim();
                    const orderCount = customer.pedidos?.length || 0;
                    const sortedPedidos = customer.pedidos ? [...customer.pedidos].sort((a, b) => 
                      new Date(b.fechaPedido).getTime() - new Date(a.fechaPedido).getTime()
                    ) : [];
                    const lastOrderDate = sortedPedidos.length > 0 ? sortedPedidos[0].fechaPedido : null;

                return (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-amber-800 font-medium">
                            {(customer.nombre?.[0] || '')}{(customer.apellido?.[0] || '')}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {fullName}
                          </div>
                          <div className="text-sm text-gray-500">
                            Cliente #{customer.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.email || '-'}</div>
                      <div className="text-sm text-gray-500">{customer.telefono}</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">-</div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={orderCount > 10 ? 'success' : 'default'} size="sm">
                        {orderCount} pedidos
                      </Badge>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lastOrderDate ? new Date(lastOrderDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
                  })}
                </tbody>
              </table>
            </div>
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, customers.length)}
                  </span>{' '}
                  de <span className="font-medium">{customers.length}</span> resultados
                </p>

                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    &laquo;
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                        ? 'bg-amber-50 border-amber-500 text-amber-600'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    &raquo;
                  </button>
                </nav>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default CustomersPage;