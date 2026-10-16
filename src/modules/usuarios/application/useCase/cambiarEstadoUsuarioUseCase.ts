import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  USUARIO_ADMIN_REPOSITORY,
  type UsuarioAdminRepositoryPort,
} from '../ports/output/usuarioAdminRepository.port';
import { UsuarioService } from '../../domain/services/usuarioService';

@Injectable()
export class CambiarEstadoUsuarioUseCase {
  private readonly usuarioService = new UsuarioService();

  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,
  ) {}

  async ejecutar(
    idUsuario: number,
    nuevoEstado: string,
    rolAdministrador: number | null,
  ): Promise<void> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para modificar el estado de los usuarios',
      );
    }

    const estadoNormalizado = nuevoEstado.toUpperCase();

    if (!this.usuarioService.validarEstado(estadoNormalizado)) {
      throw new BadRequestException(
        'Estado no válido. Debe ser ACTIVO o INACTIVO',
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (usuario.estado === estadoNormalizado) {
      throw new BadRequestException(
        `El usuario ya se encuentra en estado ${estadoNormalizado}`,
      );
    }

    await this.usuarioRepository.actualizarEstado(idUsuario, estadoNormalizado);
  }
}
