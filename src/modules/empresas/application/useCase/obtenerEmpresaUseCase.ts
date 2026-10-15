import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../ports/output/empresaRepository.port';

import type { EmpresaResponseDto } from '../dto/empresaResponse.dto';

@Injectable()
export class ObtenerEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(empresaId: number): Promise<EmpresaResponseDto> {
    const empresa = await this.empresaRepository.buscarPorId(empresaId);

    if (!empresa) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return empresa;
  }
}
