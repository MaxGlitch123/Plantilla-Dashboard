import React, { useMemo } from 'react';
import Card from '../ui/Card';
import { BarChart2, DollarSign, Loader2, Package, ShoppingBag } from 'lucide-react';
import { Bar } from 'react-chartjs-2';
import type { VentaArticuloItem, VentaRubroItem, PosResumen, PosFormaPagoItem } from '../../api/dashboard';
import { formatCurrency, ARTICULO_CHART_OPTIONS } from '../../utils/reportUtils';

interface Props {
  posResumen: PosResumen;
  posArticulos: VentaArticuloItem[];
  posRubros: VentaRubroItem[];
  posFormaPago: PosFormaPagoItem[];
  loadingDetalle: boolean;
}

const PosTab: React.FC<Props> = ({ posResumen, posArticulos, posRubros, posFormaPago, loadingDetalle }) => {
  const rubroChartData = useMemo(() => ({
    labels: posRubros.map((r) => r.rubro),
    datasets: [{ label: 'Ingresos ($)', data: posRubros.map((r) => r.ingresos), backgroundColor: 'rgba(220, 38, 38, 0.8)', borderRadius: 4 }],
  }), [posRubros]);

  const articuloChartData = useMemo(() => ({
    labels: posArticulos.map((a) => a.articulo),
    datasets: [{ label: 'Ingresos ($)', data: posArticulos.map((a) => a.ingresos), backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 4 }],
  }), [posArticulos]);

  const totalIngresos = useMemo(() => posArticulos.reduce((s, a) => s + a.ingresos, 0), [posArticulos]);

  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        {[
          { label: 'Ingresos POS', value: formatCurrency(posResumen.ingresos), footnote: 'Período seleccionado', icon: <DollarSign size={24} />, bg: 'bg-amber-100 text-amber-600' },
          { label: 'Ventas realizadas', value: String(posResumen.totalVentas), footnote: 'Solo ventas activas', icon: <ShoppingBag size={24} />, bg: 'bg-red-100 text-red-600' },
          { label: 'Ticket promedio', value: formatCurrency(posResumen.ticketPromedio), footnote: 'Promedio por venta', icon: <BarChart2 size={24} />, bg: 'bg-emerald-100 text-emerald-600' },
        ].map(({ label, value, footnote, icon, bg }) => (
          <Card key={label}>
            <div className="flex justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
              </div>
              <div className={`p-2 rounded-full ${bg}`}>{icon}</div>
            </div>
            <div className="mt-4 text-sm text-gray-500">{footnote}</div>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-medium text-gray-900">Ingresos por rubro</h3>
              <p className="text-xs text-gray-400 mt-0.5">Agrupado por categoría — período seleccionado</p>
            </div>
            {loadingDetalle && <Loader2 size={16} className="animate-spin text-gray-400" />}
          </div>
          {rubroChartData.labels.length > 0 ? (
            <div className="h-72"><Bar data={rubroChartData} options={ARTICULO_CHART_OPTIONS} /></div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <BarChart2 size={28} /><span className="text-sm">Sin ventas POS en este período</span>
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
          {articuloChartData.labels.length > 0 ? (
            <div className="h-72"><Bar data={articuloChartData} options={ARTICULO_CHART_OPTIONS} /></div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Package size={28} /><span className="text-sm">Sin ventas POS en este período</span>
            </div>
          )}
        </Card>
      </div>

      {/* Payment methods & article table */}
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
                      <td className="py-2 text-right text-sm font-semibold text-gray-900">{formatCurrency(totalIngresos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
};

export default PosTab;
