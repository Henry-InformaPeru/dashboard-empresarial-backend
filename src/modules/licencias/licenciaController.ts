import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/infrastructure/http/guards/jwtAuthGuard';
import type { UsuarioAutenticado } from '../../shared/infrastructure/security/usuarioAutenticado';
import { LicenciasService } from './licencias.service';

// Licencia de la empresa del usuario que llama (D9). licencia = null: licencias apagadas o sin información (la web no muestra nada).
// ?refrescar=1 vuelve a preguntar a Sulotec sin esperar la caché.
@Controller('licencia')
export class LicenciaController {
  constructor(private readonly licencias: LicenciasService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async obtener(
    @Req() request: Request & { user: UsuarioAutenticado },
    @Query('refrescar') refrescar?: string,
  ) {
    return this.licencias.licenciaPublica(request.user, {
      forzar: refrescar === '1',
    });
  }
}
