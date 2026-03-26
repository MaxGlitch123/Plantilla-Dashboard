// src/services/stockValidationService.ts

import { getToken } from '../api/apiClient';
import axios from 'axios';
import { Supply } from '../types/supply';

/**
 * Verifica si hay suficiente stock para los productos solicitados CON DESCUENTO INMEDIATO
 * ⚠️ IMPORTANTE: Con el nuevo sistema, el stock se descuenta al crear el pedido
 * @param items Items del pedido a verificar
 * @returns Un objeto con el resultado de la validación
 */
export const validateStockForOrder = async (items: any[]): Promise<{ 
  isValid: boolean;
  insufficientStockItems: Array<{
    insumoId: number;
    nombre: string;
    stockActual: number;
    stockRequerido: number;
    faltante: number;
  }>;
  warning?: string;
}> => {
  console.log('🔍 === VALIDACIÓN DE STOCK - SISTEMA DE DESCUENTO INMEDIATO ===');
  console.log('⚠️  ADVERTENCIA: Al confirmar el pedido, el stock se descontará inmediatamente');
  console.log('📦 Items a validar:', items.length);
  console.log('🎯 Items detallados:', JSON.stringify(items, null, 2));
  
  try {
    // Primero obtenemos todos los insumos disponibles
    console.log('📋 Obteniendo lista de insumos disponibles...');
    const token = await getToken();
    const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloInsumo/listar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const supplies: Supply[] = response.data;
    console.log(`✅ ${supplies.length} insumos cargados desde la API`);
    
    // Log de insumos disponibles
    console.log('📊 Stock actual de insumos:');
    supplies.forEach(supply => {
      console.log(`  - ${supply.denominacion} (ID: ${supply.id}): ${supply.stockActual} ${typeof supply.unidadMedida === 'object' ? supply.unidadMedida.denominacion : supply.unidadMedida}`);
    });
    
    // Ahora obtenemos todos los productos manufacturados con sus recetas
    let products = [];
    console.log('🏭 Obteniendo recetas de productos manufacturados...');
    try {
      const productsResponse = await axios.get(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloManufacturadoDetalle/todos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      products = productsResponse.data || [];
      console.log('✅ Productos manufacturados cargados correctamente:', products.length);
      
      // Log de productos con sus recetas
      console.log('📝 Recetas de productos:');
      products.forEach((product: any) => {
        console.log(`  🍴 ${product.denominacion || product.nombre} (ID: ${product.id}):`);
        if (product.detalles && Array.isArray(product.detalles)) {
          product.detalles.forEach((detalle: any) => {
            console.log(`    - ${detalle.articuloInsumo.denominacion}: ${detalle.cantidad} unidades`);
          });
        } else {
          console.log('    ⚠️ Sin detalles de receta');
        }
      });
      
    } catch (error) {
      console.error('❌ Error al cargar productos manufacturados:', error);
      console.warn('⚠️ Continuando con validación parcial sin detalles de productos');
      // Si no podemos cargar los productos, continuamos con un array vacío
      // Esto permitirá que la función siga funcionando parcialmente
    }

    // Calculamos el consumo total de insumos
    console.log('🧮 Calculando consumo de insumos para el pedido...');
    const insumoConsumption: Record<number, number> = {};
    
    // Para cada ítem del pedido
    for (const item of items) {
      const productId = item.articuloId;
      const cantidad = item.cantidad || 1;
      
      console.log(`\n🔍 Analizando producto ID: ${productId}, cantidad: ${cantidad}`);
      
      // Buscar el producto manufacturado correspondiente
      const product = products.find((p: any) => p.id === productId);
      
      if (!product) {
        console.warn(`⚠️ Producto ID ${productId} no encontrado en las recetas`);
        continue;
      }
      
      console.log(`✅ Producto encontrado: ${product.denominacion || product.nombre}`);
      
      if (product && product.detalles && Array.isArray(product.detalles)) {
        console.log(`📝 Procesando ${product.detalles.length} ingredientes de la receta:`);
        
        // Recorrer cada ingrediente de la receta
        for (const detalle of product.detalles) {
          const insumoId = detalle.articuloInsumo.id;
          const cantidadRequerida = detalle.cantidad * cantidad;
          const nombreInsumo = detalle.articuloInsumo.denominacion;
          
          console.log(`  🥄 ${nombreInsumo} (ID: ${insumoId}): ${detalle.cantidad} x ${cantidad} = ${cantidadRequerida} unidades`);
          
          // Sumar al consumo total del insumo
          if (insumoConsumption[insumoId]) {
            const consumoPrevio = insumoConsumption[insumoId];
            insumoConsumption[insumoId] += cantidadRequerida;
            console.log(`    ➕ Sumando a consumo previo: ${consumoPrevio} + ${cantidadRequerida} = ${insumoConsumption[insumoId]}`);
          } else {
            insumoConsumption[insumoId] = cantidadRequerida;
            console.log(`    🆕 Primer consumo de este insumo: ${cantidadRequerida}`);
          }
        }
      } else {
        console.warn(`⚠️ Producto ${product.denominacion || product.nombre} no tiene detalles de receta válidos`);
      }
    }
    
    console.log('\n📊 RESUMEN DE CONSUMO TOTAL DE INSUMOS:');
    Object.entries(insumoConsumption).forEach(([insumoId, cantidadRequerida]) => {
      const insumo = supplies.find(s => s.id === parseInt(insumoId));
      const nombreInsumo = insumo ? insumo.denominacion : `ID ${insumoId}`;
      console.log(`  - ${nombreInsumo}: ${cantidadRequerida} unidades requeridas`);
    });
    
    // Verificamos si hay suficiente stock para todos los insumos
    console.log('\n🎯 === VERIFICACIÓN DE STOCK ===');
    const insufficientStockItems = [];
    
    // Si no hay datos de consumo (porque no se pudieron cargar los productos)
    if (Object.keys(insumoConsumption).length === 0 && products.length === 0) {
      console.warn('⚠️ No hay datos de consumo de insumos. Validación de stock incompleta.');
      
      // En este caso, permitimos que continúe la operación pero notificamos al usuario
      return {
        isValid: true,
        insufficientStockItems: [],
        warning: 'No se pudo realizar la validación completa de stock debido a un error al cargar los datos de productos.'
      };
    }
    
    for (const [insumoId, cantidadRequerida] of Object.entries(insumoConsumption)) {
      const insumo = supplies.find(s => s.id === parseInt(insumoId));
      
      if (!insumo) {
        console.error(`❌ Insumo ID ${insumoId} no encontrado en la lista de supplies`);
        continue;
      }
      
      const stockActual = insumo.stockActual;
      const stockPendiente = insumo.stockPendiente || 0;
      const stockDisponible = stockActual - stockPendiente;
      
      console.log(`\n🧾 ${insumo.denominacion} (ID: ${insumoId}):`);
      console.log(`  📦 Stock actual: ${stockActual}`);
      console.log(`  ⏳ Stock pendiente: ${stockPendiente}`);
      console.log(`  ✅ Stock disponible: ${stockDisponible}`);
      console.log(`  🎯 Cantidad requerida: ${cantidadRequerida}`);
      
      if (stockDisponible < cantidadRequerida) {
        const faltante = cantidadRequerida - stockDisponible;
        console.log(`  ❌ INSUFICIENTE - Faltan ${faltante} unidades`);
        
        insufficientStockItems.push({
          insumoId: insumo.id,
          nombre: insumo.denominacion,
          stockActual: stockDisponible,
          stockRequerido: cantidadRequerida,
          faltante: faltante
        });
      } else {
        const sobrante = stockDisponible - cantidadRequerida;
        console.log(`  ✅ SUFICIENTE - Sobran ${sobrante} unidades`);
      }
    }
    
    console.log('\n🏁 === RESULTADO FINAL ===');
    const isValid = insufficientStockItems.length === 0;
    
    if (isValid) {
      console.log('✅ VALIDACIÓN EXITOSA: Hay suficientes insumos para crear el/los productos');
    } else {
      console.log('❌ VALIDACIÓN FALLIDA: No hay suficientes insumos');
      console.log('📋 Insumos insuficientes:');
      insufficientStockItems.forEach(item => {
        console.log(`  - ${item.nombre}: Necesita ${item.stockRequerido}, disponible ${item.stockActual}, faltan ${item.faltante}`);
      });
    }
    
    return {
      isValid: insufficientStockItems.length === 0,
      insufficientStockItems
    };
  } catch (error) {
    console.error('❌ Error al validar stock para el pedido:', error);
    // En lugar de lanzar el error, devolvemos un resultado con una advertencia
    return {
      isValid: true, // Asumimos que es válido para permitir que continúe
      insufficientStockItems: [],
      warning: 'No se pudo validar el stock debido a un error en el sistema. El pedido continuará sin validación de inventario.'
    };
  }
};

/**
 * Estima el tiempo de preparación en base a los productos solicitados
 * @param items Items del pedido
 * @returns Tiempo estimado en minutos
 */
export const estimatePreparationTime = async (items: any[]): Promise<number> => {
  try {
    const token = await getToken();
    
    // Obtenemos información de tiempos de preparación de productos
    const productsResponse = await axios.get(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloManufacturado/listar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const products = productsResponse.data;
    
    // Calculamos el tiempo máximo de preparación
    let maxPreparationTime = 0;
    let totalPreparationTime = 0;
    
    for (const item of items) {
      const productId = item.articuloId;
      const product = products.find((p: any) => p.id === productId);
      
      if (product && product.tiempoEstimadoMinutos) {
        // El tiempo total es la suma de todos los tiempos
        totalPreparationTime += product.tiempoEstimadoMinutos;
        
        // El tiempo máximo es el tiempo del producto que más tarde en prepararse
        if (product.tiempoEstimadoMinutos > maxPreparationTime) {
          maxPreparationTime = product.tiempoEstimadoMinutos;
        }
      }
    }
    
    // El tiempo estimado es el máximo + un porcentaje adicional basado en la cantidad de ítems
    const additionalTime = Math.min(30, items.length * 5); // 5 minutos extra por cada ítem, máximo 30 minutos
    
    return maxPreparationTime + additionalTime;
  } catch (error) {
    console.error('Error al estimar tiempo de preparación:', error);
    return 30; // Tiempo por defecto si hay error
  }
};

// ✅ NUEVO: Validación específica para creación de pedidos con descuento inmediato
export const validateStockForImmediateOrder = async (orderItems: any[]): Promise<{
  isValid: boolean;
  insufficientStockItems: Array<{
    insumoId: number;
    nombre: string;
    stockActual: number;
    stockRequerido: number;
    faltante: number;
  }>;
  warning?: string;
  estimatedImpact: Array<{
    insumoId: number;
    nombre: string;
    stockActual: number;
    stockDespues: number;
    criticalLevel: boolean;
  }>;
}> => {
  console.log('🔍 === VALIDACIÓN PARA PEDIDO CON DESCUENTO INMEDIATO ===');
  console.log('🚨 El stock se descontará AL MOMENTO de confirmar el pedido');
  
  try {
    // Obtener stock actual
    const token = await getToken();
    const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloInsumo/listar`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const supplies: Supply[] = response.data;
    const insufficientStockItems: any[] = [];
    const estimatedImpact: any[] = [];
    
    // Calcular el impacto para cada item
    for (const orderItem of orderItems) {
      console.log(`🔍 Analizando item: ${JSON.stringify(orderItem)}`);
      
      if (orderItem.articulo?.receta) {
        // Es un producto manufacturado
        console.log('🏭 Producto manufacturado detectado - analizando ingredientes');
        
        for (const ingredient of orderItem.articulo.receta.ingredientes) {
          const supply = supplies.find(s => s.id === ingredient.insumoId);
          if (!supply) {
            console.warn(`⚠️ Ingrediente no encontrado: ${ingredient.insumoId}`);
            continue;
          }
          
          const requiredAmount = ingredient.cantidad * orderItem.cantidad;
          const stockAfter = supply.stockActual - requiredAmount;
          
          console.log(`   📋 ${supply.denominacion}: ${supply.stockActual} -> ${stockAfter} (requiere ${requiredAmount})`);
          
          if (supply.stockActual < requiredAmount) {
            insufficientStockItems.push({
              insumoId: supply.id,
              nombre: supply.denominacion,
              stockActual: supply.stockActual,
              stockRequerido: requiredAmount,
              faltante: requiredAmount - supply.stockActual
            });
          }
          
          estimatedImpact.push({
            insumoId: supply.id,
            nombre: supply.denominacion,
            stockActual: supply.stockActual,
            stockDespues: Math.max(0, stockAfter),
            criticalLevel: stockAfter <= (supply.stockMinimo || 0)
          });
        }
      } else {
        // Es un insumo directo
        const supply = supplies.find(s => s.id === orderItem.articulo?.id);
        if (!supply) {
          console.warn(`⚠️ Insumo no encontrado: ${orderItem.articulo?.id}`);
          continue;
        }
        
        const requiredAmount = orderItem.cantidad;
        const stockAfter = supply.stockActual - requiredAmount;
        
        console.log(`📋 ${supply.denominacion}: ${supply.stockActual} -> ${stockAfter} (requiere ${requiredAmount})`);
        
        if (supply.stockActual < requiredAmount) {
          insufficientStockItems.push({
            insumoId: supply.id,
            nombre: supply.denominacion,
            stockActual: supply.stockActual,
            stockRequerido: requiredAmount,
            faltante: requiredAmount - supply.stockActual
          });
        }
        
        estimatedImpact.push({
          insumoId: supply.id,
          nombre: supply.denominacion,
          stockActual: supply.stockActual,
          stockDespues: Math.max(0, stockAfter),
          criticalLevel: stockAfter <= (supply.stockMinimo || 0)
        });
      }
    }
    
    console.log('📊 === RESUMEN DE VALIDACIÓN ===');
    console.log(`✅ Items con stock suficiente: ${estimatedImpact.length - insufficientStockItems.length}`);
    console.log(`❌ Items con stock insuficiente: ${insufficientStockItems.length}`);
    console.log(`⚠️ Items que quedarán en nivel crítico: ${estimatedImpact.filter(i => i.criticalLevel).length}`);
    
    return {
      isValid: insufficientStockItems.length === 0,
      insufficientStockItems,
      estimatedImpact,
      warning: insufficientStockItems.length > 0 ? 
        'Algunos items no tienen stock suficiente para este pedido' : 
        (estimatedImpact.some(i => i.criticalLevel) ? 
          'Algunos insumos quedarán en nivel crítico después de este pedido' : 
          undefined)
    };
    
  } catch (error) {
    console.error('❌ Error en validación de stock inmediato:', error);
    return {
      isValid: false,
      insufficientStockItems: [],
      estimatedImpact: [],
      warning: 'Error al validar stock - contacte al administrador'
    };
  }
};
