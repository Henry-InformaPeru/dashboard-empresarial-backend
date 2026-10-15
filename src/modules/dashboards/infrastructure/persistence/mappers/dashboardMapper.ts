import type { Dashboard } from '../../../domain/entities/dashboard.entity';
import { DashboardOrmEntity } from '../entities/dashboardOrm.entity';

export class DashboardMapper {
  static toDomain(entity: DashboardOrmEntity): Dashboard {
    return {
      id: entity.id,
      codigo: entity.codigo,
      nombre: entity.nombre,
      descripcion: entity.descripcion,
      estado: entity.estado,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
