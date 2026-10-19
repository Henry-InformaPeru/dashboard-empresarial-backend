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

import { CambiarPasswordUsuarioUseCase } from '../../../application/useCase/cambiarPasswordUsuarioUseCase';
import { CambiarPasswordUsuarioHttpDto } from '../dto/cambiarPasswordUsuarioHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('usuarios')
export class CambiarPasswordUsuarioController {
  constructor(
    private readonly cambiarPasswordUsuarioUseCase: CambiarPasswordUsuarioUseCase,
  ) {}

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CambiarPasswordUsuarioHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    await this.cambiarPasswordUsuarioUseCase.ejecutar(
      id,
      body.password,
      request.user.rolId,
    );

    return { message: 'Contraseña actualizada correctamente' };
  }
}
