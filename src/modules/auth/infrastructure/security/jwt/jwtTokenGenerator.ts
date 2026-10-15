import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import type {
  TokenGeneratorPort,
  TokenPayload,
} from '../../../application/ports/output/tokenGenerator.port';

@Injectable()
export class JwtTokenGenerator implements TokenGeneratorPort {
  constructor(private readonly jwtService: JwtService) {}

  async generar(payload: TokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload);
  }
}
