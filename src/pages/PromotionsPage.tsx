import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PromotionModal from '../components/promotions/PromotionModal';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Calendar, 
  Percent, 
  DollarSign,
  Tag,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { Promotion } from '../types';
import { 
  obtenerTodasPromociones, 
  eliminarPromocion
} from '../api/promotions';

const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  console.log('🎉 === PÁGINA DE PROMOCIONES INICIALIZADA ===');

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    console.log('📋 Cargando promociones...');
    try {
      setLoading(true);
      const response = await obtenerTodasPromociones();
      console.log('✅ Promociones obtenidas (ya filtradas por el backend):', response?.length || 0);
      
      if (response && response.length > 0) {
        console.log('🔍 DEBUG - Promoción ejemplo:', JSON.stringify(response[0], null, 2));
      }
      
      // Convertir Promocion[] a Promotion[] agregando campos faltantes
      const convertedPromotions = response.map(promo => ({
        ...promo,
        eliminado: false, // El backend ya filtró las eliminadas
        promoDetalles: promo.promoDetalles || [],
        imagenes: promo.imagenes || [],
        // Mantener los campos del backend si existen
        articulosIncluidos: promo.articulosIncluidos || [],
        categoriasIncluidas: promo.categoriasIncluidas || [],
        tagsIncluidos: promo.tagsIncluidos || [],
        // Mapear campos del backend a la interfaz del frontend
        descuentoPorcentaje: promo.descuentoPorcentaje,
        precioPromocional: promo.precioPromocional,
        activa: promo.activa ?? true,
      } as Promotion));
      setPromotions(convertedPromotions);
    } catch (error) {
      console.error('❌ Error cargando promociones:', error);
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (promotionId: number) => {
    console.log(`🗑️ Eliminando promoción ID: ${promotionId}`);
    try {
      await eliminarPromocion(promotionId);
      console.log('✅ Promoción eliminada exitosamente');
      await loadPromotions();
    } catch (error) {
      console.error('❌ Error eliminando promoción:', error);
      alert('Error al eliminar la promoción. Por favor, inténtalo de nuevo.');
    } finally {
      setShowDeleteConfirm(null);
    }
  };

  const openModal = (promotion?: Promotion) => {
    console.log(`📝 Abriendo modal para ${promotion ? 'editar' : 'crear'} promoción`);
    setSelectedPromotion(promotion);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPromotion(undefined);
  };

  // Función para determinar si una promoción está activa
  const isPromotionActive = (promotion: Promotion): boolean => {
    const now = new Date();
    const startDate = new Date(promotion.fechaDesde);
    const endDate = new Date(promotion.fechaHasta);
    return now >= startDate && now <= endDate && promotion.activa;
  };

  // Función para determinar el estado de la promoción
  const getPromotionStatus = (promotion: Promotion): { label: string; variant: 'success' | 'warning' | 'danger' | 'secondary' } => {
    const now = new Date();
    const startDate = new Date(promotion.fechaDesde);
    const endDate = new Date(promotion.fechaHasta);

    if (!promotion.activa) {
      return { label: 'Inactiva', variant: 'secondary' };
    } else if (now < startDate) {
      return { label: 'Programada', variant: 'warning' };
    } else if (now >= startDate && now <= endDate) {
      return { label: 'Activa', variant: 'success' };
    } else {
      return { label: 'Expirada', variant: 'danger' };
    }
  };

  // Filtrar promociones
  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = promotion.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (promotion.descripcionDescuento || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !selectedType || promotion.tipoPromocion === selectedType;
    return matchesSearch && matchesType && !promotion.eliminado;
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Encabezado */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Promociones</h1>
          <p className="text-gray-600">Gestiona promociones y happy hours del restaurante</p>
        </div>
        <Button 
          variant="primary" 
          icon={<Plus size={18} />}
          onClick={() => openModal()}
        >
          Nueva Promoción
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar promociones..."
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            <option value="HAPPYHOUR">Happy Hour</option>
            <option value="PROMOCION_1">Promoción</option>
            <option value="DESCUENTO_ESPECIAL">Descuento Especial</option>
            <option value="OFERTA_LIMITADA">Oferta Limitada</option>
          </select>
        </div>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-center">
            <Tag className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-lg font-semibold text-gray-900">{promotions.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Activas</p>
              <p className="text-lg font-semibold text-gray-900">
                {promotions.filter(p => isPromotionActive(p)).length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Programadas</p>
              <p className="text-lg font-semibold text-gray-900">
                {promotions.filter(p => new Date(p.fechaDesde) > new Date()).length}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center">
            <XCircle className="h-8 w-8 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Expiradas</p>
              <p className="text-lg font-semibold text-gray-900">
                {promotions.filter(p => new Date(p.fechaHasta) < new Date()).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista de promociones */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredPromotions.map((promotion) => {
          const status = getPromotionStatus(promotion);
          return (
            <Card key={promotion.id} className="overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800 mb-1">{promotion.denominacion}</h3>
                  <Badge variant={status.variant} size="sm">
                    {status.label}
                  </Badge>
                </div>
                <Badge 
                  variant={promotion.tipoPromocion === 'HAPPYHOUR' ? 'info' : 'secondary'}
                  size="sm"
                >
                  {promotion.tipoPromocion === 'HAPPYHOUR' ? 'Happy Hour' : 'Promoción'}
                </Badge>
              </div>

              <div className="text-sm space-y-2 mb-4">
                <div className="flex items-center text-gray-600">
                  <Calendar size={14} className="mr-2" />
                  <span>
                    {new Date(promotion.fechaDesde).toLocaleDateString()} - {' '}
                    {new Date(promotion.fechaHasta).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center text-gray-600">
                  {promotion.descuentoPorcentaje ? (
                    <Percent size={14} className="mr-2" />
                  ) : (
                    <DollarSign size={14} className="mr-2" />
                  )}
                  <span>
                    {promotion.descuentoPorcentaje 
                      ? `${promotion.descuentoPorcentaje}% de descuento`
                      : promotion.precioPromocional
                      ? `Precio promocional: $${promotion.precioPromocional}`
                      : 'Ver detalles'
                    }
                  </span>
                </div>

                {promotion.descripcionDescuento && (
                  <p className="text-xs text-gray-500 italic">
                    {promotion.descripcionDescuento}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Edit size={16} />}
                  onClick={() => openModal(promotion)}
                >
                  Editar
                </Button>
                {showDeleteConfirm === promotion.id ? (
                  <div className="flex space-x-1">
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={() => handleDelete(promotion.id)}
                    >
                      Confirmar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDeleteConfirm(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={() => setShowDeleteConfirm(promotion.id)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </Card>
          );
        })}

        {filteredPromotions.length === 0 && (
          <div className="col-span-full text-center py-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <Tag size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                No se encontraron promociones
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedType 
                  ? 'No hay promociones que coincidan con los filtros aplicados.' 
                  : 'Aún no hay promociones creadas.'}
              </p>
              <Button 
                variant="primary" 
                onClick={() => openModal()}
                icon={<Plus size={18} />}
              >
                Crear primera promoción
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de promociones */}
      <PromotionModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={loadPromotions}
        promotion={selectedPromotion}
        mode={selectedPromotion ? 'edit' : 'create'}
      />
    </Layout>
  );
};

export default PromotionsPage;