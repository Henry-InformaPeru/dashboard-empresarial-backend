import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/infrastructure/http/guards/jwtAuthGuard';
import { RolesGuard } from '../../../../shared/infrastructure/guards/rolesGuard';
import { Roles } from '../../../../shared/infrastructure/decorators/roles.decorator';
import { PortfolioService } from '../../application/services/portfolio.service';
import { EmpresaOrmEntity } from '../../../empresas/infrastructure/persistence/entities/empresaOrm.entity';
import {
  PortfolioFilterDto,
  PortfolioDetalleQueryDto,
  PortfolioGeografiaQueryDto,
  SetMantenimientoDto,
  SetColoresDto,
} from '../../application/dto/portfolioQuery.dto';

@Controller('portfolio')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(1, 2)
export class PortfolioController {
  constructor(
    private readonly portfolioService: PortfolioService,
    @InjectRepository(EmpresaOrmEntity)
    private readonly empresaRepository: Repository<EmpresaOrmEntity>,
  ) {}

  /**
   * Resuelve el esquema de SQL Server correspondiente al usuario o a la entidad solicitada.
   * Si es Cliente (rol 2), se fuerza su esquema asignado (o nombre de empresa).
   * Si es Admin (rol 1), busca la empresa por nombre o esquema en PostgreSQL.
   */
  private async resolveSchema(req: any, requestedEntidad?: string): Promise<string> {
    const user = req?.user;
    if (user?.rolId === 2) {
      return user.empresaEsquema || user.empresaNombre || 'Qapac';
    }

    if (requestedEntidad && requestedEntidad !== 'Todas') {
      const emp = await this.empresaRepository.findOne({
        select: { id: true, nombre: true, esquema: true, estado: true },
        where: [
          { nombre: requestedEntidad },
          { esquema: requestedEntidad },
        ],
      });
      if (!emp) {
        throw new NotFoundException(`No se encontró la empresa solicitada: «${requestedEntidad}».`);
      }
      if (emp.estado !== 'ACTIVO') {
        throw new BadRequestException(
          `La empresa «${emp.nombre}» está en estado ${emp.estado}. Debe estar activa para consultar su cartera.`
        );
      }
      return emp.esquema || emp.nombre;
    }

    const primera = await this.empresaRepository.findOne({
      select: { id: true, nombre: true, esquema: true, estado: true },
      where: { estado: 'ACTIVO' },
      order: { id: 'ASC' },
    });
    return primera?.esquema || primera?.nombre || 'Qapac';
  }

  @Get('dashboard-general')
  @Roles(1)
  async getDashboardGeneralAdmin(
    @Query('periodo') periodo?: string,
  ) {
    const empresas = await this.empresaRepository.find({
      select: { id: true, nombre: true, esquema: true, ruc: true, estado: true },
      where: { estado: 'ACTIVO' },
      order: { id: 'ASC' },
    });
    return this.portfolioService.getDashboardGeneralAdmin(empresas, periodo);
  }

  @Get('mantenimiento')
  async getMantenimiento() {
    return this.portfolioService.getMantenimientoEstado();
  }

  @Put('mantenimiento')
  @Roles(1)
  async setMantenimiento(
    @Body() body: SetMantenimientoDto,
    @Req() req: any,
  ) {
    const usuario = req?.user?.username || req?.user?.sub || 'admin';
    return this.portfolioService.setMantenimientoEstado(
      body.activo,
      body.mensaje,
      usuario,
    );
  }

  @Get('colores')
  async getColores(
    @Req() req: any,
    @Query('empresaId') empresaId?: string,
    @Query('entidad') entidad?: string,
  ) {
    const user = req?.user;
    let targetEmpresaId: number | string | undefined = empresaId;

    if (user?.rolId === 2) {
      targetEmpresaId = user.empresaId || 1;
    } else if (!targetEmpresaId && entidad && entidad !== 'Todas') {
      const emp = await this.empresaRepository.findOne({
        select: { id: true, nombre: true, esquema: true },
        where: [{ nombre: entidad }, { esquema: entidad }],
      });
      if (emp) targetEmpresaId = emp.id;
    }

    if (!targetEmpresaId) {
      const primera = await this.empresaRepository.findOne({
        select: { id: true },
        where: { estado: 'ACTIVO' },
        order: { id: 'ASC' },
      });
      targetEmpresaId = primera?.id || 1;
    }

    const colores = this.portfolioService.getPaletaEmpresa(targetEmpresaId);
    return {
      empresaId: Number(targetEmpresaId),
      colores,
    };
  }

