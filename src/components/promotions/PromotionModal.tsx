import React, { useEffect, useState, useMemo } from 'react';
import { X, Search, AlertCircle, Clock, Info, Package, Tag } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Promotion } from '../../types';
import { updatePromotion, createPromotion } from '../../api/promotions';
import { fetchAllProducts } from '../../api/products';
import { fetchCategories, FlatCategory } from '../../api/categories';

// ── Types ────────────────────────────────────────────

interface MenuItem {
  id: string;
  denominacion: string;
  precioVenta: number;
  categoria?: { id: string; denominacion: string };
}

type TipoPromocion = 'PROMOCION_1' | 'HAPPYHOUR' | 'DESCUENTO_ESPECIAL' | 'OFERTA_LIMITADA';
type Alcance = 'TODOS' | 'PRODUCTOS' | 'CATEGORIAS';

interface FormData {
  denominacion: string;
  fechaDesde: string;
  fechaHasta: string;
  horaDesde: string;
  horaHasta: string;
  descripcionDescuento: string;
  tipoPromocion: TipoPromocion;
  alcance: Alcance;
  descuentoPorcentaje: number | '';
  precioPromocional: number | '';
  cantidadMaxima: number | '';
  montoMinimo: number | '';
  activa: boolean;
  prioridad: number;
  articulosIncluidos: { id: number; denominacion?: string }[];
  categoriasIncluidas: { id: number; denominacion?: string }[];
}

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  promotion?: Promotion;
  mode: 'create' | 'edit';
  onSuccess: () => void;
}

// ── Defaults ───────────────────────────────────────────

const emptyForm: FormData = {
  denominacion: '',
  fechaDesde: '',
  fechaHasta: '',
  horaDesde: '',
  horaHasta: '',
  descripcionDescuento: '',
  tipoPromocion: 'PROMOCION_1',
  alcance: 'TODOS',
  descuentoPorcentaje: '',
  precioPromocional: '',
  cantidadMaxima: '',
  montoMinimo: '',
  activa: true,
  prioridad: 1,
  articulosIncluidos: [],
  categoriasIncluidas: [],
};

const TIPO_LABELS: Record<TipoPromocion, { label: string; desc: string }> = {
  PROMOCION_1: { label: 'Promoción estándar', desc: 'Descuento por porcentaje o precio fijo' },
  HAPPYHOUR: { label: 'Happy Hour', desc: 'Descuento en horario específico' },
  DESCUENTO_ESPECIAL: { label: 'Descuento especial', desc: 'Oferta exclusiva por tiempo limitado' },
  OFERTA_LIMITADA: { label: 'Oferta limitada', desc: 'Cantidad de unidades limitadas' },
};

const ALCANCE_LABELS: Record<Alcance, { label: string; desc: string; icon: React.ReactNode }> = {
  TODOS: { label: 'Todos los productos', desc: 'Se aplica a todo el menú', icon: <Package size={18} /> },
  CATEGORIAS: { label: 'Por categoría', desc: 'Todos los productos de las categorías elegidas', icon: <Tag size={18} /> },
  PRODUCTOS: { label: 'Productos específicos', desc: 'Solo los productos que selecciones', icon: <Search size={18} /> },
};

// ── Helpers ────────────────────────────────────────────

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0');
};

// ── Component ──────────────────────────────────────────

