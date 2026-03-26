import apiClient from './apiClient';

// 🎯 INTERFACES ACTUALIZADAS SEGÚN TU NUEVO BACKEND

export interface CrearPromocion {
  denominacion: string;
  fechaDesde: string;               // "2025-09-19" (YYYY-MM-DD)
  fechaHasta: string;               // "2025-12-31"
  horaDesde?: string;               // "15:00:00" (opcional para Happy Hour)
  horaHasta?: string;               // "18:00:00" (opcional)
  descripcionDescuento: string;     // "25% descuento en todas las pizzas"
  tipoPromocion: 'HAPPYHOUR' | 'PROMOCION_1' | 'DESCUENTO_ESPECIAL' | 'OFERTA_LIMITADA';
  
  // 🔥 CAMPOS HÍBRIDOS NUEVOS
  alcance: 'TODOS' | 'CATEGORIAS' | 'PRODUCTOS' | 'TAGS';
  descuentoPorcentaje?: number;      // 25 (para 25%)
  precioPromocional?: number;        // 500 (precio fijo alternativo)
  montoMinimo?: number;             // 1000 (compra mínima)
  cantidadMaxima?: number;          // 10 (límite de productos)
  activa: boolean;                  // true
  prioridad: number;                // 1-10 (1 = más importante)
  
  // 🔥 RELACIONES (IDs de los elementos relacionados)
  sucursales?: { id: number }[];     // [{ id: 1 }]
  categoriasIncluidas?: { id: number }[];    // Para alcance CATEGORIAS
  articulosIncluidos?: { id: number }[];     // Para alcance PRODUCTOS  
  tagsIncluidos?: string[];          // Para alcance TAGS
}

export interface Promocion extends CrearPromocion {
  id: number;
  deleted?: boolean;
  fechaCreacion?: string;
  fechaModificacion?: string;
  // Campos adicionales que pueden venir del backend
  promoDetalles?: any[];
  imagenes?: any[];
}

export interface PromocionCalculada {
  articuloId: number;
  promociones: Promocion[];
  mejorPromocion?: Promocion;
  precioOriginal: number;
  precioConDescuento: number;
  ahorroTotal: number;
}

// 🎯 FUNCIONES DE API ACTUALIZADAS

/**
 * 📋 Obtener todas las promociones
 */
export async function obtenerTodasPromociones(): Promise<Promocion[]> {
  console.log('📡 API Call: GET /promocion/listar');
  
  try {
    const response = await apiClient.get('/promocion/listar');
    console.log('✅ Todas las promociones obtenidas:', response.data?.length || 0);
    
    // Filtrar las promociones eliminadas en el frontend como respaldo
    const promocionesActivas = (response.data || []).filter((promo: Promocion) => !promo.deleted);
    console.log('✅ Promociones activas filtradas:', promocionesActivas.length);
    
    return promocionesActivas;
  } catch (error) {
    console.error('❌ Error obteniendo promociones:', error);
    return [];
  }
}

/**
 * 📋 Obtener promociones activas
 */
export async function getPromocionesActivas(): Promise<Promocion[]> {
  console.log('📡 API Call: GET /promocion/activas');
  
  try {
    const response = await apiClient.get('/promocion/activas');
    console.log('✅ Promociones activas obtenidas:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo promociones activas:', error);
    throw new Error('No se pudieron cargar las promociones activas');
  }
}

/**
 * 🎯 Obtener promociones para un artículo específico
 */
export async function getPromocionesArticulo(articuloId: number): Promise<Promocion[]> {
  console.log('📡 API Call: GET /promocion/articulo/', articuloId);
  
  try {
    const response = await apiClient.get(`/promocion/articulo/${articuloId}`);
    console.log('✅ Promociones del artículo obtenidas:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo promociones del artículo:', error);
    throw new Error('No se pudieron cargar las promociones del artículo');
  }
}

/**
 * 📂 Obtener promociones para una categoría
 */
export async function getPromocionesCategoria(categoriaId: number): Promise<Promocion[]> {
  console.log('📡 API Call: GET /promocion/categoria/', categoriaId);
  
  try {
    const response = await apiClient.get(`/promocion/categoria/${categoriaId}`);
    console.log('✅ Promociones de la categoría obtenidas:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo promociones de la categoría:', error);
    throw new Error('No se pudieron cargar las promociones de la categoría');
  }
}

/**
 * 🧮 Calcular mejor promoción para un artículo
 */
