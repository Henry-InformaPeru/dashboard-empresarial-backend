import {
  Body,
  Controller,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ActualizarEstadoAsignacionUseCase } from '../../../application/useCase/actualizarEstadoAsignacionUseCase';

import { ActualizarEstadoAsignacionHttpDto } from '../dto/actualizarEstadoAsignacionHttp.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class ActualizarEstadoAsignacionController {
  constructor(
    private readonly actualizarEstadoAsignacionUseCase: ActualizarEstadoAsignacionUseCase,
  ) {}

  @Patch(':empresaId/dashboards/:dashboardId/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Body() body: ActualizarEstadoAsignacionHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const asignacion = await this.actualizarEstadoAsignacionUseCase.ejecutar(
      {
        empresaId,
        dashboardId,
        estado: body.estado,
      },
      request.user.rolId,
    );

    return {
      message: 'Estado de asignación actualizado correctamente',
      asignacion,
    };
  }
}
