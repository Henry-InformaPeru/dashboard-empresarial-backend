import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UsuarioOrmEntity } from '../../../modules/auth/infrastructure/persistence/entities/usuarioOrm.entity';

@Injectable()
export class AccesoActualService {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly usuarioRepository: Repository<UsuarioOrmEntity>,
  ) {}

  async obtenerPorId(id: number): Promise<UsuarioOrmEntity | null> {
    return this.usuarioRepository.findOne({
      where: {
        id,
        estado: 'ACTIVO',
      },
    });
  }
}
