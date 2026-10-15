import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Usuario } from '../../../domain/entities/usuario.entity';
import type { UsuarioRepositoryPort } from '../../../application/ports/output/usuarioRepository.port';

import { UsuarioOrmEntity } from '../entities/usuarioOrm.entity';
import { UsuarioMapper } from '../mappers/usuarioMapper';
import { PerfilUsuarioDto } from '../../../application/dto/perfilUsuario.dto';

@Injectable()
export class UsuarioRepository implements UsuarioRepositoryPort {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repository: Repository<UsuarioOrmEntity>,
  ) {}

  async buscarPorUsername(username: string): Promise<Usuario | null> {
    const usuario = await this.repository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.username = :username', { username })
      .getOne();

    return usuario ? UsuarioMapper.toDomain(usuario) : null;
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const usuario = await this.repository.findOne({
      where: { id },
    });

    return usuario ? UsuarioMapper.toDomain(usuario) : null;
  }

  async buscarPerfilPorId(
    id: number,
  ): Promise<(PerfilUsuarioDto & { estado: string }) | null> {
    const usuario = await this.repository.findOne({
      where: { id },
    });

    if (!usuario) {
      return null;
    }

    return {
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      rolId: usuario.rolId,
      empresaId: usuario.empresaId,
      estado: usuario.estado,
    };
  }
}
