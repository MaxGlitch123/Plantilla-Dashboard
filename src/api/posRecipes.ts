import apiClient from "./apiClient";
import type { RecipeItem, RecipeUpsertDTO } from "../types/pos";

export async function posGetRecipe(productId: number): Promise<RecipeItem[]> {
  const { data } = await apiClient.get<RecipeItem[]>(`/api/recipes/${productId}`);
  return data;
}

export async function posUpsertRecipe(productId: number, dto: RecipeUpsertDTO): Promise<RecipeItem[]> {
  const { data } = await apiClient.post<RecipeItem[]>(`/api/recipes/${productId}`, dto);
  return data;
}