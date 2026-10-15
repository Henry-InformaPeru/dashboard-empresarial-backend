import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { AsignarDashboardUseCase } from '../../../application/useCase/asignarDashboardUseCase';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class AsignarDashboardController {
  constructor(
    private readonly asignarDashboardUseCase: AsignarDashboardUseCase,
  ) {}

  @Post(':empresaId/dashboards/:dashboardId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.CREATED)
  async ejecutar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Req() request: RequestAutenticado,
  ) {
    const asignacion = await this.asignarDashboardUseCase.ejecutar(
      empresaId,
      dashboardId,
      request.user.rolId,
    );

    return {
      message: 'Dashboard asignado correctamente',
      asignacion,
    };
  }
}
