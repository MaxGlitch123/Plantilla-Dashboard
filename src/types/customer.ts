import { PedidoResponse } from './order';

export interface Usuario {
  id: number;
  username: string;
  rol: string;
}

export interface Customer {
  id: number;
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
  fechaNacimiento: string | null;
  usuario: Usuario | null;
  pedidos: PedidoResponse[] | null;
}
