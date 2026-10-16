import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import type { Empresa } from '../../../domain/entities/empresa.entity';
import type { EmpresaRepositoryPort } from '../../../application/ports/output/empresaRepository.port';

import { EmpresaOrmEntity } from '../entities/empresaOrm.entity';
import { EmpresaMapper } from '../mappers/empresaMapper';

@Injectable()
export class EmpresaRepository implements EmpresaRepositoryPort {
  constructor(
    @InjectRepository(EmpresaOrmEntity)
    private readonly repository: Repository<EmpresaOrmEntity>,
  ) {}

  async listar(): Promise<Empresa[]> {
    const empresas = await this.repository.find({
      order: { id: 'DESC' },
    });

    return empresas.map((empresa) => EmpresaMapper.toDomain(empresa));
  }

  async buscarPorId(id: number): Promise<Empresa | null> {
    const empresa = await this.repository.findOne({
      where: { id },
    });

    return empresa ? EmpresaMapper.toDomain(empresa) : null;
  }
}
