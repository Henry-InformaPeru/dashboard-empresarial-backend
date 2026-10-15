import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { ObtenerEmpresaUseCase } from '../../../application/useCase/obtenerEmpresaUseCase';

import type { EmpresaResponseDto } from '../../../application/dto/empresaResponse.dto';

import { JwtAuthGuard } from '../../../../auth/infrastructure/http/guards/jwtAuthGuard';

import { EmpresaGuard } from '../../../../../shared/infrastructure/guards/empresaGuard';

@Controller('empresas')
export class ObtenerEmpresaController {
  constructor(private readonly obtenerEmpresaUseCase: ObtenerEmpresaUseCase) {}

  @Get(':empresaId')
  @UseGuards(JwtAuthGuard, EmpresaGuard)
  async ejecutar(
    @Param('empresaId', ParseIntPipe) empresaId: number,
  ): Promise<EmpresaResponseDto> {
    return this.obtenerEmpresaUseCase.ejecutar(empresaId);
  }
}
