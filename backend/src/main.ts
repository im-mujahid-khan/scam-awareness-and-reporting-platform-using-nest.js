// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger.config';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  console.log('Starting NestJS application...');

  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));

  // Add validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Get ConfigService
  const configService = app.get(ConfigService);

  // Read config
  const port = configService.get<number>('app.port') || 3001;
  const apiPrefix = configService.get<string>('app.apiPrefix') || '/api/v1';
  const environment =
    configService.get<string>('app.environment') || 'development';
  const swaggerEnabled =
    configService.get<boolean>('app.swagger.enabled') ?? true;

  console.log(` Config - ENVIRONMENT: ${environment}`);
  console.log(` Config - PORT: ${port}, API_PREFIX: ${apiPrefix}`);
  console.log(` Config - SWAGGER: ${swaggerEnabled ? 'ENABLED' : 'DISABLED'}`);

  // Set global prefix
  app.setGlobalPrefix(apiPrefix);

  // Setup Swagger documentation (only if enabled)
  if (swaggerEnabled) {
    setupSwagger(app);
  }

  // Enable CORS
  const corsOrigin =
    configService.get<string>('app.cors.origin') || 'http://72.62.175.140';

  if (corsOrigin) {
    app.enableCors({
      origin: ['http://72.62.175.140', 'http://localhost:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Authorization'],
    });
    console.log(` Config - CORS: Enabled for ${corsOrigin}`);
  }

  console.log(` Listening on port ${port}...`);
  await app.listen(port);

  const apiUrl = `http://localhost:${port}${apiPrefix}`;
  console.log(`\n SUCCESS! Server is running:`);
  console.log(`    API: ${apiUrl}`);
  console.log(`    Health: ${apiUrl}/health`);

  if (swaggerEnabled) {
    console.log(`   📚 Documentation: http://localhost:${port}/docs`);
    console.log(`   📄 OpenAPI Spec: http://localhost:${port}/docs-json`);
  }

  console.log(`\n⚡ Environment: ${environment.toUpperCase()}`);
}

bootstrap().catch((error) => {
  console.error(' FAILED:', error.message);
  process.exit(1);
});