import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, Product, POSState, Sale, PaymentDetails } from '../types/pos';

interface POSStore extends POSState {
  // Actions para el carrito
  addToCart: (product: Product, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  
  // Actions para productos
  selectProduct: (product: Product | undefined) => void;
  
  // Actions para pagos
  setShowPaymentModal: (show: boolean) => void;
  
  // Actions para ventas
  completeSale: (paymentDetails: PaymentDetails, customerInfo?: { name?: string; document?: string }) => Promise<Sale>;
  
  // Actions para estado
  setOfflineMode: (offline: boolean) => void;
  updateSyncStatus: (lastSync: string) => void;
  
  // Actions para estadísticas
  updateDailyStats: () => void;
}

const generateSaleCode = (): string => {
  const date = new Date();
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `POS-${timeStr}-${random}`;
};

export const usePOSStore = create<POSStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      cart: [],
      currentSale: undefined,
      isOffline: false,
      lastSync: null,
      dailyTotal: 0,
      salesCount: 0,
      selectedProduct: undefined,
      showPaymentModal: false,

      // Actions para el carrito
      addToCart: (product: Product, quantity: number) => {
        set((state) => {
          const existingItem = state.cart.find(item => item.productId === product.id);
          
          if (existingItem) {
            return {
              cart: state.cart.map(item =>
                item.productId === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            };
          }

          const newItem: CartItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            price: product.price,
            quantity,
            category: product.category,
            unitMeasure: product.unitMeasure,
            image: product.image,
          };

          return { cart: [...state.cart, newItem] };
        });
      },

      removeFromCart: (productId: string) => {
        set((state) => ({
          cart: state.cart.filter(item => item.productId !== productId)
        }));
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        set((state) => ({
          cart: state.cart.map(item =>
            item.productId === productId
              ? { ...item, quantity }
              : item
          )
        }));
      },

      clearCart: () => {
        set({ cart: [] });
      },

      // Actions para productos
      selectProduct: (product: Product | undefined) => {
        set({ selectedProduct: product });
      },

      // Actions para pagos
      setShowPaymentModal: (show: boolean) => {
        set({ showPaymentModal: show });
      },

      // Actions para ventas
      completeSale: async (paymentDetails: PaymentDetails, customerInfo) => {
        const state = get();
        const { cart } = state;

        if (cart.length === 0) {
          throw new Error('El carrito está vacío');
        }

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.21; // 21% IVA
        const total = subtotal + tax;

        const sale: Sale = {
          id: crypto.randomUUID(),
          saleCode: generateSaleCode(),
          saleDate: new Date().toISOString(),
          employeeId: 'current-user-id', // TODO: Obtener del auth store
          employeeName: 'Usuario Actual', // TODO: Obtener del auth store
          items: [...cart],
          itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
          subtotal,
          tax,
          discount: 0,
          total,
          paymentMethod: paymentDetails.method,
          customerName: customerInfo?.name,
          customerDocument: customerInfo?.document,
          printed: false,
          synced: !state.isOffline,
        };

        // Limpiar carrito y cerrar modal
        set({
          cart: [],
          currentSale: sale,
          showPaymentModal: false,
          dailyTotal: state.dailyTotal + total,
          salesCount: state.salesCount + 1,
        });

        return sale;
      },

      // Actions para estado
      setOfflineMode: (offline: boolean) => {
        set({ isOffline: offline });
      },

      updateSyncStatus: (lastSync: string) => {
        set({ lastSync });
      },

      // Actions para estadísticas
      updateDailyStats: () => {
        // Esta función se puede expandir para cargar estadísticas del día
        // desde el localStorage o el servidor
      },
    }),
    {
      name: 'pos-storage',
      partialize: (state) => ({
        cart: state.cart,
        dailyTotal: state.dailyTotal,
        salesCount: state.salesCount,
        lastSync: state.lastSync,
      }),
    }
  )
);