import React from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from '../ui/Button';

interface StockWarningModalProps {
  insufficientItems: Array<{
    insumoId: number;
    nombre: string;
    stockActual: number;
    stockRequerido: number;
    faltante: number;
  }>;
  onClose: () => void;
  onContinue?: () => void; // Opcional: función para continuar a pesar de stock insuficiente
}

const StockWarningModal: React.FC<StockWarningModalProps> = ({ 
  insufficientItems, 
  onClose,
  onContinue 
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="bg--50 p-4 rounded-t-lg border-b border-red-100">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={24} />
            <h2 className="text-xl font-semibold text-red-700">Stock insuficiente</h2>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-gray-700 mb-4">
            No hay suficiente stock para procesar este pedido. Los siguientes insumos tienen stock insuficiente:
          </p>
          
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumo</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock actual</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Requerido</th>
                  <th className="py-2 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Faltante</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {insufficientItems.map((item) => (
                  <tr key={item.insumoId} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.nombre}</td>
                    <td className="py-3 px-4 text-sm text-gray-500 text-right">{item.stockActual}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right">{item.stockRequerido}</td>
                    <td className="py-3 px-4 text-sm text-red-600 font-medium text-right">{item.faltante}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200 mb-6">
            <h4 className="font-medium text-amber-800 mb-1">Recomendaciones:</h4>
            <ul className="text-sm text-amber-700 list-disc pl-5">
              <li>Modifique su pedido para reducir la cantidad de productos</li>
              <li>Elija productos alternativos que no utilicen estos insumos</li>
              <li>Intente nuevamente más tarde cuando se haya repuesto el stock</li>
            </ul>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button onClick={onClose} variant="primary">
              Cancelar
            </Button>
            {onContinue && (
              <Button onClick={onContinue} variant="danger">
                Continuar de todos modos
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockWarningModal;
