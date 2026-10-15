import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginHttpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
