import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  ASIGNACION_REPOSITORY,
  type AsignacionRepositoryPort,
} from '../ports/output/asignacionRepository.port';

import type { ActualizarEstadoAsignacionDto } from '../dto/actualizarEstadoAsignacion.dto';
import type { AsignacionResponseDto } from '../dto/asignacionResponse.dto';

import { AsignacionService } from '../../domain/services/asignacionService';

@Injectable()
export class ActualizarEstadoAsignacionUseCase {
  private readonly asignacionService = new AsignacionService();

  constructor(
    @Inject(ASIGNACION_REPOSITORY)
    private readonly asignacionRepository: AsignacionRepositoryPort,
  ) {}

  async ejecutar(
    request: ActualizarEstadoAsignacionDto,
    rolId: number | null,
  ): Promise<AsignacionResponseDto> {
    if (rolId !== 1) {
      throw new ForbiddenException(
        'No tiene permisos para modificar asignaciones',
      );
    }

    const asignacion = await this.asignacionRepository.actualizarEnTransaccion(
      request.empresaId,
      request.dashboardId,
      (actual) =>
        this.asignacionService.actualizarEstado(
          actual,
          request.estado,
          new Date(),
        ),
    );

    if (!asignacion) {
      throw new NotFoundException('Asignación no encontrada');
    }

    return {
      id: asignacion.id,
      empresaId: asignacion.empresaId,
      dashboardId: asignacion.dashboardId,
      estado: asignacion.estado,
      fechaAsignacion: asignacion.fechaAsignacion,
      fechaDesactivacion: asignacion.fechaDesactivacion,
    };
  }
}
