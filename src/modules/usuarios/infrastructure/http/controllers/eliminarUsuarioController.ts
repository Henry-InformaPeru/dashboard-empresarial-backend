import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { EliminarUsuarioUseCase } from '../../../application/useCase/eliminarUsuarioUseCase';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class EliminarUsuarioController {
  constructor(
    private readonly eliminarUsuarioUseCase: EliminarUsuarioUseCase,
  ) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestAutenticado,
  ) {
    await this.eliminarUsuarioUseCase.ejecutar(
      id,
      request.user.rolId,
      request.user.sub,
    );

    return { message: 'Usuario eliminado correctamente' };
  }
}
