import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';

import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../ports/output/usuarioRepository.port';

import type { PerfilUsuarioDto } from '../dto/perfilUsuario.dto';

@Injectable()
export class ObtenerPerfilUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepositoryPort,
  ) {}

  async ejecutar(usuarioId: number): Promise<PerfilUsuarioDto> {
    const usuario = await this.usuarioRepository.buscarPerfilPorId(usuarioId);

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException('No autorizado');
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      rolId: usuario.rolId,
      empresaId: usuario.empresaId,
    };
  }
}
