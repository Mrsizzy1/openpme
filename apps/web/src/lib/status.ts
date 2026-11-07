import type { Tone } from './tone';

/** Libellé français + ton visuel d'un statut métier. */
export interface StatusMeta {
  label: string;
  tone: Tone;
}

/**
 * Renvoie le libellé et le ton d'un statut, avec repli neutre si la valeur est inconnue.
 *
 * @example
 * const { label, tone } = getStatusMeta(INVOICE_STATUS, invoice.status);
 * <StatusBadge tone={tone} label={label} dot />
 */
export function getStatusMeta(map: Record<string, StatusMeta>, value: string | null | undefined): StatusMeta {
  if (value && map[value]) return map[value];
  return { label: value ? String(value) : '—', tone: 'neutral' };
}

/** Ventes (SaleStatus, + PARTIAL utilisé par l'API). */
export const SALE_STATUS: Record<string, StatusMeta> = {
  COMPLETED: { label: 'Finalisée', tone: 'success' },
  PENDING: { label: 'En attente', tone: 'warning' },
  PARTIAL: { label: 'Partielle', tone: 'info' },
  CANCELLED: { label: 'Annulée', tone: 'danger' },
};

/** Factures (InvoiceStatus). */
export const INVOICE_STATUS: Record<string, StatusMeta> = {
  DRAFT: { label: 'Brouillon', tone: 'neutral' },
  ISSUED: { label: 'Émise', tone: 'info' },
  SENT: { label: 'Envoyée', tone: 'info' },
  PARTIALLY_PAID: { label: 'Partiellement payée', tone: 'warning' },
  PAID: { label: 'Payée', tone: 'success' },
  OVERDUE: { label: 'En retard', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
  REFUNDED: { label: 'Remboursée', tone: 'neutral' },
};

/** Types de pièces (InvoiceType). */
export const INVOICE_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Facture',
  PROFORMA: 'Facture proforma',
  ADVANCE: 'Facture d’acompte',
  CREDIT_NOTE: 'Avoir',
};

/** Règlements (PaymentStatus). */
export const PAYMENT_STATUS: Record<string, StatusMeta> = {
  PENDING: { label: 'En attente', tone: 'warning' },
  COMPLETED: { label: 'Encaissé', tone: 'success' },
  FAILED: { label: 'Échoué', tone: 'danger' },
  REFUNDED: { label: 'Remboursé', tone: 'neutral' },
};

/** Moyens de paiement (PaymentMethod). */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  BANK_TRANSFER: 'Virement bancaire',
  CHECK: 'Chèque',
  MOBILE_MONEY_MPESA: 'M-Pesa',
  MOBILE_MONEY_AIRTEL: 'Airtel Money',
  MOBILE_MONEY_ORANGE: 'Orange Money',
};

/** Sessions de caisse (CashSessionStatus). */
export const CASH_SESSION_STATUS: Record<string, StatusMeta> = {
  OPEN: { label: 'Ouverte', tone: 'success' },
  CLOSED: { label: 'Clôturée', tone: 'neutral' },
};

/** Gravité des anomalies (AnomalySeverity). */
export const ANOMALY_SEVERITY: Record<string, StatusMeta> = {
  LOW: { label: 'Faible', tone: 'neutral' },
  MEDIUM: { label: 'Moyenne', tone: 'warning' },
  HIGH: { label: 'Élevée', tone: 'danger' },
  CRITICAL: { label: 'Critique', tone: 'danger' },
};

/** Traitement des anomalies (AnomalyStatus). */
export const ANOMALY_STATUS: Record<string, StatusMeta> = {
  DETECTED: { label: 'À traiter', tone: 'warning' },
  UNDER_REVIEW: { label: 'En cours d’examen', tone: 'info' },
  RESOLVED: { label: 'Résolue', tone: 'success' },
  DISMISSED: { label: 'Classée sans suite', tone: 'neutral' },
};

/** Règles de détection (AnomalyRuleType). */
export const ANOMALY_RULE_LABELS: Record<string, string> = {
  DUPLICATE_INVOICE: 'Facture en double',
  DUPLICATE_PAYMENT: 'Paiement en double',
  HIGH_DISCOUNT: 'Remise anormale',
  CASH_DISCREPANCY: 'Écart de caisse',
  ABNORMAL_EXPENSE: 'Dépense inhabituelle',
  NEGATIVE_STOCK: 'Stock négatif',
  UNJUSTIFIED_PAYMENT: 'Paiement non justifié',
  UNUSUAL_CANCEL: 'Annulation inhabituelle',
  EXCESSIVE_TRANSACTION: 'Transaction excessive',
};

/** Achats fournisseurs (PurchaseStatus). */
export const PURCHASE_STATUS: Record<string, StatusMeta> = {
  ORDERED: { label: 'Commandée', tone: 'info' },
  PARTIALLY_RECEIVED: { label: 'Partiellement reçue', tone: 'warning' },
  RECEIVED: { label: 'Reçue', tone: 'success' },
  CANCELLED: { label: 'Annulée', tone: 'neutral' },
};

/** Mouvements de stock (StockMovementType). */
export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  IN_PURCHASE: 'Entrée – achat',
  IN_RETURN: 'Entrée – retour client',
  IN_ADJUSTMENT: 'Entrée – ajustement',
  OUT_SALE: 'Sortie – vente',
  OUT_RETURN: 'Sortie – retour fournisseur',
  OUT_LOSS: 'Sortie – perte',
  OUT_ADJUSTMENT: 'Sortie – ajustement',
  TRANSFER_IN: 'Transfert entrant',
  TRANSFER_OUT: 'Transfert sortant',
};

/** Postes de travail supervisés (statut renvoyé par /terminals). */
export const TERMINAL_STATUS: Record<string, StatusMeta> = {
  ONLINE: { label: 'En ligne', tone: 'success' },
  LOCKED: { label: 'Verrouillé', tone: 'warning' },
  OFFLINE: { label: 'Déconnecté', tone: 'neutral' },
};

/** Libellés des rôles (UserRole). */
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administrateur',
  ORG_OWNER: 'Propriétaire',
  MANAGER: 'Gestionnaire',
  ACCOUNTANT: 'Comptable',
  CASHIER: 'Caissier',
  SALES_REP: 'Commercial',
  INVENTORY_MANAGER: 'Responsable stock',
  PURCHASER: 'Acheteur',
  AUDITOR: 'Auditeur',
};

/** Libellé d'un rôle avec repli sur le code brut. */
export function getRoleLabel(role: string | null | undefined): string {
  return (role && ROLE_LABELS[role]) || role || '—';
}
