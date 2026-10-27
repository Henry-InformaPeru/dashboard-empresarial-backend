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

  // Acepta el HTML de «Código para insertar» de Power BI o su vínculo: el caso de uso saca el vínculo limpio (ver enlacesPeriodo.ts).
  @IsString()
  @IsNotEmpty({
    message:
      'Pega el HTML de «Código para insertar» de Power BI, o su vínculo.',
  })
  @MaxLength(8000, { message: 'El texto pegado es demasiado largo.' })
  urlPowerbi!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  urlMega?: string | null;
}
