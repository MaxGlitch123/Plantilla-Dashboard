// authStore.ts
import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface AuthState {
  token: string | null;
  rol: string | null;
  setToken: (token: string | null) => void;
  setRol: (rol: string | null) => void;
}

// Crear el store con el middleware devtools para mejor depuración
export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      token: null,
      rol: null,
      setToken: (token: string | null) => {
        if (token !== null && token.length > 0) {
          // Solo actualizar si hay un cambio real
          set((state) => state.token !== token ? { token } : {});
        }
      },
      setRol: (rol: string | null) => {
        // Solo actualizar si hay un cambio real
        set((state) => state.rol !== rol ? { rol } : {});
      },
    }),
    { name: 'auth-store' }
  )
);
