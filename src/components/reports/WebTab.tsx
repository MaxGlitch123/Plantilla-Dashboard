import React, { useMemo } from 'react';
import Card from '../ui/Card';
import {
  BarChart2, DollarSign, Loader2, Package, ShoppingBag, TrendingDown, TrendingUp, Users,
} from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { VentaRubroTipoEnvioItem, VentaArticuloItem } from '../../api/dashboard';
import type { PedidoResponse } from '../../types/order';
import {
  filterByRange, groupByMonth, formatCurrency, MONTHS,
  RUBRO_CHART_OPTIONS, ARTICULO_CHART_OPTIONS,
} from '../../utils/reportUtils';

interface Props {
  allPedidos: PedidoResponse[];
  dateRange: string;
  totalVentas: number;
  totalPedidos: number;
  totalProductosVendidos: number;
  totalCustomers: number;
  topProducts: { producto: string; cantidad: number }[];
  ventasPorRubroEnvio: VentaRubroTipoEnvioItem[];
  ventasPorArticulo: VentaArticuloItem[];
  loadingDetalle: boolean;
}

const WebTab: React.FC<Props> = ({
  allPedidos, dateRange, totalVentas, totalPedidos, totalProductosVendidos,
  totalCustomers, topProducts, ventasPorRubroEnvio, ventasPorArticulo, loadingDetalle,
}) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const filtered  = useMemo(() => filterByRange(allPedidos, dateRange), [allPedidos, dateRange]);
  const delivered = useMemo(() => filtered.filter((p) => p.estado === 'ENTREGADO'), [filtered]);
  const rangeVentas = useMemo(() => delivered.reduce((s, p) => s + p.total, 0), [delivered]);
  const rangeTicketPromedio = delivered.length > 0 ? rangeVentas / delivered.length : 0;

  const thisYearPedidos = useMemo(
    () => allPedidos.filter((p) => new Date(p.fechaPedido).getFullYear() === currentYear && p.estado === 'ENTREGADO'),
    [allPedidos, currentYear],
  );
  const monthlyTotals = useMemo(() => groupByMonth(thisYearPedidos), [thisYearPedidos]);

  const distribution = useMemo(() => {
    const delivery = filtered.filter((p) => p.tipoEnvio === 'DELIVERY').length;
    const retiro   = filtered.filter((p) => p.tipoEnvio === 'RETIRO_LOCAL').length;
    return { delivery, retiro, otro: filtered.length - delivery - retiro };
  }, [filtered]);

  const distributionTotal = distribution.delivery + distribution.retiro + distribution.otro;
  const pctDelivery = distributionTotal > 0 ? Math.round((distribution.delivery / distributionTotal) * 100) : 0;
  const pctRetiro   = distributionTotal > 0 ? Math.round((distribution.retiro   / distributionTotal) * 100) : 0;
  const pctOtro     = distributionTotal > 0 ? 100 - pctDelivery - pctRetiro : 0;

  const paymentBreakdown = useMemo(() => ({
    efectivo: delivered.filter((p) => p.formaPago === 'EFECTIVO').length,
    mp:       delivered.filter((p) => p.formaPago === 'MERCADO_PAGO').length,
    tarjeta:  delivered.filter((p) => p.formaPago === 'TARJETA').length,
  }), [delivered]);

  const currentMonthTotal = monthlyTotals[currentMonth] || 0;
  const prevMonthTotal    = monthlyTotals[currentMonth > 0 ? currentMonth - 1 : 11] || 0;
  const yearTotal         = monthlyTotals.reduce((a, b) => a + b, 0);
  const monthChange       = prevMonthTotal > 0 ? ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  // Chart data
  const salesChartData = {
    labels: MONTHS,
    datasets: [{
      label: `Ventas ${currentYear}`, data: monthlyTotals,
      borderColor: 'rgb(220, 38, 38)', backgroundColor: 'rgba(220, 38, 38, 0.1)', tension: 0.4, fill: true,
    }],
  };
  const salesOptions = {
    responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } }, x: { grid: { display: false } } },
  };

  const topProductsData = {
    labels: topProducts.map((p) => p.producto),
    datasets: [{ label: 'Cantidad vendida', data: topProducts.map((p) => p.cantidad), backgroundColor: 'rgba(220, 38, 38, 0.8)', borderRadius: 4 }],
  };
  const topProductsOptions = {
    responsive: true, maintainAspectRatio: false, indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } }, y: { grid: { display: false } } },
  };

  const orderDistributionData = {
    labels: ['Delivery', 'Retiro en local', 'Otro'],
    datasets: [{ data: [distribution.delivery, distribution.retiro, distribution.otro], backgroundColor: ['rgb(245, 158, 11)', 'rgb(220, 38, 38)', 'rgb(16, 185, 129)'], borderWidth: 0 }],
  };

  const rubroChartData = useMemo(() => {
    const rubros = [...new Set(ventasPorRubroEnvio.map((r) => r.rubro))];
    return {
      labels: rubros,
      datasets: [
        { label: 'Delivery',       data: rubros.map((rb) => ventasPorRubroEnvio.find((x) => x.rubro === rb && x.tipoEnvio === 'DELIVERY')?.ingresos ?? 0),   backgroundColor: 'rgba(245, 158, 11, 0.85)', borderRadius: 4, stack: 'rubros' },
        { label: 'Retiro en local', data: rubros.map((rb) => ventasPorRubroEnvio.find((x) => x.rubro === rb && x.tipoEnvio !== 'DELIVERY')?.ingresos ?? 0),   backgroundColor: 'rgba(220, 38, 38, 0.85)',  borderRadius: 4, stack: 'rubros' },
      ],
    };
  }, [ventasPorRubroEnvio]);

  const articuloChartData = useMemo(() => ({
    labels: ventasPorArticulo.map((a) => a.articulo),
    datasets: [{ label: 'Ingresos ($)', data: ventasPorArticulo.map((a) => a.ingresos), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 4 }],
  }), [ventasPorArticulo]);

  const totalIngresosArticulos = useMemo(() => ventasPorArticulo.reduce((s, a) => s + a.ingresos, 0), [ventasPorArticulo]);

  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ventas ({dateRange === 'year' ? 'año' : 'período'})</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(rangeVentas)}</p>
            </div>
            <div className="p-2 rounded-full bg-amber-100 text-amber-600"><DollarSign size={24} /></div>
          </div>
          <div className="mt-4 text-sm text-gray-500">Total histórico: {formatCurrency(totalVentas)}</div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Órdenes (período)</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{filtered.length}</p>
            </div>
            <div className="p-2 rounded-full bg-red-100 text-red-600"><ShoppingBag size={24} /></div>
          </div>
          <div className="mt-4 text-sm text-gray-500">Total histórico: {totalPedidos}</div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Ticket promedio</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{formatCurrency(rangeTicketPromedio)}</p>
            </div>
            <div className="p-2 rounded-full bg-emerald-100 text-emerald-600"><BarChart2 size={24} /></div>
          </div>
          <div className="mt-4 text-sm text-gray-500">{delivered.length} órdenes entregadas</div>
        </Card>
        <Card>
          <div className="flex justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Clientes registrados</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{totalCustomers}</p>
            </div>
            <div className="p-2 rounded-full bg-blue-100 text-blue-600"><Users size={24} /></div>
          </div>
          <div className="mt-4 text-sm text-gray-500">{totalProductosVendidos} productos vendidos</div>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Tendencia de ventas {currentYear}</h3>
          </div>
          <div className="h-72"><Line data={salesChartData} options={salesOptions} /></div>
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

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Productos más vendidos</h3>
            <span className="text-sm text-gray-500">{topProducts.length} productos</span>
          </div>
          {topProducts.length > 0 ? (
            <div className="h-80"><Bar data={topProductsData} options={topProductsOptions} /></div>
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <Package size={32} className="mr-2" /> Sin datos de productos
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-900">Tipo de envío</h3>
          </div>
          {distributionTotal > 0 ? (
            <>
              <div className="h-52 mb-4">
                <Doughnut data={orderDistributionData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '70%' }} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Delivery', pct: pctDelivery, count: distribution.delivery, bg: 'bg-amber-50',  dot: 'bg-amber-500' },
                  { label: 'Retiro',   pct: pctRetiro,   count: distribution.retiro,   bg: 'bg-red-50',    dot: 'bg-red-500' },
                  { label: 'Otro',     pct: pctOtro,     count: distribution.otro,     bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
                ].map(({ label, pct, count, bg, dot }) => (
                  <div key={label} className={`p-3 ${bg} rounded-lg text-center`}>
                    <div className="flex items-center justify-center space-x-1 mb-1">
                      <div className={`w-3 h-3 ${dot} rounded-full`} />
                      <p className="text-xs font-medium text-gray-700">{label}</p>
                    </div>
                    <p className="text-xl font-semibold text-gray-900">{pct}%</p>
                    <p className="text-xs text-gray-500">{count} órdenes</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">Sin órdenes en este período</div>
          )}
        </Card>
      </div>

      {/* Rubro & articulo charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-medium text-gray-900">Ingresos por rubro</h3>
              <p className="text-xs text-gray-400 mt-0.5">Delivery vs retiro en local — período seleccionado</p>
            </div>
            {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {rubroChartData.labels.length > 0 ? (
            <div className="h-72"><Bar data={rubroChartData} options={RUBRO_CHART_OPTIONS} /></div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 size={28} /><span className="text-sm">Sin datos de rubros para este período</span>
            </div>
          )}
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-medium text-gray-900">Ingresos por artículo</h3>
              <p className="text-xs text-gray-400 mt-0.5">Artículos ordenados por ingresos generados</p>
            </div>
            {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {articuloChartData.labels.length > 0 ? (
            <div className="h-72"><Bar data={articuloChartData} options={ARTICULO_CHART_OPTIONS} /></div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Package size={28} /><span className="text-sm">Sin datos de artículos para este período</span>
            </div>
          )}
        </Card>
      </div>

      {/* Article detail table */}
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
                    const pct = totalIngresosArticulos > 0 ? ((a.ingresos / totalIngresosArticulos) * 100).toFixed(1) : '0';
                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-4 text-gray-800 font-medium">{a.articulo}</td>
                        <td className="py-2 pr-4 text-right text-gray-600">{a.cantidad.toLocaleString('es-AR')}</td>
                        <td className="py-2 pr-4 text-right font-semibold text-gray-900">{formatCurrency(a.ingresos)}</td>
                        <td className="py-2 text-right">
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{pct}%</span>
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
                    <td className="py-2 pr-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(totalIngresosArticulos)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Payment & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Formas de pago (período)">
          <div className="space-y-4">
            {[
              { label: 'Efectivo',    count: paymentBreakdown.efectivo, color: 'bg-emerald-500' },
              { label: 'MercadoPago', count: paymentBreakdown.mp,       color: 'bg-blue-500' },
              { label: 'Tarjeta',     count: paymentBreakdown.tarjeta,  color: 'bg-purple-500' },
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

        <Card title="Resumen general">
          <div className="space-y-3">
            {[
              { label: 'Total ventas históricas', value: formatCurrency(totalVentas) },
              { label: 'Total pedidos históricos', value: String(totalPedidos) },
              { label: 'Productos vendidos', value: totalProductosVendidos.toLocaleString('es-AR') },
              { label: 'Clientes registrados', value: String(totalCustomers) },
              { label: 'Ticket promedio global', value: totalPedidos > 0 ? formatCurrency(totalVentas / totalPedidos) : '-' },
              { label: 'Productos destacados', value: String(topProducts.length) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-600">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
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
  );
};

export default WebTab;
