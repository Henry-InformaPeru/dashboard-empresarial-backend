import {
  BadRequestException,
  ConflictException,
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

import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../../../empresas/application/ports/output/empresaRepository.port';

import { UsuarioService } from '../../domain/services/usuarioService';

import type { CrearUsuarioDto } from '../dto/crearUsuario.dto';
import type { UsuarioResponseDto } from '../dto/usuarioResponse.dto';

@Injectable()
export class CrearUsuarioUseCase {
  private readonly usuarioService = new UsuarioService();

  constructor(
    @Inject(USUARIO_ADMIN_REPOSITORY)
    private readonly usuarioRepository: UsuarioAdminRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,
  ) {}

  async ejecutar(
    datos: CrearUsuarioDto,
    rolAdministrador: number | null,
  ): Promise<UsuarioResponseDto> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException('No tiene permisos para crear usuarios');
    }

    const username = this.usuarioService.normalizarUsername(datos.username);

    if (!username) {
      throw new BadRequestException('El username es obligatorio');
    }

    if (!this.usuarioService.validarRol(datos.rolId)) {
      throw new BadRequestException('Rol no permitido');
    }

    if (!this.usuarioService.validarPassword(datos.password)) {
      throw new BadRequestException(
        'La contraseña no cumple los requisitos de seguridad',
      );
    }

    if (
      this.usuarioService.requiereEmpresa(datos.rolId) &&
      datos.empresaId === null
    ) {
      throw new BadRequestException(
        'Los usuarios CLIENT deben pertenecer a una empresa',
      );
    }

    if (datos.empresaId !== null) {
      const empresa = await this.empresaRepository.buscarPorId(datos.empresaId);

      if (!empresa) {
        throw new NotFoundException('Empresa no encontrada');
      }

      if (empresa.estado !== 'ACTIVO') {
        throw new BadRequestException('La empresa no está activa');
      }
    }

    const existente = await this.usuarioRepository.buscarPorUsername(username);

    if (existente) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    const passwordHash = await this.passwordHasher.generar(datos.password);

    const usuario = await this.usuarioRepository.crear({
      empresaId: datos.empresaId,
      rolId: datos.rolId,
      username,
      email: datos.email?.trim() || null,
      nombreCompleto: datos.nombreCompleto?.trim() || null,
      passwordHash,
    });

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
