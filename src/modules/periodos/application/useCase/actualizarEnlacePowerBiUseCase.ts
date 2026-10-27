import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  PERIODO_REPOSITORY,
  type PeriodoRepositoryPort,
} from '../ports/output/periodoRepository.port';
import { DashboardOrmEntity } from '../../../dashboards/infrastructure/persistence/entities/dashboardOrm.entity';
import { extraerEnlacePowerBi } from '../../domain/services/enlacesPeriodo';

// El vínculo de Power BI es del reporte, no del mes. Este caso de uso lo define o lo cambia en el reporte y hace que todos sus
// periodos lo usen (por ejemplo cuando se vuelve a publicar el reporte en Power BI y el vínculo anterior deja de servir).
@Injectable()
export class ActualizarEnlacePowerBiUseCase {
  constructor(
    @Inject(PERIODO_REPOSITORY)
    private readonly periodoRepository: PeriodoRepositoryPort,

    @InjectRepository(DashboardOrmEntity)
    private readonly dashboardRepository: Repository<DashboardOrmEntity>,
  ) {}

  async ejecutar(
    dashboardId: number,
    urlPowerbi: string,
    rolId: number | null,
  ): Promise<{ periodosActualizados: number }> {
    if (rolId !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para cambiar el vínculo de Power BI',
      );
    }

    const powerbi = extraerEnlacePowerBi(urlPowerbi);
    if (!powerbi.ok) {
      throw new BadRequestException(powerbi.motivo);
    }

    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard no encontrado');
    }

    const periodosActualizados =
      await this.periodoRepository.cambiarVinculoPowerbiDelReporte(
        dashboardId,
        powerbi.url,
      );

    return { periodosActualizados };
  }
}
