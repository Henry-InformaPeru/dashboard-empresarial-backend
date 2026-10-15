import type { Usuario } from '../../../domain/entities/usuario.entity';
import { UsuarioOrmEntity } from '../entities/usuarioOrm.entity';

export class UsuarioMapper {
  static toDomain(entity: UsuarioOrmEntity): Usuario {
    return {
      id: entity.id,
      empresaId: entity.empresaId,
      rolId: entity.rolId,
      username: entity.username,
      email: entity.email,
      nombreCompleto: entity.nombreCompleto,
      passwordHash: entity.passwordHash,
      estado: entity.estado,
      fechaCreacion: entity.fechaCreacion,
    };
  }
}
