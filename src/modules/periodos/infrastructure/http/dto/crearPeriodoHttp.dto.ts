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

  // Opcional: el vínculo de Power BI es del reporte, no del mes. Sin él se usa el del periodo más reciente del reporte.
  // Si se manda, acepta el HTML de «Código para insertar» de Power BI o su vínculo: el caso de uso saca el vínculo limpio (ver enlacesPeriodo.ts).
  @IsString()
  @IsOptional()
  @MaxLength(8000, { message: 'El texto pegado es demasiado largo.' })
  urlPowerbi?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  urlMega?: string | null;
}
