import type { Usuario } from '../../../../auth/domain/entities/usuario.entity';
import type { CupoExigido } from '../../../../licencias/licencias.service';

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
  // cupo: tope del plan de la empresa que se vuelve a contar dentro de la misma transacción (licencias de Sulotec); null = sin tope
  crear(datos: DatosNuevoUsuario, cupo?: CupoExigido | null): Promise<Usuario>;
  actualizarEstado(
    id: number,
    estado: string,
    cupo?: CupoExigido | null,
  ): Promise<void>;
  actualizarPasswordHash(id: number, passwordHash: string): Promise<void>;
  eliminar(id: number): Promise<void>;
}
