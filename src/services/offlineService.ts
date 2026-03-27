import { Sale } from '../types/pos';

export class OfflineService {
  private static readonly PENDING_SALES_KEY = 'pos-pending-sales';
  private static readonly SYNC_STATUS_KEY = 'pos-sync-status';

  // Guardar venta para sincronización posterior
  static async savePendingSale(sale: Sale): Promise<void> {
    try {
      const pendingSales = await this.getPendingSales();
      pendingSales.push({ ...sale, synced: false });
      
      localStorage.setItem(this.PENDING_SALES_KEY, JSON.stringify(pendingSales));
      console.log(`📱 Venta ${sale.saleCode} guardada para sincronización posterior`);
      
    } catch (error) {
      console.error('Error saving pending sale:', error);
      throw new Error('Error al guardar venta pendiente');
    }
  }

  // Limpiar todas las ventas pendientes (para resolver problemas de loop)
  static async clearAllPendingSales(): Promise<void> {
    try {
      localStorage.removeItem(this.PENDING_SALES_KEY);
      console.log('🧹 Todas las ventas pendientes han sido limpiadas');
    } catch (error) {
      console.error('Error clearing pending sales:', error);
      throw new Error('Error al limpiar ventas pendientes');
    }
  }

  // Obtener ventas pendientes de sincronización
  static async getPendingSales(): Promise<Sale[]> {
    try {
      const data = localStorage.getItem(this.PENDING_SALES_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting pending sales:', error);
      return [];
    }
  }

  // Obtener cantidad de ventas pendientes
  static async getPendingSalesCount(): Promise<number> {
    try {
      const pendingSales = await this.getPendingSales();
      return pendingSales.filter(sale => !sale.synced).length;
    } catch (error) {
      console.error('Error getting pending sales count:', error);
      return 0;
    }
  }

  // Marcar venta como sincronizada
  static async markSaleAsSynced(saleId: string): Promise<void> {
    try {
      const pendingSales = await this.getPendingSales();
      const updatedSales = pendingSales.map(sale =>
        sale.id === saleId ? { ...sale, synced: true } : sale
      );
      
      localStorage.setItem(this.PENDING_SALES_KEY, JSON.stringify(updatedSales));
      
      // Limpiar ventas sincronizadas después de 24 horas
      setTimeout(() => {
        this.cleanupSyncedSales();
      }, 100);
      
    } catch (error) {
      console.error('Error marking sale as synced:', error);
      throw new Error('Error al marcar venta como sincronizada');
    }
  }

  // Limpiar ventas ya sincronizadas
  static async cleanupSyncedSales(): Promise<void> {
    try {
      const pendingSales = await this.getPendingSales();
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      const filteredSales = pendingSales.filter(sale => {
        if (sale.synced) {
          const saleDate = new Date(sale.saleDate).getTime();
          return saleDate > oneDayAgo; // Mantener solo las últimas 24 horas
        }
        return true; // Mantener ventas no sincronizadas
      });
      
      if (filteredSales.length !== pendingSales.length) {
        localStorage.setItem(this.PENDING_SALES_KEY, JSON.stringify(filteredSales));
        console.log('🧹 Ventas sincronizadas antiguas eliminadas');
      }
      
    } catch (error) {
      console.error('Error cleaning up synced sales:', error);
    }
  }

  // Obtener estado de sincronización
  static getSyncStatus(): { lastSync: Date | null; pendingCount: number } {
    try {
      const data = localStorage.getItem(this.SYNC_STATUS_KEY);
      const status = data ? JSON.parse(data) : { lastSync: null, pendingCount: 0 };
      
      return {
        lastSync: status.lastSync ? new Date(status.lastSync) : null,
        pendingCount: status.pendingCount || 0
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      return { lastSync: null, pendingCount: 0 };
    }
  }

  // Actualizar estado de sincronización
  static updateSyncStatus(lastSync: Date, pendingCount: number): void {
    try {
      const status = {
        lastSync: lastSync.toISOString(),
        pendingCount
      };
      
      localStorage.setItem(this.SYNC_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  // Verificar si hay conexión a internet
  static async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        timeout: 5000 
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Obtener tamaño del almacenamiento local usado
  static getStorageUsage(): { used: number; total: number; percentage: number } {
    try {
      let totalSize = 0;
      let usedSize = 0;

      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const itemSize = localStorage[key].length + key.length;
          usedSize += itemSize;
        }
      }

      // Estimación del límite de localStorage (5MB típicamente)
      totalSize = 5 * 1024 * 1024; 

      return {
        used: usedSize,
        total: totalSize, 
        percentage: Math.round((usedSize / totalSize) * 100)
      };
    } catch (error) {
      console.error('Error calculating storage usage:', error);
      return { used: 0, total: 0, percentage: 0 };
    }
  }
}