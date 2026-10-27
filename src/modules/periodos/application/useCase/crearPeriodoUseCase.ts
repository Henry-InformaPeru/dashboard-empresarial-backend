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
import {
  extraerEnlacePowerBi,
  validarEnlaceDescarga,
} from '../../domain/services/enlacesPeriodo';

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
    urlPowerbi: string | null,
    urlMega: string | null,
    rolId: number | null,
  ): Promise<PeriodoResponseDto> {
    if (rolId !== 1) {
      throw new ForbiddenException('No tiene permisos para crear periodos');
    }

    // Lo pegado pasa a ser solo el vínculo: del HTML «para pegar en un sitio web» de Power BI se guarda su src, nunca el HTML.
    // El vínculo es opcional: el de Power BI es del reporte, y un periodo solo lleva uno propio si ese mes usa otro reporte.
    const pegado = urlPowerbi?.trim() ?? '';
    const powerbi = pegado ? extraerEnlacePowerBi(pegado) : null;
    if (powerbi && !powerbi.ok) {
      throw new BadRequestException(powerbi.motivo);
    }
    const descarga = validarEnlaceDescarga(urlMega);
    if (!descarga.ok) {
      throw new BadRequestException(descarga.motivo);
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
      powerbi ? powerbi.url : null,
      descarga.url,
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
