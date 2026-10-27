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

import { ActualizarEnlacePowerBiUseCase } from '../../../application/useCase/actualizarEnlacePowerBiUseCase';
import { ActualizarEnlacePowerBiHttpDto } from '../dto/actualizarEnlacePowerBiHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('dashboards')
export class ActualizarEnlacePowerBiController {
  constructor(
    private readonly actualizarEnlacePowerBiUseCase: ActualizarEnlacePowerBiUseCase,
  ) {}

  @Patch(':dashboardId/powerbi')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(
    @Param('dashboardId', ParseIntPipe) dashboardId: number,
    @Body() body: ActualizarEnlacePowerBiHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const { periodosActualizados } =
      await this.actualizarEnlacePowerBiUseCase.ejecutar(
        dashboardId,
        body.urlPowerbi,
        request.user.rolId,
      );

    return {
      message: 'Vínculo de Power BI actualizado en todos los periodos',
      periodosActualizados,
    };
  }
}
