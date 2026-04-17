import React, { useState } from 'react';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { Calendar, Download, Loader2, RefreshCw } from 'lucide-react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { useReportsData } from '../hooks/useReportsData';
import { filterByRange } from '../utils/reportUtils';
import PosTab from '../components/reports/PosTab';
import WebTab from '../components/reports/WebTab';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// Active tab — currently only POS is shown (web reserved for future use)
const activeTab: 'pos' | 'web' = 'pos';

const ReportsPage: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const data = useReportsData(dateRange);

  const handleExport = () => {
    const filtered = filterByRange(data.allPedidos, dateRange);
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

  if (data.loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-red-600" size={40} />
          <span className="ml-3 text-gray-600">Cargando reportes...</span>
        </div>
      </Layout>
    );
  }

  if (data.error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-600 text-lg">{data.error}</p>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={data.loadData}>
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
          <Button variant="outline" icon={<Download size={16} />} onClick={handleExport}>Exportar CSV</Button>
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={data.loadData}>Actualizar</Button>
        </div>
      </div>

      {activeTab === 'pos' && (
        <PosTab
          posResumen={data.posResumen}
          posArticulos={data.posArticulos}
          posRubros={data.posRubros}
          posFormaPago={data.posFormaPago}
          loadingDetalle={data.loadingDetalle}
        />
      )}
      {activeTab === 'web' && (
        <WebTab
          allPedidos={data.allPedidos}
          dateRange={dateRange}
          totalVentas={data.totalVentas}
          totalPedidos={data.totalPedidos}
          totalProductosVendidos={data.totalProductosVendidos}
          totalCustomers={data.totalCustomers}
          topProducts={data.topProducts}
          ventasPorRubroEnvio={data.ventasPorRubroEnvio}
          ventasPorArticulo={data.ventasPorArticulo}
          loadingDetalle={data.loadingDetalle}
        />
      )}
    </Layout>
  );
};

export default ReportsPage;
