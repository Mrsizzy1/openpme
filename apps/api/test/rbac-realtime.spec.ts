import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UserRole } from '@prisma/client';
import { lastValueFrom, of, throwError, take, toArray } from 'rxjs';
import { ROLES_KEY } from '../src/common/decorators/roles.decorator';
import { SalesController } from '../src/modules/sales/sales.controller';
import { InvoicesController } from '../src/modules/invoices/invoices.controller';
import { PaymentsController } from '../src/modules/payments/payments.controller';
import { FinancesController } from '../src/modules/finances/finances.controller';
import { CustomersController } from '../src/modules/customers/customers.controller';
import { SuppliersController } from '../src/modules/suppliers/suppliers.controller';
import { ProductsController } from '../src/modules/products/products.controller';
import { UsersController } from '../src/modules/users/users.controller';
import { RealtimeService } from '../src/modules/realtime/realtime.service';
import { RealtimeInterceptor, topicFromUrl } from '../src/modules/realtime/realtime.interceptor';

/** Rôles effectifs d'une méthode : ceux de la méthode, sinon ceux du contrôleur. */
function rolesOf(controller: any, method: string): UserRole[] {
  return (Reflect.getMetadata(ROLES_KEY, controller.prototype[method])
    ?? Reflect.getMetadata(ROLES_KEY, controller)) as UserRole[];
}

const allows = (controller: any, method: string, role: UserRole) => rolesOf(controller, method).includes(role);

describe('role matrix', () => {
  it('gives the manager access to every business endpoint', () => {
    const endpoints: Array<[any, string]> = [
      [SalesController, 'findAll'], [SalesController, 'createSale'],
      [InvoicesController, 'createInvoice'], [InvoicesController, 'cancelInvoice'],
      [PaymentsController, 'findAll'], [PaymentsController, 'createPayment'],
      [FinancesController, 'listExpenses'], [FinancesController, 'createExpense'], [FinancesController, 'listAccounts'],
      [CustomersController, 'remove'], [SuppliersController, 'remove'],
      [ProductsController, 'create'], [UsersController, 'findAll'],
    ];
    for (const [controller, method] of endpoints) {
      assert.ok(allows(controller, method, UserRole.MANAGER), `${controller.name}.${method}`);
    }
  });

  it('keeps the cashier on the till: sales, own cash session, customers and invoice collection', () => {
    assert.ok(allows(SalesController, 'createSale', UserRole.CASHIER));
    assert.ok(allows(FinancesController, 'openSession', UserRole.CASHIER));
    assert.ok(allows(FinancesController, 'closeSession', UserRole.CASHIER));
    assert.ok(allows(CustomersController, 'create', UserRole.CASHIER));
    assert.ok(allows(InvoicesController, 'findAll', UserRole.CASHIER));
    assert.ok(allows(PaymentsController, 'createPayment', UserRole.CASHIER));

    assert.ok(!allows(FinancesController, 'listExpenses', UserRole.CASHIER));
    assert.ok(!allows(FinancesController, 'createExpense', UserRole.CASHIER));
    assert.ok(!allows(FinancesController, 'listAccounts', UserRole.CASHIER));
    assert.ok(!allows(CustomersController, 'update', UserRole.CASHIER));
    assert.ok(!allows(InvoicesController, 'cancelInvoice', UserRole.CASHIER));
    assert.ok(!allows(PaymentsController, 'findAll', UserRole.CASHIER));
  });

  it('lets the auditor read everything but change nothing', () => {
    for (const [controller, method] of [
      [SalesController, 'findAll'], [InvoicesController, 'findAll'], [PaymentsController, 'findAll'],
      [FinancesController, 'listExpenses'], [FinancesController, 'listAccounts'],
      [CustomersController, 'findAll'], [SuppliersController, 'findAll'], [ProductsController, 'findAll'],
      [UsersController, 'findAll'],
    ] as Array<[any, string]>) {
      assert.ok(allows(controller, method, UserRole.AUDITOR), `read ${controller.name}.${method}`);
    }
    for (const [controller, method] of [
      [SalesController, 'createSale'], [InvoicesController, 'createInvoice'], [PaymentsController, 'createPayment'],
      [FinancesController, 'createExpense'], [FinancesController, 'openSession'],
      [CustomersController, 'create'], [SuppliersController, 'create'], [ProductsController, 'create'],
    ] as Array<[any, string]>) {
      assert.ok(!allows(controller, method, UserRole.AUDITOR), `write ${controller.name}.${method}`);
    }
  });

  it('limits stock managers, buyers and accountants to their domain', () => {
    assert.ok(allows(ProductsController, 'create', UserRole.INVENTORY_MANAGER));
    assert.ok(!allows(ProductsController, 'create', UserRole.ACCOUNTANT));
    assert.ok(allows(ProductsController, 'findAll', UserRole.ACCOUNTANT));
    assert.ok(allows(SuppliersController, 'create', UserRole.PURCHASER));
    assert.ok(!allows(SalesController, 'findAll', UserRole.PURCHASER));
    assert.ok(allows(ProductsController, 'findAll', UserRole.SALES_REP));
  });
});

