import React, { useEffect, useState } from 'react';
import { TrendingUp, ShoppingBag, DollarSign, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { POSService } from '../../services/posService';
import { DailySales } from '../../types/pos';

export const SalesSummary: React.FC = () => {
  const [dailyStats, setDailyStats] = useState<DailySales | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadStats = async () => {
    try {
      setLoading(true);
      const stats = await POSService.getDailyStats();
      setDailyStats(stats);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading daily stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    
    // Escuchar eventos de nueva venta para actualizar inmediatamente
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pos-sales') {
        loadStats();
      }
    };

    // Escuchar evento custom de venta completada (misma pestaña)
    const handleSaleCompleted = () => {
      loadStats();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pos-sale-completed', handleSaleCompleted);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pos-sale-completed', handleSaleCompleted);
    };
  }, []);

  if (loading && !dailyStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!dailyStats) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
        <ShoppingBag className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No se pudieron cargar las statisticas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Resumen principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total de ventas */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas del día</p>
              <p className="text-3xl font-bold text-blue-600">{dailyStats.totalSales}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <ShoppingBag className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Ingresos totales */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ingresos del día</p>
              <p className="text-3xl font-bold text-green-600">
                ${dailyStats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Promedio por venta */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ticket promedio</p>
              <p className="text-3xl font-bold text-purple-600">
                ${dailyStats.totalSales > 0 ? (dailyStats.totalRevenue / dailyStats.totalSales).toFixed(2) : '0.00'}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Métodos de pago */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por método de pago</h3>
        
        <div className="space-y-3">
          {/* Efectivo */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <Banknote className="h-4 w-4 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Efectivo</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {dailyStats.salesByMethod.cash}
            </span>
          </div>

          {/* Tarjeta */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-full">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Tarjeta</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {dailyStats.salesByMethod.card}
            </span>
          </div>

          {/* Transferencia */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <Smartphone className="h-4 w-4 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Transferencia</span>
            </div>
            <span className="text-lg font-bold text-gray-900">
              {dailyStats.salesByMethod.transfer}
            </span>
          </div>
        </div>
      </div>

      {/* Productos más vendidos */}
      {dailyStats.topProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Productos más vendidos</h3>
          
          <div className="space-y-3">
            {dailyStats.topProducts.map((product, index) => (
              <div key={product.productName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-1 rounded-full">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.productName}</p>
                    <p className="text-xs text-gray-500">
                      {product.quantity} vendidos • ${product.revenue.toFixed(2)} total
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600">
                  {product.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Última actualización */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </p>
        <button 
          onClick={loadStats}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-1"
          disabled={loading}
        >
          {loading ? 'Actualizando...' : 'Actualizar ahora'}
        </button>
      </div>
    </div>
  );
};