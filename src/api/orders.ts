// src/api/orders.ts

import apiClient from './apiClient';
import { PedidoResponse } from '../types/order';
import { PedidoDetalleResponse } from '../types/order';
import { 
  extractArrayFromResponse,
  isValidPedido,
  normalizePedido
} from '../utils/sanitizeJSON';

// Obtener todos los pedidos
export const fetchPedidos = async (): Promise<PedidoResponse[]> => {
  console.log('� fetchPedidos llamado - NUEVA DEPURACIÓN');
  try {
    console.log('� Haciendo petición a /pedido/dto...');
    
    const response = await apiClient.get('/pedido/dto');
    
    console.log('📋 Respuesta recibida:', {
      status: response.status,
      statusText: response.statusText,
      dataType: typeof response.data,
      isArray: Array.isArray(response.data),
      length: Array.isArray(response.data) ? response.data.length : 'N/A'
    });
    
    // Si es array vacío
    if (Array.isArray(response.data) && response.data.length === 0) {
      console.warn('⚠️ El backend devolvió un array vacío de pedidos');
      return [];
    }
    
    // Si no es array
    if (!Array.isArray(response.data)) {
      console.error('❌ La respuesta no es un array:', response.data);
      return [];
    }
    
    console.log('✅ Pedidos recibidos correctamente:', response.data.length);
    return response.data;
    
  } catch (error: any) {
    console.error('❌ Error CRÍTICO en fetchPedidos:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });
    
    // Si es 401, problema de autenticación
    if (error.response?.status === 401) {
      console.error('� Error de autenticación - Token inválido o expirado');
    }
    
    // Si es 500, problema del backend
    if (error.response?.status >= 500) {
      console.error('🖥️ Error del servidor backend');
    }
    
    return [];
  }
};

// Obtener un pedido por ID (no estás usando esto aún, pero lo dejamos)
export const fetchPedidoById = async (id: number): Promise<PedidoResponse> => {
  // Usar la ruta sin modificaciones, alineada con la configuración del backend
  const res = await apiClient.get(`/pedido/${id}`);
  return res.data;
};

// Función para obtener pedidos sin procesar (para debugging)
export const fetchRawPedidos = async (): Promise<any[]> => {
  try {
    console.log('🔍 Llamando a API: /pedido/raw (sin DTOs)');
    // Usar la ruta sin modificaciones
    const res = await apiClient.get('/pedido/raw');
    console.log('📦 Respuesta raw recibida:', res.status);
    return res.data;
  } catch (error) {
    console.error('❌ Error al obtener pedidos raw:', error);
    return [];
  }
};

// Cambiar el estado de un pedido (usa POST con query param `nuevoEstado`)
export const updatePedidoEstado = async (
  id: number,
  nuevoEstado: string
): Promise<void> => {
  try {
    console.log(`🔄 Actualizando estado del pedido #${id} a ${nuevoEstado}`);
    // Usar la ruta sin modificaciones
    await apiClient.post(`/pedido/${id}/estado?nuevoEstado=${nuevoEstado}`);
    console.log(`✅ Estado del pedido #${id} actualizado correctamente a ${nuevoEstado}`);
  } catch (error) {
    console.error(`❌ Error al actualizar estado del pedido #${id}:`, error);
    throw error; // Re-lanzamos el error para que se maneje en el componente
  }
};


export const fetchPedidoDetalle = async (
  id: number
): Promise<PedidoDetalleResponse> => {
  try {
    console.log(`🔍 Obteniendo detalles del pedido #${id}`);
    // Usar la ruta sin modificaciones
    const res = await apiClient.get(`/pedido/${id}/dto`);
    
    // Verificar si la respuesta es válida
    if (!res.data || typeof res.data !== 'object') {
      console.error(`❌ Respuesta inválida para pedido #${id}:`, res.data);
      throw new Error('La respuesta del servidor no contiene datos válidos');
    }
    
    // Normalizar el detalle del pedido
    const normalizedData = normalizePedido(res.data);
    
    console.log(`✅ Detalles del pedido #${id} obtenidos y normalizados correctamente`);
    return normalizedData;
  } catch (error) {
    console.error(`❌ Error al obtener detalles del pedido #${id}:`, error);
    throw error; // Re-lanzamos el error para que se maneje en el componente
  }
};

// ✅ NUEVO: Crear pedido con descuento inmediato de stock
export const createOrder = async (orderData: any): Promise<PedidoResponse> => {
  console.log('📝 NUEVO: Creando pedido con descuento inmediato de stock');
  console.log('🔥 Items que descontarán stock inmediatamente:', orderData.items);
  console.log('📊 Datos del pedido a enviar:', JSON.stringify(orderData, null, 2));
  
  try {
    // Agregar flag para indicar descuento inmediato
    const orderWithFlags = {
      ...orderData,
      descontarStockInmediato: true, // Flag para el backend
      timestamp: new Date().toISOString() // Para tracking
    };
    
    console.log('⏳ Enviando pedido al backend...');
    const response = await apiClient.post('/pedido/crear-desde-carrito', orderWithFlags);
    
    console.log('✅ Pedido creado exitosamente - Stock descontado inmediatamente');
    console.log('📦 Respuesta del servidor:', {
      id: response.data.id,
      estado: response.data.estado,
      total: response.data.total,
      itemsCount: response.data.detalles?.length || 0
    });
    
    // Log específico sobre el descuento de stock
    console.log('🎯 CONFIRMACIÓN: El stock de los siguientes items fue descontado:');
    if (response.data.detalles) {
      response.data.detalles.forEach((detalle: any, index: number) => {
        console.log(`   ${index + 1}. ${detalle.articulo?.denominacion} x${detalle.cantidad}`);
      });
    }
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creando pedido con descuento de stock:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      orderData: orderData
    });
    
    // Mensajes específicos para errores comunes
    if (error.response?.status === 400) {
      console.error('📋 Error de validación - Revisar datos del pedido');
      if (error.response?.data?.message?.includes('Stock insuficiente')) {
        console.error('📦 STOCK INSUFICIENTE - Algunos items no tienen stock disponible');
      }
    } else if (error.response?.status === 500) {
      console.error('🖥️ Error interno del servidor - Contactar administrador');
    }
    
    throw error;
  }
};

// ✅ NUEVO: Cancelar pedido y revertir stock
export const cancelOrder = async (orderId: number, reason?: string): Promise<void> => {
  console.log(`🚫 Cancelando pedido #${orderId} con reversión de stock`);
  console.log(`📝 Razón: ${reason || 'No especificada'}`);
  
  try {
    await apiClient.post(`/pedido/${orderId}/cancelar`, {
      reason: reason || 'Cancelado desde el dashboard',
      revertirStock: true, // Flag para revertir stock
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ Pedido #${orderId} cancelado y stock revertido exitosamente`);
  } catch (error: any) {
    console.error(`❌ Error cancelando pedido #${orderId}:`, error);
    throw error;
  }
};

