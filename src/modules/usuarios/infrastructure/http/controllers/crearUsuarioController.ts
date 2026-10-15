import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { CrearUsuarioUseCase } from '../../../application/useCase/crearUsuarioUseCase';
import { CrearUsuarioHttpDto } from '../dto/crearUsuarioHttp.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class CrearUsuarioController {
  constructor(private readonly crearUsuarioUseCase: CrearUsuarioUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.CREATED)
  async ejecutar(
    @Body() body: CrearUsuarioHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const usuario = await this.crearUsuarioUseCase.ejecutar(
      {
        empresaId: body.empresaId ?? null,
        rolId: body.rolId,
        username: body.username,
        email: body.email ?? null,
        nombreCompleto: body.nombreCompleto ?? null,
        password: body.password,
      },
      request.user.rolId,
    );

    return {
      message: 'Usuario creado correctamente',
      usuario,
    };
  }
}
