import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { OfflineService } from '../services/offlineService';
import { POSService } from '../services/posService';

export const useOfflineSync = () => {
  const [pendingSales, setPendingSales] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isOnline = useOnlineStatus();

  // Obtener ventas pendientes de sincronización
  const checkPendingSales = useCallback(async () => {
    try {
      const pending = await OfflineService.getPendingSalesCount();
      setPendingSales(pending);
    } catch (error) {
      console.error('Error checking pending sales:', error);
    }
  }, []);

  // Sincronizar ventas pendientes
  const syncPendingSales = useCallback(async () => {
    if (!isOnline || syncInProgress) return;

    setSyncInProgress(true);
    try {
      const pendingSalesList = await OfflineService.getPendingSales();
      
      for (const sale of pendingSalesList) {
        try {
          await POSService.uploadSale(sale);
          await OfflineService.markSaleAsSynced(sale.id);
          console.log(`✅ Venta ${sale.saleCode} sincronizada`);
        } catch (error: any) {
          const errorMsg = error?.message || '';
          // Errores permanentes: no reintentar (stock insuficiente, datos incorrectos, sin empleado)
          const isPermanentError = errorMsg.includes('STOCK INSUFICIENTE') || 
                                   errorMsg.includes('Error 400') ||
                                   errorMsg.includes('no tiene empleado') ||
                                   errorMsg.includes('Error de configuración');
          
          if (isPermanentError) {
            console.error(`🚫 Venta ${sale.saleCode} falló permanentemente, removiendo de pendientes:`, errorMsg);
            await OfflineService.markSaleAsSynced(sale.id);
            // Guardar en lista de ventas fallidas para revisión
            try {
              const failedSales = JSON.parse(localStorage.getItem('pos-failed-sales') || '[]');
              failedSales.push({ ...sale, failReason: errorMsg, failDate: new Date().toISOString() });
              localStorage.setItem('pos-failed-sales', JSON.stringify(failedSales));
            } catch (e) { /* ignore storage errors */ }
          } else {
            console.error(`❌ Error sincronizando venta ${sale.saleCode} (se reintentará):`, error);
          }
        }
      }

      await checkPendingSales();
      setLastSyncTime(new Date());
      
    } catch (error) {
      console.error('Error durante sincronización:', error);
    } finally {
      setSyncInProgress(false);
    }
  }, [isOnline, syncInProgress, checkPendingSales]);

  // Efecto para sincronizar automáticamente cuando se recupere la conexión
  useEffect(() => {
    if (isOnline && pendingSales > 0 && !syncInProgress) {
      setTimeout(() => {
        syncPendingSales();
      }, 2000); // Esperar 2 segundos para estabilizar la conexión
    }
  }, [isOnline, pendingSales, syncInProgress, syncPendingSales]);

  // Verificar ventas pendientes al cargar
  useEffect(() => {
    checkPendingSales();
  }, [checkPendingSales]);

  return {
    pendingSales,
    syncInProgress,
    lastSyncTime,
    syncPendingSales,
    checkPendingSales
  };
};