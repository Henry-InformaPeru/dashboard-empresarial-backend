import { Inject, Injectable } from '@nestjs/common';

import { CredencialesInvalidasException } from '../../domain/exceptions/credencialesInvalidas.exception';

import type { LoginRequestDto } from '../dto/loginRequest.dto';
import type { LoginResponseDto } from '../dto/loginResponse.dto';

import {
  USUARIO_REPOSITORY,
  type UsuarioRepositoryPort,
} from '../ports/output/usuarioRepository.port';

import {
  PASSWORD_HASHER,
  type PasswordHasherPort,
} from '../ports/output/passwordHasher.port';

import {
  TOKEN_GENERATOR,
  type TokenGeneratorPort,
} from '../ports/output/tokenGenerator.port';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USUARIO_REPOSITORY)
    private readonly usuarioRepository: UsuarioRepositoryPort,

    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasherPort,

    @Inject(TOKEN_GENERATOR)
    private readonly tokenGenerator: TokenGeneratorPort,
  ) {}

  async ejecutar(request: LoginRequestDto): Promise<LoginResponseDto> {
    const usuario = await this.usuarioRepository.buscarPorUsername(
      request.username,
    );

    if (!usuario || usuario.estado !== 'ACTIVO') {
      throw new CredencialesInvalidasException();
    }

    const passwordValido = await this.passwordHasher.verificar(
      request.password,
      usuario.passwordHash,
    );

    if (!passwordValido) {
      throw new CredencialesInvalidasException();
    }

    const accessToken = await this.tokenGenerator.generar({
      sub: usuario.id,
      username: usuario.username,
      rolId: usuario.rolId,
      empresaId: usuario.empresaId,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombreCompleto: usuario.nombreCompleto,
        rolId: usuario.rolId,
        empresaId: usuario.empresaId,
      },
    };
  }
}
