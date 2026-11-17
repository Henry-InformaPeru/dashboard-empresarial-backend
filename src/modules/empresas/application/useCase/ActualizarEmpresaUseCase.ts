import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
  type DatosActualizarEmpresaRepo,
} from '../ports/output/empresaRepository.port';
import type { Empresa } from '../../domain/entities/empresa.entity';

@Injectable()
export class ActualizarEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly repository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(
    id: number,
    datos: DatosActualizarEmpresaRepo,
    rolId: number | null,
  ): Promise<Empresa> {
    if (rolId !== 1) {
      throw new ForbiddenException('Solo los administradores pueden editar empresas');
    }

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new NotFoundException(`No existe la empresa con ID ${id}`);
    }

    const actualizada = await this.repository.actualizar(id, datos);
    if (!actualizada) {
      throw new NotFoundException(`No se pudo actualizar la empresa con ID ${id}`);
    }

    return actualizada;
  }
}
