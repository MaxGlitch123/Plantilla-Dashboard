import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import {
  Calendar,
  Download,
  BarChart2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Loader2,
  RefreshCw,
  Package
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  fetchTotalVentas,
  fetchTotalPedidos,
  fetchProductosMasVendidos,
  fetchTotalProductosVendidos,
  fetchVentasPorRubroTipoEnvio,
  fetchVentasPorArticulo,
  fetchPosResumen,
  fetchPosVentasPorArticulo,
  fetchPosVentasPorRubro,
  fetchPosVentasPorFormaPago,
  type VentaRubroTipoEnvioItem,
  type VentaArticuloItem,
  type VentaRubroItem,
  type PosResumen,
  type PosFormaPagoItem,
} from '../api/dashboard';
import { fetchPedidos } from '../api/orders';
import { fetchCustomers } from '../api/customers';
import type { PedidoResponse } from '../types/order';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Helpers ──────────────────────────────────────────────

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function filterByRange(pedidos: PedidoResponse[], range: string): PedidoResponse[] {
  const now = new Date();
  let from: Date;

  switch (range) {
    case 'today':
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      from = new Date(y.getFullYear(), y.getMonth(), y.getDate());
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return pedidos.filter((p) => {
        const d = new Date(p.fechaPedido);
        return d >= from && d < to;
      });
    }
    case 'week':
      from = new Date(now);
      from.setDate(from.getDate() - 7);
      break;
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      break;
    case 'year':
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      from = new Date(0);
  }

  return pedidos.filter((p) => new Date(p.fechaPedido) >= from);
}

function groupByMonth(pedidos: PedidoResponse[]): number[] {
  const totals = new Array(12).fill(0);
  pedidos.forEach((p) => {
    const m = new Date(p.fechaPedido).getMonth();
    totals[m] += p.total;
  });
  return totals;
}

function formatCurrency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

function rangeToDateParams(range: string): { desde?: string; hasta?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (range) {
    case 'today': { const d = fmt(now); return { desde: d, hasta: d }; }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); const d = fmt(y); return { desde: d, hasta: d }; }
    case 'week': { const f = new Date(now); f.setDate(f.getDate() - 7); return { desde: fmt(f), hasta: fmt(now) }; }
    case 'month': return { desde: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: fmt(now) };
    case 'quarter': { const f = new Date(now); f.setMonth(f.getMonth() - 3); return { desde: fmt(f), hasta: fmt(now) }; }
    case 'year': return { desde: fmt(new Date(now.getFullYear(), 0, 1)), hasta: fmt(now) };
    default: return {};
  }
}

const RUBRO_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
  },
};

const ARTICULO_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
    y: { grid: { display: false } },
  },
};

