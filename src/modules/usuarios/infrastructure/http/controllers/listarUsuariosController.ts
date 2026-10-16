import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { ListarUsuariosUseCase } from '../../../application/useCase/listarUsuariosUseCase';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class ListarUsuariosController {
  constructor(private readonly listarUsuariosUseCase: ListarUsuariosUseCase) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(@Req() request: RequestAutenticado) {
    const usuarios = await this.listarUsuariosUseCase.ejecutar(
      request.user.rolId,
    );
    return {
      message: 'Usuarios obtenidos correctamente',
      usuarios,
    };
  }
}
