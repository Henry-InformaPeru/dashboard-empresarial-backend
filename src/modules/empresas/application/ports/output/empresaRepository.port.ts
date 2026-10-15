import type { Empresa } from '../../../domain/entities/empresa.entity';

export const EMPRESA_REPOSITORY = Symbol('EMPRESA_REPOSITORY');

export interface EmpresaRepositoryPort {
  listar(): Promise<Empresa[]>;
  buscarPorId(id: number): Promise<Empresa | null>;
}
