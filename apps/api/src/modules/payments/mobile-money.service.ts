import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const UNAVAILABLE_MESSAGE =
  'Le paiement Mobile Money est désactivé : aucun opérateur réel n’est connecté. Enregistrez la vente à crédit, puis comptabilisez le règlement après confirmation effective.';

export interface MobileMoneyPushRequest {
  operator: 'MPESA' | 'AIRTEL' | 'ORANGE';
  phoneNumber: string;
  amount: number;
  currency: 'CDF' | 'USD';
  invoiceId?: string;
  saleId?: string;
}

@Injectable()
export class MobileMoneyService {
  async initiatePush(
    _organizationId: string,
    _userId: string,
    _data: MobileMoneyPushRequest,
  ): Promise<never> {
    throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }

  async checkStatus(_reference: string): Promise<never> {
    throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }

  async confirmMobileMoneyPayment(
    _organizationId: string,
    _userId: string,
    _reference: string,
    _invoiceId?: string,
  ): Promise<never> {
    throw new ServiceUnavailableException(UNAVAILABLE_MESSAGE);
  }
}
