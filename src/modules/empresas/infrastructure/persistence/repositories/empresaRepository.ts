import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import type { Empresa } from '../../../domain/entities/empresa.entity';
import type {
  DatosNuevaEmpresa,
  DatosActualizarEmpresaRepo,
  EmpresaRepositoryPort,
} from '../../../application/ports/output/empresaRepository.port';

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
      where: {
        estado: Not('ELIMINADO'),
      },
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

  async crear(datos: DatosNuevaEmpresa): Promise<Empresa> {
    const nueva = this.repository.create({
      nombre: datos.nombre,
      ruc: datos.ruc,
      esquema: datos.esquema?.trim() || null,
      logo: datos.logo?.trim() || null,
      estado: 'ACTIVO',
      fechaCreacion: new Date(),
    });

    const guardada = await this.repository.save(nueva);
    return EmpresaMapper.toDomain(guardada);
  }

  async actualizar(id: number, datos: DatosActualizarEmpresaRepo): Promise<Empresa | null> {
    const empresa = await this.repository.findOne({
      where: { id },
    });

    if (!empresa) {
      return null;
    }

    if (datos.nombre !== undefined) {
      empresa.nombre = datos.nombre;
    }
    if (datos.ruc !== undefined) {
      empresa.ruc = datos.ruc;
    }
    if (datos.estado !== undefined) {
      empresa.estado = datos.estado;
    }
    if (datos.esquema !== undefined) {
      empresa.esquema = datos.esquema?.trim() || null;
    }
    if (datos.logo !== undefined) {
      empresa.logo = datos.logo?.trim() || null;
    }

    const guardada = await this.repository.save(empresa);
    return EmpresaMapper.toDomain(guardada);
  }

  async eliminar(id: number): Promise<void> {
    await this.repository.update(id, { estado: 'ELIMINADO' });
  }
}
