import { IsOptional, IsString, IsNumber, IsBoolean, IsDefined, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class SetMantenimientoDto {
  @IsBoolean()
  activo!: boolean;

  @IsOptional()
  @IsString()
  mensaje?: string;
}

export class SetColoresDto {
  @IsDefined()
  empresaId!: number | string;

  @IsOptional()
  @IsObject()
  colores!: Record<number, { color: string }> | null;
}

export class PortfolioFilterDto {
  @IsOptional()
  @IsString()
  periodo?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  tipoCliente?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estrategia?: number;
}

export class PortfolioDetalleQueryDto extends PortfolioFilterDto {
  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;
}

export class PortfolioGeografiaQueryDto {
  @IsOptional()
  @IsString()
  periodo?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  departamento?: string;

  @IsOptional()
  @IsString()
  provincia?: string;
}
