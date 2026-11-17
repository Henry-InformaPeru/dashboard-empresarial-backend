import type { Empresa } from '../../../domain/entities/empresa.entity';

export const EMPRESA_REPOSITORY = Symbol('EMPRESA_REPOSITORY');

export interface DatosNuevaEmpresa {
  nombre: string;
  ruc: string | null;
  esquema?: string | null;
  logo?: string | null;
}

export interface DatosActualizarEmpresaRepo {
  nombre?: string;
  ruc?: string | null;
  estado?: string;
  esquema?: string | null;
  logo?: string | null;
}

export interface EmpresaRepositoryPort {
  listar(): Promise<Empresa[]>;
  buscarPorId(id: number): Promise<Empresa | null>;
  crear(datos: DatosNuevaEmpresa): Promise<Empresa>;
  actualizar(id: number, datos: DatosActualizarEmpresaRepo): Promise<Empresa | null>;
  eliminar(id: number): Promise<void>;
}
