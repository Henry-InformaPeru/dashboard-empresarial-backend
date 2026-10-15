import { Injectable } from '@nestjs/common';

import { LoginUseCase } from '../../application/useCase/loginUseCase';
import { ObtenerPerfilUseCase } from '../../application/useCase/obtenerPerfilUseCase';

import type { LoginRequestDto } from '../../application/dto/loginRequest.dto';
import type { LoginResponseDto } from '../../application/dto/loginResponse.dto';
import type { PerfilUsuarioDto } from '../../application/dto/perfilUsuario.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly obtenerPerfilUseCase: ObtenerPerfilUseCase,
  ) {}

  async login(request: LoginRequestDto): Promise<LoginResponseDto> {
    return this.loginUseCase.ejecutar(request);
  }

  async obtenerPerfil(usuarioId: number): Promise<PerfilUsuarioDto> {
    return this.obtenerPerfilUseCase.ejecutar(usuarioId);
  }
}
