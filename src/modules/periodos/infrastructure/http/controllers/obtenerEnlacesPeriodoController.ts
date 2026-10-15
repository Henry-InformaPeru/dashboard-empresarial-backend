import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ObtenerEnlacesPeriodoUseCase } from '../../../application/useCase/obtenerEnlacesPeriodoUseCase';

import type { EnlacesPeriodoResponseDto } from '../../../application/dto/enlacesPeriodoResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ObtenerEnlacesPeriodoController {
  constructor(
    private readonly obtenerEnlacesPeriodoUseCase: ObtenerEnlacesPeriodoUseCase,
  ) {}

  @Get(':dashboardId/periodos/:periodo')
  @UseGuards(JwtAuthGuard)
  async ejecutar(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Param('periodo') periodo: string,
    @Req() request: RequestAutenticado,
  ): Promise<EnlacesPeriodoResponseDto> {
    if (!/^\d{4}(0[1-9]|1[0-2])$/.test(periodo)) {
      throw new BadRequestException('Período inválido');
    }

    return this.obtenerEnlacesPeriodoUseCase.ejecutar(
      dashboardId,
      periodo,
      request.user.rolId,
      request.user.empresaId,
    );
  }
}
