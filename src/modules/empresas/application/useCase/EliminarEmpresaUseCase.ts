import {
  Inject,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../ports/output/empresaRepository.port';

@Injectable()
export class EliminarEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly repository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(id: number, rolId: number | null): Promise<void> {
    if (rolId !== 1) {
      throw new ForbiddenException('Solo los administradores pueden dar de baja empresas');
    }

    const existente = await this.repository.buscarPorId(id);
    if (!existente) {
      throw new NotFoundException(`No existe la empresa con ID ${id}`);
    }

    await this.repository.eliminar(id);
  }
}
