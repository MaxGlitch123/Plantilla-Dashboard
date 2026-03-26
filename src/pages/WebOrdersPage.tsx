// src/pages/WebOrdersPage.tsx - Pedidos hechos desde la web por clientes

import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge, { BadgeVariant } from '../components/ui/Badge';
import { fetchPedidos, fetchPedidoDetalle, updatePedidoEstado } from '../api/orders';
import { PedidoResponse, PedidoEstado, PedidoDetalleResponse } from '../types/order';
import { connectToPedidoSocket, WebSocketConnectionState } from '../utils/pedidoWebSocket';
import { getToken } from '../api/apiClient';
import { useSupplyStore } from '../store/useSupplyStore';
import { processOrderForStock } from '../services/orderStockService';
import { validateStockForImmediateOrder } from '../services/stockValidationService';
import {
  Eye, ShoppingBag, Clock, Check, X, Wifi, WifiOff, RefreshCw, Globe
} from 'lucide-react';
import StockWarningModal from '../components/orders/StockWarningModal';
import PedidoCardAcciones from '../components/orders/PedidoCardAcciones';
import { useUserRol } from '../hooks/useUserRol';
import OrderDetailModal from '../components/orders/OrderDetailModal';

// Importar componentes de depuración directamente
// ...existing code...

const statusIcons: Record<PedidoEstado, React.ReactNode> = {
  PENDIENTE: <Clock size={16} />,
  PREPARACION: <ShoppingBag size={16} />,
  LISTO: <Check size={16} />,
  ENTREGADO: <Check size={16} />,
  CANCELADO: <X size={16} />,
};

const statusVariant: Record<PedidoEstado, BadgeVariant> = {
  PENDIENTE: 'warning',
  PREPARACION: 'info',
  LISTO: 'secondary',
  ENTREGADO: 'success',
  CANCELADO: 'danger',
};

