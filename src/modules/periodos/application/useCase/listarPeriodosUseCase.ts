import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import {
  PERIODO_REPOSITORY,
  type PeriodoRepositoryPort,
} from '../ports/output/periodoRepository.port';
import type { PeriodoResponseDto } from '../dto/periodoResponse.dto';

@Injectable()
export class ListarPeriodosUseCase {
  constructor(
    @Inject(PERIODO_REPOSITORY)
    private readonly periodoRepository: PeriodoRepositoryPort,
  ) {}

  async ejecutar(
    dashboardId: number,
    rolId: number | null,
    empresaId: number | null,
  ): Promise<PeriodoResponseDto[]> {
    if (rolId !== 1 && (rolId !== 2 || empresaId === null)) {
      throw new ForbiddenException('Acceso no permitido');
    }

    if (rolId === 2) {
      if (empresaId === null) {
        throw new ForbiddenException('Empresa no especificada');
      }

      const autorizado = await this.periodoRepository.tieneAcceso(
        dashboardId,
        empresaId,
      );
      if (!autorizado) {
        throw new ForbiddenException('No tiene acceso a este dashboard');
      }
    }

    const periodos =
      await this.periodoRepository.listarPorDashboard(dashboardId);

    // Mapeamos incluyendo las URLs para que la tabla del frontend las reciba de golpe
    return periodos.map((registro) => ({
      id: registro.id,
      dashboardId: registro.dashboardId,
      periodo: registro.periodo,
      urlPowerbi: registro.urlPowerbi,
      urlMega: registro.urlMega,
    }));
  }
}
