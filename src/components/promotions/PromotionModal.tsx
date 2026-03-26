import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Promotion } from '../../types';
import { updatePromotion, createPromotion } from '../../api/promotions';
import { fetchAllProducts } from '../../api/products';

interface MenuItem {
  id: string;
  denominacion: string;
  precioVenta: number;
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: Promotion;
  mode: 'create' | 'edit';
  onSuccess: () => void;
}

export default function PromotionModal({
  isOpen,
  onClose,
  promotion,
  mode,
  onSuccess,
}: PromotionModalProps) {
  // 🔥 ESTADO SIMPLE - SOLO LO ESENCIAL
  const [formData, setFormData] = useState<any>({
    denominacion: '',
    fechaDesde: '',
    fechaHasta: '',
    descripcionDescuento: '',
    descuentoPorcentaje: '',
    alcance: 'TODOS',
    activa: true,
    articulosIncluidos: [],
  });

  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar productos cuando se abre
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  // Cargar datos si es edición
  useEffect(() => {
    if (promotion && mode === 'edit') {
      console.log('📝 Cargando promoción:', promotion);
      
      // 🔧 FIX: Manejo correcto de fechas sin problemas de zona horaria
      const formatDateForInput = (dateString: string) => {
        if (!dateString) return '';
        // Crear fecha local sin conversión UTC
        const date = new Date(dateString + 'T00:00:00');
        return date.getFullYear() + '-' + 
               String(date.getMonth() + 1).padStart(2, '0') + '-' + 
               String(date.getDate()).padStart(2, '0');
      };
      
      setFormData({
        ...promotion,
        fechaDesde: formatDateForInput(promotion.fechaDesde),
        fechaHasta: formatDateForInput(promotion.fechaHasta),
        articulosIncluidos: promotion.articulosIncluidos || [],
      });
    } else {
      // Reset para crear nueva
      setFormData({
        denominacion: '',
        fechaDesde: '',
        fechaHasta: '',
        descripcionDescuento: '',
        descuentoPorcentaje: '',
        alcance: 'TODOS',
        activa: true,
        articulosIncluidos: [],
      });
    }
  }, [promotion, mode]);

  const loadProducts = async () => {
    try {
      const data = await fetchAllProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error);
    }
  };

  // 🔥 AGREGAR PRODUCTO - SIMPLE Y DIRECTO
  const addProduct = () => {
    if (products.length === 0) return;
    
    const firstProduct = products[0];
    const newProduct = { 
      id: parseInt(firstProduct.id), 
      denominacion: firstProduct.denominacion 
    };
    
    setFormData({
      ...formData,
      articulosIncluidos: [...(formData.articulosIncluidos || []), newProduct]
    });
    
    console.log('✅ Producto agregado:', newProduct.denominacion);
  };

  // 🔥 CAMBIAR PRODUCTO - DIRECTO AL GRANO
  const changeProduct = (index: number, productId: string) => {
    const selectedProduct = products.find(p => p.id === productId);
    if (!selectedProduct) return;
    
    const updatedProduct = { 
      id: parseInt(selectedProduct.id), 
      denominacion: selectedProduct.denominacion 
    };
    
    const updatedProducts = [...(formData.articulosIncluidos || [])];
    updatedProducts[index] = updatedProduct;
    
    setFormData({
      ...formData,
      articulosIncluidos: updatedProducts
    });
    
    console.log('✅ Producto cambiado a:', selectedProduct.denominacion);
  };

  // 🔥 REMOVER PRODUCTO - SIMPLE
  const removeProduct = (index: number) => {
    const updatedProducts = [...(formData.articulosIncluidos || [])];
    const removedProduct = updatedProducts[index];
    updatedProducts.splice(index, 1);
    
    setFormData({
      ...formData,
      articulosIncluidos: updatedProducts
    });
    
    console.log('🗑️ Producto removido:', removedProduct?.denominacion);
  };

  // 🔥 ENVIAR FORMULARIO - SIN COMPLICACIONES
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 🔧 FIX: Formatear fechas correctamente antes de enviar
      const formatDateForAPI = (dateString: string) => {
        if (!dateString) return '';
        // Asegurar formato YYYY-MM-DD para la API
        return dateString; // Los inputs de fecha ya están en formato correcto
      };

      const promocionData = {
        ...formData,
        fechaDesde: formatDateForAPI(formData.fechaDesde),
        fechaHasta: formatDateForAPI(formData.fechaHasta),
        tipoPromocion: formData.tipoPromocion || 'PROMOCION_1',
        prioridad: formData.prioridad || 1
      };

      console.log('📤 Enviando promoción con fechas corregidas:', promocionData);

      if (mode === 'create') {
        await createPromotion(promocionData);
        console.log('✅ Promoción creada');
      } else {
        await updatePromotion(formData.id, promocionData);
        console.log('✅ Promoción actualizada');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('❌ Error guardando promoción:', error);
      alert('Error al guardar la promoción: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">
            {mode === 'create' ? 'Crear Promoción' : 'Editar Promoción'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          
          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Input
              label="Nombre de la Promoción *"
              value={formData.denominacion}
              onChange={(e) => setFormData({...formData, denominacion: e.target.value})}
              required
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Alcance *
              </label>
              <select
                value={formData.alcance}
                onChange={(e) => setFormData({...formData, alcance: e.target.value, articulosIncluidos: []})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TODOS">Todos los productos</option>
                <option value="PRODUCTOS">Productos específicos</option>
              </select>
            </div>

            <Input
              label="Fecha de Inicio *"
              type="date"
              value={formData.fechaDesde}
              onChange={(e) => setFormData({...formData, fechaDesde: e.target.value})}
              required
            />

            <Input
              label="Fecha de Fin *"
              type="date"
              value={formData.fechaHasta}
              onChange={(e) => setFormData({...formData, fechaHasta: e.target.value})}
              required
            />
          </div>

          {/* Descripción y descuento */}
          <div className="mb-6">
            <Input
              label="Descripción del Descuento *"
              value={formData.descripcionDescuento}
              onChange={(e) => setFormData({...formData, descripcionDescuento: e.target.value})}
              placeholder="Ej: 20% de descuento en cervezas"
              required
            />
          </div>

          <div className="mb-6">
            <Input
              label="Porcentaje de Descuento (%) *"
              type="number"
              min="1"
              max="100"
              value={formData.descuentoPorcentaje}
              onChange={(e) => setFormData({...formData, descuentoPorcentaje: parseInt(e.target.value) || ''})}
              placeholder="Ej: 20"
              required
            />
          </div>

          {/* 🔥 PRODUCTOS ESPECÍFICOS - AQUÍ ESTÁ LA MAGIA */}
          {formData.alcance === 'PRODUCTOS' && (
            <div className="border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Productos Incluidos</h3>
                <Button
                  type="button"
                  onClick={addProduct}
                  variant="outline"
                  size="sm"
                  disabled={products.length === 0}
                >
                  <Plus size={16} className="mr-1" />
                  Agregar Producto
                </Button>
              </div>

              {formData.articulosIncluidos?.map((producto: any, index: number) => (
                <div key={index} className="flex items-center gap-4 mb-3 p-3 border rounded-lg bg-gray-50">
                  <select
                    value={producto.id}
                    onChange={(e) => changeProduct(index, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar producto</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.denominacion} - ${product.precioVenta}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={() => removeProduct(index)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}

              {/* Mensaje cuando no hay productos */}
              {(!formData.articulosIncluidos || formData.articulosIncluidos.length === 0) && (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-lg mb-2">😊 No hay productos seleccionados</div>
                  <div className="text-sm">
                    Haga clic en "Agregar Producto" para comenzar
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Botones */}
          <div className="flex justify-end gap-3 pt-6 border-t mt-8">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : mode === 'create' ? 'Crear Promoción' : 'Actualizar Promoción'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
