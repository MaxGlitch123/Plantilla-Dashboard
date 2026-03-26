// src/store/useSupplyStore.ts

import { create } from 'zustand';
import axios from 'axios';
import { getToken } from '../api/apiClient';

// Definir tipos para insumos
export interface Supply {
  id: number;
  denominacion: string;
  precioCompra: number;
  stockActual: number;
  stockMinimo: number;
  stockMaximo: number;
  unidadMedida?: {
    id: number;
    denominacion: string;
  };
  esParaElaborar?: boolean;
  rubro?: {
    id: number;
    denominacion: string;
  };
}

// Definir tipo para actualizaciones de stock
export interface StockUpdate {
  insumoId: number;
  nuevoStock: number;
}

// Definir el estado del store
interface SupplyState {
  supplies: Supply[];
  loading: boolean;
  error: string | null;
  
  // Acciones
  fetchSupplies: () => Promise<void>;
  getSupplyById: (id: number) => Supply | undefined;
  updateSupplyStock: (id: number, newStock: number) => Promise<void>;
  handleStockUpdate: (update: StockUpdate) => void;
}

// Crear el store usando zustand
export const useSupplyStore = create<SupplyState>((set, get) => ({
  supplies: [],
  loading: false,
  error: null,
  
  // Obtener todos los insumos
  fetchSupplies: async () => {
    set({ loading: true, error: null });
    try {
      const token = await getToken();
      const response = await axios.get(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloInsumo/listar`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Verificar que la respuesta sea un array
      if (Array.isArray(response.data)) {
        set({ supplies: response.data, loading: false });
      } else {
        console.error('La respuesta de insumos no es un array:', response.data);
        set({ error: 'Formato de respuesta inesperado', loading: false });
      }
    } catch (error) {
      console.error('Error al cargar insumos:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Error desconocido al cargar insumos', 
        loading: false 
      });
    }
  },
  
  // Obtener un insumo por su ID
  getSupplyById: (id) => {
    return get().supplies.find(supply => supply.id === id);
  },
  
  // Actualizar el stock de un insumo
  updateSupplyStock: async (id, newStock) => {
    try {
      const token = await getToken();
      const supply = get().supplies.find(s => s.id === id);
      
      if (!supply) {
        throw new Error(`No se encontró el insumo con ID ${id}`);
      }
      
      // Enviar actualización al backend
      await axios.put(`${import.meta.env.VITE_API_URL || '/api-proxy'}/articuloInsumo/${id}/stock`, {
        stockActual: newStock
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Actualizar el estado local si la operación fue exitosa
      set({
        supplies: get().supplies.map(s => 
          s.id === id ? { ...s, stockActual: newStock } : s
        )
      });
      
      console.log(`✅ Stock actualizado para insumo #${id}: ${newStock}`);
    } catch (error) {
      console.error(`Error al actualizar stock para insumo #${id}:`, error);
      throw error; // Re-lanzar error para manejo externo
    }
  },
  
  // Manejar actualizaciones de stock recibidas por WebSocket
  handleStockUpdate: (update) => {
    const { insumoId, nuevoStock } = update;
    
    set({
      supplies: get().supplies.map(s => 
        s.id === insumoId ? { ...s, stockActual: nuevoStock } : s
      )
    });
    
    console.log(`⚡ Stock actualizado vía WebSocket para insumo #${insumoId}: ${nuevoStock}`);
  }
}));

export default useSupplyStore;
