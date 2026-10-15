import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { Request } from 'express';

import type { UsuarioAutenticado } from '../security/usuarioAutenticado';

@Injectable()
export class EmpresaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();

    const usuario = request.user;

    if (!usuario) {
      throw new UnauthorizedException();
    }

    const empresaId = Number(request.params.empresaId);

    if (!Number.isSafeInteger(empresaId) || empresaId <= 0) {
      throw new ForbiddenException('Empresa no válida');
    }

    // ADMIN puede acceder a empresas según esta política.
    if (usuario.rolId === 1) {
      return true;
    }

    // CLIENT solamente puede acceder a su empresa.
    if (
      usuario.rolId !== 2 ||
      usuario.empresaId === null ||
      usuario.empresaId !== empresaId
    ) {
      throw new ForbiddenException(
        'No tiene permisos para acceder a esta empresa',
      );
    }

    return true;
  }
}
