// Guard de licencia de las escrituras. Es un interceptor global porque en Nest los interceptores corren DESPUÉS de los guards de cada ruta:
// así ya existe req.user (JwtAuthGuard lo arma desde la base, nunca desde lo que mande el navegador) y la empresa es la del usuario verificado.
// Solo mira escrituras no exentas; qué se bloquea lo decide licencias.core.ts con el estado que respondió Sulotec (o el último conocido). Con
// las licencias apagadas pasa de inmediato, y ante un error propio también: nunca tumba una petición por su cuenta.
import {
  ForbiddenException,
  Injectable,
  Logger,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';

import { ENLACES } from './licencias.core';
import { LicenciasService, type UsuarioLicencia } from './licencias.service';

@Injectable()
export class LicenciaInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Licencias');

  constructor(private readonly licencias: LicenciasService) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    if (context.getType() !== 'http') return next.handle();
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioLicencia }>();
    let decision: Awaited<ReturnType<LicenciasService['decidirPeticion']>>;
    try {
      decision = await this.licencias.decidirPeticion({
        metodo: req.method,
        ruta: String(req.originalUrl || req.url || '').split('?')[0],
        usuario: req.user,
      });
    } catch (error) {
      this.logger.error(`licencias_guard_fallo ${(error as Error)?.message}`);
      decision = { permitir: true };
    }
    if (!decision.permitir) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: decision.mensaje,
        code: decision.code,
        estado: decision.estado ?? null,
        enlace: ENLACES.miLicencia,
      });
    }
    return next.handle();
  }
}
