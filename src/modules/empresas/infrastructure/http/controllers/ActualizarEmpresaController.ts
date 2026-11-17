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

import { ActualizarEmpresaHttpDto } from '../dto/actualizarEmpresaHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';
import { ActualizarEmpresaUseCase } from '../../../application/useCase/ActualizarEmpresaUseCase';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class ActualizarEmpresaController {
  constructor(
    private readonly actualizarEmpresaUseCase: ActualizarEmpresaUseCase,
  ) {}

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.OK)
  async ejecutar(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ActualizarEmpresaHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const empresa = await this.actualizarEmpresaUseCase.ejecutar(
      id,
      {
        nombre: body.nombre?.trim(),
        ruc: body.ruc !== undefined ? (body.ruc ? body.ruc.trim() : null) : undefined,
        estado: body.estado?.trim().toUpperCase(),
        esquema: body.esquema !== undefined ? (body.esquema ? body.esquema.trim() : null) : undefined,
        logo: body.logo !== undefined ? (body.logo ? body.logo.trim() : null) : undefined,
      },
      request.user.rolId,
    );

    return {
      message: 'Empresa actualizada correctamente',
      empresa,
    };
  }
}
