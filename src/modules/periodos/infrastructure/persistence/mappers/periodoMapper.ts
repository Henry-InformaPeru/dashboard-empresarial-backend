import type { DashboardPeriodo } from '../../../domain/entities/dashboardPeriodo.entity';
import { DashboardPeriodoOrmEntity } from '../entities/dashboardPeriodoOrm.entity';
import { enlacePowerBiLegible } from '../../../domain/services/enlacesPeriodo';

export class PeriodoMapper {
  // urlPowerbiReporte: vínculo de Power BI del reporte, que usa el periodo cuando no tiene uno propio.
  static toDomain(
    entity: DashboardPeriodoOrmEntity,
    urlPowerbiReporte: string | null = null,
  ): DashboardPeriodo {
    const vinculo = entity.urlPowerbi || urlPowerbiReporte;

    return {
      id: entity.id,
      dashboardId: entity.dashboardId,
      periodo: entity.periodo,
      // si antes alguien pegó el HTML completo, se devuelve solo el vínculo para que el visor funcione
      urlPowerbi: vinculo ? enlacePowerBiLegible(vinculo) : null,
      urlMega: entity.urlMega,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
