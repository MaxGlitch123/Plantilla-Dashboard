import apiClient from "./apiClient";
import type { Ingredient } from "../types/pos";

export async function posSearchIngredients(query: string): Promise<Ingredient[]> {
  try {
    console.log(`🔍 POS: Buscando ingredientes con query: "${query}"`);
    // Usar el endpoint real de insumos que SÍ funciona
    const { data } = await apiClient.get("/articuloInsumo/listar");
    console.log(`📦 POS: Respuesta de insumos:`, data);
    
    // Filtrar y mapear insumos para POS
    const ingredients = data
      .filter((insumo: any) => !insumo.deleted)  // Solo excluir los eliminados
      .filter((insumo: any) => {
        if (!query || query.trim() === '') return true;
        const searchTerm = query.toLowerCase();
        return insumo.denominacion?.toLowerCase().includes(searchTerm);
      })
      .map((insumo: any) => ({
        id: insumo.id.toString(),
        name: insumo.denominacion,
        unitMeasure: insumo.unidadMedida?.denominacion || 'unidad',
        stock: insumo.stockActual || 0,
        category: insumo.categoria?.denominacion || 'Sin categoría'
      }));
    
    console.log(`✅ POS: ${ingredients.length} ingredientes encontrados para "${query}"`);
    return ingredients;
  } catch (error) {
    console.error('❌ POS: Error searching ingredients:', error);
    return [];
  }
}