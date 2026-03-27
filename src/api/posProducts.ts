import apiClient from "./apiClient";
import type { Product } from "../types/pos";

export async function posSearchProducts(query: string): Promise<Product[]> {
  const { data } = await apiClient.get<Product[]>("/api/pos/products/search", {
    params: { query },
  });
  return data;
}