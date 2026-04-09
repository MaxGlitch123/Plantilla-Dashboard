import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { CartItemComponent } from './CartItem';
import { usePOSStore } from '../../store/posStore';
import Button from '../ui/Button';

export const CartView: React.FC = () => {
  const { cart, clearCart, setShowPaymentModal } = usePOSStore();

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal;
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleClearCart = () => {
    if (cart.length > 0 && confirm('¿Vaciar todo el carrito?')) {
      clearCart();
    }
  };

  const handleCheckout = () => {
    if (cart.length > 0) {
      setShowPaymentModal(true);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border">
      {/* Header del carrito */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Carrito ({itemCount})
          </h2>
        </div>
        
        {cart.length > 0 && (
          <button
            onClick={handleClearCart}
            className="text-sm text-red-600 hover:text-red-800 hover:underline"
          >
            Vaciar
          </button>
        )}
      </div>

      {/* Lista de productos en el carrito */}
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6">
            <div>
              <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">
                Carrito vacío
              </h3>
              <p className="text-sm text-gray-400">
                Busque productos y agréguelos al carrito
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {cart.map((item) => (
              <CartItemComponent key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Totales y acciones */}
      {cart.length > 0 && (
        <div className="border-t bg-gray-50 p-4 space-y-4">
          {/* Resumen de totales */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            
            <div className="border-t pt-2">
              <div className="flex justify-between">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-green-600">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Advertencias */}
          {subtotal < 100 && (
            <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Venta pequeña</p>
                <p>Considere verificar si el cliente desea agregar algo más.</p>
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="space-y-2">
            <Button
              onClick={handleCheckout}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
              size="lg"
            >
              Procesar Pago • ${total.toFixed(2)}
            </Button>
            
            <Button
              onClick={handleClearCart}
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
            >
              Vaciar Carrito
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};