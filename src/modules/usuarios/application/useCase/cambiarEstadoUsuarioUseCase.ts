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
import { LicenciasService } from '../../../licencias/licencias.service';
import { UsuarioService } from '../../domain/services/usuarioService';

@Injectable()
export class CambiarEstadoUsuarioUseCase {
  private readonly usuarioService = new UsuarioService();

  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,

    private readonly licencias: LicenciasService,
  ) {}

  async ejecutar(
    idUsuario: number,
    nuevoEstado: string,
    rolAdministrador: number | null,
    idAdministrador: number,
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

    if (idUsuario === idAdministrador && estadoNormalizado === 'INACTIVO') {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
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

    // Licencias de Sulotec: reactivar una cuenta de empresa ocupa cupo del plan
    const ocupaCupo =
      estadoNormalizado === 'ACTIVO' &&
      this.usuarioService.requiereEmpresa(usuario.rolId ?? 0) &&
      usuario.empresaId !== null;
    const cupo = ocupaCupo
      ? await this.licencias.verificarCupo(usuario.empresaId, {
          universal: true,
        })
      : null;

    await this.usuarioRepository.actualizarEstado(
      idUsuario,
      estadoNormalizado,
      cupo,
    );

    this.licencias.reportarLuego(usuario.empresaId);
  }
}
