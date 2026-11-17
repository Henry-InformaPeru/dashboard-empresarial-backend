import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarEmpresaHttpDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  ruc?: string | null;

  @IsOptional()
  @IsString()
  estado?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  esquema?: string | null;

  @IsOptional()
  @IsString()
  logo?: string | null;
}
