import type { Usuario } from '../../../../auth/domain/entities/usuario.entity';

export const USUARIO_ADMIN_REPOSITORY = Symbol('USUARIO_ADMIN_REPOSITORY');

export interface DatosNuevoUsuario {
  empresaId: number | null;
  rolId: number;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  passwordHash: string;
}

export interface UsuarioAdminRepositoryPort {
  buscarPorUsername(username: string): Promise<Usuario | null>;
  buscarPorId(id: number): Promise<Usuario | null>;
  listarTodos(): Promise<Usuario[]>;
  crear(datos: DatosNuevoUsuario): Promise<Usuario>;
  actualizarEstado(id: number, estado: string): Promise<void>;
}
