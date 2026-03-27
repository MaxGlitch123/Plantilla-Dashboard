import apiClient from "./apiClient";
import type { Ingredient } from "../types/pos";

export async function posSearchIngredients(query: string): Promise<Ingredient[]> {
  const { data } = await apiClient.get<Ingredient[]>("/api/ingredients/search", {
    params: { query },
  });
  return data;
}