import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import type { BadgeVariant } from '../components/ui/Badge';
import {
  Search,
  Truck,
  MapPin,
  User,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Package
} from 'lucide-react';
import { fetchPedidos } from '../api/orders';
import { updatePedidoEstado } from '../api/orders';
import type { PedidoResponse, PedidoEstado } from '../types/order';

// ── Helpers ──────────────────────────────────────────────

const statusConfig: Record<PedidoEstado, { label: string; variant: BadgeVariant }> = {
  PENDIENTE: { label: 'Pendiente', variant: 'warning' },
  PREPARACION: { label: 'En preparación', variant: 'info' },
  LISTO: { label: 'Listo para enviar', variant: 'primary' },
  ENTREGADO: { label: 'Entregado', variant: 'success' },
  CANCELADO: { label: 'Cancelado', variant: 'danger' },
};

function statusIcon(estado: PedidoEstado) {
  switch (estado) {
    case 'ENTREGADO': return <CheckCircle size={14} />;
    case 'CANCELADO': return <AlertCircle size={14} />;
    default: return <Truck size={14} />;
  }
}

function formatAddress(pedido: PedidoResponse): string {
  if (!pedido.domicilio) return 'Sin dirección de entrega';
  const d = pedido.domicilio;
  let addr = `${d.calle} ${d.numero}`;
  if (d.piso) addr += `, Piso ${d.piso}`;
  if (d.nroDpto) addr += `, Dpto ${d.nroDpto}`;
  if (d.localidad) {
    if (typeof d.localidad === 'string') {
      addr += `, ${d.localidad}`;
    } else {
      addr += `, ${d.localidad.nombre}`;
    }
  }
  return addr;
}

