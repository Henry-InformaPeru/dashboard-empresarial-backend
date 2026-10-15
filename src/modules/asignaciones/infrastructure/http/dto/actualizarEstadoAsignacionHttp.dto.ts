import { IsIn } from 'class-validator';

import type { EstadoAsignacion } from '../../../domain/entities/asignacion.entity';

export class ActualizarEstadoAsignacionHttpDto {
  @IsIn(['ACTIVO', 'INACTIVO'], {
    message: 'El estado debe ser ACTIVO o INACTIVO',
  })
  estado!: EstadoAsignacion;
}
