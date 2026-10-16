import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CambiarEstadoUsuarioHttpDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['ACTIVO', 'INACTIVO'])
  estado!: 'ACTIVO' | 'INACTIVO';
}
