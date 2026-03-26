// src/api/products.ts - API cliente para interactuar con productos manufacturados

import apiClient from './apiClient';
import { MenuItem } from '../types/menuItem';
import { normalizeManufacturedProduct } from '../utils/normalizeManufacturedProduct';

export const fetchAllProducts = async (forceRefresh: boolean = false): Promise<MenuItem[]> => {
  console.log('🍔 Intentando cargar productos manufacturados...');
  
  try {
    // Usar el endpoint correcto del controlador: /articulosManufacturados/listarTodos
    const url = forceRefresh 
      ? `/articulosManufacturados/listarTodos?_t=${Date.now()}`
      : '/articulosManufacturados/listarTodos';
    
    console.log(`📡 Obteniendo productos desde ${url}...`);
    const response = await apiClient.get(url);
    
    if (response.data && Array.isArray(response.data)) {
      console.log(`✅ Se obtuvieron ${response.data.length} productos manufacturados`);
      
      // Los productos vienen como ArticuloManufacturadoDTO, normalizarlos
      const productos = response.data.map((product: any) => normalizeManufacturedProduct(product));
      
      const productosConCategoria = productos.filter((p: MenuItem) => p.categoria && p.categoria.id);
      const productosConDetalles = productos.filter((p: MenuItem) => p.detalles && p.detalles.length > 0);
      
      console.log(`📊 Estadísticas de productos cargados:
        - Total: ${productos.length}
        - Con categoría: ${productosConCategoria.length}
        - Con detalles: ${productosConDetalles.length}
      `);
      
      return productos;
    }
    
    console.warn('⚠️ La respuesta no contiene un array de productos');
    return [];
    
  } catch (error: any) {
    console.error('❌ Error al cargar productos:', error.message);
    
    // Como fallback, intentar con el endpoint de ArticuloManufacturadoDetalleController
    try {
      console.log('🔄 Intentando endpoint alternativo: /articuloManufacturadoDetalle/todos');
      const response = await apiClient.get('/articuloManufacturadoDetalle/todos');
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Se obtuvieron ${response.data.length} productos desde endpoint alternativo`);
        const productos = response.data.map((product: any) => normalizeManufacturedProduct(product));
        return productos;
      }
    } catch (fallbackError: any) {
      console.error('❌ Error con endpoint alternativo:', fallbackError.message);
    }
    
    return [];
  }
};

/**
 * Obtiene un producto manufacturado por su ID usando el endpoint correcto
 */
export const fetchProductById = async (id: number | string): Promise<MenuItem | null> => {
  console.log(`🔍 Obteniendo producto por ID: ${id}`);
  
  try {
    // PRIMERO: Intentar endpoint individual directo
    console.log(`🎯 Intentando endpoint individual: /articulosManufacturados/obtener/${id}`);
    const response = await apiClient.get(`/articulosManufacturados/obtener/${id}`);
    
    if (response.data) {
      console.log(`📊 Respuesta del endpoint individual:`, JSON.stringify(response.data, null, 2));
      
      // DIAGNÓSTICO ESPECÍFICO DEL MAPPER
      console.log('🔍 DIAGNÓSTICO MAPPER COMPLETO:');
      console.log('   - Detalles directos:', response.data.detalles);
      console.log('   - ArticuloManufacturadoDetalles:', response.data.articuloManufacturadoDetalles);
      console.log('   - Details:', response.data.details);
      console.log('   - Ingredientes:', response.data.ingredientes);
      console.log('   - Raw keys:', Object.keys(response.data));
      console.log('   - Raw JSON completo:', JSON.stringify(response.data, null, 2));
      
      const product = normalizeManufacturedProduct(response.data);
      const detallesCount = product.detalles?.length || 0;
      
      if (detallesCount > 0) {
        console.log(`✅ Endpoint individual devolvió producto con ${detallesCount} detalles`);
        return product;
      } else {
        console.warn(`⚠️ Endpoint individual devolvió producto SIN detalles - usando fallback`);
      }
    }

    // FALLBACK: Usar listarTodos y filtrar
    console.log(`🔄 Usando listado completo como fallback para obtener producto ${id} con detalles`);
    const allProducts = await fetchAllProducts();
    const product = allProducts.find(p => p.id === id.toString() || p.id === id);
    
    if (product) {
      console.log(`✅ Producto encontrado en listado: ${product.name} con ${product.detalles?.length || 0} detalles`);
      return product;
    }
    
    console.warn(`⚠️ No se encontraron datos para el producto ${id} en ningún endpoint`);
    return null;
    
  } catch (error: any) {
    console.error(`❌ Error al obtener producto ${id}:`, error.message);
    
    // Fallback en caso de error
    try {
      console.log(`🔄 Intentando fallback tras error`);
      const allProducts = await fetchAllProducts();
      const product = allProducts.find(p => p.id === id.toString() || p.id === id);
      
      if (product) {
        console.log(`✅ Producto recuperado en fallback con ${product.detalles?.length || 0} detalles`);
        return product;
      }
    } catch (fallbackError) {
      console.error(`❌ Error en fallback:`, fallbackError);
    }
    
    return null;
  }
};

/**
 * Crea un nuevo producto manufacturado
 */
export const createProduct = async (productData: Partial<MenuItem>): Promise<MenuItem> => {
  // Preparar payload completo para el backend con la estructura exacta observada
  const payload = {
    // Campos básicos del producto
    type: "MANUFACTURADO",
    deleted: false,
    denominacion: productData.denominacion,
    descripcion: productData.descripcion,
    tiempoEstimadoMinutos: productData.tiempoEstimadoMinutos,
    preparacion: productData.preparacion || '',
    precioVenta: productData.precioVenta,
    
    // Campos adicionales observados en la respuesta
    tiempoPreparacion: 0,
    valorAgregado: null,
    
    // Categoría en el formato esperado según la respuesta
    // Importante: la API requiere que el ID de la categoría sea un número
    categoria: (() => {
      console.log('🔍 Procesando categoría para creación...');
      
      if (productData.categoria && productData.categoria.id) {
        // Obtener el ID como número (más seguro)
        const idAsNumber = Number(productData.categoria.id);
        
        if (isNaN(idAsNumber) || idAsNumber <= 0) {
          console.warn('⚠️ ID de categoría no válido:', productData.categoria.id);
          return { id: 0, denominacion: "Sin categoría", deleted: false };
        }
        
        console.log(`✅ Usando categoría: ${productData.categoria.denominacion} (ID: ${idAsNumber})`);
        return {
          id: idAsNumber,
          denominacion: productData.categoria.denominacion || '',
          deleted: false
        };
      } 
      // Alternativa: usar categoriaId si está disponible
      else if (productData.categoriaId) {
        const idAsNumber = Number(productData.categoriaId);
        
        if (isNaN(idAsNumber) || idAsNumber <= 0) {
          console.warn('⚠️ categoriaId no válido:', productData.categoriaId);
          return { id: 0, denominacion: "Sin categoría", deleted: false };
        }
        
        console.log(`✅ Usando categoriaId: ${idAsNumber}`);
        return {
          id: idAsNumber,
          denominacion: "Categoría", // Nombre genérico, se actualizará desde el backend
          deleted: false
        };
      }
      
      console.warn('⚠️ No se encontró información de categoría');
      return { id: 0, denominacion: "Sin categoría", deleted: false };
    })(),
    
    // Detalles/ingredientes según la estructura observada
    detalles: (productData.detalles || [])
      .filter(detalle => detalle.item)
      .map((detalle) => {
        // Extraer la unidad de medida del insumo, garantizando la estructura correcta
        const unidadMedida = (detalle.item as any).unidadMedida;
        const unidadMedidaObj = typeof unidadMedida === 'object' 
          ? { 
              id: unidadMedida.id || 1,
              deleted: unidadMedida.deleted || false,
              denominacion: unidadMedida.denominacion || 'Gramos'
            }
          : { id: 1, deleted: false, denominacion: unidadMedida || 'Gramos' };
          
        return {
          cantidad: Number(detalle.cantidad),
          deleted: false,
          articuloInsumo: { 
            id: Number((detalle.item as any).id),
            type: "INSUMO",
            deleted: false, // cambiado de null a false para consistencia
            denominacion: (detalle.item as any).denominacion || "",
            stockActual: (detalle.item as any).stockActual || 0,
            precioCompra: (detalle.item as any).precioCompra || 0,
            esParaElaborar: (detalle.item as any).esParaElaborar === undefined ? true : (detalle.item as any).esParaElaborar,
            unidadMedida: unidadMedidaObj
          }
        };
      }),
    
    // Incluir ambos formatos para máxima compatibilidad
    articuloManufacturadoDetalleList: (productData.detalles || [])
      .filter(detalle => detalle.item)
      .map((detalle) => ({
        cantidad: Number(detalle.cantidad),
        deleted: false,
        articuloInsumo: { 
          id: Number((detalle.item as any).id),
          denominacion: (detalle.item as any).denominacion || "",
          stockActual: (detalle.item as any).stockActual || 0,
          // Incluir unidadMedida para prevenir errores de validación
          unidadMedida: typeof (detalle.item as any).unidadMedida === 'object' 
            ? (detalle.item as any).unidadMedida 
            : { id: 1, deleted: false, denominacion: (detalle.item as any).unidadMedida || 'Gramos' }
        }
      }))
  };
  
  console.log('Payload para crear producto:', JSON.stringify(payload, null, 2));
  
  // Lista de posibles endpoints para crear productos según el controlador compartido
  const endpoints = [
    '/articulosManufacturados/alta',
    '/articulosManufacturados/guardarOActualizar',
    '/articuloManufacturado/crear',
    '/articulosManufacturados'
  ];
  
  // Intentar cada endpoint
  for (const endpoint of endpoints) {
    try {
      console.log(`Intentando crear producto con POST a ${endpoint}`);
      const response = await apiClient.post(endpoint, payload);
      console.log('✅ Creación exitosa con endpoint ' + endpoint);
      
      // Esperar un momento para que el servidor procese la operación
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Intentar obtener el producto recién creado
      if (response.data && response.data.id) {
        const createdProductId = response.data.id;
        try {
          const createdProduct = await fetchProductById(createdProductId);
          if (createdProduct) {
            console.log('Producto creado recuperado correctamente');
            console.log('Categoría:', createdProduct.categoria);
            console.log('Detalles:', createdProduct.detalles?.length || 0);
            
            // Verificar si se creó todo correctamente
            const categoriaCreada = createdProduct.categoria && 
                                    String(createdProduct.categoria.id) === 
                                    String(productData.categoria?.id || productData.categoriaId);
            const detallesCreados = (createdProduct.detalles?.length || 0) === (productData.detalles?.length || 0);
            
            if (!categoriaCreada || !detallesCreados) {
              console.log('⚠️ Creación parcial. Intentando actualizar datos pendientes...');
              
              // Intentar una actualización inmediata con el mismo payload
              try {
                await apiClient.put(`/articuloManufacturado/modificar/${createdProductId}`, {
                  ...payload,
                  id: createdProductId
                });
                
                console.log('✅ Actualización post-creación completada');
                
                // Obtener el producto actualizado
                const updatedProduct = await fetchProductById(createdProductId);
                if (updatedProduct) {
                  return updatedProduct;
                }
              } catch (updateError) {
                console.warn('Error actualizando el producto recién creado:', updateError);
              }
            }
            
            return createdProduct;
          }
        } catch (fetchError) {
          console.warn('Error obteniendo el producto recién creado:', fetchError);
        }
      }
      
      return normalizeManufacturedProduct(response.data);
    } catch (error: any) {
      console.warn(`❌ Error al crear con ${endpoint}: ${error.message}`);
    }
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw new Error('No se pudo crear el producto. Por favor, intente nuevamente.');
};

/**
 * Actualiza específicamente la categoría de un producto
 * Función dedicada para resolver problemas de asociación de categorías
 */
export const updateProductCategory = async (productId: number | string, categoryId: number): Promise<boolean> => {
  const numericId = Number(productId);
  const numericCategoryId = Number(categoryId);
  
  console.log(`🏷️ Actualizando categoría del producto ${numericId} a categoría ${numericCategoryId}`);
  
  // Lista de endpoints específicos para actualizar categorías
  const endpoints = [
    `/articulosManufacturados/${numericId}/categoria/${numericCategoryId}`,
    `/articuloManufacturado/${numericId}/categoria`,
    `/articulosManufacturados/asignarCategoria`,
    `/articuloManufacturado/modificarCategoria/${numericId}`
  ];
  
  for (const endpoint of endpoints) {
    try {
      if (endpoint.includes('asignarCategoria')) {
        console.log(`🔄 Intentando asignar categoría con POST a ${endpoint}`);
        await apiClient.post(endpoint, {
          articuloId: numericId,
          categoriaId: numericCategoryId
        });
      } else if (endpoint.includes('/categoria/')) {
        console.log(`🔄 Intentando actualizar categoría con PUT a ${endpoint}`);
        await apiClient.put(endpoint, { categoriaId: numericCategoryId });
      } else {
        console.log(`🔄 Intentando actualizar categoría con PUT a ${endpoint}`);
        await apiClient.put(endpoint, {
          id: numericId,
          categoriaId: numericCategoryId
        });
      }
      
      console.log(`✅ Categoría actualizada exitosamente con ${endpoint}`);
      return true;
    } catch (error: any) {
      console.warn(`❌ Error actualizando categoría con ${endpoint}:`, error.message);
    }
  }
  
  console.error(`❌ No se pudo actualizar la categoría del producto ${numericId}`);
  return false;
};

/**
 * Actualiza un producto manufacturado usando el endpoint correcto del backend
 */
export const updateProduct = async (id: number | string, productData: Partial<MenuItem>): Promise<MenuItem> => {
  console.log(`🛠️ updateProduct llamado para el ID ${id}`);
  
  const numericId = Number(id);
  
  // Estructura exacta que funciona según la respuesta del backend
  const payload = {
    id: numericId,
    denominacion: productData.denominacion,
    descripcion: productData.descripcion,
    precioVenta: Number(productData.precioVenta || 0),
    tiempoEstimadoMinutos: Number(productData.tiempoEstimadoMinutos || 0),
    preparacion: productData.preparacion || '',
    
    // Categoría en el formato que espera el backend
    categoria: productData.categoria ? {
      id: Number(productData.categoria.id),
      denominacion: productData.categoria.denominacion,
      esInsumo: false,
      padre: null
    } : null,
    
    categoriaId: Number(productData.categoria?.id || productData.categoriaId || 1),
    unidadMedida: null,
    tiempoPreparacion: Number(productData.tiempoEstimadoMinutos || 0), // Campo requerido por el backend
    
    // ✅ PROCESAR LOS INGREDIENTES/DETALLES CORRECTAMENTE
    detalles: productData.detalles && productData.detalles.length > 0 ? 
      productData.detalles.map(detalle => ({
        tipo: "INSUMO",
        cantidad: Number(detalle.cantidad || 0),
        articuloInsumo: {
          id: Number((detalle.item as any).id),
          denominacion: (detalle.item as any).denominacion
        }
      })) : [],
    
    deleted: false,
    type: "MANUFACTURADO",
    imagenes: productData.imagenes || []
  };
  
  console.log('📤 Enviando payload estructurado según backend:', JSON.stringify(payload, null, 2));
  
  // Verificar específicamente los detalles en el payload
  if (payload.detalles && payload.detalles.length > 0) {
    console.log(`✅ Payload incluye ${payload.detalles.length} ingredientes procesados correctamente`);
  } else {
    console.log('⚠️ Payload no incluye ingredientes (detalles vacío o null)');
  }
  
  try {
    // Usar el endpoint correcto del controlador: /articulosManufacturados/modificar/{id}
    console.log(`🔄 Actualizando producto con PUT a /articulosManufacturados/modificar/${numericId}`);
    const response = await apiClient.put(`/articulosManufacturados/modificar/${numericId}`, payload);
    
    console.log('✅ Actualización exitosa');
    
    // Obtener el producto actualizado para verificar que todo se guardó correctamente
    await new Promise(resolve => setTimeout(resolve, 500));
    const updatedProduct = await fetchProductById(numericId);
    
    if (updatedProduct) {
      console.log(`� Producto actualizado verificado:
        - Categoría: ${updatedProduct.categoria?.denominacion} (ID: ${updatedProduct.categoria?.id})
        - Detalles: ${updatedProduct.detalles?.length || 0}
      `);
      return updatedProduct;
    }
    
    // Si no se puede obtener el producto actualizado, usar la respuesta directa
    return normalizeManufacturedProduct(response.data);
    
  } catch (error: any) {
    console.error('❌ Error al actualizar producto:', error.message);
    
    // Intentar con una estructura aún más simple
    try {
      console.log('🔄 Intentando con estructura ultra-simple');
      const simplePayload = {
        id: numericId,
        denominacion: productData.denominacion,
        descripcion: productData.descripcion,
        tiempoEstimadoMinutos: productData.tiempoEstimadoMinutos,
        preparacion: productData.preparacion || '',
        precioVenta: productData.precioVenta,
        categoriaId: Number(productData.categoria?.id || productData.categoriaId || 1)
      };
      
      const response = await apiClient.put(`/articulosManufacturados/modificar/${numericId}`, simplePayload);
      
      console.log('✅ Actualización exitosa con estructura simple');
      
      const updatedProduct = await fetchProductById(numericId);
      if (updatedProduct) {
        return updatedProduct;
      }
      
      return normalizeManufacturedProduct(response.data);
      
    } catch (simpleError: any) {
      console.error('❌ Error con estructura simple:', simpleError.message);
      
      // Como último recurso, intentar solo actualizar datos básicos
      try {
        console.log('🔄 Intentando solo actualizar datos básicos');
        const basicPayload = {
          id: numericId,
          denominacion: productData.denominacion,
          precioVenta: productData.precioVenta
        };
        
        const response = await apiClient.put(`/articulosManufacturados/modificar/${numericId}`, basicPayload);
        
        console.log('✅ Actualización básica exitosa');
        return normalizeManufacturedProduct(response.data);
        
      } catch (basicError: any) {
        console.error('❌ Error con actualización básica:', basicError.message);
        throw new Error(`No se pudo actualizar el producto: ${error.message}`);
      }
    }
  }
};



/**
 * Elimina un producto manufacturado
 */
export const deleteProduct = async (id: number | string): Promise<void> => {
  // Convertir ID a número para asegurar compatibilidad
  const numericId = Number(id);
  
  // Lista de posibles endpoints y métodos para eliminar según el controlador compartido
  const endpoints = [
    { url: `/articulosManufacturados/baja/${numericId}`, method: 'delete' }, // Endpoint correcto según controlador
    { url: `/articuloManufacturado/baja/${numericId}`, method: 'delete' },
    { url: `/articulosManufacturados/${numericId}`, method: 'delete' },
    { url: `/articuloManufacturado/${numericId}`, method: 'delete' },
    { url: `/articulosManufacturados/guardarOActualizar`, method: 'post' } // Alternativa con actualización lógica
  ];
  
  // Intentar cada combinación de endpoint y método
  for (const endpoint of endpoints) {
    try {
      console.log(`Intentando eliminar producto con ${endpoint.method.toUpperCase()} a ${endpoint.url}`);
      
      if (endpoint.method === 'delete') {
        await apiClient.delete(endpoint.url);
      } else {
        await apiClient.post(endpoint.url);
      }
      
      console.log('✅ Eliminación exitosa con ' + endpoint.url);
      return;
    } catch (error: any) {
      console.warn(`❌ Error al eliminar con ${endpoint.url}: ${error.message}`);
    }
  }
  
  // Si ningún endpoint directo funcionó, intentar con una baja lógica (soft delete)
  try {
    console.log('Intentando baja lógica del producto...');
    const softDeletePayload = {
      id: numericId,
      deleted: true
    };
    
    await apiClient.put(`/articuloManufacturado/${numericId}`, softDeletePayload);
    console.log('✅ Baja lógica exitosa');
    return;
  } catch (softDeleteError: any) {
    console.warn('❌ Error al realizar baja lógica:', softDeleteError.message);
  }
  
  // Si llegamos aquí, todos los intentos fallaron
  throw new Error('No se pudo eliminar el producto. Por favor, intente nuevamente.');
};
