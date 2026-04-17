import type { PedidoResponse } from '../types/order';

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function filterByRange(pedidos: PedidoResponse[], range: string): PedidoResponse[] {
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
      return pedidos.filter((p) => { const d = new Date(p.fechaPedido); return d >= from && d < to; });
    }
    case 'week':   from = new Date(now); from.setDate(from.getDate() - 7); break;
    case 'month':  from = new Date(now.getFullYear(), now.getMonth(), 1); break;
    case 'quarter': from = new Date(now); from.setMonth(from.getMonth() - 3); break;
    case 'year':   from = new Date(now.getFullYear(), 0, 1); break;
    default:       from = new Date(0);
  }

  return pedidos.filter((p) => new Date(p.fechaPedido) >= from);
}

export function groupByMonth(pedidos: PedidoResponse[]): number[] {
  const totals = new Array(12).fill(0);
  pedidos.forEach((p) => { totals[new Date(p.fechaPedido).getMonth()] += p.total; });
  return totals;
}

export function formatCurrency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

export function rangeToDateParams(range: string): { desde?: string; hasta?: string } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  switch (range) {
    case 'today':   { const d = fmt(now); return { desde: d, hasta: d }; }
    case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); const d = fmt(y); return { desde: d, hasta: d }; }
    case 'week':    { const f = new Date(now); f.setDate(f.getDate() - 7); return { desde: fmt(f), hasta: fmt(now) }; }
    case 'month':   return { desde: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), hasta: fmt(now) };
    case 'quarter': { const f = new Date(now); f.setMonth(f.getMonth() - 3); return { desde: fmt(f), hasta: fmt(now) }; }
    case 'year':    return { desde: fmt(new Date(now.getFullYear(), 0, 1)), hasta: fmt(now) };
    default:        return {};
  }
}

export const RUBRO_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' as const } },
  scales: {
    x: { stacked: true, grid: { display: false } },
    y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
  },
};

export const ARTICULO_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y' as const,
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
    y: { grid: { display: false } },
  },
};
