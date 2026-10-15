import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { AuthService } from '../../../domain/services/authService';

import type { PerfilUsuarioDto } from '../../../application/dto/perfilUsuario.dto';

import type { UsuarioAutenticado } from '../../../../../shared/infrastructure/security/usuarioAutenticado';

import { JwtAuthGuard } from '../guards/jwtAuthGuard';

type RequestAutenticado = Request & {
  user: UsuarioAutenticado;
};

@Controller('auth')
export class ObtenerPerfilController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async obtenerPerfil(
    @Req() request: RequestAutenticado,
  ): Promise<PerfilUsuarioDto> {
    return this.authService.obtenerPerfil(request.user.sub);
  }
}
