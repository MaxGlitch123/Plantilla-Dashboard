export interface User {
  id: string;
  username: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  isFirstLogin: boolean;
  createdAt: Date;
}

export type Role = 'admin' | 'manager' | 'employee' | 'delivery';

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  orderCount: number;
  lastOrderDate: Date | null;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
  hireDate: Date;
  status: 'active' | 'inactive';
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  createdAt: Date;
  deliveryInfo?: DeliveryInfo;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'in-delivery' | 'completed' | 'cancelled';

export interface DeliveryInfo {
  id: string;
  orderId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  estimatedDeliveryTime: Date;
  actualDeliveryTime?: Date;
  status: 'assigned' | 'picked-up' | 'in-transit' | 'delivered' | 'failed';
  address: string;
  customerPhone: string;
}


export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Tipos para promociones - Actualizada según el backend nuevo
export interface Promotion {
  id: number;
  denominacion: string;
  fechaDesde: string;
  fechaHasta: string;
  horaDesde?: string;
  horaHasta?: string;
  descripcionDescuento: string;
  tipoPromocion: 'HAPPYHOUR' | 'PROMOCION_1' | 'DESCUENTO_ESPECIAL' | 'OFERTA_LIMITADA';
  alcance: 'TODOS' | 'CATEGORIAS' | 'PRODUCTOS' | 'TAGS';
  descuentoPorcentaje?: number;
  precioPromocional?: number;
  montoMinimo?: number;
  cantidadMaxima?: number;
  activa: boolean;
  prioridad: number;
  eliminado: boolean;
  fechaModificacion: string;
  // Relaciones
  promoDetalles: PromoDetalle[];
  imagenes: PromoImagen[];
  // Campos adicionales para compatibilidad con el backend
  articulosIncluidos?: { id: number }[];
  categoriasIncluidas?: { id: number }[];
  tagsIncluidos?: string[];
}

export interface PromoDetalle {
  id: number;
  cantidad?: number;
  promocionId: number;
  articuloId?: number;
  categoriaId?: number;
  tagNombre?: string;
  articulo?: Product;
  categoria?: Category;
}

export interface PromoImagen {
  id: number;
  url: string;
  promocionId: number;
}

export interface Product {
  id: number;
  denominacion: string;
  precioVenta: number;
  categoria?: Category;
  tags?: string[];
}

export interface Category {
  id: number;
  denominacion: string;
  esInsumo: boolean;
}