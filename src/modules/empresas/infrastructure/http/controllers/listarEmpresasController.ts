import { Controller, Get, UseGuards } from '@nestjs/common';

import { ListarEmpresasUseCase } from '../../../application/useCase/listarEmpresasUseCase';

import type { EmpresaResponseDto } from '../../../application/dto/empresaResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { Roles } from '../../../../../shared/infrastructure/decorators/roles.decorator';
import { RolesGuard } from '../../../../../shared/infrastructure/guards/rolesGuard';

@Controller('empresas')
export class ListarEmpresasController {
  constructor(private readonly listarEmpresasUseCase: ListarEmpresasUseCase) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(1)
  async ejecutar(): Promise<EmpresaResponseDto[]> {
    return this.listarEmpresasUseCase.ejecutar();
  }
}
