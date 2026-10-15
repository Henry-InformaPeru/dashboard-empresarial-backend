import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator';
import type { UsuarioAutenticado } from '../security/usuarioAutenticado';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<number[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();

    const usuario = request.user;

    if (!usuario) {
      throw new UnauthorizedException();
    }

    if (!rolesPermitidos || rolesPermitidos.length === 0) {
      return true;
    }

    if (usuario.rolId === null || !rolesPermitidos.includes(usuario.rolId)) {
      throw new ForbiddenException(
        'No tiene permisos para realizar esta operación',
      );
    }

    return true;
  }
}
