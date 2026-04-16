import apiClient from './apiClient';


export const fetchTotalVentas = async (): Promise<number> => {
  console.log('💰 fetchTotalVentas llamado');
  try {
    const response = await apiClient.get('/grafico/ventas/total');
    console.log('✅ Total ventas response:', response.data);
    return Number(response.data); 
  } catch (error) {
    console.error('❌ Error en fetchTotalVentas:', error);
    throw error;
  }
};

export const fetchTotalPedidos = async (): Promise<number> => {
  console.log('📋 fetchTotalPedidos llamado');
  try {
    const response = await apiClient.get('/grafico/pedidos/total');
    console.log('✅ Total pedidos response:', response.data);
    return Number(response.data);
  } catch (error) {
    console.error('❌ Error en fetchTotalPedidos:', error);
    throw error;
  }
};

export const fetchProductosMasVendidos = async (): Promise<
  { producto: string; cantidad: number }[]
> => {
  console.log('🏆 fetchProductosMasVendidos llamado');
  try {
    const response = await apiClient.get('/grafico/productos/mas-vendidos');
    console.log('✅ Productos más vendidos response:', response.data);
    // Si `cantidad` puede venir como string, hacé:
    const result = response.data.map((item: any) => ({
      producto: item.producto,
      cantidad: Number(item.cantidad),
    }));
    console.log('✅ Productos más vendidos procesados:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en fetchProductosMasVendidos:', error);
    throw error;
  }
};

export const fetchTotalProductosVendidos = async (): Promise<number> => {
  console.log('🛍️ fetchTotalProductosVendidos llamado');
  try {
    const response = await apiClient.get('/grafico/productos/total-vendidos');
    console.log('✅ Total productos vendidos response:', response.data);
    return Number(response.data);
  } catch (error) {
    console.error('❌ Error en fetchTotalProductosVendidos:', error);
    throw error;
  }
};

// ── Types ─────────────────────────────────────────────────────────────────

export interface VentaRubroItem {
  rubro: string;
  cantidad: number;
  ingresos: number;
}

export interface VentaArticuloItem {
  articulo: string;
  cantidad: number;
  ingresos: number;
}

export interface VentaRubroTipoEnvioItem {
  rubro: string;
  tipoEnvio: string;
  cantidad: number;
  ingresos: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildQuery(desde?: string, hasta?: string): string {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function normalizeItem<T extends { cantidad: unknown; ingresos: unknown }>(item: T): T {
  return { ...item, cantidad: Number(item.cantidad), ingresos: Number(item.ingresos) };
}

// ── Ventas por rubro ───────────────────────────────────────────────────────

export const fetchVentasPorRubro = async (
  desde?: string,
  hasta?: string,
): Promise<VentaRubroItem[]> => {
  const { data } = await apiClient.get<VentaRubroItem[]>(
    `/grafico/ventas/por-rubro${buildQuery(desde, hasta)}`,
  );
  return data.map(normalizeItem);
};

export const fetchVentasPorRubroTipoEnvio = async (
  desde?: string,
  hasta?: string,
): Promise<VentaRubroTipoEnvioItem[]> => {
  const { data } = await apiClient.get<VentaRubroTipoEnvioItem[]>(
    `/grafico/ventas/por-rubro/tipo-envio${buildQuery(desde, hasta)}`,
  );
  return data.map(normalizeItem);
};

// ── Ventas por artículo ────────────────────────────────────────────────────

export const fetchVentasPorArticulo = async (
  desde?: string,
  hasta?: string,
): Promise<VentaArticuloItem[]> => {
  const { data } = await apiClient.get<VentaArticuloItem[]>(
    `/grafico/ventas/por-articulo${buildQuery(desde, hasta)}`,
  );
  return data.map(normalizeItem);
};

// ── POS types ──────────────────────────────────────────────────────────────

export interface PosResumen {
  ingresos: number;
  totalVentas: number;
  ticketPromedio: number;
}

export interface PosFormaPagoItem {
  formaPago: string;
  totalVentas: number;
  ingresos: number;
}

// ── POS API functions ──────────────────────────────────────────────────────

export const fetchPosResumen = async (
  desde?: string,
  hasta?: string,
): Promise<PosResumen> => {
  const { data } = await apiClient.get<PosResumen>(
    `/grafico/pos/resumen${buildQuery(desde, hasta)}`,
  );
  return {
    ingresos: Number(data.ingresos),
    totalVentas: Number(data.totalVentas),
    ticketPromedio: Number(data.ticketPromedio),
  };
};

export const fetchPosVentasPorArticulo = async (
  desde?: string,
  hasta?: string,
): Promise<VentaArticuloItem[]> => {
  const { data } = await apiClient.get<VentaArticuloItem[]>(
    `/grafico/pos/ventas/por-articulo${buildQuery(desde, hasta)}`,
  );
  return data.map(normalizeItem);
};

export const fetchPosVentasPorRubro = async (
  desde?: string,
  hasta?: string,
): Promise<VentaRubroItem[]> => {
  const { data } = await apiClient.get<VentaRubroItem[]>(
    `/grafico/pos/ventas/por-rubro${buildQuery(desde, hasta)}`,
  );
  return data.map(normalizeItem);
};

export const fetchPosVentasPorFormaPago = async (
  desde?: string,
  hasta?: string,
): Promise<PosFormaPagoItem[]> => {
  const { data } = await apiClient.get<PosFormaPagoItem[]>(
    `/grafico/pos/ventas/por-forma-pago${buildQuery(desde, hasta)}`,
  );
  return data.map(item => ({
    formaPago: item.formaPago,
    totalVentas: Number(item.totalVentas),
    ingresos: Number(item.ingresos),
  }));
};
