import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AccesoActualService } from '../../../../../shared/infrastructure/security/accesoActualService';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly accesoActualService: AccesoActualService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
    });
  }

  async validate(payload: { sub?: unknown }): Promise<UsuarioAutenticado> {
    if (
      typeof payload.sub !== 'number' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub <= 0
    ) {
      throw new UnauthorizedException();
    }

    const usuario = await this.accesoActualService.obtenerPorId(payload.sub);

    if (!usuario) {
      throw new UnauthorizedException();
    }

    return {
      sub: usuario.id,
      username: usuario.username,
      rolId: usuario.rolId,
      empresaId: usuario.empresaId,
    };
  }
}
