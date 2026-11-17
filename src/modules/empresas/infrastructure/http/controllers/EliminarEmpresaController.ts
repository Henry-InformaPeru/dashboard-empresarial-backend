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

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';
import { EliminarEmpresaUseCase } from '../../../application/useCase/EliminarEmpresaUseCase';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class EliminarEmpresaController {
  constructor(
    private readonly eliminarEmpresaUseCase: EliminarEmpresaUseCase,
  ) {}

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: RequestAutenticado,
  ) {
    await this.eliminarEmpresaUseCase.ejecutar(id, request.user.rolId);
    return {
      message: 'Empresa dada de baja correctamente',
    };
  }
}
