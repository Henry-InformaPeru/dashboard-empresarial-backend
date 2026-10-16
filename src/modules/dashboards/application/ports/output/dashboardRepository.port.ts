import type { Dashboard } from '../../../domain/entities/dashboard.entity';

import type { DashboardAsignadoEmpresaDto } from '../../dto/dashboardAsignadoEmpresa.dto';

export const DASHBOARD_REPOSITORY = Symbol('DASHBOARD_REPOSITORY');

export interface DashboardRepositoryPort {
  listarPorEmpresa(empresaId: number): Promise<Dashboard[]>;

  listarTodos(): Promise<Dashboard[]>;

  buscarPorId(id: number): Promise<Dashboard | null>;

  listarAsignadosPorEmpresa(
    empresaId: number,
  ): Promise<DashboardAsignadoEmpresaDto[]>;

  crear(datos: {
    codigo: string;
    nombre: string;
    descripcion: string | null;
  }): Promise<Dashboard>;
}
