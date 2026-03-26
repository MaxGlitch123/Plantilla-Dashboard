import React, { useEffect, useState } from 'react';
import { Calendar, Search, Filter, Printer, Eye, Download } from 'lucide-react';
import { POSService } from '../services/posService';
import { PrinterService } from '../services/printerService';
import { Sale } from '../types/pos';
import Button from '../components/ui/Button';

const POSSalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  // Cargar ventas
  useEffect(() => {
    const loadSales = async () => {
      setLoading(true);
      try {
        const salesData = await POSService.getTodaySales();
        setSales(salesData);
      } catch (error) {
        console.error('Error loading sales:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSales();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...sales];

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.saleCode.toLowerCase().includes(query) ||
        sale.employeeName.toLowerCase().includes(query) ||
        sale.customerName?.toLowerCase().includes(query) ||
        sale.items.some(item => item.productName.toLowerCase().includes(query))
      );
    }

    // Filtro por método de pago
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }

    // Filtro por fecha
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(sale => new Date(sale.saleDate) >= today);
        break;
      case 'this-week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        filtered = filtered.filter(sale => new Date(sale.saleDate) >= weekStart);
        break;
      case 'this-month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        filtered = filtered.filter(sale => new Date(sale.saleDate) >= monthStart);
        break;
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    
    setFilteredSales(filtered);
  }, [sales, searchQuery, dateFilter, paymentMethodFilter]);

  const handlePrintSale = async (sale: Sale) => {
    try {
      const success = await PrinterService.printSale(sale);
      if (success) {
        console.log(`✅ Ticket reimpreso para ${sale.saleCode}`);
      } else {
        console.error('❌ Error al reimprimir ticket');
      }
    } catch (error) {
      console.error('Error printing sale:', error);
    }
  };

  const getPaymentMethodText = (method: string): string => {
    const methods = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia'
    };
    return methods[method as keyof typeof methods] || method;
  };

  const getPaymentMethodColor = (method: string): string => {
    const colors = {
      'cash': 'bg-green-100 text-green-800',
      'card': 'bg-blue-100 text-blue-800',
      'transfer': 'bg-purple-100 text-purple-800'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Ventas del Punto de Venta
        </h1>
        <p className="text-gray-600">
          Historial y gestión de todas las ventas realizadas en el POS
        </p>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{totalSales}</div>
          <div className="text-gray-600">Ventas encontradas</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
          <div className="text-gray-600">Total facturado</div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            ${totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : '0.00'}
          </div>
          <div className="text-gray-600">Ticket promedio</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar por código, cajero, cliente o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filtro por fecha */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="today">Hoy</option>
            <option value="this-week">Esta semana</option>
            <option value="this-month">Este mes</option>
          </select>

          {/* Filtro por método de pago */}
          <select
            value={paymentMethodFilter}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
          </select>

          {/* Acciones */}
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de ventas */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando ventas...</p>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No se encontraron ventas con los filtros aplicados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha/Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cajero
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {sale.saleCode}
                        </div>
                        {sale.customerName && (
                          <div className="text-sm text-gray-500">
                            {sale.customerName}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(sale.saleDate).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(sale.saleDate).toLocaleTimeString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.employeeName}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {sale.itemsCount} productos
                      </div>
                      <div className="text-sm text-gray-500">
                        {sale.items.slice(0, 2).map(item => item.productName).join(', ')}
                        {sale.items.length > 2 && '...'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        getPaymentMethodColor(sale.paymentMethod)
                      }`}>
                        {getPaymentMethodText(sale.paymentMethod)}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${sale.total.toFixed(2)}
                      </div>
                      {!sale.synced && (
                        <div className="text-xs text-yellow-600">
                          Pendiente sync
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Ver detalles"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => handlePrintSale(sale)}
                          className="text-green-600 hover:text-green-800"
                          title="Reimprimir ticket"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de detalle de venta */}
      {selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">Detalle de Venta</h3>
              <button
                onClick={() => setSelectedSale(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Código:</label>
                  <p className="text-lg">{selectedSale.saleCode}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Total:</label>
                  <p className="text-lg font-bold text-green-600">
                    ${selectedSale.total.toFixed(2)}
                  </p>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Productos:</label>
                <div className="space-y-2">
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="font-bold">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSSalesPage;