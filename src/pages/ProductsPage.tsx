import React, { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Search, Plus, Edit, Trash2, ListFilter, RefreshCw, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { MenuItem } from '../types/menuItem';
import ProductModal from '../components/products/ProductModal';
import { fetchCategories, FlatCategory } from '../api/categories';
import { uploadProductImage } from '../api/images';
import { fetchAllProducts, createProduct, updateProduct, deleteProduct, fetchProductById } from '../api/products';

const ProductsPage: React.FC = () => {
  const [categoryOptions, setCategoryOptions] = useState<FlatCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;



  useEffect(() => {
    // Cargar productos y categorías cuando el componente se monta
    const initialLoad = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadProducts(),
          loadCategories()
        ]);
      } catch (error) {
        console.error("Error en carga inicial:", error);
      } finally {
        setLoading(false);
      }
    };
    
    initialLoad();
  }, []);

  const loadProducts = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      const data = await fetchAllProducts(forceRefresh);
      
      if (data && data.length > 0) {
        console.log(`✅ Se cargaron ${data.length} productos correctamente${forceRefresh ? ' (recarga forzada)' : ''}`);
        
        // Verificar si los productos tienen categorías
        const sinCategoria = data.filter(p => !p.categoria || !p.categoria.id);
        const conCategoria = data.filter(p => p.categoria && p.categoria.id);
        
        console.log(`📊 Estado de las categorías en productos:
          - Con categoría asignada: ${conCategoria.length}
          - Sin categoría: ${sinCategoria.length}
        `);
        
        // Si hay productos sin categoría, imprimir sus nombres
        if (sinCategoria.length > 0) {
          console.warn('⚠️ Productos sin categoría:', sinCategoria.map(p => p.denominacion));
        }
        
        setProducts(data);
      } else {
        console.warn('⚠️ No se encontraron productos o el array está vacío');
        setProducts([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar productos:', error);
      setProducts([]);
      
      // Mostrar un alert para notificar al usuario
      alert("Error al cargar los productos. Por favor, recarga la página o contacta al administrador.");
    } finally {
      setLoading(false);
    }
  };
  const loadCategories = async () => {
    try {
      console.log('🔄 Cargando categorías de productos...');
      const data = await fetchCategories();
      
      if (data && data.length > 0) {
        console.log(`✅ Se cargaron ${data.length} categorías correctamente`);
        setCategoryOptions(data);
      } else {
        console.warn('⚠️ No se encontraron categorías o el array está vacío');
        setCategoryOptions([]);
      }
    } catch (error) {
      console.error('❌ Error al cargar categorías:', error);
      setCategoryOptions([]);
    }
  };
  // Obtener categorías únicas de los productos
  const productCategories = Array.from(
    new Set(
      products
        .map(product => product.categoria?.denominacion)
        .filter(denom => denom != null)
    )
  );
  
  // Combinar las categorías de la API y las de los productos para mayor robustez
  const categoriesFromOptions = categoryOptions.map(cat => cat.denominacion);
  const categories = Array.from(new Set([...productCategories, ...categoriesFromOptions]));

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.denominacion.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoria?.denominacion === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const handleEdit = (product: MenuItem) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: string) => {
    try {
      // Llamar al backend para hacer la baja lógica
      await deleteProduct(productId);

      // Si fue exitoso, actualizar el estado local
      setProducts(prev => prev.filter(p => p.id !== productId));
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      alert('Ocurrió un error al eliminar el producto');
    }
  };

  const handleSave = async (productData: Partial<MenuItem>, imageFile?: File): Promise<MenuItem> => {
    try {
      let result: MenuItem;
      
      console.log(`🔄 ${selectedProduct ? 'Actualizando' : 'Creando'} producto...`);
      
      const payload = {
        ...productData,
        descuento: productData.descuento || 0,
      };
      
      console.log('🔍 Detalles del producto actualizado:', payload);

      if (selectedProduct) {
        // 📝 Modificación
        console.log(`🛠️ Actualizando producto ID ${selectedProduct.id}`);
        result = await updateProduct(selectedProduct.id, payload);
        console.log('✅ Producto actualizado exitosamente:', result);
        
        
        // Recargar todos los productos para asegurar consistencia de datos
        console.log('🔄 Recargando listado de productos para reflejar todos los cambios...');
        await loadProducts(true); // Forzamos refresco para evitar datos en caché
        
        // Para que el usuario vea que algo cambió, marcar el producto actualizado
        const updatedProduct = await fetchProductById(selectedProduct.id);
        if (updatedProduct) {
          console.log('🔍 Producto actualizado recuperado:', updatedProduct);
          // No necesitamos actualizar el estado manualmente ya que loadProducts() ya lo hizo
          result = updatedProduct;
          
          // Verificar si la categoría y los detalles se actualizaron correctamente
          const categoriaUpdated = String(result.categoria?.id) === String(payload.categoria?.id || payload.categoriaId);
          const detallesUpdated = (result.detalles?.length || 0) === (payload.detalles?.length || 0);

          if (!categoriaUpdated || !detallesUpdated) {
            console.log('⚠️ Algunos datos no se actualizaron correctamente. Programando intento adicional...');
            
            // Programar un intento adicional en segundo plano después de que se cierre el modal
            setTimeout(async () => {
              try {
                console.log('🔄 Realizando intento adicional de actualización en segundo plano...');
                await updateProduct(selectedProduct.id, payload);
                console.log('✅ Actualización en segundo plano completada');
                // Recargar productos después de 1 segundo más
                setTimeout(() => loadProducts(true), 1000);
              } catch (retryError) {
                console.error('❌ Error en actualización en segundo plano:', retryError);
              }
            }, 1500);
          }
        } else {
          console.log('⚠️ No se pudo recuperar el producto actualizado, usando resultado original');
        }
      } else {
        // 🆕 Creación
        console.log('➕ Creando nuevo producto');
        result = await createProduct(payload);
        console.log('✅ Producto creado exitosamente:', result);
        setProducts((prev) => [...prev, result]);
        
        // Para productos nuevos, también verificar si la categoría e ingredientes se guardaron correctamente
        const categoriaCreated = String(result.categoria?.id) === String(payload.categoria?.id || payload.categoriaId);
        const detallesCreated = (result.detalles?.length || 0) === (payload.detalles?.length || 0);
        
        if (!categoriaCreated || !detallesCreated) {
          console.log('⚠️ Algunos datos no se crearon correctamente. Programando intento adicional...');
          
          // Programar un intento adicional en segundo plano después de que se cierre el modal
          setTimeout(async () => {
            try {
              console.log('🔄 Realizando intento adicional de actualización para producto nuevo en segundo plano...');
              await updateProduct(result.id, payload);
              console.log('✅ Actualización en segundo plano completada para producto nuevo');
              // Recargar productos después de 1 segundo más
              setTimeout(() => loadProducts(true), 1000);
            } catch (retryError) {
              console.error('❌ Error en actualización en segundo plano para producto nuevo:', retryError);
            }
          }, 1500);
        }
      }
      
      // Subir imagen si se proporcionó
      if (imageFile) {
        console.log(`📷 Subiendo imagen para producto ID ${result.id}`);
        try {
          await uploadProductImage(Number(result.id), imageFile, 'manufacturado');
          console.log('✅ Imagen subida correctamente');
          
          // Recargar productos nuevamente para obtener la imagen actualizada
          if (selectedProduct) {
            await loadProducts();
          }
        } catch (imageError: any) {
          console.error('❌ Error al subir imagen:', imageError);
          // No detener el flujo si falla la subida de imagen
          alert('El producto se guardó correctamente pero hubo un problema al subir la imagen. Puede intentar editar el producto nuevamente para subir la imagen.');
        }
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Error al guardar producto:', error);
      
      // Mostrar información más detallada sobre el error
      if (error?.response) {
        console.error('Detalles de la respuesta de error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.response.config?.url,
          method: error.response.config?.method,
          data: error.response.data
        });
        
        // Extraer mensaje del error
        const errorMessage = error.response.data?.message || 
                            error.response.data?.mensaje || 
                            `Error ${error.response.status}: No se pudo ${selectedProduct ? 'actualizar' : 'crear'} el producto`;
        
        throw new Error(errorMessage);
      }
      
      // Si no hay una respuesta específica, mostrar un mensaje genérico
      throw new Error(`No se pudo ${selectedProduct ? 'actualizar' : 'crear'} el producto. Por favor, intente nuevamente.`);
    }
  };



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
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-800">Productos</h1>
          <p className="text-gray-600">Gestiona el menú del restaurante</p>
        </div>
        <div className="flex gap-2">
          <Link to="/products/categories">
            <Button variant="outline" icon={<ListFilter size={18} />}>
              Categorías
            </Button>
          </Link>
          <Button
            variant="primary"
            icon={<Plus size={18} />}
            onClick={() => {
              setSelectedProduct(undefined);
              setIsModalOpen(true);
            }}
          >
            Nuevo Producto
          </Button>
        </div>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nombre o descripción"
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-amber-500 focus:border-amber-500"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={async () => {
                // Recargar categorías y productos
                setLoading(true);
                try {
                  await Promise.all([loadCategories(), loadProducts(true)]);
                  console.log('✅ Datos recargados correctamente (forzado)');
                } catch (error) {
                  console.error('❌ Error al recargar datos:', error);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors"
              title="Recargar datos"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </Card>

      {products.length === 0 && !loading ? (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <div className="mb-4">
            <AlertTriangle size={48} className="mx-auto text-amber-500" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
          <p className="text-gray-600 mb-4">
            No hay productos disponibles o se produjo un error al cargarlos.
          </p>
          <Button
            variant="primary"
            onClick={() => loadProducts(true)}
            icon={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />}
          >
            Recargar productos
          </Button>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-[28%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="w-[16%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiempo prep.</th>
                  <th className="w-[12%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                  <th className="w-[18%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumos</th>
                  <th className="w-[10%] px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 truncate">{product.denominacion}</div>
                        <div
                          className="text-sm text-gray-500 truncate"
                          title={product.descripcion}
                        >
                          {product.descripcion}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {product.categoria && product.categoria.id && product.categoria.id !== '0' ? (
                        <div className="tooltip" data-tip={`ID: ${product.categoria.id}`}>
                          <Badge variant="secondary" size="sm">
                            {product.categoria.denominacion}
                          </Badge>
                        </div>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-300">
                          Sin categoría
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{product.tiempoEstimadoMinutos} minutos</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${product.precioVenta.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {product.detalles.length} insumos
                      </div>
                      {product.detalles.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {product.detalles.slice(0, 2).map((detalle, index) => (
                            <div key={index}>
                              {detalle.cantidad} {
                                typeof (detalle.item as any)?.unidadMedida === 'object' 
                                  ? (detalle.item as any)?.unidadMedida?.denominacion 
                                  : (detalle.item as any)?.unidadMedida
                              } de {(detalle.item as any)?.denominacion || 'Ingrediente desconocido'}
                            </div>
                          ))}
                          {product.detalles.length > 2 && (
                            <div>+{product.detalles.length - 2} más</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit size={16} />}
                          onClick={() => handleEdit(product)}
                          aria-label="Editar producto"
                        />
                        {showDeleteConfirm === product.id ? (
                          <div className="flex space-x-1">
                            <Button variant="danger" size="sm" onClick={() => handleDelete(product.id)}>
                              Eliminar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={16} />}
                            onClick={() => setShowDeleteConfirm(product.id)}
                            aria-label="Eliminar producto"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between w-full">
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
                  a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
                  </span>{' '}
                  de <span className="font-medium">{filteredProducts.length}</span> resultados
                </p>

                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    &laquo;
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                          ? 'bg-amber-50 border-amber-500 text-amber-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    &raquo;
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProduct(undefined);
        }}
        onSave={handleSave}
        product={selectedProduct}
        categories={categoryOptions}
      />
    </Layout>
  );
};

export default ProductsPage;