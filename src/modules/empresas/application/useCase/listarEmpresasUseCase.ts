import { Inject, Injectable } from '@nestjs/common';

import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../ports/output/empresaRepository.port';

import type { EmpresaResponseDto } from '../dto/empresaResponse.dto';

@Injectable()
export class ListarEmpresasUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(): Promise<EmpresaResponseDto[]> {
    return this.empresaRepository.listar();
  }
}
