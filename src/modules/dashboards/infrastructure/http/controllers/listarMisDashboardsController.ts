import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { ListarMisDashboardsUseCase } from '../../../application/useCase/listarMisDashboardsUseCase';

import type { DashboardResponseDto } from '../../../application/dto/dashboardResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ListarMisDashboardsController {
  constructor(
    private readonly listarMisDashboardsUseCase: ListarMisDashboardsUseCase,
  ) {}

  @Get('mis-dashboards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(2)
  async ejecutar(
    @Req() request: RequestAutenticado,
  ): Promise<DashboardResponseDto[]> {
    return this.listarMisDashboardsUseCase.ejecutar(request.user);
  }
}
