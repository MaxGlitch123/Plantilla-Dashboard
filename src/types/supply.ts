export interface Supply {
  id: number;
  denominacion: string;
  categoria: {
    id: number;
    denominacion: string;
    esInsumo: boolean;
    deleted?: boolean;
  } | null;
  unidadMedida: 
    | string 
    | { id: number; denominacion: string; abreviatura?: string };
  precioVenta: number;
  precioCompra: number;
  stockActual: number;
  stockMinimo?: number;
  stockMaximo?: number;
  stockPendiente?: number; // Stock pendiente por confirmar/recibir
  esParaElaborar: boolean;
  deleted?: boolean;
}