export async function calcularMejorPromocion(articuloId: number): Promise<PromocionCalculada> {
  console.log('📡 API Call: GET /promocion/calcular/', articuloId);
  
  try {
    const response = await apiClient.get(`/promocion/calcular/${articuloId}`);
    console.log('✅ Cálculo de promoción obtenido:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error calculando mejor promoción:', error);
    throw new Error('No se pudo calcular la mejor promoción');
  }
}

/**
 * 🏷️ Obtener tags disponibles
 */
export async function getTagsDisponibles(): Promise<string[]> {
  console.log('📡 API Call: GET /promocion/tags');
  
  try {
    const response = await apiClient.get('/promocion/tags');
    console.log('✅ Tags disponibles obtenidos:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Error obteniendo tags:', error);
    return ['vegetariano', 'vegano', 'sin-gluten', 'picante', 'dulce']; // Fallback
  }
}

/**
 * ✅ Crear nueva promoción - ARREGLADO PARA USAR ENDPOINT CREAR
 */
export async function crearPromocion(promocion: CrearPromocion): Promise<Promocion> {
  console.log('📡 API Call: POST /promocion/crear');
  console.log('📤 Datos de promoción:', promocion);
  
  try {
    // Validar datos antes de enviar
    validarDatosPromocion(promocion);
    
    // 🔥 USAR ENDPOINT /crear COMO EN TU BACKEND
    const response = await apiClient.post('/promocion/crear', promocion);
    console.log('✅ Promoción creada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creando promoción:', error);
    throw new Error('No se pudo crear la promoción');
  }
}

/**
 * ✏️ Actualizar promoción existente - ARREGLADO PARA USAR ID EN URL
 */
export async function actualizarPromocion(id: number, promocion: Promocion): Promise<Promocion> {
  console.log('📡 API Call: PUT /promocion/actualizar/' + id);
  console.log('📤 Datos actualizados:', promocion);
  
  try {
    validarDatosPromocion(promocion);
    
    // 🔥 USAR ID EN LA URL COMO ESPERA TU BACKEND
    const response = await apiClient.put(`/promocion/actualizar/${id}`, promocion);
    console.log('✅ Promoción actualizada:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error actualizando promoción:', error);
    throw new Error('No se pudo actualizar la promoción');
  }
}

/**
 * ❌ Eliminar promoción
 */
export async function eliminarPromocion(id: number): Promise<void> {
  console.log('📡 API Call: DELETE /promocion/', id);
  
  try {
    // El endpoint /eliminar/ no existe, usar el endpoint simple
    await apiClient.delete(`/promocion/${id}`);
    console.log('✅ Promoción eliminada:', id);
  } catch (error) {
    console.error('❌ Error eliminando promoción:', error);
    throw new Error('No se pudo eliminar la promoción');
  }
}

// 🔥 GESTIÓN DE RELACIONES

/**
 * 📂 Agregar categoría a promoción
 */
export async function agregarCategoriaAPromocion(promoId: number, catId: number): Promise<void> {
  console.log('📡 API Call: POST /promocion/' + promoId + '/categoria/' + catId);
  
  try {
    await apiClient.post(`/promocion/${promoId}/categoria/${catId}`);
    console.log('✅ Categoría agregada a promoción');
  } catch (error) {
    console.error('❌ Error agregando categoría:', error);
    throw new Error('No se pudo agregar la categoría a la promoción');
  }
}

/**
 * 🎯 Agregar artículo a promoción
 */
export async function agregarArticuloAPromocion(promoId: number, artId: number): Promise<void> {
  console.log('📡 API Call: POST /promocion/' + promoId + '/articulo/' + artId);
  
  try {
    await apiClient.post(`/promocion/${promoId}/articulo/${artId}`);
    console.log('✅ Artículo agregado a promoción');
  } catch (error) {
    console.error('❌ Error agregando artículo:', error);
    throw new Error('No se pudo agregar el artículo a la promoción');
  }
}

/**
 * 🏷️ Agregar tag a promoción
 */
export async function agregarTagAPromocion(promoId: number, tag: string): Promise<void> {
  console.log('📡 API Call: POST /promocion/' + promoId + '/tag');
  
  try {
    await apiClient.post(`/promocion/${promoId}/tag`, { tag });
    console.log('✅ Tag agregado a promoción');
  } catch (error) {
    console.error('❌ Error agregando tag:', error);
    throw new Error('No se pudo agregar el tag a la promoción');
  }
}

// 🎯 FUNCIONES DE VALIDACIÓN Y UTILIDADES

/**
 * ✅ Validar datos de promoción antes de enviar
 */