  @Put('colores')
  @Roles(1)
  async setColores(
    @Body() body: SetColoresDto,
    @Req() req: any,
  ) {
    const usuario = req?.user?.username || req?.user?.sub || 'admin';
    const colores = this.portfolioService.setPaletaEmpresa(body.empresaId, body.colores, usuario);
    return {
      message: 'Paleta guardada correctamente',
      empresaId: Number(body.empresaId),
      colores,
    };
  }

  @Get('periodos')
  async getPeriodos(
    @Query('entidad') entidad: string,
    @Req() req: any,
  ): Promise<string[]> {
    const schema = await this.resolveSchema(req, entidad);
    return this.portfolioService.getPeriodos(schema);
  }

  @Get('entidades')
  async getEntidades(@Req() req: any): Promise<string[]> {
    const user = req?.user;
    if (user?.rolId === 2) {
      // Cliente: solo ve su propia entidad asociada
      return user.empresaNombre ? [user.empresaNombre] : [];
    }

    // Administrador: lista de empresas registradas y activas en el panel de administración
    try {
      const empresasPg = await this.empresaRepository.find({
        select: { id: true, nombre: true },
        where: { estado: 'ACTIVO' },
        order: { nombre: 'ASC' },
      });
      const nombresPg = empresasPg.map((e) => e.nombre);
      if (nombresPg.length > 0) {
        return nombresPg;
      }
      return this.portfolioService.getEntidades();
    } catch {
      return this.portfolioService.getEntidades();
    }
  }

  @Get('matriz')
  async getMatriz(
    @Query(new ValidationPipe({ transform: true })) filter: PortfolioFilterDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      filter.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, filter.entidad);
    return this.portfolioService.getMatriz(filter, schema);
  }

  @Get('estrategias')
  async getEstrategias(
    @Query(new ValidationPipe({ transform: true })) filter: PortfolioFilterDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      filter.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, filter.entidad);
    return this.portfolioService.getEstrategiasCuadro(filter, schema);
  }

  @Get('detalle')
  async getDetalle(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioDetalleQueryDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    return this.portfolioService.getDetalleClientes(query, schema);
  }

  @Get('geografia')
  async getGeografia(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioGeografiaQueryDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    return this.portfolioService.getGeografia(query, schema);
  }

  @Get('provincias')
  async getProvincias(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioGeografiaQueryDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    return this.portfolioService.getProvincias(query, schema);
  }

  @Get('distritos')
  async getDistritos(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioGeografiaQueryDto,
    @Req() req: any,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    return this.portfolioService.getDistritos(query, schema);
  }

  @Get('exportar')
  async exportar(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioDetalleQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    await this.portfolioService.exportarPadronExcel(query, res, schema);
  }

  @Get('exportar-archivo')
  async exportarArchivo(
    @Query('periodo') periodo: string,
    @Query('entidad') entidad: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const finalEntidad = req.user?.rolId === 2 ? (req.user.empresaNombre || '---') : entidad;
    const schema = await this.resolveSchema(req, finalEntidad);
    await this.portfolioService.exportarArchivoCompleto(periodo, finalEntidad, res, schema);
  }

  @Get('exportar-csv')
  async exportarCsv(
    @Query(new ValidationPipe({ transform: true })) query: PortfolioDetalleQueryDto,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (req.user?.rolId === 2) {
      query.entidad = req.user.empresaNombre || '---';
    }
    const schema = await this.resolveSchema(req, query.entidad);
    const csvContent = await this.portfolioService.exportarCsv(query, schema);
    const safePeriodo = (query.periodo || 'periodo').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `cartera_detalle_${safePeriodo}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.send(csvContent);
  }
}
