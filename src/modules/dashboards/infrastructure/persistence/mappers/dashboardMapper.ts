import type { Dashboard } from '../../../domain/entities/dashboard.entity';
import { DashboardOrmEntity } from '../entities/dashboardOrm.entity';
import { enlacePowerBiLegible } from '../../../../periodos/domain/services/enlacesPeriodo';

export class DashboardMapper {
  static toDomain(entity: DashboardOrmEntity): Dashboard {
    return {
      id: entity.id,
      codigo: entity.codigo,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      estado: entity.estado,
      urlPowerbi: entity.urlPowerbi
        ? enlacePowerBiLegible(entity.urlPowerbi)
        : null,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
