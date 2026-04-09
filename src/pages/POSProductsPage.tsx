import React, { useState, useEffect } from "react";
import type { Product } from "../types/pos";
import { POSService } from "../services/posService";
import { RecipeModal } from "../components/recipes/RecipeModal";
import { Search, Package, DollarSign, ShoppingCart, BookOpen, Filter } from "lucide-react";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Layout from '../components/layout/Layout';

export default function POSProductsPage() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const [recipeOpen, setRecipeOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const search = async () => {
    setLoading(true);
    setSearchPerformed(true);
    try {
      console.log(`🔍 POSProductsPage: Buscando productos con query: "${query}"`);
      const res = await POSService.searchProducts(query.trim());
      console.log(`✅ POSProductsPage: ${res.length} productos encontrados`);
      setProducts(res);
    } catch (error) {
      console.error('❌ POSProductsPage: Error searching products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const openRecipe = (p: Product) => {
    setSelectedProduct(p);
    setRecipeOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      search();
    }
  };

  // Cargar productos populares al inicio
  useEffect(() => {
    const loadInitialProducts = async () => {
      setLoading(true);
      try {
        console.log('🔍 POSProductsPage: Cargando productos iniciales...');
        const res = await POSService.getProducts(); // Obtener todos los productos
        console.log(`✅ POSProductsPage: ${res.length} productos cargados inicialmente`);
        setProducts(res); // Mostrar todos los productos
        setSearchPerformed(true);
      } catch (error) {
        console.error('❌ POSProductsPage: Error loading initial products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialProducts();
  }, []);

  return (
    <Layout>
      <div className="p-4 md:p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Productos POS</h1>
        </div>
        <p className="text-gray-600">
          Gestiona el catálogo de productos y sus recetas
        </p>
      </div>

      {/* Search Section */}
      <Card className="mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Buscar por nombre, categoría o código..."
              className="pl-10 block w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={search} 
              disabled={loading || query.trim().length < 1}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar
            </Button>
            <Button 
              onClick={() => {setQuery(""); search();}}
              className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700"
            >
              <Filter className="h-4 w-4" />
              Todos  
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3">
              <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-lg text-gray-600">Buscando productos...</span>
            </div>
          </div>
        </Card>
      ) : !searchPerformed ? (
        <Card>
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              ¡Busca productos para comenzar!
            </h3>
            <p className="text-gray-500">
              Ingresa un término de búsqueda para explorar nuestro catálogo
            </p>
          </div>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-yellow-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-500 mb-4">
              Intenta con otros términos de búsqueda
            </p>
            <Button 
              onClick={() => {setQuery(""); search();}}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ver todos los productos
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {query ? `Resultados para "${query}"` : 'Productos disponibles'}
            </h2>
            <div className="text-sm text-gray-500">
              {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <div className="flex flex-col h-full">
                  {/* Product Image */}
                  <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-4 flex items-center justify-center">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Package className="h-16 w-16 text-gray-400" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {product.name}
                      </h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-2 whitespace-nowrap">
                        #{product.id}
                      </span>
                    </div>

                    {product.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {/* Price and Stock */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1 text-green-600">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold text-lg">
                          ${product.price?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <ShoppingCart className="h-4 w-4" />
                        <span className="text-sm">Stock: {product.stock || 0}</span>
                      </div>
                    </div>

                    {/* Category */}
                    {product.category && (
                      <div className="text-xs text-gray-500 mb-4">
                        Categoría: {product.category}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-gray-100">
                    <Button 
                      onClick={() => openRecipe(product)} 
                      className="w-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center gap-2"
                    >
                      <BookOpen className="h-4 w-4" />
                      Ver Receta
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Recipe Modal */}
      <RecipeModal 
        open={recipeOpen} 
        onClose={() => setRecipeOpen(false)} 
        product={selectedProduct} 
      />
      </div>
    </Layout>
  );
}