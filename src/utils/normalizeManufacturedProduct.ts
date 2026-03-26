import { MenuItem, ProductDetail } from '../types/menuItem';
import { Supply } from '../types/supply';

/**
 * Normaliza un producto manufacturado a la estructura MenuItem
 * Función mejorada para manejar diferentes formatos de respuestas de la API
 * @param product El producto a normalizar
 * @returns El producto normalizado como MenuItem
 */
export const normalizeManufacturedProduct = (product: any): MenuItem => {
  // Función para estandarizar la estructura de los productos manufacturados basado en
  // la estructura real observada en el endpoint /articulosManufacturados
  console.log('🔄 Normalizando datos de producto:', product ? product.denominacion : 'Producto no definido');
  
  // Asegurar que product sea un objeto no nulo
  if (!product) {
    product = {};
    console.warn('⚠️ El producto recibido es nulo o indefinido');
  }

  // Asegúrate de que categoría siempre tenga una estructura válida
  // La estructura de categoría puede venir en diferentes formatos según el endpoint
  let categoria = null;
  let categoriaId = null;
  
  // Caso 1: El producto tiene un campo 'categoria' con la estructura completa
  if (product.categoria) {
    categoria = product.categoria;
    categoriaId = categoria.id;
    console.log(`✅ Caso 1: Producto tiene objeto 'categoria' con ID ${categoria.id}`);
  } 
  // Caso 2: El producto tiene categoriaId como string/number y no tiene categoria
  else if (product.categoriaId) {
    categoriaId = product.categoriaId;
    console.log(`✅ Caso 2: Producto tiene 'categoriaId' ${categoriaId}`);
  } 
  // Caso 3: El producto tiene el campo idCategoria (algunas respuestas de API)
  else if (product.idCategoria) {
    categoriaId = product.idCategoria;
    console.log(`✅ Caso 3: Producto tiene 'idCategoria' ${categoriaId}`);
  }
  // Caso 4: El producto tiene campo 'category' en inglés (convención antigua)
  else if (typeof product.category === 'object' && product.category?.id) {
    categoria = product.category;
    categoriaId = categoria.id;
    console.log(`✅ Caso 4: Producto tiene objeto 'category' con ID ${categoriaId}`);
  }
  
  // Si no se encontró ningún categoriaId, usar 0 como valor por defecto
  if (categoriaId === null) {
    categoriaId = '0';
    console.warn('⚠️ No se encontró información de categoría en el producto, usando ID 0');
  }
  
  // Asegurar que categoriaId sea string para MenuItem
  categoriaId = String(categoriaId);
  
  // Construir objeto de categoría completo si falta
  if (!categoria) {
    categoria = { 
      id: categoriaId,
      denominacion: 'Sin categoría',
      deleted: false 
    };
    console.warn(`⚠️ Creando objeto de categoría predeterminado con ID ${categoriaId}`);
  }
  
  // Debug para encontrar problemas con las categorías
  if (product.id) {
    console.log(`📝 Producto ${product.id} (${product.denominacion || 'sin nombre'}):`);
    console.log(`   - Categoría: ${categoria.denominacion || 'Sin nombre'} (ID: ${categoria.id})`);
  }

  // Normalizar los detalles antes de devolverlos
  let detalles = [];
  try {
    // Manejar diferentes formatos de detalles del backend (múltiples propiedades posibles)
    // Primero verificar estructuras anidadas
    if (Array.isArray(product.detalles?.detalles)) {
      detalles = product.detalles.detalles;
      console.log(`✅ Usando ${detalles.length} detalles de 'product.detalles.detalles'`);
    } else if (Array.isArray(product.detalles)) {
      detalles = product.detalles;
      console.log(`✅ Usando ${detalles.length} detalles de 'product.detalles'`);
    } else if (Array.isArray(product.articuloManufacturadoDetalleList)) {
      detalles = product.articuloManufacturadoDetalleList;
      console.log(`✅ Usando ${detalles.length} detalles de 'product.articuloManufacturadoDetalleList'`);
    } else if (Array.isArray(product.articuloManufacturadoDetalles)) {
      detalles = product.articuloManufacturadoDetalles;
      console.log(`✅ Usando ${detalles.length} detalles de 'product.articuloManufacturadoDetalles'`);
    } else {
      console.warn('⚠️ No se encontraron detalles en ninguna propiedad conocida');
      detalles = [];
    }
    
    // Mapear los detalles para normalizarlos
    detalles = detalles.map((detalle: any): ProductDetail => {
      // Impresión de depuración para ver estructura exacta del detalle
      console.log('🔍 Estructura del detalle:', JSON.stringify(detalle, null, 2));
      
      // Manejar diferentes estructuras de insumo del backend
      let insumo = null;
      
      // Intentar diferentes estructuras de objetos que pueden contener el insumo
      // Según los controladores compartidos (ArticuloManufacturadoController y ArticuloManufacturadoDetalleController)
      if (detalle.item && detalle.item.id) {
        // ESTRUCTURA NUEVA del mapper corregido - prioridad alta
        insumo = detalle.item;
        console.log('✅ Insumo encontrado en detalle.item (estructura nueva)');
      } else if (detalle.articuloInsumo && detalle.articuloInsumo.id) {
        // Formato con articuloInsumo completo
        insumo = detalle.articuloInsumo;
        console.log('✅ Insumo encontrado en articuloInsumo estructurado');
      } else if (detalle.insumo) {
        insumo = detalle.insumo;
        console.log('✅ Insumo encontrado en insumo');
      } else if (detalle.articulo) {
        insumo = detalle.articulo;
        console.log('✅ Insumo encontrado en articulo');
      } else if (detalle.articuloInsumo) {
        insumo = detalle.articuloInsumo;
        console.log('✅ Insumo encontrado en articuloInsumo');
      } else {
        // Si no hay insumo en ninguna propiedad conocida, pero tenemos un ID, crear un objeto insumo
        if (detalle.id) {
          insumo = {
            id: detalle.id,
            denominacion: detalle.denominacion || `Insumo ${detalle.id}`,
            stockActual: detalle.stockActual || 0,
            precioCompra: detalle.precioCompra || 0,
            // Agregar unidad de medida por defecto
            unidadMedida: {
              id: 1,
              denominacion: "Unidad",
              abreviatura: "U"
            }
          };
          console.log(`⚠️ Creando insumo a partir del ID del detalle: ${detalle.id}`);
          
          // Intentar obtener información adicional del insumo de forma asincrónica
          // Esto no bloqueará la función principal pero podría ayudar en una carga futura
          setTimeout(() => {
            fetch(`/api-proxy/articuloInsumo/${detalle.id}`)
              .then(response => response.ok ? response.json() : null)
              .then(data => {
                if (data) {
                  console.log(`✅ Datos adicionales encontrados para insumo ${detalle.id}`);
                }
              })
              .catch(() => {
                // Ignoramos errores, esto es solo una mejora opcional
              });
          }, 0);
        } else {
          // Último recurso: usar el propio detalle sin adaptarlo
          insumo = detalle;
          console.log('⚠️ Usando detalle como insumo por falta de estructura esperada');
        }
      }
      
      if (!insumo) {
        insumo = {};
        console.error('❌ No se pudo identificar el insumo en el detalle');
      }
      
      // Depuración para el insumo encontrado
      console.log(`🔍 Insumo identificado: ID=${insumo.id || 'no definido'}, Nombre=${insumo.denominacion || 'no definido'}`);
      
      if (!insumo.id) {
        console.warn('⚠️ Detalle con insumo sin ID:', detalle);
      }

      // Normalizar la unidad de medida (puede ser string, objeto o estar en diferentes propiedades)
      let unidadMedida;
      
      if (typeof insumo.unidadMedida === 'object' && insumo.unidadMedida !== null) {
        unidadMedida = insumo.unidadMedida;
        console.log('✅ Unidad de medida encontrada como objeto:', unidadMedida.denominacion);
      } else if (insumo.unidadDeMedida && typeof insumo.unidadDeMedida === 'object') {
        unidadMedida = insumo.unidadDeMedida;
        console.log('✅ Unidad de medida encontrada en unidadDeMedida:', unidadMedida.denominacion);
      } else if (typeof insumo.unidadMedida === 'string') {
        unidadMedida = { id: 1, denominacion: insumo.unidadMedida };
        console.log('✅ Unidad de medida encontrada como string:', insumo.unidadMedida);
      } else if (typeof insumo.unidadMedidaNombre === 'string') {
        unidadMedida = { id: insumo.unidadMedidaId || 1, denominacion: insumo.unidadMedidaNombre };
        console.log('✅ Unidad de medida encontrada en unidadMedidaNombre:', insumo.unidadMedidaNombre);
      } else if (typeof detalle.tipo === 'string' && detalle.item?.unidadMedida) {
        // Estructura desde ArticuloManufacturadoDetalleController - nueva versión que incluye abreviatura
        if (typeof detalle.item.unidadMedida === 'object' && detalle.item.unidadMedida !== null) {
          unidadMedida = {
            id: detalle.item.unidadMedida.id || 1,
            denominacion: detalle.item.unidadMedida.denominacion || 'Unidad',
            abreviatura: detalle.item.unidadMedida.abreviatura || ''
          };
        } else {
          unidadMedida = typeof detalle.item.unidadMedida === 'string' 
            ? { id: 1, denominacion: detalle.item.unidadMedida, abreviatura: '' } 
            : detalle.item.unidadMedida;
        }
        console.log('✅ Unidad de medida encontrada en detalle.item.unidadMedida:', 
          typeof unidadMedida === 'object' ? unidadMedida.denominacion : unidadMedida);
      } else {
        // Valor por defecto
        unidadMedida = { id: 1, denominacion: 'Unidad', abreviatura: 'U' };
        console.warn('⚠️ Unidad de medida no encontrada, usando valor por defecto');
      }
        
      // Normalizar la categoría del insumo (puede estar en diferentes propiedades)
      let insumoCategoria;
      
      if (insumo.categoria && typeof insumo.categoria === 'object') {
        insumoCategoria = insumo.categoria;
        console.log('✅ Categoría encontrada en insumo.categoria:', insumoCategoria.denominacion);
      } else if (insumo.category && typeof insumo.category === 'object') {
        insumoCategoria = {
          id: insumo.category.id,
          denominacion: insumo.category.denominacion || insumo.category.name || 'Sin nombre',
          esInsumo: true
        };
        console.log('✅ Categoría encontrada en insumo.category:', insumoCategoria.denominacion);
      } else {
        // Valor por defecto
        insumoCategoria = {
          id: 0,
          denominacion: 'Sin categoría',
          esInsumo: true,
        };
        console.warn('⚠️ Categoría no encontrada, usando valor por defecto');
      }
      
      if (typeof insumoCategoria.id === 'string') {
        insumoCategoria.id = Number(insumoCategoria.id);
      }

      // Asegurar que tengamos todos los campos del insumo correctamente mapeados
      const supplyItem: Supply = {
        id: insumo.id || 0,
        denominacion: insumo.denominacion || insumo.nombre || insumo.name || 'Insumo sin nombre',
        categoria: insumoCategoria,
        unidadMedida: unidadMedida,
        precioVenta: insumo.precioVenta || insumo.precio || insumo.price || 0,
        precioCompra: insumo.precioCompra || insumo.costo || insumo.cost || 0,
        stockActual: insumo.stockActual || insumo.stock || 0,
        stockMinimo: insumo.stockMinimo || insumo.stockMin || 0,
        stockMaximo: insumo.stockMaximo || insumo.stockMax || 0,
        esParaElaborar: insumo.esParaElaborar !== undefined ? insumo.esParaElaborar : true,
        deleted: insumo.deleted !== undefined ? insumo.deleted : false
      };
      
      console.log(`✅ Insumo normalizado: ${supplyItem.denominacion} (${supplyItem.id})`);
      console.log(`   - Unidad: ${typeof supplyItem.unidadMedida === 'object' ? supplyItem.unidadMedida.denominacion : supplyItem.unidadMedida}`);
      console.log(`   - Categoría: ${supplyItem.categoria ? supplyItem.categoria.denominacion : 'Sin categoría'}`);

      return {
        tipo: 'INSUMO',
        cantidad: detalle.cantidad || 0,
        item: supplyItem,
      };
    });
    
    console.log(`✅ Normalizados ${detalles.length} detalles/ingredientes`);
  } catch (error) {
    console.error('❌ Error al normalizar detalles:', error);
    detalles = [];
  }

  // Normalizar imágenes
  let imagenes = [];
  try {
    if (Array.isArray(product.imagenes)) {
      imagenes = product.imagenes;
      console.log(`✅ Encontradas ${imagenes.length} imágenes en 'product.imagenes'`);
    } else if (Array.isArray(product.images)) {
      imagenes = product.images;
      console.log(`✅ Encontradas ${imagenes.length} imágenes en 'product.images'`);
    } else if (typeof product.imagen === 'string') {
      imagenes = [product.imagen];
      console.log("✅ Encontrada 1 imagen en 'product.imagen'");
    } else {
      console.warn('⚠️ No se encontraron imágenes');
      imagenes = [];
    }
  } catch (error) {
    console.error('❌ Error al procesar imágenes:', error);
    imagenes = [];
  }

  // Construir el objeto MenuItem normalizado
  const normalizedItem: MenuItem = {
    // Campos obligatorios con valores por defecto
    id: product.id?.toString() || '0',
    denominacion: product.denominacion || 'Producto sin nombre',
    descripcion: product.descripcion || '',
    precioVenta: typeof product.precioVenta === 'number' ? product.precioVenta : 0,
    tiempoEstimadoMinutos: typeof product.tiempoEstimadoMinutos === 'number' ? product.tiempoEstimadoMinutos : 0,
    preparacion: product.preparacion || '',
    
    // Normalizar categoría para que cumpla con la estructura del tipo MenuItem
    // MenuItem.categoria.id debe ser string, aunque en el backend es número
    categoriaId: categoriaId.toString(),
    categoria: {
      id: String(categoria.id || categoriaId),
      denominacion: categoria.denominacion || 'Sin categoría',
      deleted: categoria.deleted === undefined ? false : categoria.deleted
    },
    
    // Depuración detallada de categoría
    ...(()=>{
      if (categoria.id) {
        console.log(`✅ Categoría normalizada exitosamente:
          - ID: ${String(categoria.id || categoriaId)}
          - Nombre: ${categoria.denominacion || 'Sin categoría'}
          - Original: ${JSON.stringify(product.categoria || {})}
        `);
      } else {
        console.warn('⚠️ Categoría indefinida normalizada como "Sin categoría" con ID 0');
      }
      return {};
    })(),
    
    // Asegurar que imagenes siempre existe como array
    imagenes: imagenes,
    
    // Asegurar que type siempre existe
    type: product.type || 'MANUFACTURADO',
    
    // Usar los detalles normalizados
    detalles: detalles,
    
    // Legacy fields para compatibilidad
    name: product.name || product.denominacion || 'Producto sin nombre',
    price: product.price || product.precioVenta || 0,
    category: product.category || (categoria.denominacion || 'Sin categoría'),
    preparationTime: product.preparationTime || product.tiempoEstimadoMinutos || 0,
    availability: product.availability !== undefined ? product.availability : true,
    status: product.status || 'active',
  };
  
  console.log('✅ Producto normalizado correctamente:', normalizedItem.denominacion);
  
  return normalizedItem;
}
