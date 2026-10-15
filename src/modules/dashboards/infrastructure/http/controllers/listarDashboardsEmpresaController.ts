import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { ListarDashboardsEmpresaUseCase } from '../../../application/useCase/listarDashboardsEmpresaUseCase';

import type { DashboardEmpresaAsignacionResponseDto } from '../../../application/dto/dashboardEmpresaAsignacionResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class ListarDashboardsEmpresaController {
  constructor(
    private readonly listarDashboardsEmpresaUseCase: ListarDashboardsEmpresaUseCase,
  ) {}

  @Get(':empresaId/dashboards')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
    @Req() request: RequestAutenticado,
  ): Promise<DashboardEmpresaAsignacionResponseDto[]> {
    return this.listarDashboardsEmpresaUseCase.ejecutar(
      empresaId,
      request.user.rolId,
    );
  }
}
