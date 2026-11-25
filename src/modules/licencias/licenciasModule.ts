import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { AuthModule } from '../auth/authModule';
import { LicenciaController } from './licenciaController';
import { LicenciaInterceptor } from './licencia.interceptor';
import { LicenciasService } from './licencias.service';

// Licencias de Sulotec (servicio común): estado de la licencia, cupo de usuarios y guard de escrituras. Global para que el módulo de usuarios
// use el servicio sin importarlo. Con LICENCIAS_TOKEN vacío todo queda apagado.
@Global()
@Module({
  imports: [AuthModule],
  controllers: [LicenciaController],
  providers: [
    LicenciasService,
    { provide: APP_INTERCEPTOR, useClass: LicenciaInterceptor },
  ],
  exports: [LicenciasService],
})
export class LicenciasModule {}
