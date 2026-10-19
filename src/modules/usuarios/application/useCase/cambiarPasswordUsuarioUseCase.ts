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

import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../../../auth/application/ports/output/passwordHasher.port';

import { UsuarioService } from '../../domain/services/usuarioService';

@Injectable()
export class CambiarPasswordUsuarioUseCase {
  private readonly usuarioService = new UsuarioService();

  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async ejecutar(
    idUsuario: number,
    password: string,
    rolAdministrador: number | null,
  ): Promise<void> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para cambiar contraseñas de usuarios',
      );
    }

    if (!this.usuarioService.validarPassword(password)) {
      throw new BadRequestException(
        'La contraseña no cumple los requisitos de seguridad',
      );
    }

    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordHash = await this.passwordHasher.generar(password);

    await this.usuarioRepository.actualizarPasswordHash(
      idUsuario,
      passwordHash,
    );
  }
}
