import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarPasswordUsuarioHttpDto {
  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}
