/**
 * Utilidades para trabajar con DTOs de pedidos
 * Esta utilidad complementa las funciones existentes en sanitizeJSON.ts pero está
 * orientada específicamente a los nuevos DTOs devueltos por la API
 */

import { PedidoDetalleResponse, PedidoResponse } from '../types/order';

/**
 * Valida la estructura del DTO de un pedido
 * @param pedidoDTO El DTO de pedido a validar
 * @returns true si el DTO tiene la estructura esperada
 */
export function isValidPedidoDTO(pedidoDTO: any): boolean {
  return (
    pedidoDTO &&
    typeof pedidoDTO === 'object' &&
    pedidoDTO.id !== undefined &&
    // Verificar si tiene al menos las propiedades principales esperadas en el DTO
    (pedidoDTO.estado !== undefined ||
     pedidoDTO.fechaPedido !== undefined ||
     pedidoDTO.total !== undefined)
  );
}

/**
 * Convierte un DTO de pedido recibido de la API a la estructura interna
 * utilizada por el frontend
 * @param pedidoDTO El DTO de pedido recibido de la API
 * @returns El pedido en formato PedidoResponse para uso en el frontend
 */
export function convertPedidoDTO(pedidoDTO: any): PedidoResponse {
  // Extraer los datos del cliente del DTO
  const cliente = pedidoDTO.cliente || {};
  
  // Extraer datos del domicilio si existe
  const domicilio = pedidoDTO.domicilio || {};
  
  // Formatear la fecha si existe
  let fechaFormateada = pedidoDTO.fechaPedido;
  if (fechaFormateada && typeof fechaFormateada === 'string') {
    try {
      // Intentar formatear la fecha si es necesario
      const fecha = new Date(fechaFormateada);
      if (!isNaN(fecha.getTime())) {
        fechaFormateada = fecha.toISOString();
      }
    } catch (e) {
      console.warn('Error al formatear fecha del pedido:', e);
    }
  }
  
  // Convertir a la estructura esperada por el frontend
  return {
    id: pedidoDTO.id,
    numeroPedido: pedidoDTO.numeroPedido || `P-${pedidoDTO.id}`,
    estado: pedidoDTO.estado || 'PENDIENTE',
    fechaPedido: fechaFormateada || new Date().toISOString(),
    horaEstimadaFinalizacion: pedidoDTO.horaEstimadaFinalizacion || null,
    tiempoEstimadoMinutos: pedidoDTO.tiempoEstimadoMinutos || 30,
    total: typeof pedidoDTO.total === 'number' ? pedidoDTO.total : 0,
    formaPago: (pedidoDTO.formaPago || 'EFECTIVO') as any,
    tipoEnvio: (pedidoDTO.tipoEnvio || 'DELIVERY') as any,
    
    // Datos del cliente
    cliente: {
      id: cliente.id || 0,
      nombre: cliente.nombre || 'Cliente',
      apellido: cliente.apellido || '',
      email: cliente.email || 'sin@email.com',
      telefono: cliente.telefono || '',
    },
    
    // Datos de domicilio
    domicilio: domicilio.id ? {
      id: domicilio.id,
      calle: domicilio.calle || '',
      numero: domicilio.numero || '',
      localidad: typeof domicilio.localidad === 'string' 
        ? domicilio.localidad 
        : (domicilio.localidad?.nombre || ''),
      // Agregar más campos según sea necesario
      cp: domicilio.cp || '',
      piso: domicilio.piso || '',
      nroDpto: domicilio.nroDpto || '',
    } : null,
  };
}

/**
 * Convierte un DTO de detalle de pedido a la estructura esperada por el frontend
 * @param detalleDTO El DTO con el detalle completo del pedido
 * @returns El pedido detallado en formato PedidoDetalleResponse
 */
export function convertPedidoDetalleDTO(detalleDTO: any): PedidoDetalleResponse {
  // Primero convertimos los datos básicos del pedido
  const pedidoBase = convertPedidoDTO(detalleDTO);
  
  // Procesamos los detalles (líneas de pedido)
  const detallesItems = Array.isArray(detalleDTO.detalles) 
    ? detalleDTO.detalles.map((detalle: any) => {
        // Extraer la información del artículo (puede ser manufacturado o insumo)
        const articulo = detalle.articulo || {};
        
        return {
          id: detalle.id,
          cantidad: detalle.cantidad || 1,
          subTotal: detalle.subTotal || 0,
          articulo: {
            id: articulo.id || 0,
            denominacion: articulo.denominacion || 'Producto sin nombre',
            descripcion: articulo.descripcion || '',
            precioVenta: articulo.precioVenta || 0,
            // Otros campos necesarios
          },
        };
      })
    : [];
  
  // Retornamos el pedido detallado completo
  return {
    ...pedidoBase,
    numeroPedido: detalleDTO.numeroPedido || `P-${detalleDTO.id}`, 
    detalles: detallesItems,
    totalCosto: detalleDTO.totalCosto || 0,
    // Agregar información adicional específica del detalle si es necesario
    facturaEmitida: detalleDTO.facturaEmitida || false,
    empleado: detalleDTO.empleado ? {
      id: detalleDTO.empleado.id || 0,
      nombre: detalleDTO.empleado.nombre || '',
      apellido: detalleDTO.empleado.apellido || '',
    } : null,
  };
}

/**
 * Prepara los datos de un pedido para enviar a la API
 * @param pedido El pedido a serializar para enviar a la API
 * @returns Los datos del pedido en formato compatible con la API
 */
export function serializePedidoToDTO(pedido: PedidoResponse): any {
  // Esta función sería utilizada si necesitas enviar datos de un pedido a la API
  return {
    id: pedido.id,
    estado: pedido.estado,
    // Solo incluimos los campos opcionales si existen
    ...(pedido.formaPago && { formaPago: pedido.formaPago }),
    ...(pedido.tipoEnvio && { tipoEnvio: pedido.tipoEnvio }),
    // Otros campos necesarios para la actualización
  };
}
