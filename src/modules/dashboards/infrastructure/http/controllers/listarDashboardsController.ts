import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { ListarDashboardsUseCase } from '../../../application/useCase/listarDashboardsUseCase';

import type { DashboardResponseDto } from '../../../application/dto/dashboardResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ListarDashboardsController {
  constructor(
    private readonly listarDashboardsUseCase: ListarDashboardsUseCase,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(
    @Req() request: RequestAutenticado,
  ): Promise<DashboardResponseDto[]> {
    return this.listarDashboardsUseCase.ejecutar(request.user.rolId);
  }
}
