import React from 'react';
import { ProductSearch } from '../components/pos/ProductSearch';
import { CartView } from '../components/pos/CartView';
import { PaymentModal } from '../components/pos/PaymentModal';
import { OfflineIndicator } from '../components/pos/OfflineIndicator';
import { SalesSummary } from '../components/pos/SalesSummary';
import { usePOSStore } from '../store/posStore';
import Layout from '../components/layout/Layout';

const POSPage: React.FC = () => {
  const { showPaymentModal } = usePOSStore();



  return (
    <Layout>
      <div className="p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
            <p className="text-gray-600 mt-1">
              Gestione las ventas directas del local
            </p>
          </div>
          
          {/* Indicador de estado */}
          <OfflineIndicator />
        </div>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Columna izquierda: Búsqueda y estadísticas */}
        <div className="xl:col-span-2 space-y-6">
          {/* Buscador de productos */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Buscar Productos
            </h2>
            <ProductSearch />
          </div>

          {/* Resumen de ventas del día */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Resumen del día
              </h2>
              <span className="text-sm text-gray-500">
                {new Date().toLocaleDateString('es-AR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <SalesSummary />
          </div>
        </div>

        {/* Columna derecha: Carrito */}
        <div className="xl:col-span-1">
          <div className="sticky top-4">
            <CartView />
          </div>
        </div>
      </div>

      {/* Modal de pago */}
      {showPaymentModal && <PaymentModal />}
      </div>
    </Layout>
  );
};

export default POSPage;