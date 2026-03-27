import React, { useState } from 'react';
import { Wifi, WifiOff, Clock, Trash2 } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineService } from '../../services/offlineService';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { pendingSales, syncInProgress, lastSyncTime, syncPendingSales } = useOfflineSync();
  const [clearing, setClearing] = useState(false);

  const handleManualSync = () => {
    if (isOnline && !syncInProgress) {
      syncPendingSales();
    }
  };

  const handleClearPendingSales = async () => {
    if (window.confirm('¿Estás seguro de que quieres eliminar todas las ventas pendientes? Esta acción no se puede deshacer.')) {
      setClearing(true);
      try {
        await OfflineService.clearAllPendingSales();
        window.location.reload(); // Recargar para actualizar los contadores
      } catch (error) {
        console.error('Error clearing pending sales:', error);
        alert('Error al limpiar ventas pendientes');
      } finally {
        setClearing(false);
      }
    }
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      {/* Indicador de conexión */}
      <div className={`flex items-center space-x-1 px-2 py-1 rounded-full ${
        isOnline 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        {isOnline ? (
          <>
            <Wifi size={14} />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff size={14} />
            <span>Offline</span>
          </>
        )}
      </div>

      {/* Indicador de sincronización */}
      {pendingSales > 0 && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
          <Clock size={14} />
          <span>{pendingSales} pendiente{pendingSales !== 1 ? 's' : ''}</span>
          {isOnline && !syncInProgress && (
            <button
              onClick={handleManualSync}
              className="ml-1 text-xs underline hover:no-underline"
            >
              Sincronizar
            </button>
          )}
          {/* Botón para limpiar ventas pendientes */}
          <button
            onClick={handleClearPendingSales}
            disabled={clearing}
            className="ml-1 text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
            title="Limpiar todas las ventas pendientes"
          >
            {clearing ? (
              <div className="animate-spin h-3 w-3 border border-red-600 rounded-full border-t-transparent"></div>
            ) : (
              <Trash2 size={12} />
            )}
          </button>
        </div>
      )}

      {/* Indicador de sincronización en progreso */}
      {syncInProgress && (
        <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
          <div className="animate-spin h-3 w-3 border border-blue-600 rounded-full border-t-transparent"></div>
          <span>Sincronizando...</span>
        </div>
      )}

      {/* Última sincronización */}
      {lastSyncTime && (
        <div className="text-gray-500 text-xs">
          Última sync: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};