import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { EmpresaOrmEntity } from '../../../empresas/infrastructure/persistence/entities/empresaOrm.entity';
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
    @InjectRepository(EmpresaOrmEntity)
    private readonly empresaRepository: Repository<EmpresaOrmEntity>,
  ) {}

  async ejecutar(usuarioId: number): Promise<PerfilUsuarioDto> {
    const usuario = await this.usuarioRepository.buscarPerfilPorId(usuarioId);

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new UnauthorizedException('No autorizado');
    }

    let empresaNombre: string | null = null;
    let empresaEsquema: string | null = null;
    let empresaLogo: string | null = null;

    if (usuario.empresaId) {
      const empresa = await this.empresaRepository.findOne({
        where: { id: usuario.empresaId },
      });
      empresaNombre = empresa ? empresa.nombre : null;
      empresaEsquema = empresa ? (empresa.esquema || empresa.nombre) : null;
      empresaLogo = empresa ? (empresa.logo || null) : null;
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      rolId: usuario.rolId,
      empresaId: usuario.empresaId,
      empresaNombre,
      empresaEsquema,
      empresaLogo,
    };
  }
}
