// src/utils/orderRecipeHelper.ts
import { PedidoDetalleResponse } from '../types/order';

// Interfaces para recetas
export interface RecipeIngredient {
  insumoId: number;
  cantidad: number;
}

export interface Recipe {
  ingredientes: RecipeIngredient[];
}

// Mapeos simulados de productos a recetas (en un caso real, esto vendría del backend)
const productRecipes: Record<number, Recipe> = {
  // Ejemplo: Pizza Margarita (ID: 1)
  1: {
    ingredientes: [
      { insumoId: 1, cantidad: 0.2 }, // Harina: 200g
      { insumoId: 2, cantidad: 0.1 }, // Tomate: 100g
      { insumoId: 3, cantidad: 0.08 }, // Queso: 80g
      { insumoId: 4, cantidad: 0.01 } // Aceite: 10ml
    ]
  },
  
  // Ejemplo: Hamburguesa (ID: 2)
  2: {
    ingredientes: [
      { insumoId: 5, cantidad: 0.15 }, // Carne: 150g
      { insumoId: 6, cantidad: 0.03 }, // Lechuga: 30g
      { insumoId: 7, cantidad: 0.05 }, // Pan: 50g
      { insumoId: 2, cantidad: 0.03 } // Tomate: 30g
    ]
  },
  
  // Ejemplo: Papas fritas (ID: 3)
  3: {
    ingredientes: [
      { insumoId: 8, cantidad: 0.2 }, // Papas: 200g
      { insumoId: 4, cantidad: 0.05 } // Aceite: 50ml
    ]
  }
};

/**
 * Obtiene la receta para un producto dado su ID
 */
export function getProductRecipe(productId: number): Recipe | null {
  return productRecipes[productId] || null;
}

/**
 * Enriquece un detalle de pedido con información de recetas para los productos
 */
export function enrichOrderWithRecipes(pedido: PedidoDetalleResponse): PedidoDetalleResponse {
  // Crear una copia del pedido para no modificar el original
  const enrichedOrder = {
    ...pedido,
    detalles: pedido.detalles.map(detalle => {
      // Crear un objeto artículo enriquecido con recetas
      const enrichedArticulo = {
        ...detalle.articulo,
        receta: getProductRecipe(detalle.articulo.id)
      };
      
      return {
        ...detalle,
        articulo: enrichedArticulo
      };
    })
  };
  
  return enrichedOrder;
}
