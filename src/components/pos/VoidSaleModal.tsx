import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface VoidSaleModalProps {
  saleCode: string;
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

const VoidSaleModal: React.FC<VoidSaleModalProps> = ({ saleCode, onConfirm, onClose }) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!reason.trim()) {
      setError('Debe ingresar un motivo para anular la venta');
      return;
    }
    if (reason.trim().length < 5) {
      setError('El motivo debe tener al menos 5 caracteres');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await onConfirm(reason.trim());
    } catch (err: any) {
      setError(err.message || 'Error al anular la venta');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Anular Venta</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full" disabled={loading}>
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Está a punto de anular la venta <strong>{saleCode}</strong>. 
              Esta acción restaurará el stock de los productos vendidos.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo de anulación *
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="Ingrese el motivo de la anulación..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={3}
              disabled={loading}
              maxLength={500}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
            disabled={loading || !reason.trim()}
          >
            {loading ? 'Anulando...' : 'Confirmar Anulación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoidSaleModal;
