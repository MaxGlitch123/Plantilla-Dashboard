import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../ui/Button';
import { updateSupplyPrice } from '../../api/supplies';
import { Supply } from '../../types/supply';

interface PriceUpdateModalProps {
  supply: Supply | null;
  onClose: () => void;
  onUpdate: () => void;
}

interface AffectedProduct {
  id: number;
  denominacion: string;
  precioAnterior: number;
  precioNuevo: number;
  diferencia: number;
  porcentaje: number;
}

const PriceUpdateModal: React.FC<PriceUpdateModalProps> = ({ supply, onClose, onUpdate }) => {
  const [newPrice, setNewPrice] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [affectedProducts, setAffectedProducts] = useState<AffectedProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updateComplete, setUpdateComplete] = useState<boolean>(false);

  useEffect(() => {
    if (supply) {
      setNewPrice(supply.precioCompra.toString());
    }
  }, [supply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supply) return;

    const priceValue = parseFloat(newPrice);
    
    // Validaciones de MercadoPago
    if (isNaN(priceValue) || priceValue <= 0) {
      setError('El precio debe ser un número positivo');
      return;
    }

    if (priceValue > 999999) {
      setError('El precio máximo es $999,999 (límite de MercadoPago y sistemas de pago)');
      return;
    }

    if ((priceValue * 100) % 1 !== 0) {
      setError('El precio solo puede tener hasta 2 decimales');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await updateSupplyPrice(supply.id, priceValue);
      
      // Procesar productos afectados
      const affected: AffectedProduct[] = Array.isArray(result.updatedProducts) 
        ? result.updatedProducts.map((product: any) => ({
            id: product.id,
            denominacion: product.denominacion,
            precioAnterior: product.precioAnterior || 0,
            precioNuevo: product.precioVenta || 0,
            diferencia: (product.precioVenta || 0) - (product.precioAnterior || 0),
            porcentaje: product.precioAnterior ? ((product.precioVenta - product.precioAnterior) / product.precioAnterior) * 100 : 0
          }))
        : [];
      
      setAffectedProducts(affected);
      setUpdateComplete(true);
    } catch (err) {
      console.error('Error al actualizar el precio:', err);
      setError('No se pudo actualizar el precio. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    onUpdate();
    onClose();
  };

  if (!supply) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Actualizar precio de insumo</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {!updateComplete ? (
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-lg">Insumo: {supply.denominacion}</h3>
                <p className="text-sm text-gray-500">
                  Cambiar el precio de este insumo actualizará automáticamente los precios de todos los productos manufacturados que lo utilizan.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio de compra actual
                  </label>
                  <div className="bg-gray-100 p-2 rounded border text-gray-700">
                    ${supply.precioCompra.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Nuevo precio de compra
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="newPrice"
                      step="0.01"
                      min="0.01"
                      max="999999"
                      value={newPrice}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const value = parseFloat(inputValue);
                        
                        // Validar límite máximo en tiempo real
                        if (value > 999999) {
                          alert('⚠️ Precio muy alto\n\nEl precio máximo permitido es $999,999.\n\nEste límite garantiza compatibilidad con MercadoPago y otros sistemas de pago.');
                          e.target.value = newPrice; // Mantener el valor anterior
                          return;
                        }
                        
                        setNewPrice(inputValue);
                      }}
                      className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                      placeholder="150.50"
                    />
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    💡 Máximo: $999,999 (compatible con sistemas de pago online)
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 bg-red-50 p-3 rounded border border-red-200">
                  {error}
                </div>
              )}

              <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
                <h4 className="font-medium text-amber-800">Información importante</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Al cambiar el precio de este insumo, los precios de venta de todos los productos manufacturados
                  que lo utilizan se actualizarán automáticamente. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Actualizando...' : 'Actualizar precio'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <h3 className="text-green-800 font-medium flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Precio actualizado correctamente
              </h3>
              <p className="text-green-700 text-sm mt-1">
                El precio del insumo "{supply.denominacion}" ha sido actualizado a ${parseFloat(newPrice).toFixed(2)}.
              </p>
            </div>

            <h3 className="font-medium text-lg mb-3">Productos afectados: {affectedProducts.length}</h3>
            
            {affectedProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio anterior
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nuevo precio
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Diferencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {affectedProducts.map((product) => (
                      <tr key={product.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.denominacion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          ${product.precioAnterior.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className="font-medium text-gray-900">
                            ${product.precioNuevo.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${product.diferencia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.diferencia >= 0 ? '+' : ''}{product.diferencia.toFixed(2)}
                            <span className="text-xs ml-1">
                              ({product.diferencia >= 0 ? '+' : ''}{product.porcentaje.toFixed(1)}%)
                            </span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 italic">No hay productos manufacturados que utilicen este insumo.</p>
            )}

            <div className="mt-6 flex justify-end">
              <Button variant="primary" onClick={handleFinish}>
                Finalizar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceUpdateModal;
