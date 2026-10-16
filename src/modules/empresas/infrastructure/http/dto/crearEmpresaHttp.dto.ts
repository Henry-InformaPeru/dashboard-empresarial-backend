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
}
