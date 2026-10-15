import type { Usuario } from '../../../domain/entities/usuario.entity';
import type { PerfilUsuarioDto } from '../../dto/perfilUsuario.dto';

export const USUARIO_REPOSITORY = Symbol('USUARIO_REPOSITORY');

export interface UsuarioRepositoryPort {
  buscarPorUsername(username: string): Promise<Usuario | null>;

  buscarPerfilPorId(
    id: number,
  ): Promise<(PerfilUsuarioDto & { estado: string }) | null>;
}
