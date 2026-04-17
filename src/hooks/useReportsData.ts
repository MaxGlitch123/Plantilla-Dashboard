import { useState, useEffect, useCallback } from 'react';
import {
  fetchTotalVentas, fetchTotalPedidos, fetchProductosMasVendidos, fetchTotalProductosVendidos,
  fetchVentasPorRubroTipoEnvio, fetchVentasPorArticulo,
  fetchPosResumen, fetchPosVentasPorArticulo, fetchPosVentasPorRubro, fetchPosVentasPorFormaPago,
} from '../api/dashboard';
import type {
  VentaRubroTipoEnvioItem, VentaArticuloItem, VentaRubroItem, PosResumen, PosFormaPagoItem,
} from '../api/dashboard';
import { fetchPedidos } from '../api/orders';
import { fetchCustomers } from '../api/customers';
import type { PedidoResponse } from '../types/order';
import { rangeToDateParams } from '../utils/reportUtils';

export interface ReportsData {
  loading: boolean;
  error: string | null;
  loadData: () => Promise<void>;
  loadingDetalle: boolean;
  allPedidos: PedidoResponse[];
  totalVentas: number;
  totalPedidos: number;
  totalProductosVendidos: number;
  topProducts: { producto: string; cantidad: number }[];
  totalCustomers: number;
  ventasPorRubroEnvio: VentaRubroTipoEnvioItem[];
  ventasPorArticulo: VentaArticuloItem[];
  posResumen: PosResumen;
  posArticulos: VentaArticuloItem[];
  posRubros: VentaRubroItem[];
  posFormaPago: PosFormaPagoItem[];
}

export function useReportsData(dateRange: string): ReportsData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allPedidos, setAllPedidos] = useState<PedidoResponse[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [totalProductosVendidos, setTotalProductosVendidos] = useState(0);
  const [topProducts, setTopProducts] = useState<{ producto: string; cantidad: number }[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [ventasPorRubroEnvio, setVentasPorRubroEnvio] = useState<VentaRubroTipoEnvioItem[]>([]);
  const [ventasPorArticulo, setVentasPorArticulo] = useState<VentaArticuloItem[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [posResumen, setPosResumen] = useState<PosResumen>({ ingresos: 0, totalVentas: 0, ticketPromedio: 0 });
  const [posArticulos, setPosArticulos] = useState<VentaArticuloItem[]>([]);
  const [posRubros, setPosRubros] = useState<VentaRubroItem[]>([]);
  const [posFormaPago, setPosFormaPago] = useState<PosFormaPagoItem[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ventas, pedidosCount, productosSold, masVendidos, pedidos, customers] = await Promise.all([
        fetchTotalVentas(), fetchTotalPedidos(), fetchTotalProductosVendidos(),
        fetchProductosMasVendidos(), fetchPedidos(), fetchCustomers(),
      ]);
      setTotalVentas(ventas);
      setTotalPedidos(pedidosCount);
      setTotalProductosVendidos(productosSold);
      setTopProducts(masVendidos);
      setAllPedidos(pedidos);
      setTotalCustomers(customers.length);
    } catch (e) {
      console.error('Error loading report data:', e);
      setError('No se pudieron cargar los datos. Verificá la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadDetailData = useCallback(async () => {
    setLoadingDetalle(true);
    const { desde, hasta } = rangeToDateParams(dateRange);
    try {
      const [rubroEnvio, articulo, posRes, posArt, posRub, posPago] = await Promise.allSettled([
        fetchVentasPorRubroTipoEnvio(desde, hasta), fetchVentasPorArticulo(desde, hasta),
        fetchPosResumen(desde, hasta), fetchPosVentasPorArticulo(desde, hasta),
        fetchPosVentasPorRubro(desde, hasta), fetchPosVentasPorFormaPago(desde, hasta),
      ]);
      if (rubroEnvio.status === 'fulfilled') setVentasPorRubroEnvio(rubroEnvio.value);
      if (articulo.status  === 'fulfilled') setVentasPorArticulo(articulo.value);
      if (posRes.status    === 'fulfilled') setPosResumen(posRes.value);
      if (posArt.status    === 'fulfilled') setPosArticulos(posArt.value);
      if (posRub.status    === 'fulfilled') setPosRubros(posRub.value);
      if (posPago.status   === 'fulfilled') setPosFormaPago(posPago.value);
      [rubroEnvio, articulo, posRes, posArt, posRub, posPago].forEach((r, i) => {
        if (r.status === 'rejected') console.error(`[Reports] fetch #${i} failed:`, (r as PromiseRejectedResult).reason);
      });
    } finally {
      setLoadingDetalle(false);
    }
  }, [dateRange]);

  useEffect(() => { loadDetailData(); }, [loadDetailData]);

  return {
    loading, error, loadData, loadingDetalle,
    allPedidos, totalVentas, totalPedidos, totalProductosVendidos, topProducts, totalCustomers,
    ventasPorRubroEnvio, ventasPorArticulo,
    posResumen, posArticulos, posRubros, posFormaPago,
  };
}
