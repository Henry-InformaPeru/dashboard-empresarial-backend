import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UsuarioOrmEntity } from '../../../modules/auth/infrastructure/persistence/entities/usuarioOrm.entity';
import { EmpresaOrmEntity } from '../../../modules/empresas/infrastructure/persistence/entities/empresaOrm.entity';

@Injectable()
export class AccesoActualService {
  constructor(
    @InjectRepository(UsuarioOrmEntity)
    private readonly usuarioRepository: Repository<UsuarioOrmEntity>,
    @InjectRepository(EmpresaOrmEntity)
    private readonly empresaRepository: Repository<EmpresaOrmEntity>,
  ) {}

  async obtenerPorId(id: number): Promise<(UsuarioOrmEntity & { empresaNombre?: string | null; empresaEsquema?: string | null }) | null> {
    const usuario = await this.usuarioRepository.findOne({
      where: {
        id,
        estado: 'ACTIVO',
      },
    });

    if (!usuario) {
      return null;
    }

    let empresaNombre: string | null = null;
    let empresaEsquema: string | null = null;
    if (usuario.empresaId) {
      const empresa = await this.empresaRepository.findOne({
        select: {
          id: true,
          nombre: true,
          ruc: true,
          estado: true,
          esquema: true,
          fechaCreacion: true,
        },
        where: { id: usuario.empresaId },
      });
      empresaNombre = empresa ? empresa.nombre : null;
      empresaEsquema = empresa ? (empresa.esquema || empresa.nombre) : null;
    }

    return Object.assign(usuario, { empresaNombre, empresaEsquema });
  }
}
