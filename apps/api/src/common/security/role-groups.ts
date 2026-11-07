import { UserRole } from '@prisma/client';

/**
 * Matrice des droits par rôle.
 * SUPER_ADMIN et ORG_OWNER ont toujours tous les droits (voir RolesGuard) ; le gérant
 * (MANAGER) figure dans chaque groupe pour voir et faire tout ce qui concerne l'entreprise.
 */
const ADMINS = [UserRole.SUPER_ADMIN, UserRole.ORG_OWNER, UserRole.MANAGER] as const;

/** Rôles qui ne voient que leurs propres ventes. */
export const OWN_SALES_ONLY_ROLES: readonly UserRole[] = [UserRole.CASHIER, UserRole.SALES_REP];

export const ROLE_GROUPS = {
  /** Lecture seule de tout : l'auditeur est ajouté à chaque groupe de lecture. */
  salesRead: [...ADMINS, UserRole.CASHIER, UserRole.SALES_REP, UserRole.AUDITOR],
  salesWrite: [...ADMINS, UserRole.CASHIER, UserRole.SALES_REP],

  productsRead: [
    ...ADMINS,
    UserRole.INVENTORY_MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.CASHIER,
    UserRole.SALES_REP,
    UserRole.AUDITOR,
  ],
  productsWrite: [...ADMINS, UserRole.INVENTORY_MANAGER],

  customersRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP, UserRole.AUDITOR],
  customersCreate: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.SALES_REP],
  customersUpdate: [...ADMINS, UserRole.ACCOUNTANT, UserRole.SALES_REP],
  customersDelete: [...ADMINS],

  suppliersRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.INVENTORY_MANAGER, UserRole.PURCHASER, UserRole.AUDITOR],
  suppliersCreate: [...ADMINS, UserRole.ACCOUNTANT, UserRole.PURCHASER],
  suppliersUpdate: [...ADMINS, UserRole.ACCOUNTANT, UserRole.INVENTORY_MANAGER, UserRole.PURCHASER],
  suppliersDelete: [...ADMINS],

  invoicesRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.AUDITOR],
  invoicesWrite: [...ADMINS, UserRole.ACCOUNTANT],

  paymentsRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.AUDITOR],
  paymentsCollect: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER],

  /** Caisse : le caissier gère sa session ; dépenses et comptes restent à la comptabilité. */
  cashRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER, UserRole.AUDITOR],
  cashOperate: [...ADMINS, UserRole.ACCOUNTANT, UserRole.CASHIER],
  financesRead: [...ADMINS, UserRole.ACCOUNTANT, UserRole.AUDITOR],
  financesWrite: [...ADMINS, UserRole.ACCOUNTANT],

  usersRead: [...ADMINS, UserRole.AUDITOR],
} satisfies Record<string, readonly UserRole[]>;