function formatCurrency(n: number): string {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

// ── Component ────────────────────────────────────────────

const DeliveryPage: React.FC = () => {
  const [allOrders, setAllOrders] = useState<PedidoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>('active');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const pedidos = await fetchPedidos();
      // Solo delivery
      const delivery = pedidos.filter((p) => p.tipoEnvio === 'DELIVERY');
      setAllOrders(delivery);
    } catch (e) {
      console.error('Error loading delivery orders:', e);
      setError('No se pudieron cargar los pedidos de delivery.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filtrado
  const filtered = useMemo(() => {
    let list = allOrders;

    // Tab filter
    if (activeTab === 'active') {
      list = list.filter((p) => ['PENDIENTE', 'PREPARACION', 'LISTO'].includes(p.estado));
    } else if (activeTab === 'completed') {
      list = list.filter((p) => ['ENTREGADO', 'CANCELADO'].includes(p.estado));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          (p.numeroPedido || String(p.id)).toLowerCase().includes(q) ||
          p.cliente?.nombre?.toLowerCase().includes(q) ||
          p.cliente?.apellido?.toLowerCase().includes(q)
      );
    }

    // Sort: active first by estado priority, then by date
    return list.sort((a, b) => {
      const priority: Record<string, number> = { LISTO: 0, PREPARACION: 1, PENDIENTE: 2, ENTREGADO: 3, CANCELADO: 4 };
      const pa = priority[a.estado] ?? 5;
      const pb = priority[b.estado] ?? 5;
      if (pa !== pb) return pa - pb;
      return new Date(b.fechaPedido).getTime() - new Date(a.fechaPedido).getTime();
    });
  }, [allOrders, activeTab, search]);

  // Counts
  const activeCount = allOrders.filter((p) => ['PENDIENTE', 'PREPARACION', 'LISTO'].includes(p.estado)).length;
  const completedCount = allOrders.filter((p) => ['ENTREGADO', 'CANCELADO'].includes(p.estado)).length;

  // Status change
  const handleStatusChange = async (id: number, nuevoEstado: PedidoEstado) => {
    setUpdatingId(id);
    try {
      await updatePedidoEstado(id, nuevoEstado);
      setAllOrders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p))
      );
    } catch (e) {
      console.error('Error updating status:', e);
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Render ────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="animate-spin text-red-600" size={40} />
          <span className="ml-3 text-gray-600">Cargando entregas...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <p className="text-red-600 text-lg">{error}</p>
          <Button variant="primary" icon={<RefreshCw size={16} />} onClick={loadOrders}>
            Reintentar
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Gestión de Entregas</h1>
          <p className="text-gray-600">
            {allOrders.length} pedidos delivery — {activeCount} activos
          </p>
        </div>
        <Button variant="outline" icon={<RefreshCw size={16} />} onClick={loadOrders}>
          Actualizar
        </Button>
      </div>

      {/* Tabs & search */}
      <div className="bg-white p-4 mb-6 rounded-lg shadow-md">
        <div className="flex flex-wrap border-b border-gray-200">
          {([
            { id: 'active' as const, label: 'Activas', count: activeCount },
            { id: 'completed' as const, label: 'Completadas', count: completedCount },
            { id: 'all' as const, label: 'Todas', count: allOrders.length },
          ]).map((tab) => (
            <button
              key={tab.id}
              className={`mr-8 py-4 text-sm font-medium border-b-2 ${
                activeTab === tab.id
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
              <span className="ml-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por # de pedido o cliente..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={48} className="mx-auto mb-3" />
          <p className="text-lg">No hay pedidos de delivery en esta sección</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((pedido) => {
            const cfg = statusConfig[pedido.estado];
            const isUpdating = updatingId === pedido.id;

            return (
              <Card
                key={pedido.id}
                className={`overflow-hidden hover:shadow-lg transition-shadow border-l-4 ${
                  pedido.estado === 'ENTREGADO'
                    ? 'border-emerald-500'
                    : pedido.estado === 'CANCELADO'
                    ? 'border-red-500'
                    : pedido.estado === 'LISTO'
                    ? 'border-blue-500'
                    : 'border-amber-500'
                }`}
              >
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-800">
                      Pedido #{pedido.numeroPedido || pedido.id}
                    </h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock size={14} />
                      <span>
                        {new Date(pedido.fechaPedido).toLocaleString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {pedido.tiempoEstimadoMinutos > 0 && (
                        <span className="text-gray-400">· {pedido.tiempoEstimadoMinutos} min</span>
                      )}
                    </div>
                  </div>
                  <Badge variant={cfg.variant} icon={statusIcon(pedido.estado)}>
                    {cfg.label}
                  </Badge>
                </div>

                {/* Address & client */}
                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin size={16} className="text-gray-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-800">{formatAddress(pedido)}</span>
                  </div>
                  {pedido.cliente && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <User size={16} className="text-gray-500 flex-shrink-0" />
                        <span className="text-gray-800">
                          {pedido.cliente.nombre} {pedido.cliente.apellido}
                        </span>
                      </div>
                      {pedido.cliente.telefono && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={16} className="text-gray-500 flex-shrink-0" />
                          <span className="text-gray-800">{pedido.cliente.telefono}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Total:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(pedido.total)}</span>
                  </div>
                  {pedido.formaPago && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-500 text-sm">Pago:</span>
                      <span className="text-sm text-gray-700">
                        {pedido.formaPago === 'EFECTIVO' ? 'Efectivo' : pedido.formaPago === 'MERCADO_PAGO' ? 'MercadoPago' : 'Tarjeta'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {pedido.estado === 'LISTO' && (
                  <div className="mt-4 flex justify-end space-x-2">
                    <Button
                      variant="success"
                      size="sm"
                      icon={<CheckCircle size={14} />}
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(pedido.id, 'ENTREGADO')}
                    >
                      {isUpdating ? 'Actualizando...' : 'Marcar entregado'}
                    </Button>
                  </div>
                )}

                {pedido.estado === 'PREPARACION' && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Package size={14} />}
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(pedido.id, 'LISTO')}
                    >
                      {isUpdating ? 'Actualizando...' : 'Marcar listo'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default DeliveryPage;
