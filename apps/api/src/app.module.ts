import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProductsModule } from './modules/products/products.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SalesModule } from './modules/sales/sales.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { FinancesModule } from './modules/finances/finances.module';
import { AnomaliesModule } from './modules/anomalies/anomalies.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    OrganizationsModule,
    ProductsModule,
    CustomersModule,
    SalesModule,
    InvoicesModule,
    PaymentsModule,
    FinancesModule,
    AnomaliesModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
