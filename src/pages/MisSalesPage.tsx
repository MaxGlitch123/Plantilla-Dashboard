import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Search, Printer, Eye, XCircle } from 'lucide-react';
import { POSService } from '../services/posService';
import { PrinterService } from '../services/printerService';
import { Sale } from '../types/pos';
import VoidSaleModal from '../components/pos/VoidSaleModal';
import Layout from '../components/layout/Layout';

const MisSalesPage: React.FC = () => {
  const [currentEmployeeId, setCurrentEmployeeId] = useState('');
  const [currentEmployeeName, setCurrentEmployeeName] = useState('');

  useEffect(() => {
    POSService.getEmployeeInfo().then(info => {
      console.log('[MisSales] employee info resolved:', info);
      setCurrentEmployeeId(String(info.id));
      // Use just "nombre" for matching against sale.employeeName (backend stores only nombre)
      setCurrentEmployeeName(info.nombre || info.name);
    });
  }, []);

  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);

  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      let salesData: Sale[];
      const now = new Date();
      const today = now.toISOString().split('T')[0];

      if (dateFilter === 'today') {
        salesData = await POSService.getTodaySales();
      } else if (dateFilter === 'custom') {
        if (customFrom && customTo) {
          salesData = await POSService.getSalesByDateRange(customFrom, customTo);
        } else {
          salesData = [];
        }
      } else {
        let from: string;
        if (dateFilter === 'this-week') {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - now.getDay());
          from = weekStart.toISOString().split('T')[0];
        } else {
          from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        salesData = await POSService.getSalesByDateRange(from, today);
      }

      // Only my own sales — filter by ID (most reliable) with name as fallback
      console.log('[MisSales] total salesData:', salesData.length, '| filtering by id:', currentEmployeeId, 'name:', currentEmployeeName);
      if (salesData.length > 0) {
        console.log('[MisSales] sample sale fields:', { employeeId: salesData[0].employeeId, employeeName: salesData[0].employeeName });
      }
      setSales(salesData.filter(s => {
        if (currentEmployeeId && s.employeeId) return s.employeeId === currentEmployeeId;
        if (currentEmployeeName && currentEmployeeName !== 'Empleado') return s.employeeName === currentEmployeeName;
        return false;
      }));
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customFrom, customTo, currentEmployeeId, currentEmployeeName]);

  useEffect(() => {
    loadSales();
    const handleNewSale = () => loadSales();
    window.addEventListener('pos-sale-completed', handleNewSale);
    return () => window.removeEventListener('pos-sale-completed', handleNewSale);
  }, [loadSales]);

  useEffect(() => {
    let filtered = [...sales];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sale =>
        sale.saleCode.toLowerCase().includes(query) ||
        sale.customerName?.toLowerCase().includes(query) ||
        sale.items.some(item => item.productName.toLowerCase().includes(query))
      );
    }

    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    setFilteredSales(filtered);
  }, [sales, searchQuery, paymentMethodFilter, statusFilter]);

  const handlePrintSale = async (sale: Sale) => {
    try {
      await PrinterService.printSale(sale);
    } catch (error) {
      console.error('Error printing sale:', error);
    }
  };

  const getPaymentMethodText = (method: string): string => {
    const methods: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia' };
    return methods[method] || method;
  };

  const getPaymentMethodColor = (method: string): string => {
    const colors: Record<string, string> = {
      cash: 'bg-green-100 text-green-800',
      card: 'bg-blue-100 text-blue-800',
      transfer: 'bg-purple-100 text-purple-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  const handleVoidSale = async (reason: string) => {
    if (!voidingSale) return;
    try {
      try {
        await POSService.voidSale(voidingSale.id, reason);
      } catch {
        console.warn('No se pudo anular en backend, anulando localmente');
      }

      const salesData = localStorage.getItem('pos-sales');
      if (salesData) {
        const all: Sale[] = JSON.parse(salesData);
        const updated = all.map(s =>
          s.saleCode === voidingSale.saleCode
            ? { ...s, status: 'VOIDED' as const, voidReason: reason, voidedAt: new Date().toISOString() }
            : s
        );
        localStorage.setItem('pos-sales', JSON.stringify(updated));
      }

      setVoidingSale(null);
      await loadSales();
      window.dispatchEvent(new CustomEvent('pos-sale-completed'));
    } catch (error) {
      console.error('Error anulando venta:', error);
      throw error;
    }
  };

  const activeSales = filteredSales.filter(s => s.status !== 'VOIDED');
  const totalSales = activeSales.length;
  const totalRevenue = activeSales.reduce((sum, sale) => sum + sale.total, 0);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Mis Ventas</h1>
          <p className="text-gray-600">Historial y gestión de tus ventas realizadas en el POS</p>
        </div>

        {/* Stats */}
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

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por código o producto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date filter */}
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="today">Hoy</option>
              <option value="this-week">Esta semana</option>
              <option value="this-month">Este mes</option>
              <option value="custom">Rango personalizado</option>
            </select>
            {dateFilter === 'custom' && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}

            {/* Payment method */}
            <select
              value={paymentMethodFilter}
              onChange={e => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los métodos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVE">Activas</option>
              <option value="VOIDED">Anuladas</option>
            </select>
          </div>
        </div>

        {/* Sales table */}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha/Hora</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Método</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSales.map(sale => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{sale.saleCode}</div>
                        {sale.customerName && (
                          <div className="text-sm text-gray-500">{sale.customerName}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{new Date(sale.saleDate).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">{new Date(sale.saleDate).toLocaleTimeString()}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          sale.channel === 'pedidosya' ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {sale.channel === 'pedidosya' ? 'Pedidos Ya' : 'Local'}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{sale.itemsCount} productos</div>
                        <div className="text-sm text-gray-500">
                          {sale.items.slice(0, 2).map(i => i.productName).join(', ')}
                          {sale.items.length > 2 && '...'}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentMethodColor(sale.paymentMethod)}`}>
                          {getPaymentMethodText(sale.paymentMethod)}
                        </span>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className={`text-lg font-bold ${sale.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                          ${sale.total.toFixed(2)}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {sale.status === 'VOIDED' ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Anulada</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Activa</span>
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
                          {sale.status === 'ACTIVE' && (
                            <button
                              onClick={() => setVoidingSale(sale)}
                              className="text-red-600 hover:text-red-800"
                              title="Anular venta"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail modal */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-semibold">Detalle de Venta</h3>
                <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Código:</label>
                    <p className="text-lg">{selectedSale.saleCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total:</label>
                    <p className={`text-lg font-bold ${selectedSale.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                      ${selectedSale.total.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha:</label>
                    <p className="text-sm">{new Date(selectedSale.saleDate).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <p className="mt-1">
                      {selectedSale.status === 'VOIDED' ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Anulada</span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Activa</span>
                      )}
                    </p>
                  </div>
                </div>

                {selectedSale.status === 'VOIDED' && selectedSale.voidReason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800">Motivo de anulación:</p>
                    <p className="text-sm text-red-700">{selectedSale.voidReason}</p>
                    {selectedSale.voidedAt && (
                      <p className="text-xs text-red-500 mt-1">
                        Anulada el {new Date(selectedSale.voidedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Productos:</label>
                  <div className="space-y-2">
                    {selectedSale.items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-600">${item.price.toFixed(2)} × {item.quantity}</p>
                        </div>
                        <div className="font-bold">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Void modal */}
        {voidingSale && (
          <VoidSaleModal
            saleCode={voidingSale.saleCode}
            onConfirm={handleVoidSale}
            onClose={() => setVoidingSale(null)}
          />
        )}
      </div>
    </Layout>
  );
};

export default MisSalesPage;
