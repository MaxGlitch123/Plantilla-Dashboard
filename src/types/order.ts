// src/types/order.ts

export type PedidoEstado =
  | 'PENDIENTE'
  | 'PREPARACION'
  | 'LISTO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type PedidoFormaPago = 'EFECTIVO' | 'MERCADO_PAGO' | 'TARJETA';
export type PedidoTipoEnvio = 'DELIVERY' | 'RETIRO_LOCAL';

export interface DomicilioBasico {
  id: number;
  calle: string;
  numero: string;
  piso?: string;
  nroDpto?: string;
  cp?: string;
  localidad: string | {
    nombre: string;
    provincia?: {
      nombre: string;
      pais?: {
        nombre: string;
      };
    };
  };
}

export interface PedidoResponse {
  id: number;
  numeroPedido?: string;
  fechaPedido: string;
  estado: PedidoEstado;
  total: number;
  tiempoEstimadoMinutos: number;
  horaEstimadaFinalizacion: string | null;
  formaPago?: PedidoFormaPago;
  tipoEnvio?: PedidoTipoEnvio;
  initPoint?: string;
  
  // Cliente del pedido
  cliente?: {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    telefono: string;
  };
  
  // Domicilio de entrega (para pedidos con delivery)
  domicilio?: DomicilioBasico | null;
}

export interface PedidoDetalleResponse extends Omit<PedidoResponse, 'numeroPedido'> {
  numeroPedido: string;
  totalCosto?: number;
  facturaEmitida?: boolean;
  
  // Empleado que atendió el pedido
  empleado?: {
    id: number;
    nombre: string;
    apellido: string;
  } | null;
  
  // Datos de la sucursal
  sucursal?: {
    id: number;
    nombre: string;
    telefono: string;
    email: string;
  };
  
  // Domicilio de entrega (versión detallada)
  domicilio?: DomicilioBasico | null;
  
  // Detalles/líneas del pedido
  detalles: {
    id: number;
    cantidad: number;
    subTotal: number;
    articulo: {
      id: number;
      denominacion: string;
      descripcion: string;
      precioVenta?: number;
      imagenesArticulos?: {
        id: string;
        url: string;
      }[];
      categoria?: {
        id: number;
        denominacion: string;
      };
      unidadMedida?: {
        id: number;
        denominacion: string;
      };
    };
  }[];
}
