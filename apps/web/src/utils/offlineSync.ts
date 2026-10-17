/**
 * Smart PME Finance - Moteur de Synchronisation Hors-Ligne (Offline-First Engine)
 * Permet l'enregistrement des ventes même en cas de coupure internet/réseau,
 * avec synchronisation automatique et réconciliation dès le retour de la connexion.
 */

import { ApiClient } from '../api/client';

export interface OfflineSaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
}

export interface OfflineSale {
  offlineId: string;
  createdAt: string;
  customerId?: string;
  customerName?: string;
  items: OfflineSaleItem[];
  currency: string;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  discountTotal?: number;
  cashSessionId?: string;
  notes?: string;
  status: 'PENDING_SYNC' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
}

const STORAGE_KEY = 'SMART_PME_OFFLINE_SALES_QUEUE';

export class OfflineSyncService {
  /**
   * Vérifie si le client est actuellement en ligne
   */
  static isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  /**
   * Récupère la liste des ventes en attente de synchronisation
   */
  static getQueue(): OfflineSale[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Nombre de ventes locales non encore synchronisées
   */
  static getPendingCount(): number {
    return this.getQueue().filter((s) => s.status === 'PENDING_SYNC').length;
  }

  /**
   * Enregistre une vente localement en mode hors-ligne
   */
  static saveOfflineSale(saleData: {
    customerId?: string;
    customerName?: string;
    items: OfflineSaleItem[];
    currency: string;
    paymentMethod: string;
    cashReceived?: number;
    changeGiven?: number;
    discountTotal?: number;
    cashSessionId?: string;
    notes?: string;
  }): OfflineSale {
    const offlineId = `OFFLINE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const offlineSale: OfflineSale = {
      ...saleData,
      offlineId,
      createdAt: new Date().toISOString(),
      status: 'PENDING_SYNC',
    };

    const current = this.getQueue();
    current.push(offlineSale);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));

    // Déclencher un événement global pour mettre à jour les badges d'interface
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smart-pme-offline-queue-changed', {
        detail: { count: current.length }
      }));
    }

    return offlineSale;
  }

  /**
   * Lance la synchronisation de toutes les ventes en attente vers le serveur central
   */
  static async syncAll(onProgress?: (synced: number, total: number) => void): Promise<{
    synced: number;
    failed: number;
    errors: string[];
  }> {
    const queue = this.getQueue();
    const pending = queue.filter((s) => s.status === 'PENDING_SYNC');

    if (pending.length === 0) {
      return { synced: 0, failed: 0, errors: [] };
    }

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];
    const remainingQueue: OfflineSale[] = [];

    for (let i = 0; i < pending.length; i++) {
      const sale = pending[i];
      try {
        // Préparation du payload attendu par l'API NestJS
        const payload = {
          customerId: sale.customerId,
          items: sale.items.map((it) => ({
            productId: it.productId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount || 0,
          })),
          currency: sale.currency,
          paymentMethod: sale.paymentMethod,
          cashReceived: sale.cashReceived,
          discountTotal: sale.discountTotal,
          cashSessionId: sale.cashSessionId,
          notes: `[Synchronisé hors-ligne ${sale.offlineId}] ${sale.notes || ''}`.trim(),
        };

        await ApiClient.createSale(payload);
        synced++;
        if (onProgress) onProgress(synced, pending.length);
      } catch (err: any) {
        failed++;
        errors.push(`Vente ${sale.offlineId}: ${err.message || 'Erreur serveur'}`);
        // Conserver dans la file pour nouvel essai ultérieur
        remainingQueue.push({
          ...sale,
          status: 'ERROR',
          errorMessage: err.message,
        });
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(remainingQueue));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smart-pme-offline-queue-changed', {
        detail: { count: remainingQueue.length }
      }));
    }

    return { synced, failed, errors };
  }

  /**
   * Supprime l'historique des ventes synchronisées
   */
  static clearCompleted(): void {
    const remaining = this.getQueue().filter((s) => s.status === 'PENDING_SYNC' || s.status === 'ERROR');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
  }
}
