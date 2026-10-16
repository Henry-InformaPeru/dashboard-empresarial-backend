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

import { CrearEmpresaHttpDto } from '../dto/crearEmpresaHttp.dto';
import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';
import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';
import { CrearEmpresaUseCase } from '../../../application/useCase/CrearEmpresaUseCase';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('empresas')
export class CrearEmpresaController {
  constructor(private readonly crearEmpresaUseCase: CrearEmpresaUseCase) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  @HttpCode(HttpStatus.CREATED)
  async ejecutar(
    @Body() body: CrearEmpresaHttpDto,
    @Req() request: RequestAutenticado,
  ) {
    const empresa = await this.crearEmpresaUseCase.ejecutar(
      {
        nombre: body.nombre,
        ruc: body.ruc ?? null,
      },
      request.user.rolId,
    );

    return {
      message: 'Empresa creada correctamente',
      empresa,
    };
  }
}
