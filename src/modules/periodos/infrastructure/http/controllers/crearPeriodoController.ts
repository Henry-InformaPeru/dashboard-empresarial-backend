import {
  Body,
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

import { CrearPeriodoUseCase } from '../../../application/useCase/crearPeriodoUseCase';
import { CrearPeriodoHttpDto } from '../dto/crearPeriodoHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class CrearPeriodoController {
  constructor(private readonly crearPeriodoUseCase: CrearPeriodoUseCase) {}

  @Post(':dashboardId/periodos')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.CREATED)
  async ejecutar(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Body() body: CrearPeriodoHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const periodoCreado = await this.crearPeriodoUseCase.ejecutar(
      dashboardId,
      body.periodo,
      body.urlPowerbi,
      body.urlMega ?? null,
      request.user.rolId,
    );

    return {
      message: 'Periodo y enlaces creados correctamente',
      periodo: periodoCreado,
    };
  }
}