describe('own sales scope', () => {
  const makeController = () => {
    const calls: unknown[][] = [];
    const service = {
      findAll: (...args: unknown[]) => { calls.push(args); return []; },
      findById: (...args: unknown[]) => { calls.push(args); return {}; },
    };
    return { controller: new SalesController(service as any), calls };
  };

  it('restricts cashiers and sales reps to their own sales', async () => {
    const { controller, calls } = makeController();
    await controller.findAll({ id: 'u-cash', role: UserRole.CASHIER, organizationId: 'org' }, '10');
    await controller.findById({ id: 'u-rep', role: UserRole.SALES_REP, organizationId: 'org' }, 's1');
    assert.deepEqual(calls[0], ['org', 10, 'u-cash']);
    assert.deepEqual(calls[1], ['org', 's1', 'u-rep']);
  });

  it('shows every sale to managers and auditors', async () => {
    const { controller, calls } = makeController();
    await controller.findAll({ id: 'u-man', role: UserRole.MANAGER, organizationId: 'org' });
    await controller.findAll({ id: 'u-aud', role: UserRole.AUDITOR, organizationId: 'org' });
    assert.equal(calls[0][2], undefined);
    assert.equal(calls[1][2], undefined);
  });
});

describe('realtime sync', () => {
  it('maps request URLs to sync topics', () => {
    assert.equal(topicFromUrl('/api/v1/sales'), 'sales');
    assert.equal(topicFromUrl('/api/v1/products/12/stock-movements?x=1'), 'products');
    assert.equal(topicFromUrl('/api/v1/auth/login'), null);
    assert.equal(topicFromUrl('/api/v1/events/stream'), null);
  });

  it('delivers events only to the same organization', async () => {
    const service = new RealtimeService();
    const received = lastValueFrom(service.forOrganization('org-a').pipe(take(1), toArray()));
    service.publish({ organizationId: 'org-b', topic: 'sales', action: 'POST' });
    service.publish({ organizationId: 'org-a', topic: 'products', action: 'PATCH' });
    const [event] = await received;
    assert.equal(event.organizationId, 'org-a');
    assert.equal(event.topic, 'products');
  });

  const contextFor = (request: any) => ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  }) as any;

  it('publishes after a successful change, never after a failure or a read', async () => {
    const published: unknown[] = [];
    const interceptor = new RealtimeInterceptor({ publish: (e: unknown) => published.push(e) } as any);
    const user = { id: 'u1', organizationId: 'org' };

    await lastValueFrom(interceptor.intercept(
      contextFor({ method: 'POST', originalUrl: '/api/v1/sales', user, get: () => 'tab-1' }),
      { handle: () => of({ ok: true }) },
    ));
    await lastValueFrom(interceptor.intercept(
      contextFor({ method: 'GET', originalUrl: '/api/v1/sales', user, get: () => undefined }),
      { handle: () => of([]) },
    ));
    await assert.rejects(lastValueFrom(interceptor.intercept(
      contextFor({ method: 'PATCH', originalUrl: '/api/v1/products/1', user, get: () => undefined }),
      { handle: () => throwError(() => new Error('refusé')) },
    )));

    assert.equal(published.length, 1);
    assert.deepEqual(published[0], { organizationId: 'org', topic: 'sales', action: 'POST', actorId: 'u1', origin: 'tab-1' });
  });
});
