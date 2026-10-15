import type { Asignacion } from '../../../domain/entities/asignacion.entity';

import { EmpresaDashboardOrmEntity } from '../../../../dashboards/infrastructure/persistence/entities/empresaDashboardOrm.entity';

export class AsignacionMapper {
  static toDomain(entity: EmpresaDashboardOrmEntity): Asignacion {
    if (entity.estado !== 'ACTIVO' && entity.estado !== 'INACTIVO') {
      throw new Error('Estado de asignación no reconocido');
    }

    return {
      id: entity.id,
      empresaId: entity.empresaId,
      dashboardId: entity.dashboardId,
      fechaAsignacion: entity.fechaAsignacion,
      estado: entity.estado,
      fechaDesactivacion: entity.fechaDesactivacion,
    };
  }
}
