import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getCorsOrigins, getJwtSecret } from './common/config/security.config';

async function bootstrap() {
  getJwtSecret();
  const corsOrigins = getCorsOrigins();
  const app = await NestFactory.create(AppModule);

  // Behind a reverse proxy (nginx in docker-compose), trust it so that req.ip is the
  // real client address. Otherwise every user shares the proxy's IP and the login
  // rate limit (5 attempts / 15 min) would apply to the whole company at once.
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy && trustProxy !== 'false') {
    const hops = Number(trustProxy);
    app.getHttpAdapter().getInstance().set(
      'trust proxy',
      trustProxy === 'true' ? true : Number.isInteger(hops) ? hops : trustProxy,
    );
  }

  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
      },
    },
  }));

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Smart PME Finance - API REST v1')
    .setDescription(
      'Plateforme intégrée de gestion commerciale et financière des PME avec détection intelligente des anomalies et supervision à distance. Conçue pour les PME en RDC (multi-devises CDF/USD, TVA 16%, gestion de caisse, stocks, facturation et alertes).'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  // La documentation interactive expose toute la surface de l'API : désactivée en production
  // sauf demande explicite (SWAGGER_ENABLED=true).
  const swaggerEnabled = process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true';
  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`====================================================`);
  console.log(`🚀 Smart PME Finance API is running on port ${port}`);
  console.log(`📡 Base API URL: http://localhost:${port}/api/v1`);
  if (swaggerEnabled) console.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  console.log(`====================================================`);
}

bootstrap();
