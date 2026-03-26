import { Sale, Product, DailySales } from '../types/pos';
import apiClient from '../api/apiClient';

export class POSService {
  // Obtener productos para el POS
  static async getProducts(): Promise<Product[]> {
    try {
      // Intentar obtener productos del servidor
      const response = await apiClient.get('/products?active=true');
      return response.data.map((product: any) => ({
        id: product.id,
        name: product.denominacion,
        price: product.precioVenta,
        category: product.categoria?.denominacion || 'Sin categoría',
        subcategory: product.subcategoria?.denominacion,
        description: product.descripcion,
        image: product.imagenes?.[0]?.url,
        unitMeasure: product.unidadMedida?.denominacion,
        stock: product.stockCurrente,
        isActive: product.habilitado,
        barcode: product.codigoArticulo,
      }));
    } catch (error) {
      console.error('Error fetching products from server, using sample products:', error);
      // Fallback a productos de muestra para pruebas
      return this.getSampleProducts();
    }
  }

  // Productos de muestra para pruebas del POS
  private static getSampleProducts(): Product[] {
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
      const searchTerm = query.toLowerCase();
      
      return products.filter(product =>
        product.name.toLowerCase().includes(searchTerm) ||
        product.barcode?.toLowerCase().includes(searchTerm) ||
        product.category.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  // Guardar venta en el servidor
  static async uploadSale(sale: Sale): Promise<void> {
    try {
      const salePayload = {
        fechaPedido: sale.saleDate,
        horaEstimadaFinalizacion: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        total: sale.total,
        totalCosto: sale.subtotal,
        estado: 'COMPLETADO',
        tipoEnvio: 'TAKE_AWAY',
        formaPago: sale.paymentMethod.toUpperCase(),
        fechaVencimientoMP: null,
        empleado: {
          id: sale.employeeId
        },
        sucursal: {
          id: 1 // TODO: Obtener de configuración
        },
        detallePedidos: sale.items.map(item => ({
          cantidad: item.quantity,
          subTotal: item.price * item.quantity,
          articuloManufacturado: {
            id: item.productId
          }
        })),
        domicilio: null,
        notasPedido: sale.notes || `Venta POS - ${sale.saleCode}`,
        cliente: null
      };

      await apiClient.post('/pedidos', salePayload);
      console.log(`✅ Venta ${sale.saleCode} enviada al servidor`);
      
    } catch (error) {
      console.error('Error uploading sale:', error);
      throw new Error('Error al sincronizar la venta con el servidor');
    }
  }

  // Obtener ventas del día actual
  static async getTodaySales(): Promise<Sale[]> {
    const today = new Date().toISOString().split('T')[0];
    const salesData = localStorage.getItem('pos-sales');
    
    if (salesData) {
      const sales: Sale[] = JSON.parse(salesData);
      return sales.filter(sale => 
        sale.saleDate.startsWith(today)
      );
    }
    
    return [];
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
      
      const totalRevenue = todaySales.reduce((sum, sale) => sum + sale.total, 0);
      
      const salesByMethod = {
        cash: todaySales.filter(s => s.paymentMethod === 'cash').length,
        card: todaySales.filter(s => s.paymentMethod === 'card').length,
        transfer: todaySales.filter(s => s.paymentMethod === 'transfer').length,
      };

      // Calcular productos más vendidos
      const productSales = new Map<string, { quantity: number; revenue: number }>();
      
      todaySales.forEach(sale => {
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
        totalSales: todaySales.length,
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