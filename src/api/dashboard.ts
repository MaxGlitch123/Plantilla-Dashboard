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
