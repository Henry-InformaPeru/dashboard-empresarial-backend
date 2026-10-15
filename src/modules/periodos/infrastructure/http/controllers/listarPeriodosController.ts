import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ListarPeriodosUseCase } from '../../../application/useCase/listarPeriodosUseCase';

import type { PeriodoResponseDto } from '../../../application/dto/periodoResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ListarPeriodosController {
  constructor(private readonly listarPeriodosUseCase: ListarPeriodosUseCase) {}

  @Get(':dashboardId/periodos')
  @UseGuards(JwtAuthGuard)
  async ejecutar(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Req() request: RequestAutenticado,
  ): Promise<PeriodoResponseDto[]> {
    return this.listarPeriodosUseCase.ejecutar(
      dashboardId,
      request.user.rolId,
      request.user.empresaId,
    );
  }
}