export default function PromotionModal({ isOpen, onClose, promotion, mode, onSuccess }: PromotionModalProps) {
  const [form, setForm] = useState<FormData>(emptyForm);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2>(1);

  // Load products and categories
  useEffect(() => {
    if (isOpen) {
      Promise.all([fetchAllProducts(), fetchCategories()])
        .then(([prods, cats]) => {
          setProducts(prods || []);
          setCategories(cats.filter(c => !c.deleted) || []);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Initialize form on open
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setErrors([]);
    setProductSearch('');

    if (promotion && mode === 'edit') {
      setForm({
        denominacion: promotion.denominacion || '',
        fechaDesde: formatDateForInput(promotion.fechaDesde),
        fechaHasta: formatDateForInput(promotion.fechaHasta),
        horaDesde: (promotion as any).horaDesde || '',
        horaHasta: (promotion as any).horaHasta || '',
        descripcionDescuento: promotion.descripcionDescuento || '',
        tipoPromocion: (promotion.tipoPromocion as TipoPromocion) || 'PROMOCION_1',
        alcance: (promotion.alcance as Alcance) || 'TODOS',
        descuentoPorcentaje: promotion.descuentoPorcentaje ?? '',
        precioPromocional: promotion.precioPromocional ?? '',
        cantidadMaxima: promotion.cantidadMaxima ?? '',
        montoMinimo: promotion.montoMinimo ?? '',
        activa: promotion.activa ?? true,
        prioridad: promotion.prioridad ?? 1,
        articulosIncluidos: promotion.articulosIncluidos || [],
        categoriasIncluidas: promotion.categoriasIncluidas || [],
      });
    } else {
      setForm(emptyForm);
    }
  }, [isOpen, promotion, mode]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.denominacion.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Selected IDs for quick lookup
  const selectedProductIds = useMemo(
    () => new Set(form.articulosIncluidos.map(a => a.id)),
    [form.articulosIncluidos]
  );

  const selectedCategoryIds = useMemo(
    () => new Set(form.categoriasIncluidas.map(c => c.id)),
    [form.categoriasIncluidas]
  );

  // ── Handlers ───────────────────────────────────

  const update = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const toggleProduct = (product: MenuItem) => {
    const id = parseInt(product.id);
    if (selectedProductIds.has(id)) {
      update('articulosIncluidos', form.articulosIncluidos.filter(a => a.id !== id));
    } else {
      update('articulosIncluidos', [...form.articulosIncluidos, { id, denominacion: product.denominacion }]);
    }
  };

  const toggleCategory = (cat: FlatCategory) => {
    if (selectedCategoryIds.has(cat.id)) {
      update('categoriasIncluidas', form.categoriasIncluidas.filter(c => c.id !== cat.id));
    } else {
      update('categoriasIncluidas', [...form.categoriasIncluidas, { id: cat.id, denominacion: cat.denominacion }]);
    }
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!form.denominacion.trim()) errs.push('El nombre es obligatorio');
    if (!form.fechaDesde) errs.push('La fecha de inicio es obligatoria');
    if (!form.fechaHasta) errs.push('La fecha de fin es obligatoria');
    if (form.fechaDesde && form.fechaHasta && form.fechaDesde >= form.fechaHasta) {
      errs.push('La fecha de inicio debe ser anterior a la de fin');
    }
    if (!form.descuentoPorcentaje && !form.precioPromocional) {
      errs.push('Debés indicar un % de descuento o un precio promocional');
    }
    if (form.descuentoPorcentaje && form.precioPromocional) {
      errs.push('No podés poner descuento % y precio fijo a la vez. Elegí uno');
    }
    if (form.tipoPromocion === 'HAPPYHOUR' && (!form.horaDesde || !form.horaHasta)) {
      errs.push('Happy Hour requiere horario de inicio y fin');
    }
    if (form.alcance === 'PRODUCTOS' && form.articulosIncluidos.length === 0) {
      errs.push('Seleccioná al menos un producto');
    }
    if (form.alcance === 'CATEGORIAS' && form.categoriasIncluidas.length === 0) {
      errs.push('Seleccioná al menos una categoría');
    }
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: any = {
        ...form,
        descuentoPorcentaje: form.descuentoPorcentaje || undefined,
        precioPromocional: form.precioPromocional || undefined,
        cantidadMaxima: form.cantidadMaxima || undefined,
        montoMinimo: form.montoMinimo || undefined,
        horaDesde: form.horaDesde || undefined,
        horaHasta: form.horaHasta || undefined,
      };

      // Clean fields per alcance
      if (form.alcance !== 'PRODUCTOS') payload.articulosIncluidos = [];
      if (form.alcance !== 'CATEGORIAS') payload.categoriasIncluidas = [];

      if (mode === 'create') {
        await createPromotion(payload);
      } else if (promotion) {
        await updatePromotion(promotion.id, { ...payload, id: promotion.id });
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Error al guardar la promoción']);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'create' ? 'Crear Promoción' : 'Editar Promoción'}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {step === 1 ? 'Paso 1 — Información básica y descuento' : 'Paso 2 — ¿A qué productos aplica?'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <ul className="text-sm text-red-700 space-y-0.5">
                {errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* ── STEP 1: Basic info ── */}
          {step === 1 && (
            <>
              {/* Name */}
              <Input
                label="Nombre de la promoción *"
                placeholder="Ej: 2x1 en empanadas, Happy Hour cerveza..."
                value={form.denominacion}
                onChange={e => update('denominacion', e.target.value)}
              />

              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de promoción</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(TIPO_LABELS) as [TipoPromocion, { label: string; desc: string }][]).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update('tipoPromocion', key)}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        form.tipoPromocion === key
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-800">{val.label}</p>
                      <p className="text-xs text-gray-500">{val.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Fecha de inicio *"
                  type="date"
                  value={form.fechaDesde}
                  onChange={e => update('fechaDesde', e.target.value)}
                />
                <Input
                  label="Fecha de fin *"
                  type="date"
                  value={form.fechaHasta}
                  onChange={e => update('fechaHasta', e.target.value)}
                />
              </div>

              {/* Happy Hour times */}
              {form.tipoPromocion === 'HAPPYHOUR' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock size={16} className="text-amber-600" />
                    <span className="text-sm font-medium text-amber-800">Horario del Happy Hour</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Desde"
                      type="time"
                      value={form.horaDesde}
                      onChange={e => update('horaDesde', e.target.value)}
                    />
                    <Input
                      label="Hasta"
                      type="time"
                      value={form.horaHasta}
                      onChange={e => update('horaHasta', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción del descuento *</label>
                <textarea
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Ej: 20% de descuento en todas las empanadas de lunes a viernes"
                  value={form.descripcionDescuento}
                  onChange={e => update('descripcionDescuento', e.target.value)}
                />
              </div>

              {/* Discount type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de descuento *</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Porcentaje de descuento (%)"
                      type="number"
                      min="1"
                      max="100"
                      placeholder="Ej: 20"
                      value={form.descuentoPorcentaje === '' ? '' : String(form.descuentoPorcentaje)}
                      onChange={e => {
                        const v = e.target.value ? parseInt(e.target.value) : '' as const;
                        update('descuentoPorcentaje', v);
                        if (v) update('precioPromocional', '');
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1">Se aplica sobre el precio de cada unidad</p>
                  </div>
                  <div>
                    <Input
                      label="O precio promocional fijo ($)"
                      type="number"
                      min="0"
                      placeholder="Ej: 500"
                      value={form.precioPromocional === '' ? '' : String(form.precioPromocional)}
                      onChange={e => {
                        const v = e.target.value ? parseFloat(e.target.value) : '' as const;
                        update('precioPromocional', v);
                        if (v) update('descuentoPorcentaje', '');
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1">Precio fijo independiente del original</p>
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Info size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Límites opcionales</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Input
                      label="Cantidad máxima por pedido"
                      type="number"
                      min="0"
                      placeholder="Sin límite"
                      value={form.cantidadMaxima === '' ? '' : String(form.cantidadMaxima)}
                      onChange={e => update('cantidadMaxima', e.target.value ? parseInt(e.target.value) : '')}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Ej: si ponés 6 y el cliente pide 12, solo 6 tendrán descuento
                    </p>
                  </div>
                  <div>
                    <Input
                      label="Monto mínimo de compra ($)"
                      type="number"
                      min="0"
                      placeholder="Sin mínimo"
                      value={form.montoMinimo === '' ? '' : String(form.montoMinimo)}
                      onChange={e => update('montoMinimo', e.target.value ? parseFloat(e.target.value) : '')}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      El pedido debe superar este monto para que aplique
                    </p>
                  </div>
                </div>
              </div>

              {/* Priority + active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                  <select
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    value={form.prioridad}
                    onChange={e => update('prioridad', parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? '(más alta)' : n === 10 ? '(más baja)' : ''}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Si un producto tiene varias promos, se usa la de mayor prioridad</p>
                </div>
                <div className="flex items-end pb-1">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={form.activa}
                      onChange={e => update('activa', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 relative" />
                    <span className="ml-3 text-sm font-medium text-gray-700">Promoción activa</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {/* ── STEP 2: Scope & products ── */}
          {step === 2 && (
            <>
              {/* Alcance selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">¿A qué productos aplica esta promoción?</label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(ALCANCE_LABELS) as [Alcance, { label: string; desc: string; icon: React.ReactNode }][]).map(([key, val]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => update('alcance', key)}
                      className={`text-left p-3 rounded-lg border-2 transition-colors ${
                        form.alcance === key
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {val.icon}
                        <p className="text-sm font-medium text-gray-800">{val.label}</p>
                      </div>
                      <p className="text-xs text-gray-500">{val.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* TODOS info */}
              {form.alcance === 'TODOS' && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <Info size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-green-700">
                    <p className="font-medium">La promoción se aplica a todo el menú</p>
                    <p className="mt-1">
                      El descuento
                      {form.descuentoPorcentaje ? ` del ${form.descuentoPorcentaje}%` : ''}
                      {form.precioPromocional ? ` (precio fijo $${form.precioPromocional})` : ''}
                      {' '}se aplicará automáticamente a todos los productos.
                    </p>
                  </div>
                </div>
              )}

              {/* Categories picker */}
              {form.alcance === 'CATEGORIAS' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Seleccioná las categorías</h3>
                      <p className="text-xs text-gray-500">Todos los productos de estas categorías tendrán el descuento</p>
                    </div>
                    <span className="text-xs font-medium text-red-600">
                      {form.categoriasIncluidas.length} seleccionada{form.categoriasIncluidas.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Selected chips */}
                  {form.categoriasIncluidas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.categoriasIncluidas.map(cat => (
                        <span
                          key={cat.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 text-red-700"
                        >
                          {cat.denominacion || `Cat #${cat.id}`}
                          <button
                            type="button"
                            onClick={() => toggleCategory({ id: cat.id, denominacion: cat.denominacion || '' })}
                            className="hover:bg-red-200 rounded-full p-0.5"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {categories.map(cat => (
                      <label
                        key={cat.id}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                          selectedCategoryIds.has(cat.id) ? 'bg-red-50' : ''
                        }`}
                      >
                        <span className="text-sm text-gray-700">{cat.denominacion}</span>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          checked={selectedCategoryIds.has(cat.id)}
                          onChange={() => toggleCategory(cat)}
                        />
                      </label>
                    ))}
                    {categories.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">No se encontraron categorías</div>
                    )}
                  </div>

                  {/* Preview: how many products affected */}
                  {form.categoriasIncluidas.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                      <strong>Productos afectados:</strong>{' '}
                      {products.filter(p =>
                        p.categoria && form.categoriasIncluidas.some(c => c.id === parseInt(p.categoria!.id))
                      ).length}{' '}
                      productos recibirán el descuento
                    </div>
                  )}
                </div>
              )}

              {/* Products picker */}
              {form.alcance === 'PRODUCTOS' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700">Seleccioná los productos</h3>
                      <p className="text-xs text-gray-500">Marcá los productos que tendrán el descuento</p>
                    </div>
                    <span className="text-xs font-medium text-red-600">
                      {form.articulosIncluidos.length} seleccionado{form.articulosIncluidos.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Selected chips */}
                  {form.articulosIncluidos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.articulosIncluidos.map(art => (
                        <span
                          key={art.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-full bg-red-100 text-red-700"
                        >
                          {art.denominacion || `#${art.id}`}
                          <button
                            type="button"
                            onClick={() => {
                              update('articulosIncluidos', form.articulosIncluidos.filter(a => a.id !== art.id));
                            }}
                            className="hover:bg-red-200 rounded-full p-0.5"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar producto por nombre..."
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                    {filteredProducts.map(prod => (
                      <label
                        key={prod.id}
                        className={`flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
                          selectedProductIds.has(parseInt(prod.id)) ? 'bg-red-50' : ''
                        }`}
                      >
                        <div>
                          <span className="text-sm text-gray-700">{prod.denominacion}</span>
                          <span className="text-xs text-gray-400 ml-2">
                            ${prod.precioVenta?.toLocaleString('es-AR')}
                            {prod.categoria ? ` · ${prod.categoria.denominacion}` : ''}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                          checked={selectedProductIds.has(parseInt(prod.id))}
                          onChange={() => toggleProduct(prod)}
                        />
                      </label>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        {productSearch ? 'No se encontraron productos' : 'Cargando productos...'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Summary card */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Resumen de la promoción</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><strong>Nombre:</strong> {form.denominacion || '—'}</p>
                  <p><strong>Descuento:</strong>{' '}
                    {form.descuentoPorcentaje ? `${form.descuentoPorcentaje}%` : ''}
                    {form.precioPromocional ? `Precio fijo $${form.precioPromocional}` : ''}
                    {!form.descuentoPorcentaje && !form.precioPromocional ? '—' : ''}
                  </p>
                  <p><strong>Vigencia:</strong> {form.fechaDesde || '—'} al {form.fechaHasta || '—'}</p>
                  {form.tipoPromocion === 'HAPPYHOUR' && form.horaDesde && (
                    <p><strong>Horario:</strong> {form.horaDesde} a {form.horaHasta}</p>
                  )}
                  <p><strong>Aplica a:</strong>{' '}
                    {form.alcance === 'TODOS' && 'Todo el menú'}
                    {form.alcance === 'CATEGORIAS' && `${form.categoriasIncluidas.length} categoría(s)`}
                    {form.alcance === 'PRODUCTOS' && `${form.articulosIncluidos.length} producto(s)`}
                  </p>
                  {form.cantidadMaxima && (
                    <p><strong>Máximo:</strong> {form.cantidadMaxima} unidades con descuento por pedido</p>
                  )}
                  {form.montoMinimo && (
                    <p><strong>Compra mínima:</strong> ${form.montoMinimo}</p>
                  )}
                </div>

                {/* How quantities work */}
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <Info size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    <strong>¿Cómo funciona con cantidades?</strong> Si el cliente pide varias unidades del mismo producto,
                    el descuento se aplica a <strong>cada unidad</strong>
                    {form.cantidadMaxima ? ` (hasta ${form.cantidadMaxima} unidades)` : ''}.
                    Si hay varias promociones para el mismo producto, se aplica solo la de mayor prioridad (no se acumulan).
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${step === 1 ? 'bg-red-500' : 'bg-gray-300'}`} />
            <div className={`w-2.5 h-2.5 rounded-full ${step === 2 ? 'bg-red-500' : 'bg-gray-300'}`} />
            <span className="text-xs text-gray-500 ml-1">Paso {step} de 2</span>
          </div>
          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setErrors([]);
                    const errs: string[] = [];
                    if (!form.denominacion.trim()) errs.push('El nombre es obligatorio');
                    if (!form.fechaDesde) errs.push('La fecha de inicio es obligatoria');
                    if (!form.fechaHasta) errs.push('La fecha de fin es obligatoria');
                    if (!form.descuentoPorcentaje && !form.precioPromocional) {
                      errs.push('Indicá un % de descuento o un precio promocional');
                    }
                    if (form.descuentoPorcentaje && form.precioPromocional) {
                      errs.push('Elegí solo uno: % de descuento o precio fijo');
                    }
                    if (errs.length > 0) {
                      setErrors(errs);
                      return;
                    }
                    setStep(2);
                  }}
                >
                  Siguiente →
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={() => { setStep(1); setErrors([]); }}>
                  ← Atrás
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : mode === 'create' ? 'Crear Promoción' : 'Guardar Cambios'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
