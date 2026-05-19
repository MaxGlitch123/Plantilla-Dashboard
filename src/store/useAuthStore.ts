// authStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AuthState {
  token: string | null;
  rol: string | null;
  ubicacion: 'CITYFAST' | 'ESQUINAFAST' | null;
  suppliesFilter: string;
  productsFilter: string;
  promotionsFilter: string;
  setToken: (token: string | null) => void;
  setRol: (rol: string | null) => void;
  setUbicacion: (ubicacion: 'CITYFAST' | 'ESQUINAFAST' | null) => void;
  setSuppliesFilter: (v: string) => void;
  setProductsFilter: (v: string) => void;
  setPromotionsFilter: (v: string) => void;
}

// Crear el store con el middleware devtools para mejor depuración
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      token: null,
      rol: null,
      ubicacion: null,
      suppliesFilter: '',
      productsFilter: '',
      promotionsFilter: '',
      setToken: (token: string | null) => {
        if (token !== null && token.length > 0) {
          set((state) => state.token !== token ? { token } : {});
        }
      },
      setRol: (rol: string | null) => {
        set((state) => state.rol !== rol ? { rol } : {});
      },
      setUbicacion: (ubicacion: 'CITYFAST' | 'ESQUINAFAST' | null) => {
        set((state) => state.ubicacion !== ubicacion ? { ubicacion } : {});
      },
      setSuppliesFilter: (v: string) => set({ suppliesFilter: v }),
      setProductsFilter: (v: string) => set({ productsFilter: v }),
      setPromotionsFilter: (v: string) => set({ promotionsFilter: v }),
    }),
    { name: 'auth-store' }
  )
);
