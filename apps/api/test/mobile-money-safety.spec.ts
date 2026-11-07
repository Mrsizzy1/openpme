import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Currency, PaymentMethod } from '@prisma/client';
import { MobileMoneyService } from '../src/modules/payments/mobile-money.service';
import { PaymentsService } from '../src/modules/payments/payments.service';

describe('Mobile Money fail-closed behavior', () => {
  it('does not initiate, confirm, or account for an unverified operator payment', async () => {
    const service = new MobileMoneyService();
    const unavailable = /aucun opérateur réel n’est connecté/;

    await assert.rejects(
      service.initiatePush('org-1', 'user-1', {
        operator: 'MPESA',
        phoneNumber: '0812345678',
        amount: 100,
        currency: 'CDF',
      }),
      (error: any) => error.status === 503 && unavailable.test(error.message),
    );
    await assert.rejects(
      service.checkStatus('fake-reference'),
      (error: any) => error.status === 503 && unavailable.test(error.message),
    );
    await assert.rejects(
      service.confirmMobileMoneyPayment('org-1', 'user-1', 'fake-reference'),
      (error: any) => error.status === 503 && unavailable.test(error.message),
    );
  });

  it('rejects Mobile Money through the generic payment endpoint as well', async () => {
    const service = new PaymentsService({} as any);

    await assert.rejects(
      service.createPayment('org-1', 'user-1', {
        amount: '100',
        currency: Currency.CDF,
        method: PaymentMethod.MOBILE_MONEY_MPESA,
      }),
      (error: any) => error.status === 503 && /opérateur réel/.test(error.message),
    );
  });
});
