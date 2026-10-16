import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import {
  EMPRESA_REPOSITORY,
  type EmpresaRepositoryPort,
} from '../ports/output/empresaRepository.port';
import {
  DASHBOARD_REPOSITORY,
  type DashboardRepositoryPort,
} from '../../../dashboards/application/ports/output/dashboardRepository.port';
import {
  ASIGNACION_REPOSITORY,
  type AsignacionRepositoryPort,
} from '../../../asignaciones/application/ports/output/asignacionRepository.port';
import type { EmpresaResponseDto } from '../dto/empresaResponse.dto';
import { CrearEmpresaDto } from '../dto/crearEmpresa.dto';

@Injectable()
export class CrearEmpresaUseCase {
  constructor(
    @Inject(EMPRESA_REPOSITORY)
    private readonly empresaRepository: EmpresaRepositoryPort,
    @Inject(DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: DashboardRepositoryPort,
    @Inject(ASIGNACION_REPOSITORY)
    private readonly asignacionRepository: AsignacionRepositoryPort,
  ) {}

  async ejecutar(
    datos: CrearEmpresaDto,
    rolAdministrador: number | null,
  ): Promise<EmpresaResponseDto> {
    if (rolAdministrador !== 1) {
      throw new ForbiddenException('No tiene permisos para crear empresas');
    }

    const nombre = datos.nombre?.trim();
    if (!nombre) {
      throw new BadRequestException('El nombre de la empresa es obligatorio');
    }

    // 1. Crear la empresa
    const empresa = await this.empresaRepository.crear({
      nombre,
      ruc: datos.ruc?.trim() || null,
    });

    // 2. Generar código único para su dashboard exclusivo
    const codigoUnico = `dash_${empresa.id}_${Date.now()}`;

    // 3. Crear el Dashboard exclusivo para esta empresa
    const nuevoDashboard = await this.dashboardRepository.crear({
      codigo: codigoUnico,
      nombre: `Dashboard ${empresa.nombre}`,
      descripcion: `Panel exclusivo para ${empresa.nombre}`,
    });

    // 4. Vincular automáticamente la empresa con su nuevo dashboard
    await this.asignacionRepository.crear(empresa.id, nuevoDashboard.id);

    return {
      id: empresa.id,
      nombre: empresa.nombre,
      ruc: empresa.ruc,
      estado: empresa.estado,
      fechaCreacion: empresa.fechaCreacion,
    };
  }
}
