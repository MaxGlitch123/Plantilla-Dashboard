import apiClient from "./apiClient";
import type { Product } from "../types/pos";

export async function posSearchProducts(query: string): Promise<Product[]> {
  // ⚠️ DEPRECADO: Usar POSService.searchProducts() en su lugar
  // Este endpoint no existe en el backend real
  console.warn('⚠️ posSearchProducts DEPRECADO - Usar POSService.searchProducts()');
  
  // Fallback temporal a productos de muestra
  return [
    {
      id: '999',
      name: 'Producto de ejemplo',
      price: 1000,
      category: 'Ejemplo',
      description: 'Usar POSService en lugar de este archivo',
      unitMeasure: 'unidad',
      stock: 0,
      isActive: false,
      barcode: 'DEPRECATED'
    }
  ];
}