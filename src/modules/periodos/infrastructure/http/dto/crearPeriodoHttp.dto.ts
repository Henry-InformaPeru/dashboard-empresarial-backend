import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CrearPeriodoHttpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}(0[1-9]|1[0-2])$/, {
    message: 'El periodo debe tener el formato YYYYMM (ej. 202610)',
  })
  periodo!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  urlPowerbi!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  urlMega?: string | null;
}
