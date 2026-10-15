import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ObtenerDashboardUseCase } from '../../../application/useCase/obtenerDashboardUseCase';

import type { DashboardResponseDto } from '../../../application/dto/dashboardResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ObtenerDashboardController {
  constructor(
    private readonly obtenerDashboardUseCase: ObtenerDashboardUseCase,
  ) {}

  @Get(':dashboardId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Req() request: RequestAutenticado,
  ): Promise<DashboardResponseDto> {
    return this.obtenerDashboardUseCase.ejecutar(
      dashboardId,
      request.user.rolId,
    );
  }
}
