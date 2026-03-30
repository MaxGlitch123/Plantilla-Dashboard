export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  category: string;
  unitMeasure?: string;
  image?: string;
}

export type SaleStatus = 'ACTIVE' | 'VOIDED';

export interface Sale {
  id: string;
  saleCode: string;
  saleDate: string;
  employeeId: string;
  employeeName: string;
  items: CartItem[];
  itemsCount: number;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'transfer';
  customerName?: string;
  customerDocument?: string;
  notes?: string;
  printed: boolean;
  synced: boolean;
  status?: SaleStatus;
  voidedAt?: string;
  voidReason?: string;
}

export interface Product {
  id: string | number; // Allowing both for compatibility
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  description?: string;
  image?: string;
  imageUrl?: string | null;
  unitMeasure?: string;
  stock?: number;
  isActive?: boolean;
  active?: boolean;
  barcode?: string | null;
}

export interface PaymentDetails {
  method: 'cash' | 'card' | 'transfer';
  amount: number;
  receivedAmount?: number; // Para efectivo
  change?: number;
  cardLast4?: string;
  authCode?: string;
  transactionId?: string;
}

export interface POSState {
  cart: CartItem[];
  currentSale?: Sale;
  isOffline: boolean;
  lastSync: string | null;
  dailyTotal: number;
  salesCount: number;
  selectedProduct?: Product;
  showPaymentModal: boolean;
}

export interface DailySales {
  totalSales: number;
  totalRevenue: number;
  salesByMethod: {
    cash: number;
    card: number;
    transfer: number;
  };
  topProducts: {
    productName: string;
    quantity: number;
    revenue: number;
  }[];
}

// Tipos adicionales para sistema de recetas
export type Ingredient = {
  id: number;
  name: string;
  stockUnits: number;
  active: boolean;
  notes?: string | null;
};

export type RecipeUpsertItemDTO = {
  ingredientId: number;
  quantityUnits: number;
};

export type RecipeUpsertDTO = {
  items: RecipeUpsertItemDTO[];
};

export type RecipeItem = {
  id: number;
  quantityUnits: number;
  ingredient: Ingredient;
  product?: unknown;
};