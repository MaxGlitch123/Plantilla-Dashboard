import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import Button from '../ui/Button';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: number; denominacion: string; esInsumo: boolean }) => Promise<void>;
  initialData?: {
    id?: number;
    denominacion: string;
    esInsumo: boolean;
  };
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [denominacion, setDenominacion] = useState(initialData?.denominacion || '');
  const [esInsumo, setEsInsumo] = useState(initialData?.esInsumo || false);
  const [loading, setLoading] = useState(false);

  // Actualizar el estado cuando cambian los datos iniciales
  useEffect(() => {
    if (initialData) {
      setDenominacion(initialData.denominacion || '');
      setEsInsumo(initialData.esInsumo || false);
    } else {
      setDenominacion('');
      setEsInsumo(false);
    }
  }, [initialData, isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!denominacion.trim()) return;

    try {
      setLoading(true);
      await onSave({
        id: initialData?.id,
        denominacion,
        esInsumo
      });
    } catch (error) {
      console.error('Error al guardar categoría:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="fixed inset-0 z-10 overflow-y-auto" onClose={onClose}>
        <div className="min-h-screen px-4 text-center">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          {/* Esta técnica centra el modal */}
          <span className="inline-block h-screen align-middle" aria-hidden="true">
            &#8203;
          </span>
          
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex justify-between items-center mb-6">
                <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                  {initialData?.id ? 'Editar Categoría' : 'Nueva Categoría'}
                </Dialog.Title>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={onClose}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave}>
                <div className="mb-4">
                  <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la categoría
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Ej: Bebidas, Postres, etc."
                    value={denominacion}
                    onChange={(e) => setDenominacion(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                      checked={esInsumo}
                      onChange={(e) => setEsInsumo(e.target.checked)}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Es categoría de insumos
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Marca esta opción si la categoría es para insumos y no para productos finales.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !denominacion.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CategoryModal;
