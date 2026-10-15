import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import type { PasswordHasherPort } from '../../../application/ports/output/passwordHasher.port';

@Injectable()
export class BcryptPasswordHasher implements PasswordHasherPort {
  private readonly saltRounds = 12;

  async generar(passwordPlano: string): Promise<string> {
    return bcrypt.hash(passwordPlano, this.saltRounds);
  }

  async verificar(
    passwordPlano: string,
    passwordHash: string,
  ): Promise<boolean> {
    if (!passwordHash || !/^\$2[aby]\$\d{2}\$/.test(passwordHash)) {
      return false;
    }

    try {
      return await bcrypt.compare(passwordPlano, passwordHash);
    } catch {
      return false;
    }
  }
}
