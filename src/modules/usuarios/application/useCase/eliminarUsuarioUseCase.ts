import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  USUARIO_ADMIN_REPOSITORY,
  type UsuarioAdminRepositoryPort,
} from '../ports/output/usuarioAdminRepository.port';

@Injectable()
export class EliminarUsuarioUseCase {
  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,
  ) {}

  async ejecutar(
    idUsuario: number,
    rolAdministrador: number | null,
    idAdministrador: number,
  ): Promise<void> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException('No tiene permisos para eliminar usuarios');
    }

    // El administrador que hace la petición siempre es un administrador activo:
    // si no puede borrarse a sí mismo, el sistema nunca se queda sin administradores.
    if (idUsuario === idAdministrador) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta');
    }

    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.usuarioRepository.eliminar(idUsuario);
  }
}
