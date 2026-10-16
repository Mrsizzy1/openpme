import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. CORS Configuration
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Global API Prefix
  app.setGlobalPrefix('api/v1');

  // 3. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // 4. Swagger OpenAPI Documentation
  const config = new DocumentBuilder()
    .setTitle('Smart PME Finance - API REST v1')
    .setDescription(
      'Plateforme intégrée de gestion commerciale et financière des PME avec détection intelligente des anomalies et supervision à distance. Conçue pour les PME en RDC (multi-devises CDF/USD, TVA 16%, gestion de caisse, stocks, facturation et alertes).'
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`====================================================`);
  console.log(`🚀 Smart PME Finance API is running on port ${port}`);
  console.log(`📡 Base API URL: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger Documentation: http://localhost:${port}/api/docs`);
  console.log(`====================================================`);
}

bootstrap();