// ── Component ────────────────────────────────────────────

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Raw data
  const [allPedidos, setAllPedidos] = useState<PedidoResponse[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [totalPedidos, setTotalPedidos] = useState(0);
  const [totalProductosVendidos, setTotalProductosVendidos] = useState(0);
  const [topProducts, setTopProducts] = useState<{ producto: string; cantidad: number }[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [ventasPorRubroEnvio, setVentasPorRubroEnvio] = useState<VentaRubroTipoEnvioItem[]>([]);
  const [ventasPorArticulo, setVentasPorArticulo] = useState<VentaArticuloItem[]>([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // POS state
  const [posResumen, setPosResumen] = useState<PosResumen>({ ingresos: 0, totalVentas: 0, ticketPromedio: 0 });
  const [posArticulos, setPosArticulos] = useState<VentaArticuloItem[]>([]);
  const [posRubros, setPosRubros] = useState<VentaRubroItem[]>([]);
  const [posFormaPago, setPosFormaPago] = useState<PosFormaPagoItem[]>([]);

  // Active tab
  const [activeTab, setActiveTab] = useState<'pos' | 'web'>('pos');

  // ── Fetch ─────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ventas, pedidosCount, productosSold, masVendidos, pedidos, customers] =
        await Promise.all([
          fetchTotalVentas(),
          fetchTotalPedidos(),
          fetchTotalProductosVendidos(),
          fetchProductosMasVendidos(),
          fetchPedidos(),
          fetchCustomers(),
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadDetailData = useCallback(async () => {
    setLoadingDetalle(true);
    const { desde, hasta } = rangeToDateParams(dateRange);
    try {
      const [rubroEnvio, articulo, posRes, posArt, posRub, posPago] = await Promise.allSettled([
        fetchVentasPorRubroTipoEnvio(desde, hasta),
        fetchVentasPorArticulo(desde, hasta),
        fetchPosResumen(desde, hasta),
        fetchPosVentasPorArticulo(desde, hasta),
        fetchPosVentasPorRubro(desde, hasta),
        fetchPosVentasPorFormaPago(desde, hasta),
      ]);
      if (rubroEnvio.status === 'fulfilled') setVentasPorRubroEnvio(rubroEnvio.value);
      if (articulo.status  === 'fulfilled') setVentasPorArticulo(articulo.value);
      if (posRes.status    === 'fulfilled') setPosResumen(posRes.value);
      if (posArt.status    === 'fulfilled') setPosArticulos(posArt.value);
      if (posRub.status    === 'fulfilled') setPosRubros(posRub.value);
      if (posPago.status   === 'fulfilled') setPosFormaPago(posPago.value);

      // Log failures for debugging (not shown to user)
      [rubroEnvio, articulo, posRes, posArt, posRub, posPago].forEach((r, i) => {
        if (r.status === 'rejected') {
          console.error(`[Reports] fetch #${i} failed:`, (r as PromiseRejectedResult).reason);
        }
      });
    } finally {
      setLoadingDetalle(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadDetailData();
  }, [loadDetailData]);

  // ── Derived data ──────────────────────────────────────
  const filtered = useMemo(() => filterByRange(allPedidos, dateRange), [allPedidos, dateRange]);
  const delivered = useMemo(() => filtered.filter((p) => p.estado === 'ENTREGADO'), [filtered]);

  const rangeVentas = useMemo(() => delivered.reduce((s, p) => s + p.total, 0), [delivered]);
  const rangeOrdenes = useMemo(() => filtered.length, [filtered]);
  const rangeTicketPromedio = useMemo(
    () => (delivered.length > 0 ? rangeVentas / delivered.length : 0),
    [rangeVentas, delivered]
  );

  // Monthly trend (current year)
  const currentYear = new Date().getFullYear();
  const thisYearPedidos = useMemo(
    () => allPedidos.filter((p) => new Date(p.fechaPedido).getFullYear() === currentYear && p.estado === 'ENTREGADO'),
    [allPedidos, currentYear]
  );
  const monthlyTotals = useMemo(() => groupByMonth(thisYearPedidos), [thisYearPedidos]);

  // Order distribution by type
  const distribution = useMemo(() => {
    const delivery = filtered.filter((p) => p.tipoEnvio === 'DELIVERY').length;
    const retiro = filtered.filter((p) => p.tipoEnvio === 'RETIRO_LOCAL').length;
    const otro = filtered.length - delivery - retiro;
    return { delivery, retiro, otro };
  }, [filtered]);

  const distributionTotal = distribution.delivery + distribution.retiro + distribution.otro;
  const pctDelivery = distributionTotal > 0 ? Math.round((distribution.delivery / distributionTotal) * 100) : 0;
  const pctRetiro = distributionTotal > 0 ? Math.round((distribution.retiro / distributionTotal) * 100) : 0;
  const pctOtro = distributionTotal > 0 ? 100 - pctDelivery - pctRetiro : 0;

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const efectivo = delivered.filter((p) => p.formaPago === 'EFECTIVO').length;
    const mp = delivered.filter((p) => p.formaPago === 'MERCADO_PAGO').length;
    const tarjeta = delivered.filter((p) => p.formaPago === 'TARJETA').length;
    return { efectivo, mp, tarjeta };
  }, [delivered]);

  const rubroChartData = useMemo(() => {
    const rubros = [...new Set(ventasPorRubroEnvio.map((r) => r.rubro))];
    return {
      labels: rubros,
      datasets: [
        {
          label: 'Delivery',
          data: rubros.map((rubro) => {
            const found = ventasPorRubroEnvio.find((x) => x.rubro === rubro && x.tipoEnvio === 'DELIVERY');
            return found ? found.ingresos : 0;
          }),
          backgroundColor: 'rgba(245, 158, 11, 0.85)',
          borderRadius: 4,
          stack: 'rubros',
        },
        {
          label: 'Retiro en local',
          data: rubros.map((rubro) => {
            const found = ventasPorRubroEnvio.find((x) => x.rubro === rubro && x.tipoEnvio !== 'DELIVERY');
            return found ? found.ingresos : 0;
          }),
          backgroundColor: 'rgba(220, 38, 38, 0.85)',
          borderRadius: 4,
          stack: 'rubros',
        },
      ],
    };
  }, [ventasPorRubroEnvio]);

  const articuloChartData = useMemo(() => ({
    labels: ventasPorArticulo.map((a) => a.articulo),
    datasets: [
      {
        label: 'Ingresos ($)',
        data: ventasPorArticulo.map((a) => a.ingresos),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 4,
      },
    ],
  }), [ventasPorArticulo]);

  const totalIngresosArticulos = useMemo(
    () => ventasPorArticulo.reduce((s, a) => s + a.ingresos, 0),
    [ventasPorArticulo],
  );

  // ── POS chart data ─────────────────────────────────────────────────────
  const posRubroChartData = useMemo(() => ({
    labels: posRubros.map(r => r.rubro),
    datasets: [{
      label: 'Ingresos ($)',
      data: posRubros.map(r => r.ingresos),
      backgroundColor: 'rgba(220, 38, 38, 0.8)',
      borderRadius: 4,
    }],
  }), [posRubros]);

  const posArticuloChartData = useMemo(() => ({
    labels: posArticulos.map(a => a.articulo),
    datasets: [{
      label: 'Ingresos ($)',
      data: posArticulos.map(a => a.ingresos),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 4,
    }],
  }), [posArticulos]);

  const totalIngresosPos = useMemo(
    () => posArticulos.reduce((s, a) => s + a.ingresos, 0),
    [posArticulos],
  );

  // Current month stats
  const currentMonth = new Date().getMonth();
  const currentMonthTotal = monthlyTotals[currentMonth] || 0;
  const prevMonthTotal = monthlyTotals[currentMonth > 0 ? currentMonth - 1 : 11] || 0;
  const yearTotal = monthlyTotals.reduce((a, b) => a + b, 0);
  const monthChange = prevMonthTotal > 0 ? (((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100) : 0;

  // ── Chart data ────────────────────────────────────────
  const salesChartData = {
    labels: MONTHS,
    datasets: [
      {
        label: `Ventas ${currentYear}`,
        data: monthlyTotals,
        borderColor: 'rgb(220, 38, 38)',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const salesOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
      x: { grid: { display: false } },
    },
  };

  const topProductsData = {
    labels: topProducts.map((p) => p.producto),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: topProducts.map((p) => p.cantidad),
        backgroundColor: 'rgba(220, 38, 38, 0.8)',
        borderRadius: 4,
      },
    ],
  };

  const topProductsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
      y: { grid: { display: false } },
    },
  };

  const orderDistributionData = {
    labels: ['Delivery', 'Retiro en local', 'Otro'],
    datasets: [
      {
        data: [distribution.delivery, distribution.retiro, distribution.otro],
        backgroundColor: ['rgb(245, 158, 11)', 'rgb(220, 38, 38)', 'rgb(16, 185, 129)'],
        borderWidth: 0,
      },
    ],
  };

  const orderDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    cutout: '70%',
  };

  // ── Export CSV ─────────────────────────────────────────
  const handleExport = () => {
    const headers = ['Fecha', 'N° Pedido', 'Estado', 'Tipo Envío', 'Forma Pago', 'Total'];
    const rows = filtered.map((p) => [
      new Date(p.fechaPedido).toLocaleDateString('es-AR'),
      p.numeroPedido || p.id,
      p.estado,
      p.tipoEnvio || '-',
      p.formaPago || '-',
      p.total.toFixed(2),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-red-600" size={40} />
          <span className="ml-3 text-gray-600">Cargando reportes...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-600 text-lg">{error}</p>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={loadData}>
            Reintentar
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Reportes</h1>
          <p className="text-gray-600">Estadísticas en tiempo real del restaurante</p>
        </div>
        <div className="flex space-x-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar size={16} className="text-gray-400" />
            </div>
            <select
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Este mes</option>
              <option value="quarter">Últimos 3 meses</option>
              <option value="year">Este año</option>
            </select>
          </div>
          <Button variant="outline" icon={<Download size={16} />} onClick={handleExport}>
            Exportar CSV
          </Button>
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={loadData}>
            Actualizar
          </Button>
        </div>
      </div>

      {/* ── POS TAB ── */}
      {activeTab === 'pos' && (
        <>
          {/* POS Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <Card>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ingresos POS</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(posResumen.ingresos)}</p>
                </div>
                <div className="p-2 rounded-full bg-amber-100 text-amber-600">
                  <DollarSign size={24} />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">Período seleccionado</div>
            </Card>
            <Card>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ventas realizadas</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{posResumen.totalVentas}</p>
                </div>
                <div className="p-2 rounded-full bg-red-100 text-red-600">
                  <ShoppingBag size={24} />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">Solo ventas activas</div>
            </Card>
            <Card>
              <div className="flex justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Ticket promedio</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(posResumen.ticketPromedio)}</p>
                </div>
                <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                  <BarChart2 size={24} />
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-500">Promedio por venta</div>
            </Card>
          </div>

          {/* POS Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <Card>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="font-medium text-gray-900">Ingresos por rubro</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Agrupado por categoría — período seleccionado</p>
                </div>
                {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
              </div>
              {posRubroChartData.labels.length > 0 ? (
                <div className="h-72">
                  <Bar data={posRubroChartData} options={ARTICULO_CHART_OPTIONS} />
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <BarChart2 size={28} />
                  <span className="text-sm">Sin ventas POS en este período</span>
                </div>
              )}
            </Card>

            <Card>
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="font-medium text-gray-900">Artículos más vendidos (POS)</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Ordenados por ingresos generados</p>
                </div>
                {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
              </div>
              {posArticuloChartData.labels.length > 0 ? (
                <div className="h-72">
                  <Bar data={posArticuloChartData} options={ARTICULO_CHART_OPTIONS} />
                </div>
              ) : (
                <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Package size={28} />
                  <span className="text-sm">Sin ventas POS en este período</span>
                </div>
              )}
            </Card>
          </div>

          {/* POS forma de pago */}
          {posFormaPago.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card title="Formas de pago (POS)">
                <div className="space-y-4">
                  {posFormaPago.map((fp) => {
                    const totalVentasPos = posFormaPago.reduce((s, x) => s + x.totalVentas, 0);
                    const pct = totalVentasPos > 0 ? Math.round((fp.totalVentas / totalVentasPos) * 100) : 0;
                    return (
                      <div key={fp.formaPago}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600 capitalize">{fp.formaPago.toLowerCase().replace('_', ' ')}</span>
                          <span className="font-medium">{fp.totalVentas} ventas · {formatCurrency(fp.ingresos)} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-red-500 rounded-full h-2" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* POS artículo table */}
              {posArticulos.length > 0 && (
                <Card title="Detalle por artículo (POS)">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-2 text-gray-500 font-medium w-6">#</th>
                          <th className="text-left py-2 pr-4 text-gray-500 font-medium">Artículo</th>
                          <th className="text-right py-2 pr-4 text-gray-500 font-medium">Uds</th>
                          <th className="text-right py-2 text-gray-500 font-medium">Ingresos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posArticulos.map((a, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-2 pr-2 text-gray-400">{i + 1}</td>
                            <td className="py-2 pr-4 text-gray-800 font-medium">{a.articulo}</td>
                            <td className="py-2 pr-4 text-right text-gray-600">{a.cantidad}</td>
                            <td className="py-2 text-right font-semibold text-gray-900">{formatCurrency(a.ingresos)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300 bg-gray-50">
                          <td colSpan={2} className="py-2 px-2 text-sm font-semibold text-gray-700">Total</td>
                          <td className="py-2 pr-4 text-right text-sm font-semibold text-gray-700">
                            {posArticulos.reduce((s, a) => s + a.cantidad, 0)}
                          </td>
                          <td className="py-2 text-right text-sm font-semibold text-gray-900">
                            {formatCurrency(totalIngresosPos)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}
        </>
      )}

      {/* ── WEB TAB ── */}
      {activeTab === 'web' && (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas ({dateRange === 'year' ? 'año' : 'período'})</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(rangeVentas)}</p>
            </div>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600">
              <DollarSign size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Total histórico: {formatCurrency(totalVentas)}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Órdenes (período)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{rangeOrdenes}</p>
            </div>
            <div className="p-2 rounded-full bg-red-100 text-red-600">
              <ShoppingBag size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            Total histórico: {totalPedidos}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ticket promedio</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(rangeTicketPromedio)}</p>
            </div>
            <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
              <BarChart2 size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {delivered.length} órdenes entregadas
          </div>
        </Card>

        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes registrados</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-500">
            {totalProductosVendidos} productos vendidos
          </div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales Trend */}
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Tendencia de ventas {currentYear}</h3>
          </div>

          <div className="h-72">
            <Line data={salesChartData} options={salesOptions} />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Este mes</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(currentMonthTotal)}</p>
              {monthChange !== 0 && (
                <p className={`text-xs flex items-center justify-center gap-1 ${monthChange > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {monthChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}% vs mes anterior
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Mes anterior</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(prevMonthTotal)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-500">Total anual</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{formatCurrency(yearTotal)}</p>
            </div>
          </div>
        </Card>

        {/* Top Products */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Productos más vendidos</h3>
            <span className="text-sm text-gray-500">{topProducts.length} productos</span>
          </div>

          {topProducts.length > 0 ? (
            <div className="h-80">
              <Bar data={topProductsData} options={topProductsOptions} />
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <Package size={32} className="mr-2" /> Sin datos de productos
            </div>
          )}
        </Card>

        {/* Order Distribution */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Tipo de envío</h3>
          </div>

          {distributionTotal > 0 ? (
            <>
              <div className="h-52 mb-4">
                <Doughnut data={orderDistributionData} options={orderDistributionOptions} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-amber-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-3 h-3 bg-amber-500 rounded-full" />
                    <p className="text-xs font-medium text-gray-700">Delivery</p>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{pctDelivery}%</p>
                  <p className="text-xs text-gray-500">{distribution.delivery} órdenes</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-3 h-3 bg-red-500 rounded-full" />
                    <p className="text-xs font-medium text-gray-700">Retiro</p>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{pctRetiro}%</p>
                  <p className="text-xs text-gray-500">{distribution.retiro} órdenes</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-lg text-center">
                  <div className="flex items-center justify-center space-x-1 mb-1">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                    <p className="text-xs font-medium text-gray-700">Otro</p>
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{pctOtro}%</p>
                  <p className="text-xs text-gray-500">{distribution.otro} órdenes</p>
                </div>
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              Sin órdenes en este período
            </div>
          )}
        </Card>
      </div>

      {/* Ventas por rubro & artículo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Stacked: ingresos por rubro desglosado delivery/retiro */}
        <Card>
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-medium text-gray-900">Ingresos por rubro</h3>
              <p className="text-xs text-gray-400 mt-0.5">Delivery vs retiro en local — período seleccionado</p>
            </div>
            {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {rubroChartData.labels.length > 0 ? (
            <div className="h-72">
              <Bar data={rubroChartData} options={RUBRO_CHART_OPTIONS} />
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 size={28} />
              <span className="text-sm">Sin datos de rubros para este período</span>
            </div>
          )}
        </Card>

        {/* Horizontal: ingresos por artículo */}
        <Card>
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-medium text-gray-900">Ingresos por artículo</h3>
              <p className="text-xs text-gray-400 mt-0.5">Artículos ordenados por ingresos generados</p>
            </div>
            {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {articuloChartData.labels.length > 0 ? (
            <div className="h-72">
              <Bar data={articuloChartData} options={ARTICULO_CHART_OPTIONS} />
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Package size={28} />
              <span className="text-sm">Sin datos de artículos para este período</span>
            </div>
          )}
        </Card>
      </div>

      {/* Detalle por artículo — tabla */}
      {ventasPorArticulo.length > 0 && (
        <div className="mb-6">
          <Card title="Detalle por artículo">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium w-8">#</th>
                    <th className="text-left py-2 pr-4 text-gray-500 font-medium">Artículo</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Unidades</th>
                    <th className="text-right py-2 pr-4 text-gray-500 font-medium">Ingresos</th>
                    <th className="text-right py-2 text-gray-500 font-medium">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasPorArticulo.map((a, i) => {
                    const pct = totalIngresosArticulos > 0
                      ? ((a.ingresos / totalIngresosArticulos) * 100).toFixed(1)
                      : '0';
                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-800 font-medium">{a.articulo}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{a.cantidad.toLocaleString('es-AR')}</td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900">{formatCurrency(a.ingresos)}</td>
                        <td className="py-2 text-right">
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            {pct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300 bg-gray-50">
                    <td colSpan={2} className="py-2 px-2 text-sm font-semibold text-gray-700">Total</td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-gray-700">
                      {ventasPorArticulo.reduce((s, a) => s + a.cantidad, 0).toLocaleString('es-AR')}
                    </td>
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(totalIngresosArticulos)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Bottom row — Payment & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment breakdown */}
        <Card title="Formas de pago (período)">
          <div className="space-y-4">
            {[
              { label: 'Efectivo', count: paymentBreakdown.efectivo, color: 'bg-emerald-500' },
              { label: 'MercadoPago', count: paymentBreakdown.mp, color: 'bg-blue-500' },
              { label: 'Tarjeta', count: paymentBreakdown.tarjeta, color: 'bg-purple-500' },
            ].map((pm) => {
              const pct = delivered.length > 0 ? Math.round((pm.count / delivered.length) * 100) : 0;
              return (
                <div key={pm.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{pm.label}</span>
                    <span className="font-medium">{pm.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${pm.color} rounded-full h-2`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Resumen */}
        <Card title="Resumen general">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total ventas históricas</span>
              <span className="font-medium">{formatCurrency(totalVentas)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total pedidos históricos</span>
              <span className="font-medium">{totalPedidos}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Productos vendidos</span>
              <span className="font-medium">{totalProductosVendidos.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Clientes registrados</span>
              <span className="font-medium">{totalCustomers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ticket promedio global</span>
              <span className="font-medium">
                {totalPedidos > 0 ? formatCurrency(totalVentas / totalPedidos) : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Productos destacados</span>
              <span className="font-medium">{topProducts.length}</span>
            </div>
          </div>

          {topProducts.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Top 3 productos</p>
              {topProducts.slice(0, 3).map((p, i) => (
                <div key={i} className="flex justify-between text-sm py-1">
                  <span className="text-gray-600">{i + 1}. {p.producto}</span>
                  <span className="font-medium">{p.cantidad} uds</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
        </>
      )}
    </Layout>
  );
};

export default ReportsPage;
