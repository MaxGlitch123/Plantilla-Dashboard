import React, { useState } from 'react';
import { Minus, Plus, Trash2, Package } from 'lucide-react';
import { CartItem } from '../../types/pos';
import { usePOSStore } from '../../store/posStore';

interface CartItemProps {
  item: CartItem;
}

export const CartItemComponent: React.FC<CartItemProps> = ({ item }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const { updateQuantity, removeFromCart } = usePOSStore();

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemove();
      return;
    }

    setIsUpdating(true);
    try {
      updateQuantity(item.productId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemove = () => {
    if (confirm(`¿Eliminar ${item.productName} del carrito?`)) {
      removeFromCart(item.productId);
    }
  };

  const itemTotal = item.price * item.quantity;

  return (
    <div className="flex items-center space-x-3 py-3 px-2 border-b border-gray-100 hover:bg-gray-50 rounded-lg">
      {/* Imagen del producto */}
      <div className="flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.productName}
            className="w-12 h-12 object-cover rounded-md bg-gray-100"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded-md flex items-center justify-center">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
        )}
      </div>

      {/* Información del producto */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {item.productName}
        </h3>
        
        <div className="flex items-center space-x-2 mt-1">
          <span className="text-sm text-gray-500">
            ${item.price.toFixed(2)}
            {item.unitMeasure && ` / ${item.unitMeasure}`}
          </span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            {item.category}
          </span>
        </div>
      </div>

      {/* Controles de cantidad */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          disabled={isUpdating}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="w-12 text-center">
          <span className="text-lg font-semibold">
            {item.quantity}
          </span>
        </div>

        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          disabled={isUpdating}
          className="p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Total del item */}
      <div className="flex flex-col items-end space-y-2">
        <span className="text-lg font-bold text-green-600">
          ${itemTotal.toFixed(2)}
        </span>
        
        <button
          onClick={handleRemove}
          className="p-1 rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors"
          title="Eliminar producto"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};