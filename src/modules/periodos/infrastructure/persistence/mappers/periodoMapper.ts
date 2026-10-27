import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';
import { DashboardPeriodoOrmEntity } from '../entities/dashboardPeriodoOrm.entity';
import { enlacePowerBiLegible } from '../../../domain/services/enlacesPeriodo';

export class PeriodoMapper {
  static toDomain(entity: DashboardPeriodoOrmEntity): DashboardPeriodo {
    return {
      id: entity.id,
      dashboardId: entity.dashboardId,
      periodo: entity.periodo,
      // si antes alguien pegó el HTML completo, se devuelve solo el vínculo para que el visor funcione
      urlPowerbi: enlacePowerBiLegible(entity.urlPowerbi),
      urlMega: entity.urlMega,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
