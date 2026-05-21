import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, Search, Printer, Eye, Download, XCircle, TrendingUp, ChevronDown } from 'lucide-react';
import { POSService } from '../services/posService';
import { PrinterService } from '../services/printerService';
import { Sale } from '../types/pos';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';
import VoidSaleModal from '../components/pos/VoidSaleModal';
import Layout from '../components/layout/Layout';

const POSSalesPage: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cashierFilter, setCashierFilter] = useState('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [showRanking, setShowRanking] = useState(false);

  // Cargar ventas según filtro de fecha
  const loadSales = useCallback(async () => {
    setLoading(true);
    try {
      let salesData: Sale[];
      const now = new Date();
      const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

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
          // this-month
          from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        }
        salesData = await POSService.getSalesByDateRange(from, today);
      }

      setSales(salesData);
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, customFrom, customTo]);

  useEffect(() => {
    loadSales();

    // Escuchar evento de nueva venta para actualizar en tiempo real
    const handleNewSale = () => loadSales();
    window.addEventListener('pos-sale-completed', handleNewSale);
    return () => window.removeEventListener('pos-sale-completed', handleNewSale);
  }, [loadSales]);

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

    // Filtro por cajero
    if (cashierFilter !== 'all') {
      filtered = filtered.filter(sale => sale.employeeName === cashierFilter);
    }

    // Filtro por método de pago
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(sale => sale.paymentMethod === paymentMethodFilter);
    }

    // Filtro por estado
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sale => sale.status === statusFilter);
    }

    // Ordenar por fecha descendente
    filtered.sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
    
    setFilteredSales(filtered);
  }, [sales, searchQuery, cashierFilter, paymentMethodFilter, statusFilter]);

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

  const handleVoidSale = async (reason: string) => {
    if (!voidingSale) return;
    
    try {
      // Intentar anular en el backend
      try {
        await POSService.voidSale(voidingSale.id, reason);
        console.log('✅ Venta anulada en el backend');
      } catch (backendError) {
        console.warn('⚠️ No se pudo anular en backend (puede ser venta local), anulando localmente');
      }

      // Anular en localStorage
      const salesData = localStorage.getItem('pos-sales');
      if (salesData) {
        const sales: Sale[] = JSON.parse(salesData);
        const updated = sales.map(s => 
          s.saleCode === voidingSale.saleCode 
            ? { ...s, status: 'VOIDED' as const, voidReason: reason, voidedAt: new Date().toISOString() }
            : s
        );
        localStorage.setItem('pos-sales', JSON.stringify(updated));
      }

      // El backend ya restaura el stock automáticamente en voidSale()

      setVoidingSale(null);
      await loadSales();
      window.dispatchEvent(new CustomEvent('pos-sale-completed'));
    } catch (error) {
      console.error('❌ Error anulando venta:', error);
      throw error;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Código', 'Fecha', 'Hora', 'Cajero', 'Canal', 'Items', 'Método de Pago', 'Total', 'Estado'];
    const rows = filteredSales.map(sale => {
      const date = new Date(sale.saleDate);
      const itemsList = sale.items.map(i => `${i.productName} x${i.quantity}`).join(' | ');
      return [
        sale.saleCode,
        date.toLocaleDateString('es-AR'),
        date.toLocaleTimeString('es-AR'),
        sale.employeeName || '',
        sale.channel === 'pedidosya' ? 'Pedidos Ya' : 'Local',
        itemsList,
        getPaymentMethodText(sale.paymentMethod),
        sale.total.toFixed(2),
        sale.status === 'VOIDED' ? 'Anulada' : 'Activa',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `ventas-pos-${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeSales = filteredSales.filter(s => s.status !== 'VOIDED');
  const totalSales = activeSales.length;
  const totalRevenue = activeSales.reduce((sum, sale) => sum + sale.total, 0);

  const sellerRanking = Array.from(
    activeSales.reduce((map, sale) => {
      const name = sale.employeeName || 'Sin cajero';
      const cur = map.get(name) ?? { name, sales: 0, revenue: 0 };
      map.set(name, { ...cur, sales: cur.sales + 1, revenue: cur.revenue + sale.total });
      return map;
    }, new Map<string, { name: string; sales: number; revenue: number }>()).values()
  ).sort((a, b) => b.revenue - a.revenue);

  return (
    <Layout>
      <div className="p-4 md:p-6">

        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-gray-800">Ventas del Punto de Venta</h1>
            <p className="text-gray-600">Historial y gestión de todas las ventas realizadas en el POS</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filteredSales.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <div className="text-2xl font-bold text-blue-600">{totalSales}</div>
            <div className="text-gray-600 text-sm mt-1">Ventas encontradas</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-green-600">${totalRevenue.toFixed(2)}</div>
            <div className="text-gray-600 text-sm mt-1">Total facturado</div>
          </Card>
          <Card>
            <div className="text-2xl font-bold text-purple-600">
              ${totalSales > 0 ? (totalRevenue / totalSales).toFixed(2) : '0.00'}
            </div>
            <div className="text-gray-600 text-sm mt-1">Ticket promedio</div>
          </Card>
        </div>

        {/* Ranking de Vendedores */}
        {activeSales.length > 0 && (
          <Card className="mb-6">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => setShowRanking(v => !v)}
            >
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                <span className="font-semibold text-gray-800">Ranking de Vendedores</span>
              <span className="text-sm text-gray-500">({sellerRanking.length} cajero{sellerRanking.length !== 1 ? 's' : ''})</span>
            </div>
            <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${showRanking ? 'rotate-180' : ''}`} />
          </button>
          {showRanking && (
            <div className="border-t">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase w-8">#</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cajero</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ventas</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Ticket prom.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sellerRanking.map((seller, i) => (
                    <tr key={seller.name} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-xs font-bold text-white ${
                          i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-600' : 'bg-gray-300'
                        }`}>{i + 1}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{seller.name}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{seller.sales}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        ${(seller.revenue / seller.sales).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
                        ${seller.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </Card>
        )}

        {/* Filtros */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* Búsqueda */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar por código, cajero o producto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Filtro por fecha */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
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
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
              />
              <span className="text-sm text-gray-500 self-center">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500"
              />
            </>
          )}

            {/* Filtro por cajero */}
            <select
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Todos los cajeros</option>
              {[...new Set(sales.map(s => s.employeeName).filter(Boolean))].sort().map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>

            {/* Filtro por método de pago */}
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Todos los métodos</option>
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </select>

            {/* Filtro por estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">Todos los estados</option>
              <option value="ACTIVE">Activas</option>
              <option value="VOIDED">Anuladas</option>
            </select>
          </div>
        </Card>

        {/* Tabla de ventas */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
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
                    Canal
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
                    Estado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 transition-colors">
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
                      <Badge variant={sale.channel === 'pedidosya' ? 'danger' : 'success'} size="sm">
                        {sale.channel === 'pedidosya' ? 'Pedidos Ya' : 'Local'}
                      </Badge>
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
                      <Badge variant="secondary" size="sm">{getPaymentMethodText(sale.paymentMethod)}</Badge>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`text-lg font-bold ${sale.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                        ${sale.total.toFixed(2)}
                      </div>
                      {!sale.synced && (
                        <div className="text-xs text-yellow-600">
                          Pendiente sync
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Badge variant={sale.status === 'VOIDED' ? 'danger' : 'success'} size="sm">
                        {sale.status === 'VOIDED' ? 'Anulada' : 'Activa'}
                      </Badge>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSale(sale)} title="Ver detalles">
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handlePrintSale(sale)} title="Reimprimir ticket">
                          <Printer className="h-4 w-4 text-green-600" />
                        </Button>
                        {sale.status === 'ACTIVE' && (
                          <Button variant="ghost" size="sm" onClick={() => setVoidingSale(sale)} title="Anular venta">
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
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

        {/* Modal de detalle de venta */}
        {selectedSale && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-lg font-serif font-semibold text-gray-800">Detalle de Venta</h3>
                <button
                  onClick={() => setSelectedSale(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Código:</label>
                    <p className="text-lg font-medium text-gray-900">{selectedSale.saleCode}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Total:</label>
                    <p className={`text-lg font-bold ${selectedSale.status === 'VOIDED' ? 'text-gray-400 line-through' : 'text-green-600'}`}>
                      ${selectedSale.total.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <p className="mt-1">
                      <Badge variant={selectedSale.status === 'VOIDED' ? 'danger' : 'success'} size="sm">
                        {selectedSale.status === 'VOIDED' ? 'Anulada' : 'Activa'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Cajero:</label>
                    <p className="text-sm text-gray-900">{selectedSale.employeeName}</p>
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
                  {selectedSale.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                      <div>
                        <p className="font-medium text-gray-900">{item.productName}</p>
                        <p className="text-sm text-gray-600">
                          ${item.price.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <div className="font-bold text-gray-800">
                        ${(item.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal de anulación */}
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

export default POSSalesPage;
