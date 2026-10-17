import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentMethod } from '@prisma/client';

export interface MobileMoneyPushRequest {
  operator: 'MPESA' | 'AIRTEL' | 'ORANGE';
  phoneNumber: string;
  amount: number;
  currency: 'CDF' | 'USD';
  invoiceId?: string;
  saleId?: string;
}

export interface MobileMoneyPushResponse {
  reference: string;
  transactionId: string;
  operator: 'MPESA' | 'AIRTEL' | 'ORANGE';
  phoneNumber: string;
  amount: number;
  currency: 'CDF' | 'USD';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  promptMessage: string;
  timestamp: string;
}

@Injectable()
export class MobileMoneyService {
  constructor(private prisma: PrismaService) {}

  // En mémoire pour le suivi des transactions Mobile Money en attente de code PIN client
  private transactions = new Map<string, MobileMoneyPushResponse>();

  /**
   * Identifie l'opérateur GSM en RDC en fonction du numéro
   */
  detectOperator(phone: string): 'MPESA' | 'AIRTEL' | 'ORANGE' {
    const clean = phone.replace(/[^0-9]/g, '');
    const suffix = clean.startsWith('243') ? clean.slice(3) : clean.startsWith('0') ? clean.slice(1) : clean;

    if (suffix.startsWith('81') || suffix.startsWith('82') || suffix.startsWith('83')) {
      return 'MPESA';
    }
    if (suffix.startsWith('97') || suffix.startsWith('98') || suffix.startsWith('99')) {
      return 'AIRTEL';
    }
    if (suffix.startsWith('84') || suffix.startsWith('85') || suffix.startsWith('89') || suffix.startsWith('80')) {
      return 'ORANGE';
    }

    return 'MPESA'; // Défaut
  }

  /**
   * Initie une demande de paiement STK Push sur le téléphone du client
   */
  async initiatePush(
    organizationId: string,
    userId: string,
    data: MobileMoneyPushRequest,
  ): Promise<MobileMoneyPushResponse> {
    if (!data.phoneNumber || data.phoneNumber.length < 9) {
      throw new BadRequestException('Numéro de téléphone Mobile Money invalide.');
    }
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Le montant doit être supérieur à zéro.');
    }

    const operator = data.operator || this.detectOperator(data.phoneNumber);
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    const reference = `${operator}-TX-${dateStr}-${randomHex}`;
    const transactionId = `MOM-${Date.now()}`;

    const operatorName =
      operator === 'MPESA'
        ? 'Vodacom M-Pesa'
        : operator === 'AIRTEL'
        ? 'Airtel Money'
        : 'Orange Money';

    const promptMessage = `Demande de débit push transmise au client via ${operatorName}. Veuillez composer votre code PIN sur votre combiné pour valider.`;

    const tx: MobileMoneyPushResponse = {
      reference,
      transactionId,
      operator,
      phoneNumber: data.phoneNumber,
      amount: data.amount,
      currency: data.currency || 'USD',
      status: 'PENDING',
      promptMessage,
      timestamp: new Date().toISOString(),
    };

    this.transactions.set(reference, tx);

    // En environnement de démonstration/laboratoire PME, nous confirmons le paiement après 3 secondes
    setTimeout(() => {
      const stored = this.transactions.get(reference);
      if (stored && stored.status === 'PENDING') {
        stored.status = 'SUCCESS';
      }
    }, 2800);

    return tx;
  }

  /**
   * Vérifie l'état d'approbation de la transaction
   */
  async checkStatus(reference: string): Promise<MobileMoneyPushResponse> {
    const tx = this.transactions.get(reference);
    if (!tx) {
      throw new BadRequestException('Transaction Mobile Money introuvable ou expirée.');
    }
    return tx;
  }

  /**
   * Valide et applique le paiement final dans la comptabilité
   */
  async confirmMobileMoneyPayment(
    organizationId: string,
    userId: string,
    reference: string,
    invoiceId?: string,
  ) {
    const tx = this.transactions.get(reference);
    if (!tx) {
      throw new BadRequestException('Transaction introuvable.');
    }
    if (tx.status !== 'SUCCESS') {
      throw new BadRequestException('La transaction Mobile Money n\'a pas encore été validée par le client.');
    }

    const method: PaymentMethod =
      tx.operator === 'MPESA'
        ? PaymentMethod.MOBILE_MONEY_MPESA
        : tx.operator === 'AIRTEL'
        ? PaymentMethod.MOBILE_MONEY_AIRTEL
        : PaymentMethod.MOBILE_MONEY_ORANGE;

    const paymentNumber = `REC-MOM-${Date.now().toString().slice(-6)}`;

    // Création du paiement officiel
    const payment = await this.prisma.payment.create({
      data: {
        organizationId,
        paymentNumber,
        userId,
        invoiceId: invoiceId || null,
        amount: tx.amount,
        currency: tx.currency,
        method,
        reference: tx.reference,
        notes: `Règlement Mobile Money ${tx.operator} - Tél: ${tx.phoneNumber}`,
        status: 'COMPLETED',
      },
    });

    return { success: true, payment, transaction: tx };
  }
}