const statusLabel: Record<PedidoEstado, string> = {
  PENDIENTE: 'Pendiente',
  PREPARACION: 'En preparación',
  LISTO: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

const tabsPorRol: Record<string, ('all' | PedidoEstado)[]> = {
  ADMIN: ['all', 'PENDIENTE', 'PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],
  CHEF: ['all', 'PENDIENTE', 'LISTO'],
  DELIVERY: ['all', 'LISTO', 'ENTREGADO'],
  // Fallback para cualquier otro rol
  DEFAULT: ['all', 'PENDIENTE', 'PREPARACION', 'LISTO', 'ENTREGADO', 'CANCELADO'],
};

// Función para renderizar el indicador de estado de conexión - movida FUERA del componente
const renderConnectionStatus = (connectionState: WebSocketConnectionState) => {
  switch (connectionState) {
    case 'connected':
      return (
        <div className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-md text-xs">
          <Wifi size={14} className="mr-1" />
          <span>Conectado</span>
        </div>
      );
    case 'connecting':
      return (
        <div className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs">
          <RefreshCw size={14} className="mr-1 animate-spin" />
          <span>Conectando...</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-md text-xs">
          <WifiOff size={14} className="mr-1" />
          <span>Error de conexión</span>
        </div>
      );
    default:
      return (
        <div className="flex items-center px-2 py-1 bg-gray-100 text-gray-800 rounded-md text-xs">
          <WifiOff size={14} className="mr-1" />
          <span>Desconectado</span>
        </div>
      );
  }
};

const WebOrdersPage: React.FC = () => {
  // ... Todo el código del componente igual que OrdersPage pero cambiamos solo el JSX del título

  const rol = useUserRol();
  // Agrupar todos los estados al inicio del componente para seguir reglas de hooks
  const [pedidos, setPedidos] = useState<PedidoResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | PedidoEstado>('all');
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoDetalleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  const [debugInfo, setDebugInfo] = useState<any>({
    apiUrl: '/api-proxy/pedido',
    connectionState: 'disconnected'
  });
  const [showStockWarning, setShowStockWarning] = useState(false);
  const [insufficientItems, setInsufficientItems] = useState<Array<{
    insumoId: number;
    nombre: string;
    stockActual: number;
    stockRequerido: number;
    faltante: number;
  }>>([]);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    pedidoId: number;
    nuevoEstado: string;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Store
  const supplyStore = useSupplyStore();
  
  // Constantes
  const maxRetries = 3;
  
  // Función para actualizar la información de depuración
  // Usando useCallback para evitar reconstruir la función en cada render
  const updateDebugInfo = React.useCallback((info: any) => {
    setDebugInfo((prev: any) => ({...prev, ...info}));
  }, []);

  // Cargar insumos cuando el componente se monta
  useEffect(() => {
    const loadSupplies = async () => {
      try {
        if (supplyStore) {
          await supplyStore.fetchSupplies();
        }
      } catch (error) {
        console.error('Error al cargar insumos iniciales:', error);
      }
    };
    
    loadSupplies();
  }, []); // Quitamos supplyStore de las dependencias para evitar bucles infinitos

  useEffect(() => {
    let pollingInterval: number | null = null;
    let wsConnectionAttempts = 0;
    const maxConnectionAttempts = 3;
    let cleanupWebSocket: (() => void) | null = null;

    // Función para cargar datos iniciales
    const fetchInitialData = async () => {
      setLoading(true);
      setAuthError(null);
      try {
        // Añadir información al panel de depuración
        updateDebugInfo({
          apiUrl: '/api-proxy/pedido',
          responseStatus: 'Cargando...',
          tokenStatus: 'Verificando...'
        });
        
        // Verificar token disponible
        let hasToken = false;
        try {
          const token = await getToken();
          hasToken = !!token;
          updateDebugInfo({
            tokenStatus: hasToken ? 'Disponible' : 'No disponible',
            tokenFirstChars: hasToken && token ? `${token.substring(0, 10)}...` : null
          });
        } catch (e) {
          console.error('Error al verificar token:', e);
          updateDebugInfo({
            tokenStatus: 'Error al verificar',
            tokenError: e
          });
        }
        
        // Cargar pedidos
        const startTime = performance.now();
        const data = await fetchPedidos();
        const endTime = performance.now();
        
        // Actualizar información de depuración
        updateDebugInfo({
          responseStatus: 200,
          responseData: data,
          responseTime: `${(endTime - startTime).toFixed(0)}ms`
        });
        
        // Reiniciar contador de reintentos
        setRetryCount(0);
        
        // Verificar datos
        if (!Array.isArray(data)) {
          console.warn('Respuesta de API no es un array:', data);
          updateDebugInfo({
            error: 'La respuesta no es un array',
            rawData: typeof data === 'object' ? JSON.stringify(data).substring(0, 500) : data
          });
        }
        
        setPedidos(Array.isArray(data) ? data : []);
      } catch (error: any) {
        console.error('Error al cargar datos iniciales:', error);
        
        // Determinar si es error de autenticación
        const isAuthError = error?.response?.status === 401 || error?.response?.status === 403;
        
        if (isAuthError) {
          setAuthError('Error de autenticación. Intente recargar la página o volver a iniciar sesión.');
          updateDebugInfo({
            error: 'Error de autenticación',
            responseStatus: error?.response?.status || 'Error',
            authErrorDetails: error?.response?.data || 'Sin detalles'
          });
        } else {
          updateDebugInfo({
            error: error,
            responseStatus: (error as any)?.response?.status || 'Error',
            errorMessage: error?.message || 'Error desconocido'
          });
        }
        
        // Reintentar si no hemos alcanzado el máximo
        if (retryCount < maxRetries && isAuthError) {
          setRetryCount(prev => prev + 1);
          
          // Esperar antes de reintentar
          setTimeout(fetchInitialData, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    // Función para iniciar polling como respaldo
    const startPolling = () => {
      if (pollingInterval) return; // Ya activo
      
      pollingInterval = window.setInterval(async () => {
        try {
          const data = await fetchPedidos();
          setPedidos(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error en polling:', error);
        }
      }, 10000); // Cada 10 segundos
    };

    // Manejar cambios de conexión WebSocket
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      setConnectionState(state);
      updateDebugInfo({ connectionState: state });
      
      if (state === 'connected') {
        // WebSocket conectado, detener polling
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
        }
        wsConnectionAttempts = 0;
      } else if (state === 'error' || state === 'disconnected') {
        wsConnectionAttempts++;
        
        // Cambiar a polling si alcanzamos el máximo
        if (wsConnectionAttempts >= maxConnectionAttempts) {
          startPolling();
        }
      }
    };
    
    // Cargar datos iniciales
    fetchInitialData();

    // Conectar WebSocket
    cleanupWebSocket = connectToPedidoSocket(
      // Manejar actualizaciones de pedidos
      (updatedPedido) => {
        setPedidos((prev) => {
          const currentPedidos = Array.isArray(prev) ? prev : [];
          const index = currentPedidos.findIndex(p => p.id === updatedPedido.id);
          
          // Procesar stock si cambia a PREPARACION
          if (updatedPedido.estado === 'PREPARACION') {
            processOrderForStock(updatedPedido.id, supplyStore);
          }
          
          if (index >= 0) {
            return [
              ...currentPedidos.slice(0, index),
              updatedPedido,
              ...currentPedidos.slice(index + 1)
            ];
          } else {
            return [updatedPedido, ...currentPedidos];
          }
        });
      },
      // Para actualizaciones de stock directas
      (stockUpdate) => {
        // Convertir formato y actualizar
        supplyStore.handleStockUpdate({
          insumoId: stockUpdate.id,
          nuevoStock: stockUpdate.stockActual
        });
      },
      handleConnectionStateChange
    );
    
    // Limpieza al desmontar
    return () => {
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  // Solo incluimos dependencias que son valores primitivos o funciones estables 
  }, [retryCount, maxRetries, updateDebugInfo]);

  // ⏳ Mostrar spinner de carga mientras se traen pedidos
  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
          <p className="text-gray-600">Cargando pedidos...</p>
        </div>
      </Layout>
    );
  }
  
  // Mostrar mensaje de error de autenticación
  if (authError) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-md max-w-lg">
            <div className="flex items-center mb-2">
              <svg className="h-6 w-6 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-lg font-medium">Error de autenticación</h3>
            </div>
            <p className="mb-3">{authError}</p>
            <div className="flex space-x-4">
              <button 
                onClick={() => window.location.reload()}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm"
              >
                Recargar página
              </button>
              <button 
                onClick={() => window.location.href = '/login'}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm"
              >
                Ir al login
              </button>
            </div>
          </div>
          
          {/* Mostrar información de depuración */}
          <div className="mt-8 text-sm text-gray-500">
            <details>
              <summary className="cursor-pointer font-medium">Mostrar información para soporte</summary>
              <div className="mt-2 p-4 bg-gray-100 rounded-md overflow-auto max-w-4xl">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        </div>
      </Layout>
    );
  }

  // Determinar el rol efectivo para usar en las operaciones
  const rolEfectivo = rol && tabsPorRol[rol] ? rol : 'DEFAULT';

  // 👉 Lógica de filtros por rol y tab - Versión simplificada para evitar filtrado excesivo
  const pedidosVisibles = Array.isArray(pedidos) ? pedidos.filter((p) => {
    if (!p) return false;
    
    // Asegurarse que tenga ID al menos
    if (!p.id) return false;
    
    // Si no tiene estado, asumimos PENDIENTE para evitar que se filtren pedidos válidos
    const estado = p.estado || 'PENDIENTE';
    
    if (rolEfectivo === 'CHEF') return ['PENDIENTE', 'LISTO'].includes(estado);
    if (rolEfectivo === 'DELIVERY') return ['LISTO', 'ENTREGADO'].includes(estado);
    return true;
  }) : [];

  // Filtrado más flexible que no depende tanto de la estructura exacta
  const pedidosFiltrados = activeTab === 'all'
    ? pedidosVisibles
    : pedidosVisibles.filter(p => p && (!activeTab || p.estado === activeTab));

  // Eliminar logs de depuración que causan ruido en la consola
  const tabs = tabsPorRol[rolEfectivo];

  return (
    <Layout>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800 flex items-center space-x-2">
            <Globe className="h-6 w-6 text-blue-600" />
            <span>Pedidos Web (Delivery/Takeaway)</span>
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">Pedidos realizados por clientes desde la página web</p>
            <div className="flex items-center gap-2 mt-1">
              {renderConnectionStatus(connectionState)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6 mb-6 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2 text-sm font-medium border-b-2 ${activeTab === tab
              ? 'border-red-500 text-red-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            {tab === 'all' ? 'Todas' : statusLabel[tab]}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {pedidosFiltrados.map((pedido) => (
          <Card key={pedido.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Orden #{pedido.id}</h3>
                <p className="text-gray-500 text-sm">
                  {new Date(pedido.fechaPedido).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {pedido.estado && statusVariant[pedido.estado] && statusIcons[pedido.estado] && statusLabel[pedido.estado] ? (
                <Badge variant={statusVariant[pedido.estado]} icon={statusIcons[pedido.estado]}>
                  {statusLabel[pedido.estado]}
                </Badge>
              ) : (
                <Badge variant="warning">Estado desconocido</Badge>
              )}

            </div>

            <div className="mt-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Total:</span>
                <span className="font-medium">
                  {typeof pedido.total === 'number' ? `$${pedido.total.toFixed(2)}` : 
                   typeof pedido.total === 'string' ? `$${parseFloat(pedido.total).toFixed(2)}` : '—'}
                </span>

              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tiempo estimado:</span>
                <span>
                  {pedido.tiempoEstimadoMinutos 
                    ? `${pedido.tiempoEstimadoMinutos} min` 
                    : '—'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                icon={<Eye size={16} />}
                onClick={async () => {
                  try {
                    const detalle = await fetchPedidoDetalle(pedido.id);
                    setPedidoDetalle(detalle);
                  } catch (err) {
                    console.error('Error al cargar detalle del pedido', err);
                    alert('No se pudo cargar el detalle del pedido.');
                  }
                }}
              >
                Ver detalles
              </Button>

            </div>

            <PedidoCardAcciones
              rol={rolEfectivo as 'ADMIN' | 'CHEF' | 'DELIVERY'}
              estado={pedido.estado}
              onChangeEstado={async (nuevoEstado) => {
                try {
                  // Si el pedido se va a cambiar a PREPARACION, verificamos el stock antes
                  if (nuevoEstado === 'PREPARACION') {
                    console.log('🚨 === VALIDACIÓN DE STOCK PARA DESCUENTO INMEDIATO ===');
                    console.log(`Pedido #${pedido.id} pasará a PREPARACIÓN - verificando stock`);
                    
                    const pedidoDetalle = await fetchPedidoDetalle(pedido.id);
                    
                    // Extraemos los items del pedido para validar stock
                    const items = pedidoDetalle.detalles.map(detalle => ({
                      articulo: detalle.articulo,
                      cantidad: detalle.cantidad
                    }));
                    
                    console.log('Items a validar:', items);
                    
                    // Utilizar el nuevo servicio de validación para descuento inmediato
                    try {
                      const { isValid, insufficientStockItems, warning, estimatedImpact } = await validateStockForImmediateOrder(items);
                      
                      console.log('Resultado de validación inmediata:', { isValid, insufficientStockItems, warning });
                      
                      // Mostrar el impacto estimado
                      if (estimatedImpact && estimatedImpact.length > 0) {
                        console.log('📊 === IMPACTO ESTIMADO EN INVENTARIO ===');
                        estimatedImpact.forEach(item => {
                          console.log(`   ${item.nombre}: ${item.stockActual} -> ${item.stockDespues} ${item.criticalLevel ? '⚠️ CRÍTICO' : '✅'}`);
                        });
                      }
                      
                      // Si hay una advertencia, mostrarla pero continuar
                      if (warning) {
                        console.warn(`⚠️ ${warning}`);
                        // Mostrar una alerta no bloqueante al usuario
                        const continuar = window.confirm(`Advertencia: ${warning}\n\n¿Desea continuar con el pedido?`);
                        if (!continuar) {
                          console.log('Usuario canceló el procesamiento del pedido');
                          return;
                        }
                      }
                      
                      if (!isValid && insufficientStockItems.length > 0) {
                        console.log('❌ Stock insuficiente para el pedido:', insufficientStockItems);
                        
                        // Usar los datos formateados directamente
                        setInsufficientItems(insufficientStockItems);
                        setShowStockWarning(true);
                        
                        // Guardar el cambio de estado pendiente
                        setPendingStatusChange({
                          pedidoId: pedido.id,
                          nuevoEstado
                        });
                        
                        // No continuamos con la actualización hasta que el usuario confirme
                        return;
                      }
                      
                      console.log('✅ Stock validado correctamente - procediendo con el pedido');
                    } catch (error) {
                      console.error('❌ Error al validar stock inmediato:', error);
                      // En caso de error, mostrar advertencia al usuario
                      const continuar = window.confirm('Error al validar stock. ¿Desea continuar sin validación?');
                      if (!continuar) {
                        console.log('Usuario canceló el procesamiento debido a error de validación');
                        return;
                      }
                      console.warn('Continuando sin validación de stock debido a un error');
                    }
                  }
                  
                  // Si no es PREPARACION o hay suficiente stock, procedemos normalmente
                  await updatePedidoEstado(pedido.id, nuevoEstado);
                  console.log(`Pedido ${pedido.id} actualizado a estado ${nuevoEstado}`);
                  
                  // Si el pedido se cambió a PREPARACION, procesamos el stock
                  if (nuevoEstado === 'PREPARACION') {
                    console.log(`Pedido ${pedido.id} cambió a PREPARACION - Procesando inventario`);
                    await processOrderForStock(pedido.id, supplyStore);
                  }
                  
                  // El estado se actualizará por WebSocket, no localmente
                } catch (err) {
                  console.error('Error al cambiar estado', err);
                  alert('Hubo un error al cambiar el estado del pedido.');
                }
              }}
            />


          </Card>
        ))}
        {pedidoDetalle && (
          <OrderDetailModal pedido={pedidoDetalle} onClose={() => setPedidoDetalle(null)} />
        )}
        
        {/* Modal de advertencia de stock insuficiente */}
        {showStockWarning && insufficientItems.length > 0 && (
          <StockWarningModal 
            insufficientItems={insufficientItems} 
            onClose={() => {
              setShowStockWarning(false);
              setPendingStatusChange(null);
            }}
            onContinue={async () => {
              // Si hay un cambio de estado pendiente, lo procesamos
              if (pendingStatusChange) {
                try {
                  const { pedidoId, nuevoEstado } = pendingStatusChange;
                  await updatePedidoEstado(pedidoId, nuevoEstado);
                  console.log(`Pedido ${pedidoId} actualizado a estado ${nuevoEstado} a pesar de stock insuficiente`);
                  
                  // Si el pedido se cambió a PREPARACION, procesamos el stock
                  if (nuevoEstado === 'PREPARACION') {
                    console.log(`Pedido ${pedidoId} cambió a PREPARACION - Procesando inventario`);
                    await processOrderForStock(pedidoId, supplyStore);
                  }
                  
                  // Limpiar el estado pendiente
                  setPendingStatusChange(null);
                  setShowStockWarning(false);
                } catch (error) {
                  console.error('Error al procesar cambio de estado pendiente:', error);
                  alert('Hubo un error al cambiar el estado del pedido.');
                }
              } else {
                setShowStockWarning(false);
              }
            }}
          />
        )}
        
        {/* Sin pedidos mostrar mensaje */}
        {pedidosFiltrados.length === 0 && !loading && (
          <div className="col-span-full text-center py-8">
            <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium text-gray-800 mb-2">No se encontraron pedidos web</h3>
              <p className="text-gray-600 mb-4">
                {activeTab === 'all' 
                  ? 'No hay pedidos web disponibles en este momento.' 
                  : `No hay pedidos web con estado "${statusLabel[activeTab]}" en este momento.`}
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mb-4">
                <Button 
                  variant="primary" 
                  onClick={() => {
                    // Refrescar los datos
                    setLoading(true);
                    fetchPedidos()
                      .then(data => {
                        setPedidos(Array.isArray(data) ? data : []);
                        updateDebugInfo({
                          responseData: data,
                          responseStatus: 200,
                          responseTime: new Date().toLocaleTimeString()
                        });
                      })
                      .catch(error => {
                        console.error('Error al recargar pedidos:', error);
                        
                        // Si es un error de autenticación, actualizar el estado
                        if (error?.response?.status === 401 || error?.response?.status === 403) {
                          setAuthError('Error de autenticación al recargar pedidos. Su sesión puede haber expirado.');
                        }
                        
                        updateDebugInfo({
                          error: error,
                          responseStatus: (error as any)?.response?.status || 'Error',
                          responseTime: new Date().toLocaleTimeString()
                        });
                      })
                      .finally(() => setLoading(false));
                  }}
                  icon={<RefreshCw size={16} />}
                >
                  Recargar pedidos
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    // Intentar con una petición sin filtros
                    setActiveTab('all');
                    setLoading(true);
                    fetchPedidos() // Usar fetchPedidos en lugar de fetchRawPedidos
                      .then((data: any) => {
                        console.log('Datos raw recibidos:', data);
                        updateDebugInfo({
                          rawApiTest: data,
                          responseStatus: 'OK (raw)',
                          responseTime: new Date().toLocaleTimeString()
                        });
                        
                        // Si recibimos datos pero no hay pedidos filtrados, posible problema de filtrado
                        if (Array.isArray(data) && data.length > 0) {
                          updateDebugInfo({
                            warning: 'Se recibieron datos en modo raw pero no en modo filtrado'
                          });
                        }
                      })
                      .catch((error: any) => {
                        console.error('Error en petición raw:', error);
                        updateDebugInfo({
                          rawApiError: error,
                          responseStatus: (error as any)?.response?.status || 'Error'
                        });
                      })
                      .finally(() => {
                        setLoading(false);
                        // Recargar pedidos normales tras la prueba
                        fetchPedidos()
                          .then(data => setPedidos(Array.isArray(data) ? data : []));
                      });
                  }}
                >
                  Realizar diagnóstico
                </Button>
              </div>
              
              {/* Panel de estado de conexión */}
              <div className="flex justify-center mb-4">
                {renderConnectionStatus(connectionState)}
              </div>
              
              {/* Mostrar sugerencias basadas en el estado */}
              <div className="text-sm text-gray-500 mt-4">
                <p>
                  {connectionState === 'connected' ? 
                    'WebSocket conectado correctamente. Los pedidos aparecerán automáticamente cuando se creen.' : 
                    'El WebSocket no está conectado. Las actualizaciones pueden tardar unos minutos en aparecer.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      
      {/* Panel de inventario (visible solo para roles con permisos) */}
      {(rol === 'ADMIN' || rol === 'CHEF') && (
        <div className="mt-8">
          <details>
            <summary className="cursor-pointer font-medium text-gray-700 mb-2">
              Estado actual del inventario (Insumos)
            </summary>
            <div className="bg-white rounded-md shadow p-4 overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Denominación</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Mínimo</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplyStore.supplies.map((supply) => (
                    <tr key={supply.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{supply.id}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{supply.denominacion}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {supply.stockActual} {supply.unidadMedida?.denominacion || ''}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {supply.stockMinimo} {supply.unidadMedida?.denominacion || ''}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        {supply.stockActual <= supply.stockMinimo ? (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-md">
                            Stock bajo
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-md">
                            Suficiente
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {supplyStore.supplies.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-sm text-gray-500">
                        No hay insumos disponibles o cargando datos...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => supplyStore.fetchSupplies()}
                >
                  Actualizar inventario
                </Button>
              </div>
            </div>
          </details>
        </div>
      )}
    </Layout>
  );
};

export default WebOrdersPage;