// src/api/stock.ts
import apiClient from './apiClient';
import { PedidoDetalleResponse } from '../types/order';
import { Supply as TypedSupply } from '../types/supply';
import { Supply as StoreSupply } from '../store/useSupplyStore';

// Tipo unificado que funciona con ambas definiciones de Supply
type AnySupply = Partial<TypedSupply> & Partial<StoreSupply> & {
  id: number;
  denominacion: string;
  stockActual: number;
};

// Define la estructura para los ingredientes/receta
interface RecipeItem {
  insumoId: number;
  cantidad: number;
}

// Define la interfaz para los productos con receta
interface ProductWithRecipe {
  id: number;
  receta?: {
    ingredientes: RecipeItem[];
  };
}

// Verificar stock suficiente para un pedido
export const checkStockAvailability = async (pedidoId: number): Promise<{ 
  success: boolean; 
  insufficientSupplies: { 
    supplyId: number; 
    denominacion: string; 
    required: number; 
    available: number; 
    unidadMedida: string;
  }[] 
}> => {
  try {
    const response = await apiClient.get(`/stock/verificar/${pedidoId}`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error al verificar stock para pedido:', error);
    if (error.response && error.response.data) {
      // Si el backend proporciona información sobre qué insumos faltan
      return error.response.data;
    }
    throw error;
  }
};

// Obtener los insumos necesarios para un pedido
export const getRequiredSupplies = async (pedidoId: number): Promise<{
  supplyId: number;
  required: number;
}[]> => {
  try {
    const response = await apiClient.get(`/pedido/${pedidoId}/insumos`);
    return response.data;
  } catch (error) {
    console.error('❌ Error al obtener insumos requeridos:', error);
    return [];
  }
};

// Verificar manualmente si hay suficiente stock para un pedido (usando datos locales)
export const verifyStockLocally = (
  pedidoDetalle: PedidoDetalleResponse, 
  availableSupplies: AnySupply[]
): { 
  success: boolean; 
  insufficientSupplies: { 
    supplyId: number; 
    denominacion: string; 
    required: number; 
    available: number; 
    unidadMedida: string;
  }[]
} => {
  const insufficientSupplies: {
    supplyId: number;
    denominacion: string;
    required: number;
    available: number;
    unidadMedida: string;
  }[] = [];
  
  // Para cada detalle del pedido
  pedidoDetalle.detalles.forEach(detalle => {
    // Consideramos el producto como uno con receta para poder acceder a sus ingredientes
    const product = detalle.articulo as unknown as ProductWithRecipe;
    
    if (product && product.receta && Array.isArray(product.receta.ingredientes)) {
      // Para cada ingrediente en la receta del producto
      product.receta.ingredientes.forEach(ingredient => {
        const insumoId = ingredient.insumoId;
        const supply = availableSupplies.find(s => s.id === insumoId);
        
        if (supply) {
          // Calcular cuánto se necesita de este insumo para la cantidad ordenada
          const requiredAmount = ingredient.cantidad * detalle.cantidad;
          
          // Verificar si hay suficiente stock
          if (supply.stockActual < requiredAmount) {
            // Extraer la denominación de la unidad de medida (maneja ambos formatos)
            let unidadMedidaText = '';
            if (typeof supply.unidadMedida === 'string') {
              unidadMedidaText = supply.unidadMedida;
            } else if (supply.unidadMedida && typeof supply.unidadMedida === 'object' && 'denominacion' in supply.unidadMedida) {
              unidadMedidaText = supply.unidadMedida.denominacion;
            }

            insufficientSupplies.push({
              supplyId: insumoId,
              denominacion: supply.denominacion,
              required: requiredAmount,
              available: supply.stockActual,
              unidadMedida: unidadMedidaText
            });
          }
        } else {
          // El insumo no se encuentra en el inventario disponible
          insufficientSupplies.push({
            supplyId: insumoId,
            denominacion: `Insumo #${insumoId}`,
            required: ingredient.cantidad * detalle.cantidad,
            available: 0,
            unidadMedida: ''
          });
        }
      });
    }
  });
  
  return {
    success: insufficientSupplies.length === 0,
    insufficientSupplies
  };
};
