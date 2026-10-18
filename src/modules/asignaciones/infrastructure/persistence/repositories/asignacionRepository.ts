import { ConflictException, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import type {
  ActualizadorAsignacion,
  AsignacionRepositoryPort,
} from '../../../application/ports/output/asignacionRepository.port';

import type { Asignacion } from '../../../domain/entities/asignacion.entity';

import { EmpresaDashboardOrmEntity } from '../../../../dashboards/infrastructure/persistence/entities/empresaDashboardOrm.entity';

import { AsignacionMapper } from '../mappers/asignacionMapper';

@Injectable()
export class AsignacionRepository implements AsignacionRepositoryPort {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async crear(empresaId: number, dashboardId: number): Promise<Asignacion> {
    const repository = this.dataSource.getRepository(EmpresaDashboardOrmEntity);

    const existente = await repository.findOne({
      where: { empresaId, dashboardId },
    });

    if (existente) {
      throw new ConflictException(
        'El dashboard ya tiene una asignación con esta empresa',
      );
    }

    try {
      const nueva = repository.create({
        empresaId,
        dashboardId,
        estado: 'ACTIVO',
        fechaDesactivacion: null,
      });

      const creada = await repository.save(nueva);

      return AsignacionMapper.toDomain(creada);
    } catch (error: unknown) {
      // PostgreSQL: error de índice único
      if (this.esErrorDuplicado(error)) {
        throw new ConflictException(
          'El dashboard ya tiene una asignación con esta empresa',
        );
      }

      throw error;
    }
  }

  async actualizarEnTransaccion(
    empresaId: number,
    dashboardId: number,
    actualizar: ActualizadorAsignacion,
  ): Promise<Asignacion | null> {
    return this.dataSource.transaction('SERIALIZABLE', async (manager) => {
      const repository = manager.getRepository(EmpresaDashboardOrmEntity);

      const existente = await repository.findOne({
        where: { empresaId, dashboardId },
      });

      if (!existente) {
        return null;
      }

      const actual = AsignacionMapper.toDomain(existente);
      const modificada = actualizar(actual);

      // Evitar escritura si el estado no cambió
      if (
        modificada.estado === actual.estado &&
        modificada.fechaDesactivacion?.getTime() ===
          actual.fechaDesactivacion?.getTime()
      ) {
        return actual;
      }

      existente.estado = modificada.estado;
      existente.fechaDesactivacion = modificada.fechaDesactivacion;

      const guardada = await repository.save(existente);

      return AsignacionMapper.toDomain(guardada);
    });
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
}
