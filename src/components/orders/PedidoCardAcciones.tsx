// src/components/orders/PedidoCardAcciones.tsx

import React from 'react';
import Button from '../ui/Button';
import { PedidoEstado } from '../../types/order';

interface Props {
  rol: 'ADMIN' | 'CHEF' | 'DELIVERY' | undefined;
  estado: PedidoEstado;
  onChangeEstado: (nuevoEstado: PedidoEstado) => void;
}

const PedidoCardAcciones: React.FC<Props> = ({ rol, estado, onChangeEstado }) => {
  // CHEF: pasar de PENDIENTE a LISTO
  if (rol === 'CHEF' && estado === 'PENDIENTE') {
    return (
      <Button
        variant="primary"
        size="sm"
        onClick={() => onChangeEstado('LISTO')}
      >
        Marcar como listo
      </Button>
    );
  }

  // DELIVERY: pasar de LISTO a ENTREGADO
  if (rol === 'DELIVERY' && estado === 'LISTO') {
    return (
      <Button
        variant="success"
        size="sm"
        onClick={() => onChangeEstado('ENTREGADO')}
      >
        Marcar como entregado
      </Button>
    );
  }

  // ADMIN opcional: puede tener múltiples transiciones si lo necesitás
  if (rol === 'ADMIN') {
    const transiciones: Record<PedidoEstado, PedidoEstado[]> = {
      PENDIENTE: ['PREPARACION', 'LISTO', 'CANCELADO'],
      PREPARACION: ['LISTO', 'CANCELADO'],
      LISTO: ['ENTREGADO', 'CANCELADO'],
      ENTREGADO: [],
      CANCELADO: [],
    };

    return (
      <div className="flex gap-2 flex-wrap mt-2">
        {transiciones[estado].map((target) => (
          <Button
            key={target}
            variant={target === 'CANCELADO' ? 'danger' : 'outline'}
            size="sm"
            onClick={() => onChangeEstado(target)}
          >
            {target === 'CANCELADO'
              ? 'Cancelar'
              : `Marcar como ${target.toLowerCase()}`}
          </Button>
        ))}
      </div>
    );
  }

  return null;
};

export default PedidoCardAcciones;
