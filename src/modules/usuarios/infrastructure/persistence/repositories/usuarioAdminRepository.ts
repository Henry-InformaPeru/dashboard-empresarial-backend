import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  type DatosNuevoUsuario,
  type UsuarioAdminRepositoryPort,
} from '../../../application/ports/output/usuarioAdminRepository.port';

import type { Usuario } from '../../../../auth/domain/entities/usuario.entity';

import { UsuarioOrmEntity } from '../../../../auth/infrastructure/persistence/entities/usuarioOrm.entity';

@Injectable()
export class UsuarioAdminRepository implements UsuarioAdminRepositoryPort {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly repository: Repository<UsuarioOrmEntity>,
  ) {}

  async buscarPorUsername(username: string): Promise<Usuario | null> {
    // Sin distinguir mayúsculas, como hacía SQL Server por su collation
    const usuario = await this.repository
      .createQueryBuilder('usuario')
      .where('LOWER(usuario.username) = LOWER(:username)', { username })
      .getOne();

    if (!usuario) {
      return null;
    }

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      passwordHash: '',
      estado: usuario.estado,
      fechaCreacion: usuario.fechaCreacion,
    };
  }

  async crear(datos: DatosNuevoUsuario): Promise<Usuario> {
    try {
      const nuevo = this.repository.create({
        empresaId: datos.empresaId,
        rolId: datos.rolId,
        username: datos.username,
        email: datos.email,
        nombreCompleto: datos.nombreCompleto,
        passwordHash: datos.passwordHash,
        estado: 'ACTIVO',
      });

      const creado = await this.repository.save(nuevo);

      return {
        id: creado.id,
        empresaId: creado.empresaId,
        rolId: creado.rolId,
        username: creado.username,
        email: creado.email,
        nombreCompleto: creado.nombreCompleto,
        passwordHash: '',
        estado: creado.estado,
        fechaCreacion: creado.fechaCreacion,
      };
    } catch (error: unknown) {
      if (this.esErrorDuplicado(error)) {
        throw new ConflictException('El nombre de usuario ya está registrado');
      }

      throw error;
    }
  }

  private esErrorDuplicado(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const candidato = error as {
      code?: string;
      driverError?: {
        code?: string;
      };
    };

    const codigo = candidato.code ?? candidato.driverError?.code;

    // PostgreSQL: 23505 = unique_violation
    return codigo === '23505';
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    const usuario = await this.repository.findOne({ where: { id } });
    if (!usuario) return null;

    return {
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      passwordHash: '',
      estado: usuario.estado,
      fechaCreacion: usuario.fechaCreacion,
    };
  }

  async listarTodos(): Promise<Usuario[]> {
    const usuarios = await this.repository.find();
    return usuarios.map((usuario) => ({
      id: usuario.id,
      empresaId: usuario.empresaId,
      rolId: usuario.rolId,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      passwordHash: '',
      estado: usuario.estado,
      fechaCreacion: usuario.fechaCreacion,
    }));
  }

  async actualizarEstado(id: number, estado: string): Promise<void> {
    await this.repository.update(id, { estado });
  }

  async actualizarPasswordHash(
    id: number,
    passwordHash: string,
  ): Promise<void> {
    await this.repository.update(id, { passwordHash });
  }

  async eliminar(id: number): Promise<void> {
    await this.repository.delete(id);
  }
}
