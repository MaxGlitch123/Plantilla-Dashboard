import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Package } from 'lucide-react';
import { POSService } from '../../services/posService';
import { Product } from '../../types/pos';
import { usePOSStore } from '../../store/posStore';

export const ProductSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { addToCart, selectProduct } = usePOSStore();

  // Cargar todos los productos al montar
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const allProductsData = await POSService.getProducts();
        setAllProducts(allProductsData);
        setProducts(allProductsData.slice(0, 20)); // Mostrar los primeros 20
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Búsqueda en tiempo real
  useEffect(() => {
    const searchProducts = async () => {
      if (query.trim() === '') {
        setProducts(allProducts.slice(0, 20));
        return;
      }

      if (query.length < 2) {
        setProducts([]);
        return;
      }

      setLoading(true);
      try {
        const searchResults = await POSService.searchProducts(query);
        setProducts(searchResults.slice(0, 20));
      } catch (error) {
        console.error('Error searching products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchProducts, 300);
    return () => clearTimeout(debounce);
  }, [query, allProducts]);

  // Manejar clicks fuera del componente
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = (product: Product) => {
    addToCart(product, 1);
    setQuery('');
    setShowSuggestions(false);
    selectProduct(product);
    
    // Mostrar feedback visual
    const message = `✅ ${product.name} agregado al carrito`;
    console.log(message);
    
    // Focus de vuelta en el input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && products.length > 0) {
      handleProductSelect(products[0]);
      e.preventDefault();
    }
    
    if (e.key === 'Escape') {
      setShowSuggestions(false);
      setQuery('');
    }
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      {/* Campo de búsqueda */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {loading ? (
            <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
          ) : (
            <Search className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          placeholder="Buscar productos por nombre o código..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />
      </div>

      {/* Lista de sugerencias */}
      {showSuggestions && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Buscando...
            </div>
          ) : products.length > 0 ? (
            <div className="py-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className="px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-10 h-10 object-cover rounded-md bg-gray-100"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {product.category}
                        {product.barcode && ` • ${product.barcode}`}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-lg font-bold text-green-600">
                        ${product.price.toFixed(2)}
                      </span>
                      {product.unitMeasure && (
                        <span className="text-xs text-gray-500">
                          {product.unitMeasure}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500">
              <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No se encontraron productos
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              Escriba al menos 2 caracteres para buscar
            </div>
          )}
        </div>
      )}
    </div>
  );
};