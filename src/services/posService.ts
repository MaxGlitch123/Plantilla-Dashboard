import { Sale, Product, DailySales } from '../types/pos';
import apiClient from '../api/apiClient';

export class POSService {
  // Obtener productos para el POS
  static async getProducts(): Promise<Product[]> {
    try {
      console.log('🔗 POS: Llamando a /articulosManufacturados/listarTodos...');
      // Usar el mismo endpoint que funciona en products.ts
      const response = await apiClient.get('/articulosManufacturados/listarTodos');
      console.log(`📦 POS: Respuesta del servidor:`, response.data);
      
      // Los productos que devuelve listarTodos ya están filtrados y son válidos
      const products = response.data || [];
      
      console.log(`✅ POS: ${products.length} productos recibidos del backend`);
      
      if (products.length === 0) {
        console.log('⚠️ POS: No hay productos en el backend, usando productos de muestra');
        return this.getSampleProducts();
      }

      const mappedProducts = products.map((product: any) => ({
        id: product.id.toString(),
        name: product.denominacion,
        price: product.precioVenta || 0,
        category: product.categoria?.denominacion || 'Sin categoría',
        subcategory: product.categoria?.denominacion,
        description: product.descripcion || `Producto ${product.denominacion}`,
        image: product.imagenesArticulos?.[0]?.url,
        unitMeasure: product.unidadMedida?.denominacion || 'unidad',
        stock: 999, // Para POS usamos stock ilimitado
        isActive: true,
        barcode: `POS${product.id}`,
      }));

      console.log(`🎯 POS: ${mappedProducts.length} productos mapeados correctamente:`, mappedProducts);
      return mappedProducts;
      
    } catch (error) {
      console.error('❌ Error fetching products from server:', error);
      console.log('🔄 Activando fallback a productos de muestra...');
      // Fallback a productos de muestra para pruebas
      return this.getSampleProducts();
    }
  }

  // Productos de muestra para pruebas del POS
  static getSampleProducts(): Product[] {
    return [
      {
        id: '1',
        name: 'Pizza Margherita',
        price: 2500,
        category: 'Pizzas',
        subcategory: 'Clásicas',
        description: 'Pizza con salsa de tomate, mozzarella y albahaca fresca',
        unitMeasure: 'unidad',
        stock: 50,
        isActive: true,
        barcode: 'PIZZA001'
      },
      {
        id: '2',
        name: 'Pizza Napolitana',
        price: 2800,
        category: 'Pizzas',
        subcategory: 'Clásicas',
        description: 'Pizza con salsa de tomate, mozzarella, tomate y orégano',
        unitMeasure: 'unidad',
        stock: 45,
        isActive: true,
        barcode: 'PIZZA002'
      },
      {
        id: '3',
        name: 'Hamburguesa Clásica',
        price: 1800,
        category: 'Hamburguesas',
        subcategory: 'Clásicas',
        description: 'Hamburguesa con carne, lechuga, tomate y queso',
        unitMeasure: 'unidad',
        stock: 30,
        isActive: true,
        barcode: 'BURG001'
      },
      {
        id: '4',
        name: 'Hamburguesa Completa',
        price: 2200,
        category: 'Hamburguesas',
        subcategory: 'Especiales',
        description: 'Hamburguesa con carne, lechuga, tomate, queso, huevo y panceta',
        unitMeasure: 'unidad',
        stock: 25,
        isActive: true,
        barcode: 'BURG002'
      },
      {
        id: '5',
        name: 'Coca Cola 500ml',
        price: 800,
        category: 'Bebidas',
        subcategory: 'Gaseosas',
        description: 'Coca Cola lata 500ml',
        unitMeasure: 'unidad',
        stock: 100,
        isActive: true,
        barcode: 'BEB001'
      },
      {
        id: '6',
        name: 'Agua Mineral 500ml',
        price: 500,
        category: 'Bebidas',
        subcategory: 'Sin Alcohol',
        description: 'Agua mineral sin gas 500ml',
        unitMeasure: 'unidad',
        stock: 80,
        isActive: true,
        barcode: 'BEB002'
      },
      {
        id: '7',
        name: 'Cerveza Quilmes 470ml',
        price: 900,
        category: 'Bebidas',
        subcategory: 'Alcoholicas',
        description: 'Cerveza Quilmes lata 470ml',
        unitMeasure: 'unidad',
        stock: 60,
        isActive: true,
        barcode: 'BEB003'
      },
      {
        id: '8',
        name: 'Papas Fritas',
        price: 1200,
        category: 'Acompañamientos',
        subcategory: 'Frituras',
        description: 'Porción de papas fritas caseras',
        unitMeasure: 'porción',
        stock: 40,
        isActive: true,
        barcode: 'ACOMP001'
      },
      {
        id: '9',
        name: 'Ensalada César',
        price: 1600,
        category: 'Ensaladas',
        subcategory: 'Clásicas',
        description: 'Ensalada con lechuga, pollo, croutones y aderezo césar',
        unitMeasure: 'porción',
        stock: 20,
        isActive: true,
        barcode: 'ENS001'
      },
      {
        id: '10',
        name: 'Milanesa con Papas',
        price: 2400,
        category: 'Platos Principales',
        subcategory: 'Carnes',
        description: 'Milanesa de carne con guarnición de papas fritas',
        unitMeasure: 'plato',
        stock: 15,
        isActive: true,
        barcode: 'PLATO001'
      },
      {
        id: '11',
        name: 'Picada para 2',
        price: 3200,
        category: 'Picadas',
        subcategory: 'Para Compartir',
        description: 'Picada con fiambres, quesos, aceitunas y pan',
        unitMeasure: 'tabla',
        stock: 12,
        isActive: true,
        barcode: 'PIC001'
      }
    ];
  }

