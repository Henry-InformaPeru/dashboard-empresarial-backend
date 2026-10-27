import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ActualizarEnlacePowerBiHttpDto {
  // Acepta el HTML de «Código para insertar» de Power BI o su vínculo: el caso de uso saca el vínculo limpio (ver enlacesPeriodo.ts).
  @IsString()
  @IsNotEmpty({
    message:
      'Pega el HTML de «Código para insertar» de Power BI, o su vínculo.',
  })
  @MaxLength(8000, { message: 'El texto pegado es demasiado largo.' })
  urlPowerbi!: string;
}
