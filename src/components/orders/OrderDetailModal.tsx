import React, { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { PedidoDetalleResponse } from '../../types/order';
import Badge, { BadgeVariant } from '../ui/Badge';
import { validateStockForImmediateOrder } from '../../services/stockValidationService';
import { useSupplyStore } from '../../store/useSupplyStore';

interface Props {
    pedido: PedidoDetalleResponse | null;
    onClose: () => void;
}

const statusVariant = {
    PENDIENTE: 'warning',
    PREPARACION: 'info',
    LISTO: 'secondary',
    ENTREGADO: 'success',
    CANCELADO: 'danger',
};

const OrderDetailModal: React.FC<Props> = ({ pedido, onClose }) => {
    const [stockImpact, setStockImpact] = useState<any>(null);
    const [loadingStockInfo, setLoadingStockInfo] = useState(false);
    const supplyStore = useSupplyStore();

    // Calcular el impacto en stock cuando se monta el componente
    useEffect(() => {
        const calculateStockImpact = async () => {
            if (!pedido || pedido.estado !== 'PREPARACION' || !pedido.detalles || pedido.detalles.length === 0) {
                return;
            }

            console.log(`🔍 === CALCULANDO IMPACTO DE STOCK PARA PEDIDO #${pedido.numeroPedido} ===`);
            console.log(`📦 Estado: ${pedido.estado} - analizando descuento de stock`);

            setLoadingStockInfo(true);
            try {
                // Convertir detalles del pedido al formato esperado
                const orderItems = pedido.detalles.map(detalle => ({
                    articulo: detalle.articulo,
                    cantidad: detalle.cantidad
                }));

                console.log('Items del pedido:', orderItems);

                const validation = await validateStockForImmediateOrder(orderItems);
                console.log('📊 Impacto calculado:', validation);

                setStockImpact(validation);
            } catch (error) {
                console.error('❌ Error calculando impacto de stock:', error);
            } finally {
                setLoadingStockInfo(false);
            }
        };

        calculateStockImpact();
    }, [pedido]);

    if (!pedido) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-lg mx-4">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-serif font-bold text-gray-800">
                        Detalle del Pedido #{pedido.numeroPedido}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 space-y-4 text-sm">
                    <div className="flex justify-between">
                        <span>Estado:</span>
                        <Badge variant={statusVariant[pedido.estado] as BadgeVariant}>
                            {pedido.estado}
                        </Badge>
                    </div>

                    <div className="flex justify-between">
                        <span>Fecha:</span>
                        <span>{pedido.fechaPedido}</span>
                    </div>

                    <div className="flex justify-between">
                        <span>Forma de pago:</span>
                        <span>{pedido.formaPago}</span>
                    </div>

                    <div className="flex justify-between">
                        <span>Tipo de envío:</span>
                        <span>{pedido.tipoEnvio}</span>
                    </div>

                    <div className="flex justify-between">
                        <span>Total:</span>
                        <span className="font-medium">${pedido.total.toFixed(2)}</span>
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-gray-700 font-semibold mb-2">Artículos:</h3>
                        {Array.isArray(pedido.detalles) ? pedido.detalles.map((detalle) => (
                            <div key={detalle.id} className="flex gap-4 items-center mb-3">
                                {detalle.articulo?.imagenesArticulos?.[0]?.url && (
                                    <img
                                        src={detalle.articulo.imagenesArticulos[0].url}
                                        alt={detalle.articulo.denominacion || 'Producto'}
                                        className="w-16 h-16 object-cover rounded-md border"
                                    />
                                )}
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">
                                        {detalle.articulo?.denominacion || 'Producto sin nombre'}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        {detalle.cantidad || 1} x ${typeof detalle.subTotal === 'number' 
                                            ? detalle.subTotal.toFixed(2) 
                                            : '0.00'}
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <p className="text-gray-500">No hay detalles disponibles</p>
                        )}
                    </div>

                    {/* Información de impacto en stock */}
                    {pedido.estado === 'PREPARACION' && (
                        <div className="border-t pt-4">
                            <h3 className="text-gray-700 font-semibold mb-2 flex items-center">
                                <Package size={18} className="mr-2" />
                                Impacto en Inventario
                            </h3>
                            
                            {loadingStockInfo ? (
                                <div className="flex items-center text-sm text-gray-600">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                    Calculando impacto en inventario...
                                </div>
                            ) : stockImpact ? (
                                <div className="space-y-2">
                                    {/* Resumen del impacto */}
                                    <div className="bg-blue-50 p-3 rounded-md">
                                        <div className="flex items-center text-sm text-blue-800 font-medium mb-1">
                                            <TrendingDown size={16} className="mr-1" />
                                            Stock descontado inmediatamente
                                        </div>
                                        <p className="text-xs text-blue-600">
                                            Este pedido ha descontado automáticamente los ingredientes del inventario.
                                        </p>
                                    </div>

                                    {/* Lista de ingredientes afectados */}
                                    {stockImpact.estimatedImpact && stockImpact.estimatedImpact.length > 0 && (
                                        <div className="mt-3">
                                            <h4 className="text-sm font-medium text-gray-700 mb-2">Ingredientes utilizados:</h4>
                                            <div className="space-y-1">
                                                {stockImpact.estimatedImpact.map((item: any, index: number) => (
                                                    <div key={index} className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded">
                                                        <div className="flex items-center">
                                                            <span className="font-medium">{item.nombre}</span>
                                                            {item.criticalLevel && (
                                                                <AlertTriangle size={14} className="ml-1 text-amber-500" />
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="flex items-center text-gray-600">
                                                                {item.stockActual} → {item.stockDespues}
                                                                {item.criticalLevel ? (
                                                                    <span className="ml-1 text-amber-600 font-medium">⚠️</span>
                                                                ) : (
                                                                    <CheckCircle size={12} className="ml-1 text-green-600" />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Alertas de stock crítico */}
                                    {stockImpact.estimatedImpact && 
                                     stockImpact.estimatedImpact.filter((item: any) => item.criticalLevel).length > 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mt-2">
                                            <div className="flex items-center text-amber-800 text-sm font-medium">
                                                <AlertTriangle size={16} className="mr-2" />
                                                Ingredientes en nivel crítico
                                            </div>
                                            <p className="text-xs text-amber-700 mt-1">
                                                {stockImpact.estimatedImpact.filter((item: any) => item.criticalLevel).length} ingrediente(s) 
                                                han quedado por debajo del stock mínimo.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No se pudo calcular el impacto en inventario
                                </p>
                            )}
                        </div>
                    )}

                    {/* Información adicional para pedidos no en preparación */}
                    {pedido.estado !== 'PREPARACION' && (
                        <div className="border-t pt-4">
                            <div className="bg-gray-50 p-3 rounded-md">
                                <div className="text-sm text-gray-600">
                                    <Package size={16} className="inline mr-1" />
                                    {pedido.estado === 'PENDIENTE' ? 
                                        'El stock se descontará cuando el pedido pase a preparación.' :
                                        pedido.estado === 'CANCELADO' ?
                                        'Pedido cancelado - el stock no fue afectado.' :
                                        'El stock fue descontado durante la preparación.'
                                    }
                                </div>
                            </div>
                        </div>
                    )}

                    {/* <div className="border-t pt-4">
                        <h3 className="text-gray-700 font-semibold mb-2">Sucursal:</h3>
                        <p className="text-sm text-gray-600">{pedido.sucursal.nombre}</p>
                        <p className="text-sm text-gray-600">{pedido.sucursal.email}</p>
                        <p className="text-sm text-gray-600">{pedido.sucursal.telefono}</p>
                    </div> */}

                    <div className="border-t pt-4">
                        <h3 className="text-gray-700 font-semibold mb-2">Domicilio:</h3>
                        {pedido.domicilio ? (
                            <>
                                <p className="text-sm text-gray-600">
                                    {pedido.domicilio.calle || ''} {pedido.domicilio.numero || ''}, 
                                    {pedido.domicilio.piso ? `Piso ${pedido.domicilio.piso}` : ''}, 
                                    {pedido.domicilio.nroDpto ? `Dpto ${pedido.domicilio.nroDpto}` : ''}
                                </p>
                                {pedido.domicilio.localidad && (
                                    <p className="text-sm text-gray-600">
                                        {typeof pedido.domicilio.localidad === 'string' 
                                            ? pedido.domicilio.localidad 
                                            : [
                                                pedido.domicilio.localidad.nombre,
                                                pedido.domicilio.localidad.provincia?.nombre,
                                                pedido.domicilio.localidad.provincia?.pais?.nombre
                                              ].filter(Boolean).join(', ')
                                        }
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-sm text-gray-600">No hay información de domicilio disponible</p>
                        )}
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={onClose}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium px-4 py-2 rounded"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderDetailModal;
