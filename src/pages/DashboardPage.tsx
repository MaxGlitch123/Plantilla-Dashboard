import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import {
  fetchTotalVentas,
  fetchTotalPedidos,
  fetchTotalProductosVendidos,
  fetchProductosMasVendidos
} from '../api/dashboard';
import { useSupplyStore } from '../store/useSupplyStore';
import { connectToPedidoSocket, WebSocketConnectionState } from '../utils/pedidoWebSocket';
import { POSService } from '../services/posService'; // Nuevo import para POS
import { useUserRol } from '../hooks/useUserRol';
import { AlertTriangle, TrendingUp, Package, RefreshCw, Wifi, WifiOff, Eye, ShoppingCart, DollarSign } from 'lucide-react';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const DashboardPage = () => {
  console.log('🚀 DashboardPage montado, iniciando carga de datos...');
  
  const navigate = useNavigate();
  const userRole = useUserRol();
  const isAdmin = userRole === 'ADMIN';
  const [ventas, setVentas] = useState<number>(0);
  const [pedidos, setPedidos] = useState<number>(0);
  const [productosVendidos, setProductosVendidos] = useState<number>(0);
  const [masVendidos, setMasVendidos] = useState<{ producto: string; cantidad: number }[]>([]);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  const [stockCritico, setStockCritico] = useState<any[]>([]);
  
  // Estados para el POS
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  
  // Acceso al store de suministros
  const supplyStore = useSupplyStore();

  // Función para calcular insumos críticos
  const calculateCriticalStock = () => {
    const critical = supplyStore.supplies.filter(supply => 
      supply.stockActual <= (supply.stockMinimo || 0)
    );
    setStockCritico(critical);
    
    if (critical.length > 0) {
      console.log(`⚠️ ${critical.length} insumos en estado crítico detectados`);
    }
    
    return critical;
  };

  useEffect(() => {
    console.log('🔄 DashboardPage useEffect iniciado');
    let cleanupWebSocket: (() => void) | null = null;
    
    const loadData = async () => {
      try {
        console.log('📊 Cargando datos del dashboard...');
        
        // Solo cargar datos generales si es admin
        if (isAdmin) {
          console.log('💰 Obteniendo total de ventas...');
          const totalVentas = await fetchTotalVentas();
          console.log('✅ Total ventas:', totalVentas);
          setVentas(Number(totalVentas));

          console.log('📋 Obteniendo total de pedidos...');
          const totalPedidos = await fetchTotalPedidos();
          console.log('✅ Total pedidos:', totalPedidos);
          setPedidos(Number(totalPedidos));

          console.log('🛍️ Obteniendo productos vendidos...');
          const totalVendidos = await fetchTotalProductosVendidos();
          console.log('✅ Productos vendidos:', totalVendidos);
          setProductosVendidos(Number(totalVendidos));

          console.log('🏆 Obteniendo productos más vendidos...');
          const topVendidos = await fetchProductosMasVendidos();
          console.log('✅ Productos más vendidos:', topVendidos);
          setMasVendidos(topVendidos);
        }
        
        // Cargar estadísticas del POS
        console.log('🛒 Obteniendo estadísticas del POS...');
        try {
          const sales = await POSService.getTodaySales();
          setTodaySales(sales.length);
          setTodayRevenue(sales.reduce((sum, sale) => sum + sale.total, 0));
          console.log('✅ Estadísticas POS cargadas:', { ventas: sales.length, ingresos: sales.reduce((sum, sale) => sum + sale.total, 0) });
        } catch (error) {
          console.error('⚠️ Error cargando estadísticas POS:', error);
        }
        
        // Cargar datos de suministros y calcular estado crítico
        console.log('📦 Cargando datos de inventario...');
        await supplyStore.fetchSupplies();
        calculateCriticalStock();
        
        console.log('✅ Todos los datos del dashboard cargados correctamente');
      } catch (error) {
        console.error('❌ Error al cargar datos del dashboard:', error);
      }
    };

    // Conectar WebSocket para actualizaciones en tiempo real
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      console.log(`🔌 Dashboard WebSocket estado: ${state}`);
      setConnectionState(state);
    };

    cleanupWebSocket = connectToPedidoSocket(
      // Manejar actualizaciones de pedidos
      (pedido: any) => {
        console.log(`📦 Dashboard: Pedido #${pedido.id} actualizado`);
        // Recargar estadísticas cuando cambian los pedidos
        loadData();
      },
      // Manejar actualizaciones de stock
      (stockUpdate: any) => {
        console.log(`📊 Dashboard: Stock actualizado para insumo ${stockUpdate.id}`);
        // Actualizar store y recalcular stock crítico
        supplyStore.handleStockUpdate({
          insumoId: stockUpdate.id,
          nuevoStock: stockUpdate.stockActual
        });
        
        // Recalcular después de un pequeño delay para asegurar que el store se actualizó
        setTimeout(() => {
          calculateCriticalStock();
        }, 500);
      },
      handleConnectionStateChange
    );

    loadData();

    // Cleanup
    return () => {
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
    };
  }, []);

  // Recalcular stock crítico cuando cambia el store
  useEffect(() => {
    calculateCriticalStock();
  }, [supplyStore.supplies]);

  // Función para renderizar el estado de conexión
  const renderConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return (
          <div className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
            <Wifi size={14} className="mr-1" />
            <span>Tiempo real</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
            <RefreshCw size={14} className="mr-1 animate-spin" />
            <span>Conectando...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
            <WifiOff size={14} className="mr-1" />
            <span>Sin conexión</span>
          </div>
        );
    }
  };


  const chartData = {
    labels: masVendidos.map((p) => p.producto),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: masVendidos.map((p) => p.cantidad),
        backgroundColor: '#FBBF24',
      },
    ],
  };

  console.log('📋 DashboardPage renderizando con datos:', {
    ventas,
    pedidos,
    productosVendidos,
    masVendidos: masVendidos.length
  });

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">
            {isAdmin ? 'Dashboard' : 'Mi Turno'}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-600">
              {isAdmin ? 'Resumen en tiempo real del negocio' : 'Resumen de tu jornada de hoy'}
            </p>
            {renderConnectionStatus()}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          icon={<RefreshCw size={16} />}
          onClick={() => window.location.reload()}
        >
          Actualizar
        </Button>
      </div>

      {/* Alertas de stock crítico */}
      {stockCritico.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-red-800">
                  Alerta de Inventario - {stockCritico.length} insumos críticos
                </h3>
                <Button 
                  variant="outline" 
                  size="sm"
                  icon={<Eye size={16} />}
                  onClick={() => {
                    console.log('🎯 Navegando a insumos críticos desde dashboard');
                    navigate('/supplies?filter=critical');
                  }}
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Ver insumos críticos
                </Button>
              </div>
              <div className="mt-2 text-sm text-red-700">
                <p className="mb-2">Los siguientes insumos requieren reposición inmediata:</p>
                <div className="flex flex-wrap gap-2">
                  {stockCritico.slice(0, 5).map((supply) => (
                    <div 
                      key={supply.id}
                      className="cursor-pointer transition-transform hover:scale-105"
                      onClick={() => {
                        console.log(`🎯 Navegando al insumo específico: ${supply.denominacion} (ID: ${supply.id})`);
                        navigate(`/supplies?filter=critical&highlight=${supply.id}`);
                      }}
                      title={`Ir al insumo ${supply.denominacion}`}
                    >
                      <Badge variant="danger" size="sm">
                        {supply.denominacion}: {supply.stockActual}/{supply.stockMinimo}
                      </Badge>
                    </div>
                  ))}
                  {stockCritico.length > 5 && (
                    <div 
                      className="cursor-pointer transition-transform hover:scale-105"
                      onClick={() => navigate('/supplies?filter=critical')}
                      title="Ver todos los insumos críticos"
                    >
                      <Badge variant="secondary" size="sm">
                        +{stockCritico.length - 5} más
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-3 xl:grid-cols-6' : 'lg:grid-cols-3'} gap-4 mb-6`}>
        {isAdmin && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Ventas totales</p>
                <p className="text-2xl font-bold text-amber-600">
                  ${Number(ventas).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
        )}
        
        {isAdmin && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pedidos totales</p>
                <p className="text-2xl font-bold text-amber-600">{pedidos}</p>
              </div>
              <Package className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
        )}
        
        {isAdmin && (
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Productos vendidos</p>
                <p className="text-2xl font-bold text-amber-600">{productosVendidos}</p>
              </div>
              <Package className="h-8 w-8 text-amber-600" />
            </div>
          </Card>
        )}
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock crítico</p>
              <p className={`text-2xl font-bold ${stockCritico.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stockCritico.length}</p>
            </div>
            <AlertTriangle className={`h-8 w-8 ${stockCritico.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ventas POS Hoy</p>
              <p className="text-2xl font-bold text-blue-600">{todaySales}</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos POS Hoy</p>
              <p className="text-2xl font-bold text-green-600">
                ${todayRevenue.toFixed(2)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </Card>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {isAdmin && (
          <Card>
            <h2 className="text-lg font-semibold mb-4 text-gray-800">Productos más vendidos</h2>
            <div className="h-72">
              <Bar data={chartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
          </Card>
        )}

        <Card>
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Estado del Inventario</h2>
          <div className="space-y-3">
            {supplyStore.supplies.slice(0, 8).map((supply) => {
              const stockPercentage = supply.stockMaximo ? (supply.stockActual / supply.stockMaximo) * 100 : 0;
              const isCritical = supply.stockActual <= (supply.stockMinimo || 0);
              const isLow = supply.stockActual <= (supply.stockMinimo || 0) * 1.5;
              
              return (
                <div key={supply.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{supply.denominacion}</span>
                      <span className="text-xs text-gray-500">
                        {supply.stockActual}/{supply.stockMaximo || 'N/A'} {typeof supply.unidadMedida === 'string' ? supply.unidadMedida : supply.unidadMedida?.denominacion}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          isCritical ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                  {isCritical && <AlertTriangle size={16} className="ml-2 text-red-500" />}
                </div>
              );
            })}
            {supplyStore.supplies.length === 0 && (
              <p className="text-gray-500 text-center py-4">Cargando datos de inventario...</p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default DashboardPage;
