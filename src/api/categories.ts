// api/categories.ts
import apiClient from './apiClient';

export interface FlatCategory {
  id: number;
  denominacion: string;
  deleted?: boolean;
}

export const fetchCategories = async (): Promise<FlatCategory[]> => {
  try {
    console.log('📋 Obteniendo categorías desde API...');
    
    // Usar directamente el endpoint que funciona según los logs
    const res = await apiClient.get('/categoria/listar');
    
    console.log('� Respuesta cruda del backend:', JSON.stringify(res.data, null, 2));
    
    if (res.data && Array.isArray(res.data)) {
      console.log(`📊 Se obtuvieron ${res.data.length} categorías principales`);
      
      // Usar extractFlatCategories para manejar las categorías correctamente
      const flattenedCategories = extractFlatCategories(res.data);
      console.log(`📊 Resultado final: ${flattenedCategories.length} categorías disponibles para productos`);
      
      // Para debug: mostrar todas las categorías encontradas
      flattenedCategories.forEach(cat => {
        console.log(`- ${cat.denominacion} (ID: ${cat.id})`);
      });
      
      return flattenedCategories;
    } else {
      console.error('❌ La respuesta no contiene un array de categorías');
      return [];
    }
    
  } catch (error) {
    console.error('❌ Error al obtener categorías:', error);
    return []; // Devolvemos un array vacío en caso de error
  }
};

export const updateSubcategory = async (
  id: number,
  idCategoriaPadre: number,
  data: { denominacion: string; esInsumo: boolean }
) => {
  return apiClient.post(
    `/categoria/subcategoria/actualizar/${id}?idCategoriaPadre=${idCategoriaPadre}`,
    data
  );
};


// Nueva función para extraer categorías de varios posibles formatos de respuesta
function extractFlatCategories(data: any[]): FlatCategory[] {
  const result: FlatCategory[] = [];
  
  // Para debug
  console.log('🔍 Analizando categorías crudas:', data);
  
  for (const item of data) {
    // Verificar si el item tiene la estructura esperada
    if (item && (typeof item.id === 'number' || typeof item.id === 'string') && typeof item.denominacion === 'string') {
      
      // Solo incluir categorías que NO sean de insumos para productos manufacturados
      if (!item.esInsumo) {
        result.push({
          id: Number(item.id),
          denominacion: item.denominacion
        });
        
        console.log(`✅ Añadida categoría padre: ${item.denominacion} (ID: ${item.id})`);
      }
      
      // Procesar subcategorías si existen
      if (item.subcategorias && Array.isArray(item.subcategorias)) {
        for (const subcategoria of item.subcategorias) {
          if (subcategoria && 
              (typeof subcategoria.id === 'number' || typeof subcategoria.id === 'string') && 
              typeof subcategoria.denominacion === 'string') {
            
            // Solo incluir subcategorías que NO sean de insumos
            if (!subcategoria.esInsumo) {
              result.push({
                id: Number(subcategoria.id),
                denominacion: subcategoria.denominacion
              });
              
              console.log(`✅ Añadida subcategoría: ${subcategoria.denominacion} (ID: ${subcategoria.id})`);
            }
          }
        }
      }
    }
  }
  
  console.log(`📊 Total categorías extraídas: ${result.length}`);
  return result;
}


