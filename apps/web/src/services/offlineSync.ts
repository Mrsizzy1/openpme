import { ApiClient } from '../api/client';

export interface OfflineSaleItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  productName?: string;
}

export interface OfflineSalePayment {
  amount: string;
  currency: string;
  method: string;
  cashSessionId?: string;
  reference?: string;
}

export interface OfflineSaleRecord {
  id: string; // ID local provisoire (ex: OFFLINE-VNT-...)
  customerId?: string;
  customerName?: string;
  items: OfflineSaleItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  currency: string;
  paymentMethod: string;
  immediatePayment?: boolean;
  payments?: OfflineSalePayment[];
  notes?: string;
  createdAt: string;
  synced: boolean;
  syncError?: string;
}

const STORAGE_KEY = 'smart_pme_offline_sales_queue';

class OfflineSyncService {
  private isSyncing = false;
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncPendingSales();
      });

      // Synchronisation périodique toutes les 30 secondes si le réseau est actif
      setInterval(() => {
        if (navigator.onLine && !this.isSyncing) {
          this.syncPendingSales();
        }
      }, 30000);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in offline sync listener', err);
      }
    });
  }

  public getQueue(): OfflineSaleRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: OfflineSaleRecord[]) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (err) {
      console.error('Failed to save offline queue', err);
    }
  }

  public getPendingCount(): number {
    return this.getQueue().filter((s) => !s.synced).length;
  }

  public getPendingSyncError(): string | undefined {
    return this.getQueue().find((sale) => !sale.synced && sale.syncError)?.syncError;
  }

  public enqueueSale(saleData: Omit<OfflineSaleRecord, 'id' | 'createdAt' | 'synced'>): OfflineSaleRecord {
    const queue = this.getQueue();
    const tempId = `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newRecord: OfflineSaleRecord = {
      ...saleData,
      id: tempId,
      createdAt: new Date().toISOString(),
      synced: false,
    };

    queue.push(newRecord);
    this.saveQueue(queue);

    // Tenter immédiatement une synchro si en ligne
    if (navigator.onLine) {
      this.syncPendingSales();
    }

    return newRecord;
  }

  public async syncPendingSales(): Promise<{ successCount: number; failedCount: number }> {
    if (this.isSyncing) return { successCount: 0, failedCount: 0 };
    this.isSyncing = true;

    const queue = this.getQueue();
    const pending = queue.filter((s) => !s.synced);

    if (pending.length === 0) {
      this.isSyncing = false;
      return { successCount: 0, failedCount: 0 };
    }

    let successCount = 0;
    let failedCount = 0;

    for (const sale of pending) {
      try {
        if (sale.immediatePayment !== false && !sale.payments) {
          failedCount++;
          sale.syncError = 'Cette ancienne vente hors ligne ne contient pas les règlements ni les sessions de caisse requis. Rapprochez-la manuellement avant de la resaisir.';
          continue;
        }

        await ApiClient.createSale({
          customerId: sale.customerId,
          currency: sale.currency,
          immediatePayment: sale.immediatePayment ?? false,
          payments: sale.payments,
          items: sale.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
          paymentMethod: sale.paymentMethod,
          notes: `[Synchronisation Hors-Ligne] ${sale.notes || ''}`.trim(),
        });

        // Marquer comme synchronisé
        sale.synced = true;
        sale.syncError = undefined;
        successCount++;
      } catch (err: any) {
        failedCount++;
        sale.syncError = err.message || 'Échec de transmission au serveur';
        // Arrêter le lot si erreur réseau manifeste
        if (!navigator.onLine || err.message?.includes('Failed to fetch')) {
          break;
        }
      }
    }

    // Garder seulement les non synchronisés ou les 50 derniers synchronisés pour historique
    const cleanedQueue = queue.filter((s) => !s.synced).concat(
      queue.filter((s) => s.synced).slice(-50)
    );

    this.saveQueue(cleanedQueue);
    this.isSyncing = false;

    return { successCount, failedCount };
  }
}

export const offlineSync = new OfflineSyncService();
