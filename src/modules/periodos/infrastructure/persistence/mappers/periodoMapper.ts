import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';
import { DashboardPeriodoOrmEntity } from '../entities/dashboardPeriodoOrm.entity';

export class PeriodoMapper {
  static toDomain(entity: DashboardPeriodoOrmEntity): DashboardPeriodo {
    return {
      id: entity.id,
      dashboardId: entity.dashboardId,
      periodo: entity.periodo,
      urlPowerbi: entity.urlPowerbi,
      urlMega: entity.urlMega,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
