import apiClient from "./apiClient";

// Tipos
export interface UnitMeasure {
  id?: number;
  denominacion: string;
}

// Endpoints
export const getUnitMeasures = async () => {
  const response = await apiClient.get('/unidadmedida');
  return response.data;
};

export const getUnitMeasureById = async (id: number) => {
  const response = await apiClient.get(`/unidadmedida/${id}`);
  return response.data;
};

export const createUnitMeasure = async (unitMeasure: UnitMeasure) => {
  const response = await apiClient.post('/unidadmedida', unitMeasure);
  return response.data;
};

export const updateUnitMeasure = async (id: number, unitMeasure: UnitMeasure) => {
  const response = await apiClient.put(`/unidadmedida/${id}`, unitMeasure);
  return response.data;
};

export const deleteUnitMeasure = async (id: number) => {
  const response = await apiClient.delete(`/unidadmedida/${id}`);
  return response.data;
};
