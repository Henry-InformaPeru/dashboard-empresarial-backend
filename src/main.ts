import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Detrás del túnel de Cloudflare: así Express ve la IP real y el protocolo original
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
  }

  // En producción CORS_ORIGIN lista las webs permitidas; vacío = cualquiera (solo desarrollo)
  const origenes = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  app.enableCors(origenes.length > 0 ? { origin: origenes } : undefined);

  // Validación global de los DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = Number(process.env.PORT) || 3100;

  await app.listen(port);

  console.log(`Dashboard Empresarial Backend: http://localhost:${port}`);
}

bootstrap().catch((error: unknown) => {
  console.error('Error al iniciar Dashboard Empresarial Backend:', error);
  process.exitCode = 1;
});
