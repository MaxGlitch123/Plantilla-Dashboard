import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Search, Plus, Edit, Trash2, AlertTriangle, RefreshCw, Wifi, WifiOff, DollarSign, X } from 'lucide-react'; //ListFilter,
/* import { Link } from 'react-router-dom'; */
import type { Supply } from '../types/supply';
import SupplyModal from '../components/supplies/SupplyModal';
import PriceUpdateModal from '../components/supplies/PriceUpdateModal';
import apiClient from '../api/apiClient';
import { connectToPedidoSocket, WebSocketConnectionState, StockUpdate as WebSocketStockUpdate } from '../utils/pedidoWebSocket';
import { useSupplyStore } from '../store/useSupplyStore';

interface Category {
  id: number;
  denominacion: string;
  esInsumo: boolean;
  subcategorias: Category[];
}

// Eliminamos esta función ya que usaremos fetchSuppliesApi importada

const flattenCategories = (categoriesFromApi: Category[]): Category[] => {
  const flattened: Category[] = [];

  for (const cat of categoriesFromApi) {
    for (const sub of cat.subcategorias || []) {
      flattened.push({
        id: sub.id,
        denominacion: sub.denominacion,
        esInsumo: false,
        subcategorias: [],
      });
    }

    if (cat.esInsumo) {
      flattened.push({
        id: cat.id,
        denominacion: cat.denominacion,
        esInsumo: true,
        subcategorias: [],
      });
    }
  }

  return flattened;
};

const SuppliesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [selectedSupply, setSelectedSupply] = useState<Supply | undefined>();
  const [supplyForPriceUpdate, setSupplyForPriceUpdate] = useState<Supply | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [updatingStockIds, setUpdatingStockIds] = useState<number[]>([]);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>('disconnected');
  
  // Estados para filtros especiales
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [highlightedSupplyId, setHighlightedSupplyId] = useState<number | null>(null);

  const [flatCategories, setFlatCategories] = useState<Category[]>([]);

  // useEffect para manejar parámetros URL
  useEffect(() => {
    const filter = searchParams.get('filter');
    const highlight = searchParams.get('highlight');
    
    if (filter === 'critical') {
      setShowCriticalOnly(true);
      console.log('🎯 Filtro crítico activado desde URL');
    }
    
    if (highlight) {
      const highlightId = parseInt(highlight, 10);
      setHighlightedSupplyId(highlightId);
      console.log(`🎯 Insumo ${highlightId} marcado para resaltar`);
      
      // Auto-scroll al insumo después de que los datos se carguen
      setTimeout(() => {
        const element = document.getElementById(`supply-row-${highlightId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          console.log(`📍 Scroll automático al insumo ${highlightId}`);
        }
      }, 1000);
    }
  }, [searchParams]);

  useEffect(() => {
    let pollingInterval: number | null = null;
    let wsConnectionAttempts = 0;
    const maxConnectionAttempts = 3;
    let cleanupWebSocket: (() => void) | null = null;

    console.log('🔄 === INICIALIZANDO PÁGINA DE INSUMOS ===');
    console.log('Sistema de descuento inmediato activo - actualizaciones en tiempo real');

    const loadInitialData = async () => {
      try {
        console.log('📋 Cargando datos iniciales de insumos...');
        await loadSupplies();
        await fetchCategories();
        console.log('✅ Datos iniciales cargados correctamente');
      } catch (error) {
        console.error('❌ Error al cargar datos iniciales:', error);
      }
    };

    // Función para iniciar polling como respaldo con mayor frecuencia
    const startPolling = () => {
      if (pollingInterval) return; // Ya está activo
      
      console.log('🔄 Cambiando a modo polling para actualizaciones de stock (cada 15 segundos)');
      pollingInterval = window.setInterval(async () => {
        try {
          console.log('🔄 Actualizando stock vía polling...');
          await loadSupplies();
          console.log('✅ Stock actualizado vía polling');
        } catch (error) {
          console.error('❌ Error en polling:', error);
        }
      }, 15000); // Actualizar cada 15 segundos para mayor responsividad
    };

    // Manejar cambios en el estado de la conexión WebSocket
    const handleConnectionStateChange = (state: WebSocketConnectionState) => {
      console.log(`🔌 Estado WebSocket cambió a: ${state}`);
      setConnectionState(state);
      
      if (state === 'connected') {
        // WebSocket conectado, detener polling si estaba activo
        if (pollingInterval) {
          clearInterval(pollingInterval);
          pollingInterval = null;
          console.log('🔌 WebSocket conectado, deteniendo polling');
        }
        wsConnectionAttempts = 0; // Reiniciar contador de intentos si nos conectamos exitosamente
      } else if (state === 'error' || state === 'disconnected') {
        wsConnectionAttempts++;
        console.log(`❌ Intento de conexión WebSocket ${wsConnectionAttempts}/${maxConnectionAttempts} fallido`);
        
        // Si alcanzamos el máximo de intentos, cambiar a polling
        if (wsConnectionAttempts >= maxConnectionAttempts) {
          console.log('⚠️ Máximo de intentos alcanzado, cambiando a polling de alta frecuencia');
          startPolling();
        }
      }
    };

    loadInitialData();

    // Conectar WebSocket para actualizaciones de stock en tiempo real
    cleanupWebSocket = connectToPedidoSocket(
      // Manejar actualizaciones de pedidos (nos interesa saber cuándo cambian estados)
      (pedido: any) => { 
        console.log(`📦 Pedido #${pedido.id} actualizado a estado: ${pedido.estado}`);
        if (pedido.estado === 'PREPARACION') {
          console.log('🚨 Pedido pasó a PREPARACIÓN - stock se descontará inmediatamente');
          // Forzar actualización del inventario después de unos segundos
          setTimeout(async () => {
            console.log('🔄 Refrescando inventario después de descuento inmediato...');
            await loadSupplies();
          }, 2000);
        }
      }, 
      // Manejar actualizaciones de stock en tiempo real
      async (stockUpdate: WebSocketStockUpdate) => {
        console.log('📊 === ACTUALIZACIÓN DE STOCK EN TIEMPO REAL ===');
        console.log(`Insumo ID: ${stockUpdate.id}, Nuevo stock: ${stockUpdate.stockActual}`);
        
        try {
          // Marcar el insumo como actualizándose visualmente
          setUpdatingStockIds(prev => {
            console.log(`🔄 Marcando insumo ${stockUpdate.id} como actualizándose`);
            return [...prev, stockUpdate.id];
          });
          
          // Actualizar usando la tienda Zustand sin acceder al hook
          const storeState = useSupplyStore.getState();
          
          // Primero actualizamos la UI con los datos recibidos - convertimos el formato
          storeState.handleStockUpdate({
            insumoId: stockUpdate.id,
            nuevoStock: stockUpdate.stockActual
          });
          
          console.log(`✅ Stock actualizado en store: ${stockUpdate.stockActual}`);
          
          // Luego refrescamos los datos completos mediante una llamada API normal
          await loadSupplies();
          console.log('✅ Inventario completo actualizado');
          
        } catch (error) {
          console.error('❌ Error al actualizar el insumo:', error);
        } finally {
          // Quitar el insumo de la lista de actualizaciones después de un pequeño delay
          setTimeout(() => {
            setUpdatingStockIds(prev => {
              const newIds = prev.filter(id => id !== stockUpdate.id);
              console.log(`✅ Insumo ${stockUpdate.id} marcado como actualizado`);
              return newIds;
            });
          }, 1000);
        }
      },
      // Manejar estado de conexión
      handleConnectionStateChange
    );

    // Limpiar conexión WebSocket al desmontar el componente
    return () => {
      console.log('🔌 Desconectando WebSocket y limpiando polling');
      if (cleanupWebSocket) {
        cleanupWebSocket();
      }
      
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const loadSupplies = async () => {
    try {
      setLoading(true);
      // Cargar los insumos directamente desde la API con la ruta correcta
      const res = await apiClient.get('/articuloInsumo/listar');
      if (Array.isArray(res.data)) {
        setSupplies(res.data);
        
        // También actualizamos el store para mantener sincronización
        await useSupplyStore.getState().fetchSupplies();
      } else {
        console.error('La respuesta de insumos no es un array:', res.data);
      }
    } catch (error) {
      console.error('Error al cargar insumos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/categoria/listar');
      const data = res.data;
      //setRawCategories(data);

      const flattened = flattenCategories(data);
      setFlatCategories(flattened);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  };

  const categoriasUnicas = Array.from(
    new Map(
      supplies
        .map(s => s.categoria)
        .filter(Boolean)
        .map(c => [c!.id, c!])
    ).values()
  );

  // Función para determinar el estado del stock (debe ir antes del filtro)
  const getStockStatus = (supply: Supply) => {
    if (supply.stockActual <= (supply.stockMinimo ?? 0)) return 'critical';
    if (supply.stockActual <= (supply.stockMinimo ?? 0) * 1.5) return 'low';
    return 'normal';
  };

  const filteredSupplies = supplies.filter(supply => {
    const matchesSearch = supply.denominacion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || supply.categoria?.denominacion === selectedCategory;
    
    // Filtro para insumos críticos
    const matchesCritical = !showCriticalOnly || getStockStatus(supply) === 'critical';
    
    return matchesSearch && matchesCategory && matchesCritical;
  });

  const handleEdit = (supply: Supply) => {
    setSelectedSupply(supply);
    setIsModalOpen(true);
  };

  const handleUpdatePrice = (supply: Supply) => {
    setSupplyForPriceUpdate(supply);
    setIsPriceModalOpen(true);
  };

  const handleDelete = async (supplyId: number) => {
    try {
      await apiClient.delete(`/articuloInsumo/${supplyId}`);
      await loadSupplies();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error eliminando insumo:', error);
      alert('Hubo un error al eliminar el insumo.');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  const handleRefreshStock = async () => {
    try {
      setLoading(true);
      await loadSupplies();
    } finally {
      setLoading(false);
    }
  };

  // Función para renderizar el indicador de estado de conexión
  const renderConnectionStatus = () => {
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

  return (
    <Layout>
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Insumos</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-600">Gestiona el inventario con descuento automático inmediato</p>
            {renderConnectionStatus()}
          </div>
          {/* Indicador de stock crítico */}
          {supplies.filter(s => getStockStatus(s) === 'critical').length > 0 && !showCriticalOnly && (
            <div className="mt-2 px-3 py-1 bg-red-100 border border-red-300 rounded-md text-red-800 text-sm flex items-center">
              <AlertTriangle size={16} className="mr-2 animate-pulse" />
              <span>{supplies.filter(s => getStockStatus(s) === 'critical').length} insumos con stock crítico</span>
            </div>
          )}
          
          {/* Banner de filtro activo */}
          {showCriticalOnly && (
            <div className="mt-2 px-3 py-2 bg-amber-100 border border-amber-300 rounded-md text-amber-800 text-sm flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle size={16} className="mr-2" />
                <span>Mostrando solo insumos con stock crítico ({filteredSupplies.length} encontrados)</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                icon={<X size={14} />}
                onClick={() => {
                  setShowCriticalOnly(false);
                  setHighlightedSupplyId(null);
                  setSearchParams({});
                }}
                className="text-amber-700 hover:text-amber-900"
              >
                Limpiar filtro
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            icon={<RefreshCw size={18} />}
            onClick={handleRefreshStock}
            disabled={loading}
          >
            Actualizar Stock
          </Button>
          {/* <Link to="/supplies/categories">
            <Button variant="outline" icon={<ListFilter size={18} />}>Categorías</Button>
          </Link> */}
          <Button variant="primary" icon={<Plus size={18} />} onClick={() => {
            setSelectedSupply(undefined);
            setIsModalOpen(true);
          }}>
            Nuevo Insumo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre de insumo"
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categoriasUnicas.map(category => (
                <option key={category.id} value={category.denominacion}>{category.denominacion}</option>
              ))}
            </select>
            
            {/* Botón para filtrar críticos */}
            {!showCriticalOnly && supplies.filter(s => getStockStatus(s) === 'critical').length > 0 && (
              <Button
                variant="outline"
                size="sm"
                icon={<AlertTriangle size={16} />}
                onClick={() => {
                  setShowCriticalOnly(true);
                  setSearchParams({ filter: 'critical' });
                }}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Ver críticos ({supplies.filter(s => getStockStatus(s) === 'critical').length})
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabla */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio de compra</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSupplies.map((supply) => {
                const stockStatus = getStockStatus(supply);
                const stockPercentage = supply.stockMaximo ? (supply.stockActual / supply.stockMaximo) * 100 : 0;
                const isUpdating = updatingStockIds.includes(supply.id);
                const isHighlighted = highlightedSupplyId === supply.id;
                return (
                  <tr 
                    key={supply.id} 
                    id={`supply-row-${supply.id}`}
                    className={`hover:bg-gray-50 transition-all duration-300 ${
                      isUpdating ? 'bg-yellow-50' : 
                      isHighlighted ? 'bg-blue-50 border-l-4 border-blue-500 shadow-lg' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 flex items-center">
                        {supply.denominacion}
                        {stockStatus === 'critical' && (
                          <span title="Stock crítico - requiere reposición inmediata">
                            <AlertTriangle size={16} className="ml-2 text-red-500 animate-pulse" />
                          </span>
                        )}
                        {stockStatus === 'low' && (
                          <span title="Stock bajo - considere reabastecer pronto">
                            <AlertTriangle size={16} className="ml-2 text-amber-500" />
                          </span>
                        )}
                        {isUpdating && (
                          <span title="Actualizando stock en tiempo real">
                            <RefreshCw size={16} className="ml-2 text-blue-500 animate-spin" />
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        Unidad: {typeof supply.unidadMedida === 'string' ? supply.unidadMedida : supply.unidadMedida?.denominacion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="secondary" size="sm">
                        {supply.categoria?.denominacion || 'Sin categoría'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {supply.stockActual} / {supply.stockMaximo} {typeof supply.unidadMedida === 'string' ? supply.unidadMedida : supply.unidadMedida?.denominacion}
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${stockStatus === 'critical' ? 'bg-red-500' :
                            stockStatus === 'low' ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Mín: {supply.stockMinimo} {typeof supply.unidadMedida === 'string' ? supply.unidadMedida : supply.unidadMedida?.denominacion}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${supply.precioCompra.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit size={16} />}
                          onClick={() => handleEdit(supply)}
                          aria-label="Editar insumo"
                          title="Editar insumo"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<DollarSign size={16} />}
                          onClick={() => handleUpdatePrice(supply)}
                          aria-label="Actualizar precio"
                          title="Actualizar precio"
                        />
                        {showDeleteConfirm === supply.id ? (
                          <div className="flex space-x-1">
                            <Button variant="danger" size="sm" onClick={() => handleDelete(supply.id)}>Eliminar</Button>
                            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(null)}>Cancelar</Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => setShowDeleteConfirm(supply.id)}
                            aria-label="Eliminar insumo"
                            title="Eliminar insumo"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <SupplyModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSupply(undefined);
        }}
        onSaved={loadSupplies}
        supply={selectedSupply}
        categories={flatCategories}
      />

      {isPriceModalOpen && (
        <PriceUpdateModal
          supply={supplyForPriceUpdate}
          onClose={() => {
            setIsPriceModalOpen(false);
            setSupplyForPriceUpdate(null);
          }}
          onUpdate={loadSupplies}
        />
      )}
    </Layout>
  );
};

export default SuppliesPage;
