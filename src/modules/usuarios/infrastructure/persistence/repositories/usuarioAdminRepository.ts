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
    const usuario = await this.repository.findOne({
      where: { username },
    });

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
      number?: number;
      driverError?: {
        number?: number;
        originalError?: {
          number?: number;
        };
      };
    };

    const numero =
      candidato.number ??
      candidato.driverError?.number ??
      candidato.driverError?.originalError?.number;

    return numero === 2601 || numero === 2627;
  }
}
