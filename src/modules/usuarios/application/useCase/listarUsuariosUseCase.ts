import { Inject, Injectable, ForbiddenException } from '@nestjs/common';
import {
  USUARIO_ADMIN_REPOSITORY,
  type UsuarioAdminRepositoryPort,
} from '../ports/output/usuarioAdminRepository.port';
import type { UsuarioResponseDto } from '../dto/usuarioResponse.dto';

@Injectable()
export class ListarUsuariosUseCase {
  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,
  ) {}

  async ejecutar(
    rolAdministrador: number | null,
  ): Promise<UsuarioResponseDto[]> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para ver la lista de usuarios',
      );
    }

    const usuarios = await this.usuarioRepository.listarTodos();

    return usuarios.map((u) => ({
      id: u.id,
      empresaId: u.empresaId,
      rolId: u.rolId,
      username: u.username,
      email: u.email,
      nombreCompleto: u.nombreCompleto,
      estado: u.estado,
      fechaCreacion: u.fechaCreacion,
    }));
  }
}
