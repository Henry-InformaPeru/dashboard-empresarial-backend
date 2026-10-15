import {
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CrearUsuarioHttpDto {
  @IsOptional()
  @IsInt()
  empresaId!: number | null;

  @IsInt()
  @IsIn([1, 2])
  rolId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  username!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  email!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreCompleto!: string | null;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  password!: string;
}