function validarDatosPromocion(promocion: Partial<CrearPromocion>): void {
  if (!promocion.denominacion?.trim()) {
    throw new Error('El nombre de la promoción es requerido');
  }
  
  if (!promocion.fechaDesde) {
    throw new Error('La fecha de inicio es requerida');
  }
  
  if (!promocion.fechaHasta) {
    throw new Error('La fecha de fin es requerida');
  }
  
  const fechaInicio = new Date(promocion.fechaDesde);
  const fechaFin = new Date(promocion.fechaHasta);
  
  if (fechaInicio >= fechaFin) {
    throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
  }
  
  if (promocion.tipoPromocion === 'HAPPYHOUR') {
    if (!promocion.horaDesde || !promocion.horaHasta) {
      throw new Error('Happy Hour requiere hora de inicio y fin');
    }
    
    if (promocion.horaDesde >= promocion.horaHasta) {
      throw new Error('La hora de inicio debe ser anterior a la hora de fin');
    }
  }
  
  if (!promocion.descuentoPorcentaje && !promocion.precioPromocional) {
    throw new Error('Debe especificar un descuento porcentual o precio promocional');
  }
  
  if (promocion.descuentoPorcentaje && (promocion.descuentoPorcentaje <= 0 || promocion.descuentoPorcentaje > 100)) {
    throw new Error('El descuento porcentual debe estar entre 1% y 100%');
  }
  
  if (promocion.alcance === 'CATEGORIAS' && (!promocion.categoriasIncluidas || promocion.categoriasIncluidas.length === 0)) {
    throw new Error('Debe seleccionar al menos una categoría');
  }
  
  if (promocion.alcance === 'PRODUCTOS' && (!promocion.articulosIncluidos || promocion.articulosIncluidos.length === 0)) {
    throw new Error('Debe seleccionar al menos un producto');
  }
  
  if (promocion.alcance === 'TAGS' && (!promocion.tagsIncluidos || promocion.tagsIncluidos.length === 0)) {
    throw new Error('Debe especificar al menos un tag');
  }
}

/**
 * 📊 Obtener estadísticas de promociones
 */
// 🔥 FUNCIONES COMPATIBLES CON EL PROMOTIONMODAL

/**
 * 📋 Obtener todas las promociones - Compatible con PromotionModal
 */
export async function getPromotions(): Promise<Promocion[]> {
  return await obtenerTodasPromociones();
}

/**
 * ✅ Crear promoción - Compatible con PromotionModal
 */
export async function createPromotion(promocion: CrearPromocion): Promise<Promocion> {
  return await crearPromocion(promocion);
}

/**
 * ✏️ Actualizar promoción - Compatible con PromotionModal
 */
export async function updatePromotion(id: number, promocion: Promocion): Promise<Promocion> {
  return await actualizarPromocion(id, promocion);
}

/**
 * 📊 Obtener estadísticas de promociones
 */
export async function getEstadisticasPromociones(): Promise<{
  total: number;
  activas: number;
  programadas: number;
  expiradas: number;
  porTipo: Record<string, number>;
  porAlcance: Record<string, number>;
}> {
  console.log('📊 Calculando estadísticas de promociones...');
  
  try {
    const promociones = await getPromocionesActivas();
    const ahora = new Date();
    
    const stats = {
      total: promociones.length,
      activas: 0,
      programadas: 0,
      expiradas: 0,
      porTipo: {} as Record<string, number>,
      porAlcance: {} as Record<string, number>
    };
    
    promociones.forEach(promo => {
      const fechaInicio = new Date(promo.fechaDesde);
      const fechaFin = new Date(promo.fechaHasta);
      
      // Contar por estado
      if (ahora < fechaInicio) {
        stats.programadas++;
      } else if (ahora > fechaFin) {
        stats.expiradas++;
      } else if (promo.activa) {
        stats.activas++;
      }
      
      // Contar por tipo
      stats.porTipo[promo.tipoPromocion] = (stats.porTipo[promo.tipoPromocion] || 0) + 1;
      
      // Contar por alcance
      stats.porAlcance[promo.alcance] = (stats.porAlcance[promo.alcance] || 0) + 1;
    });
    
    console.log('📊 Estadísticas calculadas:', stats);
    return stats;
    
  } catch (error) {
    console.error('❌ Error calculando estadísticas:', error);
    return {
      total: 0,
      activas: 0,
      programadas: 0,
      expiradas: 0,
      porTipo: {},
      porAlcance: {}
    };
  }
}