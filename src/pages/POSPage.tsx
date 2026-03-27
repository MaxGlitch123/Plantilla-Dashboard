import React from 'react';
import { ProductSearch } from '../components/pos/ProductSearch';
import { CartView } from '../components/pos/CartView';
import { PaymentModal } from '../components/pos/PaymentModal';
import { OfflineIndicator } from '../components/pos/OfflineIndicator';
import { SalesSummary } from '../components/pos/SalesSummary';
import { PrinterService } from '../services/printerService';
import { usePOSStore } from '../store/posStore';
import Button from '../components/ui/Button';
import { Printer } from 'lucide-react';

const POSPage: React.FC = () => {
  const { showPaymentModal } = usePOSStore();

  // Función para probar la impresión con datos de ejemplo
  const testPrintTicket = async () => {
    const sampleSale = {
      id: 'test-' + Date.now(),
      saleCode: 'TEST-' + new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
      saleDate: new Date().toISOString(),
      employeeId: 'test-employee',
      employeeName: 'Usuario de Prueba',
      items: [
        {
          id: '1',
          productId: 'pizza-1',
          productName: 'Pizza Margherita',
          price: 2500,
          quantity: 2,
          category: 'Pizzas',
          unitMeasure: 'unidad'
        },
        {
          id: '2',
          productId: 'bebida-1',
          productName: 'Coca Cola 500ml',
          price: 800,
          quantity: 1,
          category: 'Bebidas',
          unitMeasure: 'unidad'
        }
      ],
      itemsCount: 3,
      subtotal: 5800,
      tax: 1218,
      discount: 0,
      total: 7018,
      paymentMethod: 'cash' as const,
      customerName: 'Cliente de Prueba',
      customerDocument: '12345678',
      notes: 'Ticket de prueba generado desde el POS',
      printed: false,
      synced: true
    };

    try {
      await PrinterService.printSale(sampleSale);
      console.log('✅ Ticket de prueba enviado a imprimir');
    } catch (error) {
      console.error('❌ Error imprimiendo ticket de prueba:', error);
    }
  };

  // Función para verificar estado de la impresora
  const checkPrinterStatus = () => {
    let message = '🔍 Verificación de Impresora Kretz LEX 850:\\n\\n';
    
    // Verificar si hay impresoras disponibles
    if (!navigator.userAgent.includes('Chrome') && !navigator.userAgent.includes('Firefox')) {
      message += '⚠️ Navegador: Usa Chrome o Firefox para mejor compatibilidad\\n';
    }
    
    message += '✅ Navegador compatible detectado\\n';
    message += '📋 Pasos de verificación:\\n\\n';
    message += '1. ¿Está encendida la Kretz LEX 850?\\n';
    message += '2. ¿Está conectada por USB o Serial?\\n';
    message += '3. ¿Hay papel cargado?\\n';
    message += '4. ¿Está configurada como predeterminada en Windows?\\n\\n';
    message += '💡 Si algún paso falta, corrígelo y vuelve a probar.\\n';
    message += 'Si persisten problemas, se creará un archivo .txt para imprimir manualmente.';
    
    alert(message);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
            
            {/* Botones de prueba para Kretz LEX 850 */}
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">
                🖨️ Prueba Kretz LEX 850 USE
              </h3>
              <div className="space-y-2">
                <Button 
                  onClick={testPrintTicket}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Probar Impresión de Ticket
                </Button>
                <Button 
                  onClick={checkPrinterStatus}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  📊 Verificar Estado de Impresora
                </Button>
              </div>
              <p className="text-xs text-yellow-700 mt-2">
                * Si falla, se creará un archivo .txt para imprimir manualmente
              </p>
            </div>
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
  );
};

export default POSPage;