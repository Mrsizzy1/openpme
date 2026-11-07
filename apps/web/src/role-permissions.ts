/**
 * Matrice des droits côté interface. Elle reflète celle de l'API
 * (apps/api/src/common/security/role-groups.ts), qui reste la seule garantie de sécurité :
 * l'interface masque simplement ce que le rôle ne peut pas faire.
 * L'administrateur (SUPER_ADMIN, ORG_OWNER) et le gérant (MANAGER) voient et font tout.
 */
const ADMINS = ['SUPER_ADMIN', 'ORG_OWNER', 'MANAGER'] as const;

export const ROLE_ACCESS_BY_PATH: Record<string, readonly string[]> = {
  '/': [...ADMINS, 'ACCOUNTANT', 'AUDITOR'],
  '/sales': [...ADMINS, 'CASHIER', 'SALES_REP', 'AUDITOR'],
  '/products': [...ADMINS, 'INVENTORY_MANAGER', 'ACCOUNTANT', 'AUDITOR'],
  '/invoices': [...ADMINS, 'ACCOUNTANT', 'CASHIER', 'AUDITOR'],
  '/finances': [...ADMINS, 'ACCOUNTANT', 'CASHIER', 'AUDITOR'],
  '/customers': [...ADMINS, 'ACCOUNTANT', 'CASHIER', 'SALES_REP', 'AUDITOR'],
  '/suppliers': [...ADMINS, 'ACCOUNTANT', 'INVENTORY_MANAGER', 'PURCHASER', 'AUDITOR'],
  '/anomalies': [...ADMINS, 'AUDITOR'],
  '/users': [...ADMINS, 'AUDITOR'],
  '/terminals': [...ADMINS],
  '/settings': [...ADMINS],
};

/** Actions autorisées par rôle (même découpage que l'API). */
const CAPABILITIES = {
  sell: [...ADMINS, 'CASHIER', 'SALES_REP'],
  manageProducts: [...ADMINS, 'INVENTORY_MANAGER'],
  createCustomer: [...ADMINS, 'ACCOUNTANT', 'CASHIER', 'SALES_REP'],
  editCustomer: [...ADMINS, 'ACCOUNTANT', 'SALES_REP'],
  deleteCustomer: [...ADMINS],
  createSupplier: [...ADMINS, 'ACCOUNTANT', 'PURCHASER'],
  collectPayment: [...ADMINS, 'ACCOUNTANT', 'CASHIER'],
  manageInvoices: [...ADMINS, 'ACCOUNTANT'],
  operateCash: [...ADMINS, 'ACCOUNTANT', 'CASHIER'],
  viewFinances: [...ADMINS, 'ACCOUNTANT', 'AUDITOR'],
  manageExpenses: [...ADMINS, 'ACCOUNTANT'],
  manageUsers: [...ADMINS],
  manageAnomalies: [...ADMINS],
} as const satisfies Record<string, readonly string[]>;

export type Capability = keyof typeof CAPABILITIES;

export function can(role: string | undefined, capability: Capability): boolean {
  return Boolean(role && (CAPABILITIES[capability] as readonly string[]).includes(role));
}

/** Rôle en lecture seule sur l'ensemble des données. */
export function isReadOnly(role: string | undefined): boolean {
  return role === 'AUDITOR';
}

export function hasPathAccess(path: string, role?: string): boolean {
  const allowedRoles = ROLE_ACCESS_BY_PATH[path];
  return Boolean(role && allowedRoles?.includes(role));
}

export function getFirstAllowedPath(role?: string): string {
  return Object.entries(ROLE_ACCESS_BY_PATH).find(([, roles]) => role && roles.includes(role))?.[0] ?? '/login';
}
