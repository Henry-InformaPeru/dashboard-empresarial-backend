import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PERIODO_REPOSITORY,
  type PeriodoRepositoryPort,
} from '../ports/output/periodoRepository.port';

import type { EnlacesPeriodoResponseDto } from '../dto/enlacesPeriodoResponse.dto';

@Injectable()
export class ObtenerEnlacesPeriodoUseCase {
  constructor(
    @Inject(PERIODO_REPOSITORY)
    private readonly periodoRepository: PeriodoRepositoryPort,
  ) {}

  async ejecutar(
    dashboardId: number,
    periodo: string,
    rolId: number | null,
    empresaId: number | null,
  ): Promise<EnlacesPeriodoResponseDto> {
    if (rolId !== 2 || empresaId === null) {
      throw new ForbiddenException('Acceso no permitido');
    }

    const autorizado = await this.periodoRepository.tieneAcceso(
      dashboardId,
      empresaId,
    );

    if (!autorizado) {
      throw new ForbiddenException('No tiene acceso a este dashboard');
    }

    const registro = await this.periodoRepository.buscarPorDashboardYPeriodo(
      dashboardId,
      periodo,
    );

    if (!registro) {
      throw new NotFoundException('Período no encontrado');
    }

    return {
      id: registro.id,
      dashboardId: registro.dashboardId,
      periodo: registro.periodo,
      urlPowerbi: registro.urlPowerbi,
      urlMega: registro.urlMega,
    };
  }
}
