import apiClient from "./apiClient";
import type { RecipeItem, RecipeUpsertDTO } from "../types/pos";

export async function posGetRecipe(productId: number): Promise<RecipeItem[]> {
  try {
    console.log(`🔍 POS: Obteniendo receta para producto ID: ${productId}`);
    // Usar el endpoint real que funciona según el controlador
    const { data } = await apiClient.get(`/articulosManufacturados/obtener/${productId}`);
    console.log(`📦 POS: Producto manufacturado obtenido:`, data);
    
    // Extraer ingredientes de los detalles del producto
    const recipeItems = (data.detalles || []).map((detalle: any) => ({
      ingredientId: detalle.articuloInsumo?.id || 0,
      ingredientName: detalle.articuloInsumo?.denominacion || 'Sin nombre',
      quantity: detalle.cantidad || 0,
      unitMeasure: detalle.articuloInsumo?.unidadMedida?.denominacion || 'unidad'
    }));
    
    console.log(`✅ POS: ${recipeItems.length} ingredientes encontrados en receta`);
    return recipeItems;
  } catch (error) {
    console.error('❌ POS: Error getting recipe:', error);
    return [];
  }
}

export async function posUpsertRecipe(productId: number, dto: RecipeUpsertDTO): Promise<RecipeItem[]> {
  try {
    console.log(`💾 POS: Actualizando receta para producto ID: ${productId}`, dto);
    // Por ahora retornar la receta actual, ya que el backend no tiene endpoint específico para esto
    console.warn('⚠️ POS: Actualización de recetas no implementada en backend');
    return await posGetRecipe(productId);
  } catch (error) {
    console.error('❌ POS: Error updating recipe:', error);
    return [];
  }
}