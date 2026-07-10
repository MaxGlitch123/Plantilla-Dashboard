import apiClient from './apiClient';
import { Supply } from '../types/supply';

export const fetchSupplies = async (): Promise<Supply[]> => {
  try {
    console.log('🔍 Cargando insumos desde API...');
    
    // Usar el endpoint correcto según los patrones del backend
    const response = await apiClient.get('/articuloInsumo/listar');
    
    console.log('� Respuesta cruda de insumos:', JSON.stringify(response.data, null, 2));
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Se obtuvieron ${response.data.length} insumos totales`);
      
      // Filtrar insumos que no están eliminados (deleted !== true)
      const insumos: Supply[] = response.data.filter((insumo: any) => !insumo.deleted);
      console.log(`✅ Mostrando ${insumos.length} insumos activos`);
      
      // Para debug: mostrar todos los insumos encontrados
      insumos.forEach(insumo => {
        console.log(`- ${insumo.denominacion} (ID: ${insumo.id}) - Stock: ${insumo.stockActual} - ${typeof insumo.unidadMedida === 'object' ? insumo.unidadMedida?.denominacion : insumo.unidadMedida}`);
      });
      
      return insumos;
    } else {
      console.error('❌ La respuesta no contiene un array de insumos');
      return [];
    }
  } catch (error: any) {
    console.error('❌ Error al cargar insumos:', error.message);
    return [];
  }
};

// Función para refrescar el stock de un insumo específico
export const refreshSupplyStock = async (supplyId: number): Promise<Supply> => {
  const response = await apiClient.get(`/articuloInsumo/${supplyId}`);
  return response.data;
};

// Función para actualizar el stock de un insumo
export const updateSupplyStock = async (
  supplyId: number, 
  stockActual: number, 
  stockPendiente?: number
): Promise<Supply> => {
  const response = await apiClient.put(`/articuloInsumo/${supplyId}/stock`, {
    stockActual,
    stockPendiente
  });
  return response.data;
};

// Función para actualizar el precio de un insumo y recalcular precios de productos manufacturados
export const updateSupplyPrice = async (
  supplyId: number,
  precioCompra: number
): Promise<{supply: Supply, updatedProducts: any[]}> => {
  // Actualizar el precio del insumo
  const response = await apiClient.put(`/articuloInsumo/${supplyId}/precio`, {
    precioCompra
  });
  
  // Solicitar recálculo de precios para productos manufacturados
  const updatedProductsResponse = await apiClient.post(`/articuloManufacturado/recalcularPrecios`, {
    insumoId: supplyId,
    nuevoPrecio: precioCompra
  });
  
  return {
    supply: response.data,
    updatedProducts: updatedProductsResponse.data
  };
};
