import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  USUARIO_ADMIN_REPOSITORY,
  type UsuarioAdminRepositoryPort,
} from '../ports/output/usuarioAdminRepository.port';
import type { UsuarioResponseDto } from '../dto/usuarioResponse.dto';

@Injectable()
export class ObtenerDetalleUsuarioUseCase {
  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,
  ) {}

  async ejecutar(
    idUsuario: number,
    rolAdministrador: number | null,
  ): Promise<UsuarioResponseDto> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para ver detalles de usuarios',
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      estado: usuario.estado,
      fechaCreacion: usuario.fechaCreacion,
    };
  }
}
