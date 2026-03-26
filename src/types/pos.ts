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
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  subcategory?: string;
  description?: string;
  image?: string;
  unitMeasure?: string;
  stock?: number;
  isActive: boolean;
  barcode?: string;
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