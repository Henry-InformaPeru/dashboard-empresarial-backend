import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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