  // Buscar productos por nombre o código
  static async searchProducts(query: string): Promise<Product[]> {
    try {
      const products = await this.getProducts();
      
      if (!query || query.trim() === '') {
        return products;
      }

      const searchTerm = query.toLowerCase().trim();
      const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode?.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm) ||
        product.subcategory?.toLowerCase().includes(searchTerm) ||
        product.description?.toLowerCase().includes(searchTerm)
      );
      
      return filteredProducts;
    } catch (error) {
      console.error('Error searching products:', error);
      // Si falla la búsqueda, intentar usar productos de muestra
      try {
        const sampleProducts = this.getSampleProducts();
        const searchTerm = query.toLowerCase().trim();
        const filteredSamples = sampleProducts.filter(product =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.barcode?.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm)
        );
        return filteredSamples;
      } catch (fallbackError) {
        console.error('Error con productos de muestra:', fallbackError);
        return [];
      }
    }
  }

  // Calcular ingredientes necesarios para una venta
  static async calculateRequiredIngredients(sale: Sale): Promise<{ingredientId: number, required: number, available: number, name: string}[]> {
    try {
      console.log('🧮 Calculando ingredientes necesarios para la venta...');
      const required: {[key: number]: {quantity: number, name: string}} = {};
      
      // Por cada item vendido
      for (const item of sale.items) {
        console.log(`📋 Analizando ${item.productName} (cantidad: ${item.quantity})`);
        
        // Obtener la receta del producto
        const productId = parseInt(item.productId);
        const recipe = await this.getProductRecipe(productId);
        
        // Por cada ingrediente en la receta  
        for (const ingredient of recipe) {
          const ingredientId = parseInt(ingredient.ingredientId?.toString() || '0');
          const quantityNeeded = (ingredient.quantity || 0) * item.quantity;
          
          if (required[ingredientId]) {
            required[ingredientId].quantity += quantityNeeded;
          } else {
            required[ingredientId] = {
              quantity: quantityNeeded,
              name: ingredient.ingredientName || `Ingrediente ${ingredientId}`
            };
          }
        }
      }
      
      // Obtener stock disponible actual
      console.log('📦 Verificando stock disponible...');
      const response = await apiClient.get("/articuloInsumo/listar");
      const availableIngredients = response.data.filter((insumo: any) => 
        !insumo.deleted && insumo.esParaElaborar
      );
      
      // Crear lista final con disponibilidad
      const result = Object.entries(required).map(([ingredientId, data]) => {
        const available = availableIngredients.find((ing: any) => 
          ing.id === parseInt(ingredientId)
        );
        
        return {
          ingredientId: parseInt(ingredientId),
          required: data.quantity,
          available: available?.stockActual || 0,
          name: data.name
        };
      });
      
      console.log('🎯 Ingredientes calculados:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error calculating required ingredients:', error);
      return [];
    }
  }

  // Obtener receta de un producto individual  
  static async getProductRecipe(productId: number) {
    try {
      const { data } = await apiClient.get(`/articulosManufacturados/obtener/${productId}`);
      return (data.detalles || []).map((detalle: any) => ({
        ingredientId: detalle.articuloInsumo?.id || 0,
        ingredientName: detalle.articuloInsumo?.denominacion || 'Sin nombre',
        quantity: detalle.cantidad || 0,  
        unitMeasure: detalle.articuloInsumo?.unidadMedida?.denominacion || 'unidad'
      }));
    } catch (error) {
      console.error(`❌ Error getting recipe for product ${productId}:`, error);
      return [];
    }
  }

  // Verificar si hay stock suficiente antes de vender
  static async verifyStockAvailability(sale: Sale): Promise<{canSell: boolean, missingIngredients: string[]}> {
    try {
      const ingredients = await this.calculateRequiredIngredients(sale);
      const missing: string[] = [];
      
      for (const ingredient of ingredients) {
        if (ingredient.required > ingredient.available) {
          missing.push(
            `${ingredient.name}: necesita ${ingredient.required}g, disponible ${ingredient.available}g`
          );
        }
      }
      
      return {
        canSell: missing.length === 0,
        missingIngredients: missing  
      };
      
    } catch (error) {
      console.error('❌ Error verifying stock:', error);
      return {canSell: false, missingIngredients: ['Error verificando stock']};
    }
  }

  // Descontar stock automáticamente después de venta exitosa
  static async deductStockAfterSale(sale: Sale): Promise<void> {
    try {
      console.log('📉 Descontando stock después de venta exitosa...');
      const ingredients = await this.calculateRequiredIngredients(sale);
      
      for (const ingredient of ingredients) {
        try {
          const newStock = ingredient.available - ingredient.required;
          
          console.log(`🔧 DESCONTANDO: ${ingredient.name}: ${ingredient.available}g → ${newStock}g (${-ingredient.required}g)`);
          
          // Usar el endpoint real del backend para actualizar stock
          await apiClient.put(`/articuloInsumo/${ingredient.ingredientId}/stock`, {
            stockActual: newStock
          });
          
          console.log(`✅ Stock actualizado para ${ingredient.name}`);
          
        } catch (error) {
          console.error(`❌ Error deducting stock for ingredient ${ingredient.name}:`, error);
        }
      }
      
      console.log('✅ Stock actualizado correctamente'); 
    } catch (error) {
      console.error('❌ Error deducting stock:', error);
    }
  }

  // Mapear métodos de pago frontend → backend
  static mapPaymentMethod(frontendMethod: string): string {
    const methodMap: Record<string, string> = {
      'cash': 'EFECTIVO',
      'card': 'MERCADOPAGO', 
      'transfer': 'MERCADOPAGO'
    };
    
    const mapped = methodMap[frontendMethod.toLowerCase()];
    if (!mapped) {
      console.warn(`⚠️ Método de pago desconocido: ${frontendMethod}, usando EFECTIVO por defecto`);
      return 'EFECTIVO';
    }
    
    console.log(`💳 Mapeo método pago: ${frontendMethod} → ${mapped}`);
    return mapped;
  }

  // Obtener el empleado del usuario autenticado actual
  static async getValidEmployeeId(): Promise<number> {
    try {
      // Usar nuevo endpoint que devuelve solo MI empleado
      const response = await apiClient.get('/Empleados/me');
      
      if (response.data && response.data.id) {
        const empleadoId = response.data.id;
        console.log(`✅ Empleado autenticado ID: ${empleadoId}`);
        return parseInt(empleadoId);
      }
      
      // Si no se puede obtener el empleado, usar ID por defecto
      console.warn('No se pudo obtener información del empleado autenticado, usando ID por defecto: 1');
      return 1;
      
    } catch (error: any) {
      console.error('Error obteniendo empleado autenticado:', error);
      
      // Si hay un error 404, significa que el usuario no tiene empleado asignado
      if (error.response?.status === 404) {
        throw new Error('Usuario no tiene empleado asignado en el sistema');
      }
      
      // Si hay un error 403, significa que el endpoint no existe aún
      if (error.response?.status === 403 || error.response?.status === 404) {
        console.warn('Endpoint /Empleados/me no disponible, usando ID por defecto');
        return 1;
      }
      
      throw error;
    }
  }

  // Guardar venta en el servidor
  static async uploadSale(sale: Sale): Promise<void> {
    try {
      console.log('🔍 PASO 1: Verificando disponibilidad de stock...');
      
      // Verificar stock antes de procesar la venta
      const stockCheck = await this.verifyStockAvailability(sale);
      
      if (!stockCheck.canSell) {
        console.error('❌ Stock insuficiente:', stockCheck.missingIngredients);
        throw new Error(`❌ STOCK INSUFICIENTE:\n${stockCheck.missingIngredients.join('\n')}`);
      }
      
      console.log('✅ Stock verificado - Suficientes ingredientes disponibles');
      console.log('💰 PASO 2: Procesando venta...');
      
      // ✅ MAPEO CORRECTO PARA SaleRequestDTO del backend
      const salePayload = {
        items: sale.items.map(item => ({
          productId: parseInt(item.productId),
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: parseFloat(item.price.toString()) // Asegurar formato numérico
        })),
        total: parseFloat(sale.total.toString()), // Asegurar formato numérico
        paymentMethod: this.mapPaymentMethod(sale.paymentMethod),
        employeeId: await this.getValidEmployeeId(), // Obtener empleado válido
        notes: sale.notes || `Venta POS - ${sale.saleCode}`,
        localId: sale.saleCode,
        timestamp: Date.parse(sale.saleDate)
      };

      console.log(`🔗 Enviando venta al endpoint: /api/pos/sales`);
      console.log(`📤 Payload:`, JSON.stringify(salePayload, null, 2));
      
      // Usar el endpoint específico del POS con estructura correcta
      const response = await apiClient.post('/api/pos/sales', salePayload);
      console.log(`✅ PASO 3: Venta ${sale.saleCode} procesada exitosamente`);
      console.log(`📥 Response:`, response.data);
      
      // El backend ya descuenta stock de ArticuloInsumo automáticamente
      console.log(`🎉 VENTA COMPLETA: ${sale.saleCode} - Stock descontado por el backend`);
      
    } catch (error: any) {
      console.error('❌ Error uploading sale to POS server:', error);
      
      // Log detallado del error para debugging
      if (error.response) {
        console.error('📊 Response Error Details:');
        console.error('  Status:', error.response.status);
        console.error('  Status Text:', error.response.statusText);
        console.error('  Headers:', error.response.headers);
        console.error('  Data:', error.response.data);
        
        // Errores específicos por código de estado
        if (error.response.status === 400) {
          console.error('🚫 BAD REQUEST - Posibles problemas:');
          console.error('  - EmployeeId no existe en la base de datos');
          console.error('  - PaymentMethod no válido');
          console.error('  - ProductId no encontrado');
          console.error('  - Formato de datos incorrecto');
          
          throw new Error(`❌ Error 400: Datos incorrectos. Verifica que el empleado y productos existan en el backend.`);
        } else if (error.response.status === 500) {
          console.error('💥 INTERNAL SERVER ERROR - Error en el servidor');
          throw new Error(`❌ Error 500: Error interno del servidor. Verifica que el backend esté funcionando correctamente.`);
        } else {
          throw new Error(`❌ Error ${error.response.status}: ${error.response.statusText}`);
        }
      } else if (error.request) {
        console.error('📡 Network Error:', error.request);
        throw new Error('❌ Error de conexión: No se pudo conectar con el servidor backend');
      } else {
        console.error('⚙️ Setup Error:', error.message);
        throw new Error(`❌ Error de configuración: ${error.message}`);
      }
    }
  }

  // Obtener ventas del día actual desde el backend
  static async getTodaySales(): Promise<Sale[]> {
    try {
      const response = await apiClient.get('/api/pos/sales/today');
      const backendSales = response.data || [];
      
      return backendSales.map((s: any) => this.mapBackendSaleToFrontend(s));
    } catch (error) {
      console.warn('⚠️ Error obteniendo ventas del backend, usando localStorage:', error);
      // Fallback a localStorage
      const today = new Date().toISOString().split('T')[0];
      const salesData = localStorage.getItem('pos-sales');
      if (salesData) {
        const sales: Sale[] = JSON.parse(salesData);
        return sales.filter(sale => sale.saleDate.startsWith(today));
      }
      return [];
    }
  }

  // Anular una venta
  static async voidSale(saleId: string | number, reason: string): Promise<Sale> {
    const employeeId = await this.getValidEmployeeId();
    const response = await apiClient.post(`/api/pos/sales/${saleId}/void`, {
      employeeId,
      reason
    });
    return this.mapBackendSaleToFrontend(response.data);
  }

  // Mapear venta del backend al tipo frontend
  private static mapBackendSaleToFrontend(s: any): Sale {
    const paymentMap: Record<string, 'cash' | 'card' | 'transfer'> = {
      'EFECTIVO': 'cash',
      'MERCADOPAGO': 'card',
      'CREDIT_CARD': 'card',
      'DEBIT_CARD': 'card',
      'QR': 'transfer',
    };

    return {
      id: String(s.id),
      saleCode: s.saleCode || '',
      saleDate: s.saleDate || '',
      employeeId: '',
      employeeName: s.employeeName || '',
      items: (s.items || []).map((item: any) => ({
        id: String(item.productId),
        productId: String(item.productId),
        productName: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        category: '',
        unitMeasure: 'unidad',
      })),
      itemsCount: s.itemsCount || 0,
      subtotal: s.total || 0,
      tax: 0,
      discount: 0,
      total: s.total || 0,
      paymentMethod: paymentMap[s.paymentMethod] || 'cash',
      notes: '',
      printed: false,
      synced: s.synced ?? true,
      status: s.status || 'ACTIVE',
      voidedAt: s.voidedAt,
      voidReason: s.voidReason,
    };
  }

  // Guardar venta localmente
  static async saveSaleLocally(sale: Sale): Promise<void> {
    try {
      const salesData = localStorage.getItem('pos-sales');
      const sales: Sale[] = salesData ? JSON.parse(salesData) : [];
      
      sales.push(sale);
      localStorage.setItem('pos-sales', JSON.stringify(sales));
      
      console.log(`💾 Venta ${sale.saleCode} guardada localmente`);
    } catch (error) {
      console.error('Error saving sale locally:', error);
      throw new Error('Error al guardar la venta localmente');
    }
  }

  // Obtener estadísticas del día
  static async getDailyStats(): Promise<DailySales> {
    try {
      const todaySales = await this.getTodaySales();
      const activeSales = todaySales.filter(s => s.status !== 'VOIDED');
      
      const totalRevenue = activeSales.reduce((sum, sale) => sum + sale.total, 0);
      
      const salesByMethod = {
        cash: activeSales.filter(s => s.paymentMethod === 'cash').length,
        card: activeSales.filter(s => s.paymentMethod === 'card').length,
        transfer: activeSales.filter(s => s.paymentMethod === 'transfer').length,
      };

      // Calcular productos más vendidos
      const productSales = new Map<string, { quantity: number; revenue: number }>();
      
      activeSales.forEach(sale => {
        sale.items.forEach(item => {
          const existing = productSales.get(item.productName) || { quantity: 0, revenue: 0 };
          productSales.set(item.productName, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + (item.price * item.quantity)
          });
        });
      });

      const topProducts = Array.from(productSales.entries())
        .map(([productName, data]) => ({
          productName,
          quantity: data.quantity,
          revenue: data.revenue
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      return {
        totalSales: activeSales.length,
        totalRevenue,
        salesByMethod,
        topProducts
      };
      
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return {
        totalSales: 0,
        totalRevenue: 0,
        salesByMethod: { cash: 0, card: 0, transfer: 0 },
        topProducts: []
      };
    }
  }
}