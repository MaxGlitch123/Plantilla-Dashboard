import React, { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Smartphone, Printer, AlertCircle } from 'lucide-react';
import { usePOSStore } from '../../store/posStore';
import { POSService } from '../../services/posService';
import { OfflineService } from '../../services/offlineService';
import { PrinterService } from '../../services/printerService';
import { PaymentDetails } from '../../types/pos';
import Button from '../ui/Button';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const PaymentModal: React.FC = () => {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerDocument, setCustomerDocument] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isOnline = useOnlineStatus();
  const { 
    cart, 
    showPaymentModal, 
    setShowPaymentModal, 
    completeSale, 
    setOfflineMode 
  } = usePOSStore();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = subtotal * 0.21;
  const total = subtotal + tax;
  const receivedAmountNum = parseFloat(receivedAmount) || 0;
  const change = paymentMethod === 'cash' ? Math.max(0, receivedAmountNum - total) : 0;

  // Setear el monto recibido automáticamente para otros métodos de pago
  useEffect(() => {
    if (paymentMethod !== 'cash') {
      setReceivedAmount(total.toFixed(2));
    }
  }, [paymentMethod, total]);

  // Actualizar estado offline
  useEffect(() => {
    setOfflineMode(!isOnline);
  }, [isOnline, setOfflineMode]);

  const handleClose = () => {
    if (!processing) {
      setShowPaymentModal(false);
      setError(null);
      setReceivedAmount('');
      setCustomerName('');
      setCustomerDocument('');
    }
  };

  const handlePayment = async () => {
    setError(null);

    // Validaciones
    if (cart.length === 0) {
      setError('El carrito está vacío');
      return;
    }

    if (paymentMethod === 'cash' && receivedAmountNum < total) {
      setError('El monto recibido debe ser mayor o igual al total');
      return;
    }

    setProcessing(true);

    try {
      // Crear detalles del pago
      const paymentDetails: PaymentDetails = {
        method: paymentMethod,
        amount: total,
        receivedAmount: receivedAmountNum,
        change: change
      };

      // Completar la venta
      const sale = await completeSale(paymentDetails, {
        name: customerName || undefined,
        document: customerDocument || undefined
      });

      // Guardar venta localmente
      await POSService.saveSaleLocally(sale);

      // Si está online, intentar enviar al servidor
      if (isOnline) {
        try {
          await POSService.uploadSale(sale);
          console.log('✅ Venta sincronizada inmediatamente');
        } catch (error) {
          console.log('⚠️ Error sincronizando, se guardará para más tarde');
          await OfflineService.savePendingSale(sale);
        }
      } else {
        // Si está offline, guardar para sincronización posterior
        await OfflineService.savePendingSale(sale);
      }

      // Guardar como última venta para reimpresión
      localStorage.setItem('pos-last-sale', JSON.stringify(sale));

      // Imprimir ticket automáticamente
      try {
        await PrinterService.printSale(sale);
      } catch (printError) {
        console.warn('Error imprimiendo ticket:', printError);
        // No mostrar error, la venta ya se completó
      }

      // Notificar a otros componentes (SalesSummary) que hubo una nueva venta
      window.dispatchEvent(new CustomEvent('pos-sale-completed', { detail: sale }));

      // Mostrar notificación de éxito
      const message = `✅ Venta ${sale.saleCode} completada`;
      if (!isOnline) {
        console.log(message + ' (se sincronizará cuando haya conexión)');
      } else {
        console.log(message);
      }

      // Cerrar modal
      handleClose();

    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error instanceof Error ? error.message : 'Error procesando el pago');
    } finally {
      setProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !processing) {
      handlePayment();
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  if (!showPaymentModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Procesar Pago</h2>
            <p className="text-sm text-gray-600 mt-1">
              Total: <span className="font-bold text-green-600">${total.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={processing}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6" onKeyDown={handleKeyPress}>
          {/* Estado de conexión */}
          {!isOnline && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">
                Modo offline - La venta se sincronizará cuando haya conexión
              </span>
            </div>
          )}

          {/* Métodos de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Método de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'cash'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Banknote className="h-6 w-6 mb-1" />
                <span className="text-sm">Efectivo</span>
              </button>
              
              <button
                onClick={() => setPaymentMethod('card')}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-6 w-6 mb-1" />
                <span className="text-sm">Tarjeta</span>
              </button>
              
              <button
                onClick={() => setPaymentMethod('transfer')}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                  paymentMethod === 'transfer'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className="h-6 w-6 mb-1" />
                <span className="text-sm">Transfer</span>
              </button>
            </div>
          </div>

          {/* Monto recibido (solo para efectivo) */}
          {paymentMethod === 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Monto recibido
              </label>
              <input
                type="number"
                step="0.01"
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-right text-lg font-mono"
                placeholder="0.00"
                autoFocus
              />
              {change > 0 && (
                <p className="mt-2 text-sm">
                  Vuelto: <span className="font-bold text-red-600">${change.toFixed(2)}</span>
                </p>
              )}
            </div>
          )}

          {/* Información del cliente (opcional) */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Cliente (opcional)</h3>
            
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nombre del cliente"
            />
            
            <input
              type="text"
              value={customerDocument}
              onChange={(e) => setCustomerDocument(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="DNI / CUIT (opcional)"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Resumen */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>IVA (21%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="border-t pt-2">
              <div className="flex justify-between font-bold">
                <span>Total:</span>
                <span className="text-green-600">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={processing}
              className="flex-1"
            >
              Cancelar
            </Button>
            
            <Button
              onClick={handlePayment}
              disabled={processing || (paymentMethod === 'cash' && receivedAmountNum < total)}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {processing ? 'Procesando...' : (
                <div className="flex items-center justify-center space-x-2">
                  <Printer className="h-4 w-4" />
                  <span>Cobrar</span>
                </div>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};