import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PERIODO_REPOSITORY,
  type PeriodoRepositoryPort,
} from '../ports/output/periodoRepository.port';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { PeriodoResponseDto } from '../dto/periodoResponse.dto';
import { DashboardOrmEntity } from '../../../dashboards/infrastructure/persistence/entities/dashboardOrm.entity';

@Injectable()
export class CrearPeriodoUseCase {
  constructor(
    @Inject(PERIODO_REPOSITORY)
    private readonly periodoRepository: PeriodoRepositoryPort,

    @InjectRepository(DashboardOrmEntity)
    private readonly dashboardRepository: Repository<DashboardOrmEntity>,
  ) {}

  async ejecutar(
    dashboardId: number,
    periodo: string,
    urlPowerbi: string,
    urlMega: string | null,
    rolId: number | null,
  ): Promise<PeriodoResponseDto> {
    if (rolId !== 1) {
      throw new ForbiddenException('No tiene permisos para crear periodos');
    }

    // Verificar que el dashboard exista y esté activo
    const dashboard = await this.dashboardRepository.findOne({
      where: { id: dashboardId },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard no encontrado');
    }

    if (dashboard.estado !== 'ACTIVO') {
      throw new BadRequestException(
        'No se pueden agregar periodos a un dashboard inactivo',
      );
    }

    // Validar si ya existe el periodo para este dashboard
    const existePeriodo =
      await this.periodoRepository.buscarPorDashboardYPeriodo(
        dashboardId,
        periodo,
      );

    if (existePeriodo) {
      throw new BadRequestException(
        'Ya existe un registro para este periodo en el dashboard',
      );
    }

    const nuevoPeriodo = await this.periodoRepository.crear(
      dashboardId,
      periodo,
      urlPowerbi,
      urlMega ?? null,
    );

    return {
      id: nuevoPeriodo.id,
      dashboardId: nuevoPeriodo.dashboardId,
      periodo: nuevoPeriodo.periodo,
      urlPowerbi: nuevoPeriodo.urlPowerbi,
      urlMega: nuevoPeriodo.urlMega,
    };
  }
}
