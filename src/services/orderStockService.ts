// src/services/orderStockService.ts

import { PedidoDetalleResponse } from '../types/order';
import { StockUpdate as WebSocketStockUpdate, connectToPedidoSocket } from '../utils/pedidoWebSocket';
import { fetchPedidoDetalle } from '../api/orders';

// Define a type for recipe items that contain a specific supply
interface RecipeItem {
  insumoId: number;
  cantidad: number;
}

// Define a type for products that have a recipe
interface ProductWithRecipe {
  id: number;
  denominacion?: string;
  receta?: {
    ingredientes: RecipeItem[];
  };
}

// Define interfaces for the supply store
interface Supply {
  id: number;
  denominacion: string;
  stockActual: number;
}

interface StockUpdate {
  insumoId: number;
  nuevoStock: number;
}

interface SupplyStore {
  supplies: Supply[];
  getSupplyById: (id: number) => Supply | undefined;
  updateSupplyStock: (id: number, newStock: number) => Promise<void>;
  fetchSupplies: () => Promise<void>;
  handleStockUpdate: (update: StockUpdate) => void;
}

/**
 * Updates the stock of supplies when an order is processed by its ID
 * @param orderId The ID of the order to process
 * @param supplyStore Supply store instance (required)
 */
export const processOrderForStock = async (orderId: number, supplyStore: SupplyStore) => {
  try {
    console.log(`Obteniendo detalles del pedido ${orderId} para procesar stock...`);
    const order = await fetchPedidoDetalle(orderId);
    
    if (!order.detalles || !Array.isArray(order.detalles)) {
      console.warn('Order has no details, skipping stock processing');
      return;
    }
    
    // Verificar que tenemos un store de suministros
    if (!supplyStore) {
      console.warn('No supply store provided, skipping stock processing');
      return;
    }
    
    // Importar la función de enriquecimiento desde utils
    // Usar import dinámico para evitar dependencias circulares
    const { enrichOrderWithRecipes } = await import('../utils/orderRecipeHelper');
    
    // Enriquecer el pedido con las recetas
    const enrichedOrder = enrichOrderWithRecipes(order);
    
    console.log('Procesando stock para el pedido:', orderId);
    await processOrderDetailForStock(enrichedOrder, supplyStore);
    
  } catch (error) {
    console.error(`Error al procesar el stock para el pedido ${orderId}:`, error);
  }
};

/**
 * Updates the stock of supplies when an order detail is processed
 * @param order The order detail to process
 * @param supplyStore Supply store instance (required)
 */
export const processOrderDetailForStock = async (order: PedidoDetalleResponse, supplyStore: SupplyStore) => {
  if (!order.detalles || !Array.isArray(order.detalles)) {
    console.warn('Order has no details, skipping stock processing');
    return;
  }

  // Verificar que tenemos un store de suministros
  if (!supplyStore) {
    console.warn('No supply store provided, skipping stock processing');
    return;
  }
  
  console.log('Procesando stock para el pedido:', order.id);
  
  // For each order item, check if it has a recipe and deduct stock for ingredients
  for (const item of order.detalles) {
    if (!item.articulo) continue;
    
    const product = item.articulo as unknown as ProductWithRecipe;
    
    // If the product has a recipe, deduct stock for each ingredient
    if (product.receta && Array.isArray(product.receta.ingredientes)) {
      console.log(`Procesando receta para ${product.id} - ${product.denominacion || 'Producto'}:`);
      console.log('Ingredientes:', product.receta.ingredientes);
      
      for (const ingredient of product.receta.ingredientes) {
        // Skip if the supply doesn't exist in the store
        const supply = supplyStore.getSupplyById(ingredient.insumoId);
        if (!supply) {
          console.log(`Insumo #${ingredient.insumoId} no encontrado en el store, intentando obtener datos`);
          continue;
        }
        
        // Calculate the amount to deduct (ingredient amount × ordered quantity)
        const amountToDeduct = ingredient.cantidad * (item.cantidad || 1);
        const newStock = Math.max(0, supply.stockActual - amountToDeduct);
        
        console.log(`Actualizando stock para insumo #${ingredient.insumoId}: ${supply.denominacion}`);
        console.log(`Stock actual: ${supply.stockActual}, a deducir: ${amountToDeduct}, nuevo stock: ${newStock}`);
        
        // Update the stock in the backend
        try {
          await supplyStore.updateSupplyStock(ingredient.insumoId, newStock);
          console.log(`✅ Stock actualizado correctamente: ${supply.denominacion} -> ${newStock}`);
        } catch (error) {
          console.error(`❌ Error al actualizar stock para insumo #${ingredient.insumoId}`, error);
        }
      }
    } else {
      console.log(`El producto ${product.id} no tiene receta o ingredientes definidos`);
    }
  }
  
  // Refresh all supplies to ensure consistency
  await supplyStore.fetchSupplies();
  console.log('✅ Actualización de stock completada para el pedido:', order.id);
};

/**
 * Sets up WebSocket connection to receive order and stock updates
 * @param supplyStore Supply store instance
 * @returns A cleanup function to disconnect the WebSocket
 */
export const setupStockWebSocket = (supplyStore: SupplyStore) => {
  // Verificar que tenemos un store de suministros
  if (!supplyStore) {
    console.warn('No supply store provided, stock updates will not be processed');
    // Devolvemos una función de limpieza vacía
    return () => {}; 
  }
  
  return connectToPedidoSocket(
    // Order update handler
    (updatedOrder) => {
      console.log('Order updated via WebSocket:', updatedOrder);
      
      // If the order status changes to PREPARACION, deduct stock
      if (updatedOrder.estado === 'PREPARACION') {
        // Fetch the detailed order to get recipe information
        // Usar la función del API client en lugar de fetch directo
        fetchPedidoDetalle(updatedOrder.id)
          .then(orderDetail => {
            processOrderDetailForStock(orderDetail, supplyStore);
          })
          .catch(err => {
            console.error('Error fetching order details for stock processing:', err);
          });
      }
    },
    
    // Stock update handler (direct updates from the backend)
    (stockUpdate: WebSocketStockUpdate) => {
      console.log('Stock update received via WebSocket:', stockUpdate);
      // Convert from WebSocket format to the format expected by the store
      if (stockUpdate && stockUpdate.id) {
        supplyStore.handleStockUpdate({
          insumoId: stockUpdate.id,
          nuevoStock: stockUpdate.stockActual
        });
      }
    },
    
    // Connection state handler
    (state) => {
      console.log('WebSocket connection state:', state);
    }
  );
};
