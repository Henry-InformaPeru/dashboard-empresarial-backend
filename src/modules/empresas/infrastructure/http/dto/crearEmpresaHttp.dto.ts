import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearEmpresaHttpDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  ruc!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  esquema!: string | null;

  @IsOptional()
  @IsString()
  logo?: string | null;
}
