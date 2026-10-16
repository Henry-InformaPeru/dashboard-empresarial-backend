import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ObtenerDetalleUsuarioUseCase } from '../../../application/useCase/obtenerDetalleUsuarioUseCase';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class ObtenerDetalleUsuarioController {
  constructor(
    private readonly obtenerDetalleUsuarioUseCase: ObtenerDetalleUsuarioUseCase,
  ) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestAutenticado,
  ) {
    const usuario = await this.obtenerDetalleUsuarioUseCase.ejecutar(
      id,
      request.user.rolId,
    );
    return {
      message: 'Detalle de usuario obtenido correctamente',
      usuario,
    };
  }
}
