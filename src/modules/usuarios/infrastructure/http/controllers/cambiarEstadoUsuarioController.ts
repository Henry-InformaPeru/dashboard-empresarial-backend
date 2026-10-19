import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CambiarEstadoUsuarioUseCase } from '../../../application/useCase/cambiarEstadoUsuarioUseCase';
import { CambiarEstadoUsuarioHttpDto } from '../dto/cambiarEstadoUsuarioHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class CambiarEstadoUsuarioController {
  constructor(
    private readonly cambiarEstadoUsuarioUseCase: CambiarEstadoUsuarioUseCase,
  ) {}

  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarEstadoUsuarioHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const datos = body;
    const estadoStr = String(datos?.estado ?? '');

    await this.cambiarEstadoUsuarioUseCase.ejecutar(
      id,
      estadoStr,
      request.user.rolId,
      request.user.sub,
    );
    return {
      message: `Estado del usuario actualizado a ${estadoStr} correctamente`,
    };
  }
}
