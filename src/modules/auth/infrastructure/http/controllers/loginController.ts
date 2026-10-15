import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthService } from '../../../domain/services/authService';

import type { LoginResponseDto } from '../../../application/dto/loginResponse.dto';

import { CredencialesInvalidasException } from '../../../domain/exceptions/credencialesInvalidas.exception';

import { LoginHttpRequestDto } from '../dto/loginHttpRequest.dto';

@Controller('auth')
export class LoginController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() request: LoginHttpRequestDto): Promise<LoginResponseDto> {
    try {
      return await this.authService.login(request);
    } catch (error: unknown) {
      if (error instanceof CredencialesInvalidasException) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      throw error;
    }
  }
}
