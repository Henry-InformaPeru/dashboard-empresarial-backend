import type { Empresa } from '../../../domain/entities/empresa.entity';
import { EmpresaOrmEntity } from '../entities/empresaOrm.entity';

export class EmpresaMapper {
  static toDomain(entity: EmpresaOrmEntity): Empresa {
    return {
      id: entity.id,
      nombre: entity.nombre,
      ruc: entity.ruc,
      estado: entity.estado,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
