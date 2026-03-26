import React, { useEffect, useState } from 'react';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { MenuItem, ProductDetail } from '../../types/menuItem';
import { Supply } from '../../types/supply';
import { X, Plus, Trash2 } from 'lucide-react';
import { FlatCategory } from '../../api/categories';
import { fetchSupplies } from '../../api/supplies';
import apiClient from '../../api/apiClient';


interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Partial<MenuItem>, image?:File) => Promise<MenuItem>;
  product?: MenuItem;
  categories: FlatCategory[];
}



// Función auxiliar para mostrar unidad de medida como texto
const getUnidadLabel = (unidad: string | { id: number; denominacion: string }) =>
  typeof unidad === 'string' ? unidad : unidad.denominacion;

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  categories,
}) => {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    denominacion: '',
    descripcion: '',
    precioVenta: 0,
    categoriaId: '',
    tiempoEstimadoMinutos: 0,
    preparacion: '',
    detalles: [],
    imagenes: [],
  });
  const [supplies, setSupplies] = useState<Supply[]>([]);

  // Estado para manejar la imagen
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const loadSupplies = async () => {
      try {
        const data = await fetchSupplies();
        const filtered = data.filter((s) => s.esParaElaborar === true);
        setSupplies(filtered);
      } catch (error) {
        console.error('Error al cargar insumos:', error);
      }
    };

    loadSupplies();
  }, []);

  useEffect(() => {
    // Esta es la función que inicializa el formulario con los datos del producto
    const initializeFormData = () => {
      if (product) {
        const categoriaValida = product.categoria && !product.categoria.deleted;
        const initialData = { ...product };

        if (initialData.detalles && initialData.detalles.length > 0 && supplies.length > 0) {
          initialData.detalles = initialData.detalles.map(detalle => {
            const item = detalle.item as Supply;
            if (item && (item.id === 0 || item.id === null || item.id === undefined)) {
              console.warn(`👻 Ingrediente fantasma detectado ('${item.denominacion}'). Reemplazando con el primer insumo real.`);
              const defaultSupply = supplies[0];
              return {
                ...detalle,
                item: defaultSupply, // Reemplazamos el item fantasma por el primer insumo real
              };
            }
            return detalle;
          });
        }

        setFormData({
          ...initialData,
          categoriaId: categoriaValida ? product.categoria.id : '',
          categoria: categoriaValida ? product.categoria : undefined,
        });
      } else {
        setFormData({
          denominacion: '',
          descripcion: '',
          precioVenta: 0,
          categoriaId: '',
          tiempoEstimadoMinutos: 0,
          preparacion: '',
          detalles: [],
          imagenes: [],
        });
      }
      setImageFile(null);
    };

    initializeFormData();
  }, [product, supplies]);
  
  // Efecto separado para cargar las imágenes - evita el bucle infinito
  useEffect(() => {
    // Solo cargar imágenes si tenemos un ID de producto y no hay imágenes ya cargadas
    if (product?.id && (!product.imagenes || product.imagenes.length === 0)) {
      const fetchProductImages = async () => {
        try {
          const response = await apiClient.get(`/images/byEntity`, {
            params: {
              entityId: product.id,
              entityType: 'manufacturado',
            },
          });

          if (response.data.length > 0) {
            // IMPORTANTE: Solo actualizar las imágenes, no todo el formData
            // Esto evita el bucle infinito de actualizaciones
            setFormData((prev) => ({
              ...prev,
              imagenes: [response.data[0].url], // Solo una imagen por ahora
            }));
          }
        } catch (error) {
          console.error('Error al obtener imágenes del producto:', error);
        }
      };

      fetchProductImages();
    }
  }, [product?.id, product?.imagenes]);


  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    
    // Validación básica
    if (!formData.denominacion || !formData.categoriaId || !formData.precioVenta) {
      setSaveError('Por favor completa todos los campos obligatorios');
      return;
    }
    
    // Validaciones de precio para MercadoPago
    if (formData.precioVenta <= 0) {
      setSaveError('El precio debe ser mayor a cero');
      return;
    }
    
    if (formData.precioVenta < 1) {
      setSaveError('El precio mínimo es $1 (requerimiento de MercadoPago)');
      return;
    }
    
    if (formData.precioVenta > 999999) {
      setSaveError('El precio máximo es $999,999 (límite de MercadoPago para pagos online)');
      return;
    }
    
    // Validar que no tenga más de 2 decimales (MercadoPago no acepta centavos de centavos)
    if ((formData.precioVenta * 100) % 1 !== 0) {
      setSaveError('El precio solo puede tener hasta 2 decimales (centavos)');
      return;
    }
    
    
    // Validación adicional para la categoría
    if (!formData.categoria || !formData.categoriaId) {
      setSaveError('Debe seleccionar una categoría para el producto');
      return;
    }
    
    // ✅ VALIDACIÓN DE STOCK ANTES DE CREAR EL PRODUCTO CON NUEVO SERVICIO
    if (formData.detalles && formData.detalles.length > 0) {
      console.log('🔍 === INICIANDO VALIDACIÓN DE STOCK PARA PRODUCTO ===');
      console.log(`📦 Producto: "${formData.denominacion}"`);
      console.log(`🧾 Ingredientes a validar: ${formData.detalles.length}`);
      console.log('🚨 IMPORTANTE: Usando validación para descuento inmediato');
      
      // Importar el nuevo servicio de validación de stock inmediato
      try {
        const { validateStockForImmediateOrder } = await import('../../services/stockValidationService');
        
        // Crear un ítem simulado para validar el stock usando la nueva estructura
        const simulatedItem = {
          articulo: {
            id: 999999, // ID temporal para simulación
            denominacion: formData.denominacion,
            receta: {
              ingredientes: formData.detalles.map(detalle => ({
                insumoId: (detalle.item as any).id,
                cantidad: detalle.cantidad
              }))
            }
          },
          cantidad: 1 // Simular creación de 1 unidad del producto
        };
        
        console.log('🎯 Ítem simulado para validación inmediata:', JSON.stringify(simulatedItem, null, 2));
        
        const stockValidation = await validateStockForImmediateOrder([simulatedItem]);
        
        console.log('📊 === RESULTADO DE VALIDACIÓN DE STOCK INMEDIATO ===');
        console.log(`✅ ¿Stock suficiente?: ${stockValidation.isValid ? 'SÍ' : 'NO'}`);
        
        // Mostrar impacto estimado en inventario
        if (stockValidation.estimatedImpact && stockValidation.estimatedImpact.length > 0) {
          console.log('📊 === IMPACTO ESTIMADO EN INVENTARIO ===');
          stockValidation.estimatedImpact.forEach(item => {
            console.log(`   ${item.nombre}: ${item.stockActual} -> ${item.stockDespues} ${item.criticalLevel ? '⚠️ CRÍTICO' : '✅'}`);
          });
        }
        
        if (stockValidation.isValid) {
          console.log('🎉 ¡STOCK SUFICIENTE! El producto se puede crear sin problemas');
          
          // Verificar si algunos insumos quedarán en nivel crítico
          const criticalItems = stockValidation.estimatedImpact?.filter(item => item.criticalLevel) || [];
          if (criticalItems.length > 0) {
            console.log('⚠️ ADVERTENCIA: Algunos insumos quedarán en nivel crítico');
            const criticalList = criticalItems.map(item => 
              `• ${item.nombre}: ${item.stockActual} -> ${item.stockDespues}`
            ).join('\n');
            
            const shouldProceed = confirm(
              `⚠️ ADVERTENCIA: Stock crítico después de la producción\n\n` +
              `Los siguientes insumos quedarán en nivel crítico:\n\n${criticalList}\n\n` +
              `¿Desea continuar creando el producto?`
            );
            
            if (!shouldProceed) {
              console.log('🛑 Usuario canceló la creación por stock crítico');
              setSaveError('Creación cancelada: Algunos insumos quedarían en nivel crítico');
              return;
            }
          }
        } else {
          console.log('❌ STOCK INSUFICIENTE para crear este producto');
          console.log('🚫 Ingredientes con stock insuficiente:');
          stockValidation.insufficientStockItems?.forEach(item => {
            console.log(`   - ${item.nombre}: necesita ${item.stockRequerido}, disponible: ${item.stockActual} (falta: ${item.faltante})`);
          });
          
          // MOSTRAR ALERTA AL USUARIO SOBRE STOCK INSUFICIENTE
          const insufficientItems = stockValidation.insufficientStockItems || [];
          const itemsList = insufficientItems.map(item => 
            `• ${item.nombre}: necesita ${item.stockRequerido}, disponible: ${item.stockActual}`
          ).join('\n');
          
          const shouldProceed = confirm(
            `❌ STOCK INSUFICIENTE para crear este producto\n\n` +
            `Los siguientes ingredientes no tienen suficiente stock:\n\n${itemsList}\n\n` +
            `IMPORTANTE: Con el sistema de descuento inmediato, el stock se descontará al momento de confirmar pedidos.\n\n` +
            `¿Desea continuar creando el producto de todas formas?\n\n` +
            `Nota: El producto se creará pero no podrá ser producido hasta que haya suficiente stock de ingredientes.`
          );
          
          if (!shouldProceed) {
            console.log('🛑 Usuario canceló la creación por stock insuficiente');
            setSaveError('Creación cancelada: Stock insuficiente para los ingredientes necesarios');
            return;
          } else {
            console.log('⚠️ Usuario decidió continuar a pesar del stock insuficiente');
          }
        }
        
        // Mostrar advertencia adicional si hay warning general
        if (stockValidation.warning) {
          console.warn(`⚠️ ${stockValidation.warning}`);
        }
        
      } catch (validationError) {
        console.error('❌ Error en la validación de stock inmediato:', validationError);
        const shouldProceed = confirm(
          'Error al validar stock de ingredientes.\n\n¿Desea continuar creando el producto sin validación?'
        );
        
        if (!shouldProceed) {
          console.log('🛑 Usuario canceló por error de validación');
          setSaveError('Creación cancelada: Error al validar stock de ingredientes');
          return;
        }
        console.log('⚠️ Continuando con la creación del producto (validación falló)');
      }
      
      console.log('🔍 === FIN DE VALIDACIÓN DE STOCK INMEDIATO ===');
    } else {
      console.log('ℹ️ Producto sin ingredientes - no se requiere validación de stock');
    }
    
    // Mostrar datos que se enviarán para debug
    console.log('📤 Datos completos a enviar:', JSON.stringify(formData, null, 2));
    
    // Verificar con detalle la categoría enviada
    if (formData.categoria) {
      console.log('📋 Categoría enviada: ID:', formData.categoriaId);
      console.log('📋 Objeto categoria:', JSON.stringify(formData.categoria, null, 2));
      
      // Verificar que ambos valores coincidan
      if (String(formData.categoria.id) !== String(formData.categoriaId)) {
        console.warn('⚠️ INCONSISTENCIA: formData.categoriaId y formData.categoria.id no coinciden');
        // Corregir la inconsistencia
        const updatedCategoria = { ...formData.categoria, id: formData.categoriaId };
        setFormData(prev => ({ ...prev, categoria: updatedCategoria }));
        console.log('🔄 Corrigiendo inconsistencia en categoria');
      }
    } else {
      console.warn('⚠️ No se ha seleccionado una categoría');
    }
    
    // Verificar con detalle los ingredientes
    if (formData.detalles && formData.detalles.length > 0) {
      console.log('📋 Detalles enviados:', formData.detalles.length, 'ingredientes');
      formData.detalles.forEach((det, i) => {
        console.log(`   Ingrediente ${i+1}: ${(det.item as any).denominacion}, cantidad: ${det.cantidad}`);
      });
    } else {
      console.log('📋 No hay ingredientes para este producto');
    }
    
    // Intentar guardar
    try {
      console.log('⏳ Enviando datos al servidor...');
      
      // No es necesario modificar la estructura de formData, ya que onSave ya hace las transformaciones necesarias
      // Solo asegurar que la categoría esté correctamente asignada
      console.log('🔄 Datos finales con categoría:', JSON.stringify(formData.categoria, null, 2));
      
      const result = await onSave(formData, imageFile ?? undefined);
      console.log('✅ Producto guardado exitosamente:', result);
      
      // Verificar exhaustivamente que la respuesta contenga la categoría
      if (result.categoria) {
        console.log('✅ Categoría recibida en respuesta:', JSON.stringify(result.categoria, null, 2));
      } else {
        console.warn('⚠️ La respuesta no incluye información de categoría');
      }
      
      // Verificar exhaustivamente que la respuesta contenga los detalles
      if (result.detalles && result.detalles.length > 0) {
        console.log('✅ Detalles recibidos en respuesta:', result.detalles.length, 'ingredientes');
      } else {
        console.warn('⚠️ La respuesta no incluye detalles o está vacía');
      }
      
      // Mostrar mensaje de éxito al usuario con información detallada y feedback sobre lo que funcionó o falló
      const isUpdate = Boolean(product?.id);
      
      // Verificar si la categoría se actualizó correctamente
      const solicitedCategoryId = formData.categoria?.id || formData.categoriaId;
      const resultCategoryId = result.categoria?.id;
      const categoriaUpdated = solicitedCategoryId && (String(solicitedCategoryId) === String(resultCategoryId));
      
      // Mensaje para categoría con retroalimentación clara
      let categoriaText;
      if (result.categoria?.denominacion) {
        if (categoriaUpdated) {
          categoriaText = `✅ Categoría: ${result.categoria?.denominacion} (ID: ${result.categoria?.id})`;
        } else {
          // Si no coincide, mostrar información más detallada
          categoriaText = `⚠️ Categoría: ${result.categoria?.denominacion} (ID: ${result.categoria?.id})
              La categoría guardada no coincide con la seleccionada (${formData.categoria?.denominacion}, ID: ${formData.categoriaId})`;
          
          console.warn(`⚠️ Inconsistencia en categoría: Solicitada=${solicitedCategoryId}, Recibida=${resultCategoryId}`);
        }
      } else {
        categoriaText = '⚠️ No se ha podido asignar una categoría al producto';
      }
      
      // Verificar si los ingredientes se actualizaron
      const detallesCount = result.detalles?.length || 0;
      const expectedDetallesCount = formData.detalles?.length || 0;
      const detallesUpdated = detallesCount === expectedDetallesCount;
      
      // Mensaje para ingredientes
      const detallesText = result.detalles?.length > 0
        ? (detallesUpdated
            ? `✅ ${result.detalles.length} ingredientes guardados correctamente`
            : `⚠️ ${result.detalles.length} ingredientes guardados (esperados: ${expectedDetallesCount})`)
        : '⚠️ No hay ingredientes asociados al producto';
      
      // Mensaje para imagen
      const imageText = (result.imagenes && result.imagenes.length > 0) || imageFile
        ? '✅ Imagen del producto guardada'
        : '⚠️ El producto no tiene imagen';
      

      // Mostrar mensaje con recomendaciones específicas si algo no funcionó
      let recommendationText = '';
      if (!categoriaUpdated || !detallesUpdated) {
        recommendationText = `\n\nNota: Algunos datos no pudieron actualizarse correctamente. 
Se intentará nuevamente en segundo plano y los cambios deberían verse reflejados pronto.
Puede recargar la lista de productos para verificar los cambios.`;
      }
        
      alert(`✅ ${isUpdate ? 'Actualización' : 'Creación'} exitosa: "${result.denominacion}"
      
${categoriaText}
${detallesText}
${imageText}
${recommendationText}
      
${isUpdate ? 'El producto base ha sido guardado' : 'El nuevo producto ha sido creado'} y se reflejará en la lista cuando cierre este diálogo.`);
      
      onClose();
    } catch (error: any) {
      console.error('❌ Error al guardar producto:', error);
      
      // Mostrar mensaje detallado de error para ayudar en el debugging
      let errorMessage = 'Ocurrió un error al guardar el producto';
      
      if (error.response) {
        // Error de respuesta del servidor
        console.error('Detalles del error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        errorMessage = `Error ${error.response.status}: ${error.message || error.response.statusText}`;
        
        // Si hay un mensaje específico en la respuesta, mostrarlo
        if (error.response.data?.mensaje || error.response.data?.message) {
          errorMessage += ` - ${error.response.data?.mensaje || error.response.data?.message}`;
        }
        
        // Agregar información sobre posible problema con la categoría
        if (error.response.status === 400 && formData.categoria) {
          errorMessage += "\n\nPosible problema con la categoría seleccionada. Intente seleccionar una categoría diferente.";
        }
      } else if (error.request) {
        // Error de solicitud sin respuesta
        console.error('No se recibió respuesta:', error.request);
        errorMessage = 'No se recibió respuesta del servidor. Verifica tu conexión.';
      } else {
        // Error de configuración o red
        console.error('Error de configuración:', error.message);
        errorMessage = `Error: ${error.message}`;
      }
      
      setSaveError(errorMessage);
    }
  };

  // Funciones para manejar la imagen
  const handleImageChange = (file: File) => {
    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setImageError('Por favor selecciona solo archivos de imagen');
      return;
    }

    // Validar tamaño (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageError('La imagen debe ser menor a 5MB');
      return;
    }

    setImageError(null);
    setImageFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleImageChange(files[0]);
    }
  };

  const removeImage = async () => {
    setImageError(null);

    // Si el producto ya existe (tiene ID), intentar eliminar del backend
    if (formData.id) {
      try {
        await apiClient.post(`/images/deleteFirstImageFromEntity`, null, {
          params: {
            entityId: formData.id,
            entityType: 'manufacturado', // Cambiá a 'insumo' si estás trabajando con insumos
          },
        });
      } catch (error) {
        console.error('Error al eliminar imagen desde el backend:', error);
        setImageError('No se pudo eliminar la imagen en el servidor');
        return;
      }
    }

    // Limpiar preview e imagen local
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({ ...prev, imagenes: [] }));
  };


  const addIngredient = () => {
    if (supplies.length === 0) return;
    
    // Tomar el primer insumo como predeterminado
    const defaultSupply = supplies[0];
    
    console.log(`🔍 Añadiendo insumo predeterminado: ${defaultSupply.denominacion} (ID: ${defaultSupply.id})`);
    
    // Asegurar que la unidad de medida tenga la estructura correcta
    const unidadMedida = typeof defaultSupply.unidadMedida === 'object'
      ? {
          id: defaultSupply.unidadMedida.id || 1,
          denominacion: defaultSupply.unidadMedida.denominacion || 'Gramos',
          deleted: (defaultSupply.unidadMedida as any).deleted === undefined ? false : (defaultSupply.unidadMedida as any).deleted
        }
      : { id: 1, denominacion: defaultSupply.unidadMedida || 'Gramos', deleted: false };
      
    // Asegurar que la categoría del insumo tenga la estructura correcta para Supply
    const categoria = defaultSupply.categoria 
      ? {
          id: Number(defaultSupply.categoria.id), // Asegurar que sea número para Supply.categoria
          denominacion: defaultSupply.categoria.denominacion || 'Sin categoría',
          esInsumo: defaultSupply.categoria.esInsumo === undefined ? true : defaultSupply.categoria.esInsumo,
          deleted: defaultSupply.categoria.deleted === undefined ? false : defaultSupply.categoria.deleted 
        }
      : { 
          id: 0,  
          denominacion: 'Sin categoría', 
          esInsumo: true, 
          deleted: false 
        };
    
    // Crear un nuevo detalle con todos los campos necesarios para compatibilidad
    const newDetail: ProductDetail = {
      tipo: 'INSUMO',
      cantidad: 0,
      item: {
        ...defaultSupply,
        id: Number(defaultSupply.id), // Asegurar que sea número
        unidadMedida: unidadMedida,
        categoria: categoria,
        deleted: false,
        stockActual: defaultSupply.stockActual || 0,
        precioCompra: defaultSupply.precioCompra || 0,
        esParaElaborar: defaultSupply.esParaElaborar === undefined ? true : defaultSupply.esParaElaborar
      } as Supply, // Asegurar que se interprete como Supply
    };
    
    console.log(`✅ Nuevo insumo añadido: ${defaultSupply.denominacion}`);
    console.log(`   Unidad: ${unidadMedida.denominacion}`);
    console.log(`   Categoría: ${categoria.denominacion}`);
    
    setFormData((prev) => ({
      ...prev,
      detalles: [...(prev.detalles || []), newDetail],
    }));
  };


  const removeIngredient = (index: number) => {
    const newDetalles = [...(formData.detalles || [])];
    newDetalles.splice(index, 1);
    setFormData((prev) => ({ ...prev, detalles: newDetalles }));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const newDetalles = [...(formData.detalles || [])];
    
    if (field === 'supply') {
      // Aseguramos que se asigna el objeto completo del insumo
      newDetalles[index].item = value;
      
      // Actualizar el tipo para asegurar que siempre sea INSUMO
      newDetalles[index].tipo = 'INSUMO';
      
      // Asegurar que la unidad de medida tenga una estructura válida
      const unidadMedida = (value as any).unidadMedida;
      
      // Si la unidad de medida es solo un string, convertirla a objeto
      if (typeof unidadMedida === 'string') {
        (value as any).unidadMedida = {
          id: 1, // ID predeterminado para gramos
          denominacion: unidadMedida || 'Gramos',
          deleted: false
        };
      }
      
      // Si el id de la categoría es string, convertirlo a número
      if ((value as any).categoria && typeof (value as any).categoria.id === 'string') {
        (value as any).categoria.id = Number((value as any).categoria.id);
      }
      
      console.log("✅ Insumo actualizado:", value.denominacion);
      console.log(`   Unidad: ${typeof (value as any).unidadMedida === 'object' 
        ? (value as any).unidadMedida.denominacion 
        : (value as any).unidadMedida}`);
    } else if (field === 'cantidad') {
      // Asegurar que la cantidad sea un número positivo
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      newDetalles[index].cantidad = Math.max(0, numValue);
      console.log(`✅ Cantidad actualizada para ${(newDetalles[index].item as any).denominacion}: ${newDetalles[index].cantidad}`);
    }
    
    setFormData((prev) => ({ ...prev, detalles: newDetalles }));
    
    // Estadísticas de los detalles actualizados para debugging
    console.log(`📊 Detalles actualizados: ${newDetalles.length} ingredientes en total`);
    console.log('Categorías visibles:', categories.filter(c => !c.deleted));
  };

  const availableCategories = categories
  
  .filter(c => !c.deleted)
  .filter((cat, idx, arr) =>
    arr.findIndex(c2 => c2.denominacion === cat.denominacion) === idx
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-serif font-bold text-gray-800">
            {product ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">

          <Input
            label="Nombre del producto"
            value={formData.denominacion}
            onChange={(e) => setFormData({ ...formData, denominacion: e.target.value })}
            required
          />
          <Input
            label="Descripción"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            required
          />
          <Input
            label="Precio de venta"
            type="number"
            step="0.01"
            min="1"
            max="999999"
            value={formData.precioVenta}
            onChange={(e) => {
              const inputValue = e.target.value;
              const value = parseFloat(inputValue);
              
              // Validar límite máximo en tiempo real
              if (value > 999999) {
                alert('⚠️ Precio muy alto\n\nEl precio máximo permitido es $999,999 para garantizar compatibilidad con MercadoPago.\n\nPor favor, ingrese un precio menor.');
                e.target.value = (formData.precioVenta || 0).toString(); // Revertir al valor anterior
                return;
              }
              
              setFormData({ ...formData, precioVenta: value });
            }}
            required
            placeholder="Ej: 2500.00"
          />
          <div className="text-xs text-gray-500 mt-1">
            💡 <strong>Límites MercadoPago:</strong> Mínimo $1 - Máximo $999,999 (compatible con pagos online)
          </div>
          
          
          <Input
            label="Tiempo estimado (min)"
            type="number"
            value={formData.tiempoEstimadoMinutos}
            onChange={(e) =>
              setFormData({ ...formData, tiempoEstimadoMinutos: parseInt(e.target.value) })
            }
            required
          />

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría <span className="text-red-500">*</span>
            </label>
            <select
              className="w-full p-2 border rounded-md"
              value={formData.categoriaId || ""}
              onChange={(e) => {
                const selectedId = e.target.value;
                const selected = availableCategories.find(c => String(c.id) === selectedId);
                
                if (selected) {
                  console.log("📋 Categoría seleccionada:", selected);
                  
                  // Estructura completa para la actualización según CategoriaController
                  // IMPORTANTE: Guardar tanto como string para frontend como número para backend
                  const categoriaCompleta = { 
                    id: selectedId, // Como string para el frontend (MenuItem.categoria.id es string)
                    denominacion: selected.denominacion,
                    deleted: false // No eliminada
                  };
                  
                  // IMPORTANTE: Incluimos categoriaId, categoria y código de depuración
                  console.log(`🔄 Actualizando categoría: ${selected.denominacion} (ID: ${selectedId})`);
                  
                  setFormData(prevData => {
                    const newData = {
                      ...prevData,
                      categoriaId: selectedId,
                      categoria: categoriaCompleta,
                    };
                    
                    // Debuggear el estado actualizado
                    console.log("📝 Categoría actualizada:", newData.categoria);
                    console.log("📝 CategoriaId actualizado:", newData.categoriaId);
                    
                    return newData;
                  });
                  
                } else {
                  setFormData({
                    ...formData,
                    categoriaId: "",
                    categoria: undefined
                  });
                  console.log("⚠️ Categoría eliminada");
                }
              }}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.length === 0 ? (
                <option value="" disabled>No hay categorías disponibles</option>
              ) : (
                availableCategories.map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.denominacion || 'Sin nombre'}
                  </option>
                ))
              )}
            </select>
            
            {/* Información de ayuda sobre la categoría seleccionada */}
            {formData.categoriaId && formData.categoria && (
              <div className="mt-1 text-xs text-green-600 bg-green-50 p-1 rounded border border-green-200">
                ✓ Categoría seleccionada: <strong>{formData.categoria.denominacion}</strong> (ID: {formData.categoriaId})
              </div>
            )}
            
            {/* Mensaje para alertar cuando no hay categorías */}
            {categories.length === 0 && (
              <div className="mt-1 text-xs text-red-600 bg-red-50 p-1 rounded border border-red-200">
                ⚠️ No hay categorías disponibles. Debe crear categorías primero en la sección de "Categorías".
              </div>
            )}
          </div>

          {/* Imagen */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Imagen del producto
            </label>

            {/* Área de carga de imagen */}
            <div className="space-y-3">
              {/* Mostrar imagen actual o preview */}
              {(imagePreview || (formData.imagenes && formData.imagenes.length > 0)) && (
                <div className="relative inline-block">
                  <img
                    src={imagePreview || formData.imagenes?.[0]}
                    alt="Vista previa del producto"
                    className="w-40 h-40 object-cover rounded-lg border-2 border-gray-200 shadow-sm"
                    onError={() => setImageError('Error al cargar la imagen')}
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    title="Eliminar imagen"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Área de drag & drop */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
        border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer
        ${isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }
      `}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageChange(e.target.files[0])}
                  className="hidden"
                  id="image-upload"
                />

                <label htmlFor="image-upload" className="cursor-pointer">
                  <div className="space-y-2">
                    <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                      <Plus size={24} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        Arrastra una imagen aquí o haz clic para seleccionar
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG, JPEG hasta 5MB
                      </p>
                    </div>
                  </div>
                </label>
              </div>

              {/* Mensaje de error */}
              {imageError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md border border-red-200">
                  {imageError}
                </div>
              )}

              {/* Información útil */}
              {!imagePreview && (!formData.imagenes || formData.imagenes.length === 0) && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded-md">
                  💡 <strong>Tip:</strong> Una buena imagen ayuda a que tu producto se vea más atractivo para los clientes
                </div>
              )}
            </div>
          </div>

          {/* Preparación */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preparación</label>
            <textarea
              className="w-full p-2 border rounded-md"
              rows={3}
              placeholder="Describe el proceso de preparación..."
              value={formData.preparacion}
              onChange={(e) => setFormData({ ...formData, preparacion: e.target.value })}
            />
          </div>

          {/* Insumos */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Insumos</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={16} />}
                onClick={addIngredient}
                disabled={supplies.length === 0}
              >
                Agregar insumo
              </Button>
            </div>

            {supplies.length === 0 ? (
              <p className="text-sm text-red-500 mb-4">No hay insumos disponibles para usar.</p>
            ) : (
              (formData.detalles || []).map((detalle, index) => (
                <div key={index} className="flex items-center gap-2 mb-2">
                  <select
                    className="flex-1 p-2 border rounded-md"
                    value={(detalle.item as Supply).id}
                    onChange={(e) => {
                      const selectedId = parseInt(e.target.value);
                      const selected = supplies.find((s) => s.id === selectedId);
                      
                      if (selected) {
                        // Crear una copia completa del insumo seleccionado para mantener toda la estructura
                        const completeSuppyObj = {
                          ...selected,
                          // Asegurar que unidadMedida tenga la estructura correcta
                          unidadMedida: typeof selected.unidadMedida === 'object' 
                            ? selected.unidadMedida 
                            : { id: 1, denominacion: selected.unidadMedida },
                          // Asegurar que la categoría tenga la estructura correcta para Supply
                          categoria: selected.categoria ? {
                            id: Number(selected.categoria.id), // Mantener como número para Supply
                            denominacion: selected.categoria.denominacion,
                            esInsumo: selected.categoria.esInsumo || true, // Asegurar que tenga el campo esInsumo
                            deleted: selected.categoria.deleted
                          } : null
                        };
                        
                        // Actualizar con el objeto completo
                        updateIngredient(index, 'supply', completeSuppyObj);
                      }
                    }}
                  >
                    {supplies.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.denominacion} ({getUnidadLabel(s.unidadMedida)}) - stock: {s.stockActual}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="w-28 p-2 border rounded-md"
                    value={detalle.cantidad}
                    min={0}
                    onChange={(e) => {
                      const cantidad = e.target.value === "" ? 0 : parseInt(e.target.value);
                      updateIngredient(index, 'cantidad', cantidad);
                    }}
                    placeholder="Cantidad"
                  />
                  <span className="text-xs text-gray-500">
                    {getUnidadLabel((detalle.item as Supply).unidadMedida)}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={() => removeIngredient(index)}
                    aria-label="Eliminar insumo"
                    title="Eliminar insumo"
                  />
                </div>
              ))
            )}
          </div>
          {saveError && (
            <div className="mb-2 text-red-600 font-semibold text-sm">
              {saveError}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Guardar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;