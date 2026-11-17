import { Injectable, Logger } from '@nestjs/common';
import * as sql from 'mssql';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import type { Response } from 'express';
import { SqlServerService } from '../../../../shared/infrastructure/database/sqlServer.service';
import {
  PortfolioFilterDto,
  PortfolioDetalleQueryDto,
  PortfolioGeografiaQueryDto,
} from '../dto/portfolioQuery.dto';
import {
  MatrizResponseDto,
  EstrategiasCuadroResponseDto,
  DetalleClientesPaginadoResponseDto,
  GeografiaResponseDto,
  EstrategiaResumenDto,
} from '../dto/portfolioResponse.dto';

// Paleta oficial del reporte Power BI (igual a frontend constants/estrategiaColores.ts)
const COLORES_ESTRATEGIAS: Record<number, string> = {
  1: '#008000', // Verde: FIDELIZACION
  2: '#008080', // Teal: PREVENCION
  3: '#FFFF00', // Amarillo: MITIGACION
  4: '#800080', // Morado: BLINDAJE
  5: '#EB5559', // Coral: COBRANZA DIRECCIONADA
  6: '#FF0000', // Rojo: SOLUCION DE CONCILIACION
};

const FILAS_DEFAULT = [
  { id: 1, descripcion: '1. AL DIA' },
  { id: 2, descripcion: '2. MORA <=30' },
  { id: 3, descripcion: '3. MORA <=60' },
  { id: 4, descripcion: '4. MORA <=90' },
  { id: 5, descripcion: '5. MORA <=120' },
  { id: 6, descripcion: '6. MORA <=150' },
  { id: 7, descripcion: '7. MORA <=180' },
  { id: 8, descripcion: '8. MORA +180' },
];

const COLUMNAS_DEFAULT = [
  { id: 1, descripcion: '1. AL DIA' },
  { id: 2, descripcion: '2. MORA <=30' },
  { id: 3, descripcion: '3. MORA <=60' },
  { id: 4, descripcion: '4. MORA <=90' },
  { id: 5, descripcion: '5. MORA <=120' },
  { id: 6, descripcion: '6. MORA <=150' },
  { id: 7, descripcion: '7. MORA <=180' },
  { id: 8, descripcion: '8. MORA +180' },
  { id: 9, descripcion: '9. EXCLUSIVOS' },
];

@Injectable()
export class PortfolioService {
  private static readonly EXPORT_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 días (se limpia al cambiar Modo Mantenimiento)
  private static readonly STALE_TMP_TTL_MS = 60 * 60 * 1000; // 1 hora para archivos .tmp huérfanos

  private readonly logger = new Logger(PortfolioService.name);
  private readonly inFlightExports = new Map<string, Promise<void>>();

  constructor(private readonly sqlServer: SqlServerService) {}

  getMantenimientoEstado(): {
    activo: boolean;
    mensaje: string;
    fechaActualizacion?: string;
    actualizadoPor?: string;
  } {
    const dir = path.join(process.cwd(), 'storage');
    const configPath = path.join(dir, 'mantenimiento.json');
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (e: any) {
      this.logger.error(`Error al leer estado de mantenimiento: ${e.message}`);
    }
    return {
      activo: false,
      mensaje:
        'Estamos actualizando la información de cartera crediticia para brindarle datos actualizados. El servicio se restablecerá a la brevedad.',
    };
  }

  setMantenimientoEstado(
    activo: boolean,
    mensaje?: string,
    usuario?: string,
  ): {
    activo: boolean;
    mensaje: string;
    fechaActualizacion: string;
    actualizadoPor: string;
  } {
    const dir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const configPath = path.join(dir, 'mantenimiento.json');
    const estado = {
      activo: Boolean(activo),
      mensaje:
        mensaje?.trim() ||
        'Estamos actualizando la información de cartera crediticia para brindarle datos actualizados. El servicio se restablecerá a la brevedad.',
      fechaActualizacion: new Date().toISOString(),
      actualizadoPor: usuario || 'admin',
    };
    fs.writeFileSync(configPath, JSON.stringify(estado, null, 2), 'utf8');
    this.limpiarCacheExportaciones();
    this.logger.log(
      `Modo mantenimiento actualizado: ${activo ? 'ACTIVADO' : 'DESACTIVADO'} por ${usuario || 'admin'}`,
    );
    return estado;
  }

  getPaletaEmpresa(empresaId: number | string): Record<number, { color: string }> {
    const dir = path.join(process.cwd(), 'storage');
    const configPath = path.join(dir, 'paletas.json');
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const todas = JSON.parse(content);
        if (todas && todas[String(empresaId)]) {
          return todas[String(empresaId)];
        }
      }
    } catch (e: any) {
      this.logger.error(`Error al leer paleta de empresa ${empresaId}: ${e.message}`);
    }
    return {
      1: { color: '#008000' },
      2: { color: '#008080' },
      3: { color: '#FFFF00' },
      4: { color: '#800080' },
      5: { color: '#EB5559' },
      6: { color: '#FF0000' },
    };
  }

  setPaletaEmpresa(
    empresaId: number | string,
    colores: Record<number, { color: string }> | null,
    usuario?: string,
  ): Record<number, { color: string }> {
    const dir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const configPath = path.join(dir, 'paletas.json');
    let todas: Record<string, Record<number, { color: string }>> = {};
    try {
      if (fs.existsSync(configPath)) {
        todas = JSON.parse(fs.readFileSync(configPath, 'utf8')) || {};
      }
    } catch (e: any) {
      this.logger.error(`Error al parsear paletas.json: ${e.message}`);
    }

    if (!colores) {
      delete todas[String(empresaId)];
    } else {
      todas[String(empresaId)] = colores;
    }

    fs.writeFileSync(configPath, JSON.stringify(todas, null, 2), 'utf8');
    this.logger.log(`Paleta para empresa ${empresaId} guardada por ${usuario || 'admin'}`);
    return this.getPaletaEmpresa(empresaId);
  }

  private getExportsDir(): string {
    const dir = path.join(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  private getFileAgeMs(stats: fs.Stats, now = Date.now()): number {
    const mtimeMs =
      typeof stats.mtimeMs === 'number'
        ? stats.mtimeMs
        : stats.mtime instanceof Date
          ? stats.mtime.getTime()
          : now;
    return now - mtimeMs;
  }

  /**
   * Elimina todos los archivos .xlsx en caché dentro de storage/exports/
   * (omitiendo archivos .tmp en curso) al cambiar el estado de mantenimiento.
   */
  private limpiarCacheExportaciones(): number {
    const exportsDir = path.join(process.cwd(), 'storage', 'exports');
    if (!fs.existsSync(exportsDir)) {
      return 0;
    }

    let eliminados = 0;
    try {
      const files = fs.readdirSync(exportsDir);
      if (!Array.isArray(files)) return 0;

      for (const file of files) {
        if (file.endsWith('.tmp') || !file.endsWith('.xlsx')) {
          continue;
        }
        try {
          fs.unlinkSync(path.join(exportsDir, file));
          eliminados++;
        } catch (err: any) {
          this.logger.warn(
            `No se pudo eliminar archivo de caché ${file}: ${err.message}`,
          );
        }
      }
      if (eliminados > 0) {
        this.logger.log(
          `Caché de exportaciones invalidada por cambio de modo mantenimiento (${eliminados} archivo(s) eliminado(s)).`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Error al limpiar caché de exportaciones: ${error.message}`,
      );
    }
    return eliminados;
  }

  /**
   * Limpia oportunistamente archivos .xlsx expirados (> 30 días) y archivos .tmp huérfanos (> 1h)
   * en el directorio de exportaciones para evitar que el almacenamiento crezca indefinidamente.
   */
  private limpiarArchivosExpirados(
    exportsDir: string,
    excludeFilePath?: string,
  ): void {
    try {
      if (!fs.existsSync(exportsDir)) return;
      const files = fs.readdirSync(exportsDir);
      if (!Array.isArray(files)) return;

      const now = Date.now();
      const normalizedExclude = excludeFilePath
        ? path.resolve(excludeFilePath)
        : null;

      for (const file of files) {
        const isXlsx = file.endsWith('.xlsx');
        const isTmp = file.endsWith('.tmp');
        if (!isXlsx && !isTmp) continue;

        const fullPath = path.join(exportsDir, file);
        if (normalizedExclude && path.resolve(fullPath) === normalizedExclude) {
          continue;
        }

        try {
          const stats = fs.statSync(fullPath);
          const ageMs = this.getFileAgeMs(stats, now);
          const ttl = isTmp
            ? PortfolioService.STALE_TMP_TTL_MS
            : PortfolioService.EXPORT_CACHE_TTL_MS;

          if (ageMs > ttl) {
            fs.unlinkSync(fullPath);
            this.logger.log(
              `Archivo de caché expirado/huérfano eliminado: ${file}`,
            );
          }
        } catch {
          // Ignorar si el archivo está bloqueado o fue eliminado concurrentemente
        }
      }
    } catch (error: any) {
      this.logger.warn(
        `No se pudo ejecutar limpieza oportunista de caché: ${error.message}`,
      );
    }
  }

  private enviarArchivoDesdeDisco(
    filePath: string,
    filename: string,
    res: Response,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const stats = fs.statSync(filePath);
      res.setHeader('Content-Length', stats.size);

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
      readStream.on('end', () => resolve());
      readStream.on('error', (err) => {
        this.logger.error(`Error enviando archivo desde disco: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Sanitiza y valida el nombre del esquema en SQL Server.
   * Evita inyección SQL garantizando únicamente caracteres alfanuméricos y guiones bajos.
   */
  sanitizeSchema(schema?: string): string {
    if (!schema) return 'Qapac';
    const clean = schema.trim().replace(/[^a-zA-Z0-9_]/g, '');
    return clean || 'Qapac';
  }

  /**
   * Sanitiza segmentos utilizados en nombres de archivo o rutas de caché en disco
   * para prevenir Path Traversal y caracteres inválidos en el sistema de archivos.
   */
  private sanitizePathSegment(
    value: string | number | undefined | null,
    fallback: string,
  ): string {
    if (value === undefined || value === null) return fallback;
    const clean = String(value)
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return clean || fallback;
  }

  /**
   * Cierra de forma segura el WorkbookWriter y espera a que el descriptor de archivo
   * en disco emita 'finish' y 'close' antes de renombrar o eliminar en Windows (evita EBUSY).
   */
  private async finalizarWorkbookStream(
    workbook: ExcelJS.stream.xlsx.WorkbookWriter,
    outStream: fs.WriteStream,
  ): Promise<void> {
    const waitStreamClosed = new Promise<void>((resolve, reject) => {
      if (outStream.closed) {
        resolve();
        return;
      }
      const isRealFileStream =
        typeof (outStream as any).path === 'string' &&
        typeof outStream.close === 'function';

      const onClose = () => {
        cleanup();
        resolve();
      };
      const onFinish = () => {
        if (!isRealFileStream || outStream.closed) {
          cleanup();
          resolve();
        }
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const cleanup = () => {
        outStream.removeListener('finish', onFinish);
        outStream.removeListener('close', onClose);
        outStream.removeListener('error', onError);
      };
      outStream.once('finish', onFinish);
      outStream.once('close', onClose);
      outStream.once('error', onError);
    });

    await workbook.commit();
    if (!outStream.writableEnded) {
      outStream.end();
    }
    await waitStreamClosed;
  }

  private async cerrarStreamSeguro(outStream: fs.WriteStream): Promise<void> {
    if (!outStream || outStream.closed) return;
    await new Promise<void>((resolve) => {
      const done = () => {
        outStream.removeListener('close', done);
        outStream.removeListener('error', done);
        resolve();
      };
      outStream.once('close', done);
      outStream.once('error', done);
      try {
        outStream.destroy();
      } catch {
        resolve();
      }
    });
  }

  /**
   * Genera la condición SQL flexible para filtrar por entidad financiera.
   * Permite sincronizar nombres comerciales (ej. "Qapac") con la razón social SBS ("FINANCIERA QAPAQ S.A.").
   */
  private buildEntidadCondition(
    entidad: string,
    params: Record<string, { value: any; type: any }>,
  ): string {
    params.entidad = { value: entidad.trim(), type: sql.NVarChar(200) };
    params.entidadPattern = {
      value: `%${entidad.trim().toUpperCase().replace(/Q/g, 'C')}%`,
      type: sql.NVarChar(200),
    };
    return `(ENTIDAD_FINANCIERA = @entidad OR REPLACE(UPPER(ENTIDAD_FINANCIERA), 'Q', 'C') LIKE @entidadPattern OR @entidadPattern LIKE '%' + REPLACE(UPPER(ENTIDAD_FINANCIERA), 'Q', 'C') + '%')`;
  }

  /**
   * Obtiene la lista de periodos disponibles en SQL Server ordenados descendentemente.
   * El primer elemento siempre es el último periodo disponible.
   */
  async getPeriodos(schema?: string): Promise<string[]> {
    const targetSchema = this.sanitizeSchema(schema);
    try {
      const rows = await this.sqlServer.query<{ PERIODO: string }>(
        `SELECT DISTINCT PERIODO 
         FROM [${targetSchema}].[Cliente] 
         WHERE PERIODO IS NOT NULL AND PERIODO <> ''
         ORDER BY PERIODO DESC`,
      );
      return rows.map((r) => r.PERIODO);
    } catch (error: any) {
      this.logger.error(`Error al obtener periodos de [${targetSchema}]: ${error.message}`);
      return ['202609'];
    }
  }

  /**
   * Obtiene las entidades financieras disponibles.
   */
  async getEntidades(schema?: string): Promise<string[]> {
    const targetSchema = this.sanitizeSchema(schema);
    try {
      const rows = await this.sqlServer.query<{ ENTIDAD_FINANCIERA: string }>(
        `SELECT DISTINCT ENTIDAD_FINANCIERA 
         FROM [${targetSchema}].[Cliente] 
         WHERE ENTIDAD_FINANCIERA IS NOT NULL AND ENTIDAD_FINANCIERA <> ''
         ORDER BY ENTIDAD_FINANCIERA ASC`,
      );
      return rows.map((r) => r.ENTIDAD_FINANCIERA);
    } catch (error: any) {
      this.logger.error(`Error al obtener entidades de [${targetSchema}]: ${error.message}`);
      return ['FINANCIERA QAPAQ S.A.'];
    }
  }

  /**
   * Obtiene la Matriz de Transición (8 Filas x 9 Columnas) con conteo de clientes y saldos.
   * Incluye totales por fila, por columna y gran total.
   */
  async getMatriz(filter: PortfolioFilterDto, schema?: string): Promise<MatrizResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = filter.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = filter.entidad;
    const tipoCliente = filter.tipoCliente;
    const estrategia = filter.estrategia;

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (tipoCliente && tipoCliente !== 'Todas') {
      whereClauses.push('TIPO_CLIENTE = @tipoCliente');
      params.tipoCliente = { value: tipoCliente, type: sql.NVarChar(100) };
    }

    if (estrategia && Number(estrategia) > 0) {
      whereClauses.push('ESTRATEGIA = @estrategia');
      params.estrategia = { value: Number(estrategia), type: sql.Int };
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const querySql = `
      SELECT 
        FILA,
        COLUMNA,
        FILA_DESCRIPCION,
        COLUMNA_DESCRIPCION,
        ESTRATEGIA,
        ESTRATEGIA_DESCRIPCION,
        COUNT(*) AS cantidad,
        SUM(ISNULL(SALDO_TOTAL, 0)) AS saldoTotal,
        SUM(ISNULL(SALDO_CLIENTE, 0)) AS saldoCliente
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      GROUP BY 
        FILA,
        COLUMNA,
        FILA_DESCRIPCION,
        COLUMNA_DESCRIPCION,
        ESTRATEGIA,
        ESTRATEGIA_DESCRIPCION
      ORDER BY FILA ASC, COLUMNA ASC
    `;

    try {
      const rows = await this.sqlServer.query<any>(querySql, params);

      const celdas = rows.map((r) => ({
        fila: Number(r.FILA),
        columna: Number(r.COLUMNA),
        filaDescripcion: r.FILA_DESCRIPCION || '',
        columnaDescripcion: r.COLUMNA_DESCRIPCION || '',
        estrategia: Number(r.ESTRATEGIA),
        estrategiaDescripcion: r.ESTRATEGIA_DESCRIPCION || '',
        cantidad: Number(r.cantidad || 0),
        saldoTotal: Number(r.saldoTotal || 0),
        saldoCliente: Number(r.saldoCliente || 0),
      }));

      // Calcular totales por fila, por columna y gran total
      const totalesPorFila: Record<number, { cantidad: number; saldoTotal: number }> = {};
      const totalesPorColumna: Record<number, { cantidad: number; saldoTotal: number }> = {};
      let granTotalCantidad = 0;
      let granTotalSaldo = 0;

      for (const celda of celdas) {
        if (!totalesPorFila[celda.fila]) {
          totalesPorFila[celda.fila] = { cantidad: 0, saldoTotal: 0 };
        }
        totalesPorFila[celda.fila].cantidad += celda.cantidad;
        totalesPorFila[celda.fila].saldoTotal += celda.saldoTotal;

        if (!totalesPorColumna[celda.columna]) {
          totalesPorColumna[celda.columna] = { cantidad: 0, saldoTotal: 0 };
        }
        totalesPorColumna[celda.columna].cantidad += celda.cantidad;
        totalesPorColumna[celda.columna].saldoTotal += celda.saldoTotal;

        granTotalCantidad += celda.cantidad;
        granTotalSaldo += celda.saldoTotal;
      }

      return {
        filasHeaders: FILAS_DEFAULT,
        columnasHeaders: COLUMNAS_DEFAULT,
        celdas,
        totalesPorFila,
        totalesPorColumna,
        granTotal: {
          cantidad: granTotalCantidad,
          saldoTotal: granTotalSaldo,
        },
      };
    } catch (error: any) {
      if (error?.number === 208 || error?.message?.includes('Invalid object name')) {
        this.logger.warn(`No existe la tabla de cartera [${targetSchema}].[Cliente] en SQL Server.`);
      } else {
        this.logger.error(`Error al generar matriz: ${error.message}`);
      }
      return {
        filasHeaders: FILAS_DEFAULT,
        columnasHeaders: COLUMNAS_DEFAULT,
        celdas: [],
        totalesPorFila: {},
        totalesPorColumna: {},
        granTotal: { cantidad: 0, saldoTotal: 0 },
      };
    }
  }

  /**
   * Obtiene el cuadro de distribución de las 6 estrategias con porcentajes de participación.
   */
  async getEstrategiasCuadro(filter: PortfolioFilterDto, schema?: string): Promise<EstrategiasCuadroResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = filter.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = filter.entidad;
    const tipoCliente = filter.tipoCliente;

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (tipoCliente && tipoCliente !== 'Todas') {
      whereClauses.push('TIPO_CLIENTE = @tipoCliente');
      params.tipoCliente = { value: tipoCliente, type: sql.NVarChar(100) };
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const querySql = `
      WITH EstrategiasCatalogo AS (
        SELECT 1 AS id, '1. FIDELIZACION' AS descripcion
        UNION ALL SELECT 2, '2. PREVENCION'
        UNION ALL SELECT 3, '3. MITIGACION'
        UNION ALL SELECT 4, '4. BLINDAJE'
        UNION ALL SELECT 5, '5. COBRANZA DIRECCIONADA'
        UNION ALL SELECT 6, '6. SOLUCION DE CONCILIACION'
      ),
      ResumenCartera AS (
        SELECT 
          ESTRATEGIA,
          COUNT(*) AS cantidad,
          SUM(ISNULL(SALDO_TOTAL, 0)) AS saldo
        FROM [${targetSchema}].[Cliente]
        ${whereSql}
        GROUP BY ESTRATEGIA
      )
      SELECT 
        e.id,
        e.descripcion,
        ISNULL(r.cantidad, 0) AS cantidad,
        ISNULL(r.saldo, 0) AS saldo
      FROM EstrategiasCatalogo e
      LEFT JOIN ResumenCartera r ON e.id = r.ESTRATEGIA
      ORDER BY e.id ASC
    `;

    try {
      const rows = await this.sqlServer.query<any>(querySql, params);

      // Calcular total general de la cartera para porcentajes
      const totalCarteraQuery = `
        SELECT 
          COUNT(*) as totalCantidad,
          SUM(ISNULL(SALDO_TOTAL, 0)) as totalSaldo
        FROM [${targetSchema}].[Cliente]
        ${whereSql}
      `;
      const totalRow = await this.sqlServer.query<any>(totalCarteraQuery, params);
      const totalGeneralCantidad = Number(totalRow[0]?.totalCantidad || 0);
      const totalGeneralSaldo = Number(totalRow[0]?.totalSaldo || 0);

      let sumaCantidad = 0;
      let sumaSaldo = 0;

      const items: EstrategiaResumenDto[] = rows.map((r) => {
        const cant = Number(r.cantidad || 0);
        const sal = Number(r.saldo || 0);
        sumaCantidad += cant;
        sumaSaldo += sal;

        const partCli = totalGeneralCantidad > 0 ? (cant / totalGeneralCantidad) * 100 : 0;
        const partSal = totalGeneralSaldo > 0 ? (sal / totalGeneralSaldo) * 100 : 0;

        return {
          id: Number(r.id),
          descripcion: r.descripcion,
          cantidad: cant,
          saldo: sal,
          participacionClientes: Number(partCli.toFixed(2)),
          participacionSaldo: Number(partSal.toFixed(2)),
          color: COLORES_ESTRATEGIAS[Number(r.id)] || '#999999',
        };
      });

      const totalPartClientes =
        totalGeneralCantidad > 0 ? (sumaCantidad / totalGeneralCantidad) * 100 : 0;
      const totalPartSaldo =
        totalGeneralSaldo > 0 ? (sumaSaldo / totalGeneralSaldo) * 100 : 0;

      return {
        items,
        totales: {
          cantidad: sumaCantidad,
          saldo: sumaSaldo,
          participacionClientes: Number(totalPartClientes.toFixed(2)),
          participacionSaldo: Number(totalPartSaldo.toFixed(2)),
        },
      };
    } catch (error: any) {
      if (error?.number === 208 || error?.message?.includes('Invalid object name')) {
        this.logger.warn(`No existe la tabla de cartera [${targetSchema}].[Cliente] en SQL Server.`);
      } else {
        this.logger.error(`Error al obtener cuadro de estrategias: ${error.message}`);
      }
      return {
        items: [],
        totales: { cantidad: 0, saldo: 0, participacionClientes: 0, participacionSaldo: 0 },
      };
    }
  }

  /**
   * Limpia anomalías comunes de codificación SBS / FoxPro en nombres y razones sociales.
   * En archivos SBS, el carácter '#' reemplaza la letra 'Ñ' (ej. #A#A -> ÑAÑA, #A#EZ -> ÑAÑEZ, PE#A -> PEÑA).
   */
  private limpiarRazonSocial(nombre: string | null | undefined): string {
    if (!nombre) return '—';
    let s = String(nombre).trim();
    s = s.replace(/M#NICA/gi, 'MÓNICA');
    s = s.replace(/#/g, 'Ñ');
    s = s.replace(/\s+/g, ' ');
    return s;
  }

  /**
   * Sanitiza textos geográficos evitando literales como 'NULL' o 'NO DEFINIDO'.
   */
  private limpiarTexto(texto: string | null | undefined): string {
    if (!texto) return '';
    const s = String(texto).trim();
    if (s === '' || s.toUpperCase() === 'NULL' || s.toUpperCase() === 'NO DEFINIDO') {
      return '';
    }
    return s;
  }

  /**
   * Obtiene el detalle paginado a nivel cliente (padrón) con filtros y búsqueda.
   */
  async getDetalleClientes(
    query: PortfolioDetalleQueryDto,
    schema?: string,
  ): Promise<DetalleClientesPaginadoResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = query.entidad;
    const estrategia = query.estrategia;
    const departamento = query.departamento;
    const search = query.search?.trim();
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
      offset: { value: offset, type: sql.Int },
      limit: { value: limit, type: sql.Int },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (estrategia && Number(estrategia) > 0) {
      whereClauses.push('ESTRATEGIA = @estrategia');
      params.estrategia = { value: Number(estrategia), type: sql.Int };
    }

    if (departamento && departamento !== 'Todas') {
      whereClauses.push('DEPARTAMENTO = @departamento');
      params.departamento = { value: departamento, type: sql.NVarChar(100) };
    }

    if (search) {
      whereClauses.push('(DOCUMENTO LIKE @search OR RAZONSOCIAL LIKE @search)');
      params.search = { value: `%${search}%`, type: sql.NVarChar(150) };
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countSql = `SELECT COUNT(*) as total FROM [${targetSchema}].[Cliente] ${whereSql}`;

    const dataSql = `
      SELECT 
        PERIODO,
        DOCUMENTO,
        RAZONSOCIAL,
        ISNULL(SALDO_VIGENTE, 0) AS SALDO_VIGENTE,
        ISNULL(SALDO_CASTIGADO, 0) AS SALDO_CASTIGADO,
        ISNULL(DEPARTAMENTO, 'NO DEFINIDO') AS DEPARTAMENTO,
        ISNULL(PROVINCIA, 'NO DEFINIDO') AS PROVINCIA,
        ISNULL(DISTRITO, 'NO DEFINIDO') AS DISTRITO,
        ISNULL(NUMERO_ENTIDADES, '0') AS NUMERO_ENTIDADES,
        ISNULL(CALIFICACION_CLIENTE, 'S/C') AS CALIFICACION_CLIENTE,
        ISNULL(NOR, 0) AS NOR,
        ISNULL(CPP, 0) AS CPP,
        ISNULL(DEF, 0) AS DEF,
        ISNULL(DUD, 0) AS DUD,
        ISNULL(PER, 0) AS PER,
        ISNULL(ESTRATEGIA, 0) AS ESTRATEGIA,
        ISNULL(ESTRATEGIA_DESCRIPCION, '') AS ESTRATEGIA_DESCRIPCION
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      ORDER BY RAZONSOCIAL ASC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `;

    try {
      const [countResult, dataResult] = await Promise.all([
        this.sqlServer.query<any>(countSql, params),
        this.sqlServer.query<any>(dataSql, params),
      ]);

      const total = Number(countResult[0]?.total || 0);
      const totalPages = Math.ceil(total / limit);

      const data = dataResult.map((r) => ({
        periodo: r.PERIODO,
        documento: r.DOCUMENTO,
        razonSocial: this.limpiarRazonSocial(r.RAZONSOCIAL),
        saldoVigente: Number(r.SALDO_VIGENTE || 0),
        saldoCastigado: Number(r.SALDO_CASTIGADO || 0),
        departamento: this.limpiarTexto(r.DEPARTAMENTO),
        provincia: this.limpiarTexto(r.PROVINCIA),
        distrito: this.limpiarTexto(r.DISTRITO),
        numeroEntidades: r.NUMERO_ENTIDADES,
        calificacionCliente: r.CALIFICACION_CLIENTE,
        nor: Number(r.NOR),
        cpp: Number(r.CPP),
        def: Number(r.DEF),
        dud: Number(r.DUD),
        per: Number(r.PER),
        estrategia: Number(r.ESTRATEGIA),
        estrategiaDescripcion: r.ESTRATEGIA_DESCRIPCION,
      }));

      return {
        data,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      if (error?.number === 208 || error?.message?.includes('Invalid object name')) {
        this.logger.warn(`No existe la tabla de cartera [${targetSchema}].[Cliente] en SQL Server.`);
      } else {
        this.logger.error(`Error al obtener detalle de clientes: ${error.message}`);
      }
      return { data: [], total: 0, page: 1, limit, totalPages: 0 };
    }
  }

  /**
   * Obtiene la distribución territorial por Departamento con desglose de deudas y estrategias exactas de Power BI.
   */
  async getGeografia(
    query: PortfolioGeografiaQueryDto,
    schema?: string,
  ): Promise<GeografiaResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = query.entidad;
    const departamento = query.departamento;

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (departamento && departamento !== 'Todas') {
      if (departamento === 'NULL') {
        whereClauses.push("(DEPARTAMENTO IS NULL OR DEPARTAMENTO = 'NULL' OR DEPARTAMENTO = '')");
      } else {
        whereClauses.push('DEPARTAMENTO = @departamento');
        params.departamento = { value: departamento, type: sql.NVarChar(100) };
      }
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    // Consulta 1: Agrupación departamental exacta como Power BI
    const querySql = `
      SELECT 
        ISNULL(NULLIF(RTRIM(LTRIM(DEPARTAMENTO)), ''), 'NULL') AS departamento,
        COUNT(*) AS clientes,
        SUM(CASE WHEN TIPO_CLIENTE LIKE '%EXCLUSIVO%' AND TIPO_CLIENTE NOT LIKE '%NO EXCLUSIVO%' THEN 1 ELSE 0 END) AS exclusivo,
        SUM(ISNULL(SALDO_VIGENTE, 0)) AS deudasVigentes,
        SUM(ISNULL(SALDO_CASTIGADO, 0)) AS deudasCastigadas,
        SUM(ISNULL(SALDO_TOTAL, 0)) AS saldo
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      GROUP BY ISNULL(NULLIF(RTRIM(LTRIM(DEPARTAMENTO)), ''), 'NULL')
      ORDER BY clientes DESC
    `;

    // Consulta 2: Desglose de Estrategias por Departamento
    const queryEstratSql = `
      SELECT 
        ISNULL(NULLIF(RTRIM(LTRIM(DEPARTAMENTO)), ''), 'NULL') AS departamento,
        ESTRATEGIA AS estrategia,
        ESTRATEGIA_DESCRIPCION AS nombre,
        COUNT(*) AS cantidad
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      GROUP BY 
        ISNULL(NULLIF(RTRIM(LTRIM(DEPARTAMENTO)), ''), 'NULL'),
        ESTRATEGIA,
        ESTRATEGIA_DESCRIPCION
      ORDER BY departamento ASC, ESTRATEGIA ASC
    `;

    try {
      const [rows, estratRows] = await Promise.all([
        this.sqlServer.query<any>(querySql, params),
        this.sqlServer.query<any>(queryEstratSql, params),
      ]);

      // Mapear estrategias por departamento
      const estratMap = new Map<string, Array<{ estrategia: number; nombre: string; cantidad: number }>>();
      for (const er of estratRows) {
        const depKey = String(er.departamento || '').toUpperCase().trim();
        if (!estratMap.has(depKey)) {
          estratMap.set(depKey, []);
        }
        estratMap.get(depKey)!.push({
          estrategia: Number(er.estrategia),
          nombre: er.nombre || `Estrategia ${er.estrategia}`,
          cantidad: Number(er.cantidad || 0),
        });
      }

      let totalClientes = 0;
      let totalExclusivo = 0;
      let totalSaldo = 0;
      let totalVigentes = 0;
      let totalCastigadas = 0;

      for (const r of rows) {
        totalClientes += Number(r.clientes || 0);
        totalExclusivo += Number(r.exclusivo || 0);
        totalSaldo += Number(r.saldo || 0);
        totalVigentes += Number(r.deudasVigentes || 0);
        totalCastigadas += Number(r.deudasCastigadas || 0);
      }

      // Denominador dinámico para el % de participación de estrategias
      const baseUniverso = totalClientes > 0 ? totalClientes : 1;

      const NOMBRES_ESTRATEGIAS: Record<number, string> = {
        1: '1. FIDELIZACION',
        2: '2. PREVENCION',
        3: '3. MITIGACION',
        4: '4. BLINDAJE',
        5: '5. COBRANZA DIRECCIONADA',
        6: '6. SOLUCION DE CONCILIACION',
      };

      const items = rows.map((r) => {
        const cli = Number(r.clientes || 0);
        const sal = Number(r.saldo || 0);
        const depKey = String(r.departamento || '').toUpperCase().trim();
        const rawEstrat = estratMap.get(depKey) || [];

        // Asegurar que siempre se muestren las 6 estrategias en orden
        const estrategias = [1, 2, 3, 4, 5, 6].map((id) => {
          const found = rawEstrat.find((e) => e.estrategia === id);
          const cantidad = found ? found.cantidad : 0;
          const participacion = baseUniverso > 0 ? Number(((cantidad / baseUniverso) * 100).toFixed(2)) : 0;
          return {
            estrategia: id,
            nombre: found?.nombre || NOMBRES_ESTRATEGIAS[id] || `Estrategia ${id}`,
            cantidad,
            participacion,
          };
        });

        return {
          departamento: r.departamento,
          clientes: cli,
          exclusivo: Number(r.exclusivo || 0),
          saldo: sal,
          deudasVigentes: Number(r.deudasVigentes || 0),
          deudasCastigadas: Number(r.deudasCastigadas || 0),
          participacionClientes: totalClientes > 0 ? Number(((cli / totalClientes) * 100).toFixed(2)) : 0,
          participacionMontos: totalSaldo > 0 ? Number(((sal / totalSaldo) * 100).toFixed(2)) : 0,
          estrategias,
        };
      });

      return {
        items,
        totales: {
          clientes: totalClientes,
          exclusivo: totalExclusivo,
          saldo: totalSaldo,
          deudasVigentes: totalVigentes,
          deudasCastigadas: totalCastigadas,
          participacionClientes: 100.0,
          participacionMontos: 100.0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error al obtener geografía: ${error.message}`);
      return {
        items: [],
        totales: {
          clientes: 0,
          exclusivo: 0,
          saldo: 0,
          deudasVigentes: 0,
          deudasCastigadas: 0,
          participacionClientes: 0,
          participacionMontos: 0,
        },
      };
    }
  }

  /**
   * Obtiene la distribución de cartera a nivel Provincial para un Departamento dado.
   */
  async getProvincias(
    query: PortfolioGeografiaQueryDto,
    schema?: string,
  ): Promise<GeografiaResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = query.entidad;
    const departamento = query.departamento || 'LIMA';

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (departamento && departamento !== 'Todas') {
      whereClauses.push('DEPARTAMENTO = @departamento');
      params.departamento = { value: departamento, type: sql.NVarChar(100) };
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const querySql = `
      SELECT 
        ISNULL(NULLIF(RTRIM(LTRIM(PROVINCIA)), ''), 'NO DEFINIDO') AS provincia,
        COUNT(*) AS clientes,
        SUM(CASE WHEN TIPO_CLIENTE LIKE '%EXCLUSIVO%' AND TIPO_CLIENTE NOT LIKE '%NO EXCLUSIVO%' THEN 1 ELSE 0 END) AS exclusivo,
        SUM(ISNULL(SALDO_VIGENTE, 0)) AS deudasVigentes,
        SUM(ISNULL(SALDO_CASTIGADO, 0)) AS deudasCastigadas,
        SUM(ISNULL(SALDO_TOTAL, 0)) AS saldo
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      GROUP BY ISNULL(NULLIF(RTRIM(LTRIM(PROVINCIA)), ''), 'NO DEFINIDO')
      ORDER BY clientes DESC
    `;

    try {
      const rows = await this.sqlServer.query<any>(querySql, params);

      let totalClientes = 0;
      let totalExclusivo = 0;
      let totalSaldo = 0;
      let totalVigentes = 0;
      let totalCastigadas = 0;

      for (const r of rows) {
        totalClientes += Number(r.clientes || 0);
        totalExclusivo += Number(r.exclusivo || 0);
        totalSaldo += Number(r.saldo || 0);
        totalVigentes += Number(r.deudasVigentes || 0);
        totalCastigadas += Number(r.deudasCastigadas || 0);
      }

      const items = rows.map((r) => {
        const cli = Number(r.clientes || 0);
        const sal = Number(r.saldo || 0);
        return {
          departamento: departamento,
          provincia: r.provincia,
          clientes: cli,
          exclusivo: Number(r.exclusivo || 0),
          saldo: sal,
          deudasVigentes: Number(r.deudasVigentes || 0),
          deudasCastigadas: Number(r.deudasCastigadas || 0),
          participacionClientes: totalClientes > 0 ? Number(((cli / totalClientes) * 100).toFixed(2)) : 0,
          participacionMontos: totalSaldo > 0 ? Number(((sal / totalSaldo) * 100).toFixed(2)) : 0,
        };
      });

      return {
        items,
        totales: {
          clientes: totalClientes,
          exclusivo: totalExclusivo,
          saldo: totalSaldo,
          deudasVigentes: totalVigentes,
          deudasCastigadas: totalCastigadas,
          participacionClientes: 100.0,
          participacionMontos: 100.0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error al obtener provincias: ${error.message}`);
      return {
        items: [],
        totales: {
          clientes: 0,
          exclusivo: 0,
          saldo: 0,
          deudasVigentes: 0,
          deudasCastigadas: 0,
          participacionClientes: 0,
          participacionMontos: 0,
        },
      };
    }
  }

  /**
   * Obtiene la distribución de cartera a nivel Distrital para un Departamento y Provincia dados.
   */
  async getDistritos(
    query: PortfolioGeografiaQueryDto,
    schema?: string,
  ): Promise<GeografiaResponseDto> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = query.entidad;
    const departamento = query.departamento || 'LIMA';
    const provincia = query.provincia || 'LIMA';

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (departamento && departamento !== 'Todas') {
      whereClauses.push('DEPARTAMENTO = @departamento');
      params.departamento = { value: departamento, type: sql.NVarChar(100) };
    }

    if (provincia && provincia !== 'Todas') {
      whereClauses.push('PROVINCIA = @provincia');
      params.provincia = { value: provincia, type: sql.NVarChar(100) };
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const querySql = `
      SELECT 
        ISNULL(NULLIF(RTRIM(LTRIM(DISTRITO)), ''), 'NO DEFINIDO') AS distrito,
        COUNT(*) AS clientes,
        SUM(CASE WHEN TIPO_CLIENTE LIKE '%EXCLUSIVO%' AND TIPO_CLIENTE NOT LIKE '%NO EXCLUSIVO%' THEN 1 ELSE 0 END) AS exclusivo,
        SUM(ISNULL(SALDO_VIGENTE, 0)) AS deudasVigentes,
        SUM(ISNULL(SALDO_CASTIGADO, 0)) AS deudasCastigadas,
        SUM(ISNULL(SALDO_TOTAL, 0)) AS saldo
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      GROUP BY ISNULL(NULLIF(RTRIM(LTRIM(DISTRITO)), ''), 'NO DEFINIDO')
      ORDER BY clientes DESC
    `;

    try {
      const rows = await this.sqlServer.query<any>(querySql, params);

      let totalClientes = 0;
      let totalExclusivo = 0;
      let totalSaldo = 0;
      let totalVigentes = 0;
      let totalCastigadas = 0;

      for (const r of rows) {
        totalClientes += Number(r.clientes || 0);
        totalExclusivo += Number(r.exclusivo || 0);
        totalSaldo += Number(r.saldo || 0);
        totalVigentes += Number(r.deudasVigentes || 0);
        totalCastigadas += Number(r.deudasCastigadas || 0);
      }

      const items = rows.map((r) => {
        const cli = Number(r.clientes || 0);
        const sal = Number(r.saldo || 0);
        return {
          departamento: departamento,
          provincia: provincia,
          distrito: r.distrito,
          clientes: cli,
          exclusivo: Number(r.exclusivo || 0),
          saldo: sal,
          deudasVigentes: Number(r.deudasVigentes || 0),
          deudasCastigadas: Number(r.deudasCastigadas || 0),
          participacionClientes: totalClientes > 0 ? Number(((cli / totalClientes) * 100).toFixed(2)) : 0,
          participacionMontos: totalSaldo > 0 ? Number(((sal / totalSaldo) * 100).toFixed(2)) : 0,
        };
      });

      return {
        items,
        totales: {
          clientes: totalClientes,
          exclusivo: totalExclusivo,
          saldo: totalSaldo,
          deudasVigentes: totalVigentes,
          deudasCastigadas: totalCastigadas,
          participacionClientes: 100.0,
          participacionMontos: 100.0,
        },
      };
    } catch (error: any) {
      this.logger.error(`Error al obtener distritos: ${error.message}`);
      return {
        items: [],
        totales: {
          clientes: 0,
          exclusivo: 0,
          saldo: 0,
          deudasVigentes: 0,
          deudasCastigadas: 0,
          participacionClientes: 0,
          participacionMontos: 0,
        },
      };
    }
  }

  /**
   * Exporta el padrón filtrado de clientes en formato nativo Excel (.xlsx) mediante caché en disco SSD.
   */
  async exportarPadronExcel(
    query: PortfolioDetalleQueryDto,
    res: Response,
    schema?: string,
  ): Promise<void> {
    const targetSchema = this.sanitizeSchema(schema);
    const rawPeriodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const periodo = this.sanitizePathSegment(rawPeriodo, '202609');
    const entidad = query.entidad;
    const estrategia = query.estrategia;
    const departamento = query.departamento;
    const search = query.search?.trim();

    const entidadNombre =
      entidad && entidad !== 'Todas'
        ? this.sanitizePathSegment(entidad, targetSchema).toUpperCase()
        : this.sanitizePathSegment(targetSchema, 'TODAS').toUpperCase();

    const depNombre =
      departamento && departamento !== 'Todas'
        ? this.sanitizePathSegment(departamento, 'TODOS').toUpperCase()
        : 'TODOS';

    const estrategiaKey =
      estrategia && Number(estrategia) > 0
        ? this.sanitizePathSegment(Math.trunc(Number(estrategia)), '0')
        : '0';

    const clientFilename = path.basename(`padron_clientes_${periodo}.xlsx`);
    const exportsDir = this.getExportsDir();

    // Si no hay búsqueda por texto libre, usamos la caché SSD ultrarrápida
    const isCacheable = !search;
    const safeSchemaKey = this.sanitizePathSegment(targetSchema, 'QAPAC').toUpperCase();
    const cacheFileName = path.basename(
      `cache_padron_${safeSchemaKey}_${periodo}_${entidadNombre}_est${estrategiaKey}_dep${depNombre}.xlsx`,
    );
    const cacheFilePath = path.join(exportsDir, cacheFileName);

    this.limpiarArchivosExpirados(
      exportsDir,
      isCacheable ? cacheFilePath : undefined,
    );

    if (isCacheable && fs.existsSync(cacheFilePath)) {
      const stats = fs.statSync(cacheFilePath);
      const isExpired =
        this.getFileAgeMs(stats) > PortfolioService.EXPORT_CACHE_TTL_MS;
      if (isExpired) {
        this.logger.log(
          `Caché SSD expirada (>30d) para Padrón Clientes: ${cacheFileName}. Regenerando desde SQL Server...`,
        );
        try {
          fs.unlinkSync(cacheFilePath);
        } catch {}
      } else if (stats.size > 500) {
        this.logger.log(`Sirviendo Padrón Clientes desde caché SSD instantánea: ${clientFilename} (${(stats.size / 1024).toFixed(1)} KB)`);
        return this.enviarArchivoDesdeDisco(cacheFilePath, clientFilename, res);
      }
    }

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: rawPeriodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (estrategia && Number(estrategia) > 0) {
      whereClauses.push('ESTRATEGIA = @estrategia');
      params.estrategia = { value: Number(estrategia), type: sql.Int };
    }

    if (departamento && departamento !== 'Todas') {
      whereClauses.push('DEPARTAMENTO = @departamento');
      params.departamento = { value: departamento, type: sql.NVarChar(100) };
    }

    if (search) {
      whereClauses.push('(DOCUMENTO LIKE @search OR RAZONSOCIAL LIKE @search)');
      params.search = { value: `%${search}%`, type: sql.NVarChar(150) };
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;
    const pool = await this.sqlServer.getPool();

    // Si es cacheable, escribimos primero al disco en caché y luego servimos
    const targetFile = isCacheable ? cacheFilePath : path.join(exportsDir, `tmp_${Date.now()}_padron.xlsx`);
    const tempFile = `${targetFile}.tmp`;
    const outStream = fs.createWriteStream(tempFile);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outStream,
      useStyles: false,
      useSharedStrings: false,
    });

    const PADRON_COLUMNS = [
      'PERIODO',
      'DOCUMENTO',
      'RAZON_SOCIAL',
      'SALDO_VIGENTE',
      'SALDO_CASTIGADO',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
      'NUMERO_ENTIDADES',
      'CALIFICACION_CLIENTE',
      'NOR',
      'CPP',
      'DEF',
      'DUD',
      'PER',
      'ESTRATEGIA',
    ];

    try {
      const ws = workbook.addWorksheet('PADRON_CLIENTES');
      ws.addRow(PADRON_COLUMNS).commit();

      await new Promise<void>((resolve, reject) => {
        const req = pool.request();
        req.stream = true;

        for (const [key, param] of Object.entries(params)) {
          req.input(key, param.type, param.value);
        }

        const dataSql = `
          SELECT
            PERIODO,
            DOCUMENTO,
            RAZONSOCIAL,
            ISNULL(SALDO_VIGENTE, 0) AS SALDO_VIGENTE,
            ISNULL(SALDO_CASTIGADO, 0) AS SALDO_CASTIGADO,
            ISNULL(DEPARTAMENTO, 'NO DEFINIDO') AS DEPARTAMENTO,
            ISNULL(PROVINCIA, 'NO DEFINIDO') AS PROVINCIA,
            ISNULL(DISTRITO, 'NO DEFINIDO') AS DISTRITO,
            ISNULL(NUMERO_ENTIDADES, '0') AS NUMERO_ENTIDADES,
            ISNULL(CALIFICACION_CLIENTE, 'S/C') AS CALIFICACION_CLIENTE,
            ISNULL(NOR, 0) AS NOR,
            ISNULL(CPP, 0) AS CPP,
            ISNULL(DEF, 0) AS DEF,
            ISNULL(DUD, 0) AS DUD,
            ISNULL(PER, 0) AS PER,
            ISNULL(ESTRATEGIA_DESCRIPCION, '') AS ESTRATEGIA_DESCRIPCION
          FROM [${targetSchema}].[Cliente]
          ${whereSql}
          ORDER BY RAZONSOCIAL ASC
        `;

        req.query(dataSql);

        req.on('row', (r) => {
          ws.addRow([
            r.PERIODO,
            r.DOCUMENTO,
            this.limpiarRazonSocial(r.RAZONSOCIAL),
            r.SALDO_VIGENTE != null ? Number(r.SALDO_VIGENTE) : 0,
            r.SALDO_CASTIGADO != null ? Number(r.SALDO_CASTIGADO) : 0,
            this.limpiarTexto(r.DEPARTAMENTO),
            this.limpiarTexto(r.PROVINCIA),
            this.limpiarTexto(r.DISTRITO),
            r.NUMERO_ENTIDADES,
            r.CALIFICACION_CLIENTE,
            r.NOR != null ? Number(r.NOR) : 0,
            r.CPP != null ? Number(r.CPP) : 0,
            r.DEF != null ? Number(r.DEF) : 0,
            r.DUD != null ? Number(r.DUD) : 0,
            r.PER != null ? Number(r.PER) : 0,
            r.ESTRATEGIA_DESCRIPCION,
          ]).commit();
        });

        req.on('error', (err) => {
          this.logger.error(`Error en streaming Padrón Excel: ${err.message}`);
          reject(err);
        });

        req.on('done', () => {
          ws.commit();
          resolve();
        });
      });

      await this.finalizarWorkbookStream(workbook, outStream);

      // Renombrado atómico
      if (fs.existsSync(tempFile)) {
        if (fs.existsSync(targetFile)) {
          fs.unlinkSync(targetFile);
        }
        fs.renameSync(tempFile, targetFile);
      }

      await this.enviarArchivoDesdeDisco(targetFile, clientFilename, res);

      // Si fue temporal (no cacheable), limpiarlo
      if (!isCacheable && fs.existsSync(targetFile)) {
        fs.unlinkSync(targetFile);
      }
    } catch (error: any) {
      this.logger.error(`Error al exportar padrón excel: ${error.message}`);
      await this.cerrarStreamSeguro(outStream);
      if (fs.existsSync(tempFile)) {
        try {
          fs.unlinkSync(tempFile);
        } catch {}
      }
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error al generar el archivo Excel de padrón.',
          error: error.message,
        });
      }
    }
  }

  /**
   * Exporta el archivo completo oficial de Portfolio con dos hojas:
   * 1. DETALLE CLIENTES
   * 2. DETALLE_{ENTIDAD}_MERCADO
   * Utiliza arquitectura empresarial de Caché en disco SSD con entrega Zero-Copy instantánea.
   */
  async exportarArchivoCompleto(
    periodoParam: string | undefined,
    entidadParam: string | undefined,
    res: Response,
    schema?: string,
  ): Promise<void> {
    const targetSchema = this.sanitizeSchema(schema);
    const rawPeriodo = periodoParam || (await this.getPeriodos(targetSchema))[0] || '202609';
    const periodo = this.sanitizePathSegment(rawPeriodo, '202609');
    const entidad = entidadParam;

    const rawEntidadBase =
      entidad && entidad !== 'Todas' ? entidad : targetSchema;
    const entidadNombre =
      rawEntidadBase.toUpperCase().includes('QAPAQ') ||
      rawEntidadBase.toUpperCase().includes('QAPAC')
        ? 'QAPAQ'
        : this.sanitizePathSegment(rawEntidadBase, targetSchema).toUpperCase();

    const filename = path.basename(`${entidadNombre}_${periodo}_FILE.xlsx`);
    const exportsDir = this.getExportsDir();
    const filePath = path.join(exportsDir, filename);

    this.limpiarArchivosExpirados(exportsDir, filePath);

    // 1. Si el archivo ya existe en caché SSD y no ha expirado (TTL 30 días), entregarlo de forma instantánea (< 0.5s)
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const isExpired =
        this.getFileAgeMs(stats) > PortfolioService.EXPORT_CACHE_TTL_MS;
      if (isExpired) {
        this.logger.log(
          `Caché SSD expirada (>30d) para archivo completo: ${filename}. Regenerando desde SQL Server...`,
        );
        try {
          fs.unlinkSync(filePath);
        } catch {}
      } else if (stats.size > 1000) {
        this.logger.log(
          `Sirviendo archivo desde caché SSD instantánea: ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`,
        );
        return this.enviarArchivoDesdeDisco(filePath, filename, res);
      }
    }

    // 2. Control de concurrencia: si otro usuario ya está generando este mismo archivo, esperamos su resultado
    const cacheKey = `${targetSchema}_${entidadNombre}_${periodo}`;
    if (this.inFlightExports.has(cacheKey)) {
      this.logger.log(`Esperando generación en curso para: ${filename}...`);
      await this.inFlightExports.get(cacheKey);
      if (fs.existsSync(filePath)) {
        return this.enviarArchivoDesdeDisco(filePath, filename, res);
      }
    }

    // 3. Generar el archivo una única vez en disco y guardarlo en caché
    const genPromise = this.generarArchivoExcelCompletoEnDisco(
      rawPeriodo,
      entidad,
      filePath,
      targetSchema,
      entidadNombre,
    );
    this.inFlightExports.set(cacheKey, genPromise);

    try {
      await genPromise;
      return this.enviarArchivoDesdeDisco(filePath, filename, res);
    } catch (error: any) {
      this.logger.error(`Error al generar archivo completo: ${error.message}`);
      if (!res.headersSent) {
        res.status(500).json({
          message: 'Error al generar el archivo Excel oficial.',
          error: error.message,
        });
      }
    } finally {
      this.inFlightExports.delete(cacheKey);
    }
  }

  /**
   * Genera el archivo Excel de dos hojas en disco de forma atómica para la caché.
   */
  private async generarArchivoExcelCompletoEnDisco(
    periodo: string,
    entidad: string | undefined,
    finalPath: string,
    schema?: string,
    entidadNombreParam?: string,
  ): Promise<void> {
    const targetSchema = this.sanitizeSchema(schema);
    const entidadNombre =
      entidadNombreParam ||
      (targetSchema.toUpperCase() === 'QAPAC'
        ? 'QAPAQ'
        : this.sanitizePathSegment(targetSchema, 'ENTIDAD').toUpperCase());
    const shortEntidad =
      this.sanitizePathSegment(entidadNombre, targetSchema.toUpperCase())
        .toUpperCase()
        .slice(0, 15)
        .replace(/_+$/g, '') || 'ENTIDAD';
    const sheet2Name = `DETALLE_${shortEntidad}_MERCADO`;

    const tempPath = `${finalPath}.tmp`;
    const outStream = fs.createWriteStream(tempPath);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: outStream,
      useStyles: false,
      useSharedStrings: false,
    });

    const pool = await this.sqlServer.getPool();

    const SHEET1_COLUMNS = [
      'PERIODO',
      'ENTIDAD_FINANCIERA',
      'CODIGO_SBS',
      'TIPO_DOCUMENTO',
      'DOCUMENTO',
      'RAZONSOCIAL',
      'TIPO_CLIENTE',
      'FILA_DESCRIPCION',
      'COLUMNA_DESCRIPCION',
      'SALDO_CLIENTE',
      'SALDO_MERCADO',
      'SALDO_VIGENTE',
      'SALDO_CASTIGADO',
      'SALDO_OTROS',
      'SALDO_TOTAL',
      'FILA',
      'COLUMNA',
      'ESTRATEGIA',
      'ESTRATEGIA_DESCRIPCION',
      'UBIGEO',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
      'NUMERO_ENTIDADES',
      'NOR',
      'CPP',
      'DEF',
      'DUD',
      'PER',
      'CALIFICACION_CLIENTE',
    ];

    try {
      // 1. Hoja: DETALLE CLIENTES
      const ws1 = workbook.addWorksheet('DETALLE CLIENTES');
      ws1.addRow(SHEET1_COLUMNS).commit();

      await new Promise<void>((resolve, reject) => {
        const req1 = pool.request();
        req1.stream = true;
        req1.input('periodo', sql.NVarChar(50), periodo);

        let querySql1 = `
          SELECT 
            PERIODO, ENTIDAD_FINANCIERA, CODIGO_SBS, TIPO_DOCUMENTO, DOCUMENTO,
            RAZONSOCIAL, TIPO_CLIENTE, FILA_DESCRIPCION, COLUMNA_DESCRIPCION,
            SALDO_CLIENTE, SALDO_MERCADO, SALDO_VIGENTE, SALDO_CASTIGADO, SALDO_OTROS, SALDO_TOTAL,
            FILA, COLUMNA, ESTRATEGIA, ESTRATEGIA_DESCRIPCION, UBIGEO,
            DEPARTAMENTO, PROVINCIA, DISTRITO, NUMERO_ENTIDADES,
            NOR, CPP, DEF, DUD, PER, CALIFICACION_CLIENTE
          FROM [${targetSchema}].[Cliente]
          WHERE PERIODO = @periodo
        `;

        if (entidad && entidad !== 'Todas') {
          querySql1 += ` AND (ENTIDAD_FINANCIERA = @entidad OR REPLACE(UPPER(ENTIDAD_FINANCIERA), 'Q', 'C') LIKE @entidadPattern OR @entidadPattern LIKE '%' + REPLACE(UPPER(ENTIDAD_FINANCIERA), 'Q', 'C') + '%')`;
          req1.input('entidad', sql.NVarChar(200), entidad.trim());
          req1.input('entidadPattern', sql.NVarChar(200), `%${entidad.trim().toUpperCase().replace(/Q/g, 'C')}%`);
        }

        querySql1 += ' ORDER BY RAZONSOCIAL ASC';
        req1.query(querySql1);

        req1.on('row', (row) => {
          ws1
            .addRow([
              row.PERIODO,
              row.ENTIDAD_FINANCIERA,
              row.CODIGO_SBS,
              row.TIPO_DOCUMENTO,
              row.DOCUMENTO,
              this.limpiarRazonSocial(row.RAZONSOCIAL),
              row.TIPO_CLIENTE,
              row.FILA_DESCRIPCION,
              row.COLUMNA_DESCRIPCION,
              row.SALDO_CLIENTE != null ? Number(row.SALDO_CLIENTE) : 0,
              row.SALDO_MERCADO != null ? Number(row.SALDO_MERCADO) : 0,
              row.SALDO_VIGENTE != null ? Number(row.SALDO_VIGENTE) : 0,
              row.SALDO_CASTIGADO != null ? Number(row.SALDO_CASTIGADO) : 0,
              row.SALDO_OTROS != null ? Number(row.SALDO_OTROS) : 0,
              row.SALDO_TOTAL != null ? Number(row.SALDO_TOTAL) : 0,
              row.FILA,
              row.COLUMNA,
              row.ESTRATEGIA,
              row.ESTRATEGIA_DESCRIPCION,
              row.UBIGEO,
              this.limpiarTexto(row.DEPARTAMENTO),
              this.limpiarTexto(row.PROVINCIA),
              this.limpiarTexto(row.DISTRITO),
              row.NUMERO_ENTIDADES,
              row.NOR != null ? Number(row.NOR) : 0,
              row.CPP != null ? Number(row.CPP) : 0,
              row.DEF != null ? Number(row.DEF) : 0,
              row.DUD != null ? Number(row.DUD) : 0,
              row.PER != null ? Number(row.PER) : 0,
              row.CALIFICACION_CLIENTE,
            ])
            .commit();
        });

        req1.on('error', (err) => {
          this.logger.error(`Error en streaming Sheet 1: ${err.message}`);
          reject(err);
        });

        req1.on('done', () => {
          ws1.commit();
          resolve();
        });
      });

      // 2. Hoja dinámica: DETALLE_${shortEntidad}_MERCADO
      // Verificar en INFORMATION_SCHEMA si existe [${targetSchema}].[Mercado] y sus columnas
      const mercadoColsResult = await pool
        .request()
        .input('schema', sql.NVarChar(128), targetSchema)
        .query<{ COLUMN_NAME: string }>(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = @schema AND TABLE_NAME = 'Mercado'
        `);

      const colNameMap = new Map<string, string>();
      for (const c of mercadoColsResult.recordset || []) {
        const rawName = String(c.COLUMN_NAME);
        colNameMap.set(rawName.toUpperCase(), rawName);
      }
      const availableCols = new Set(colNameMap.keys());
      const hasMercadoTable = availableCols.size > 0;

      const dynamicCuentaCol = `CUENTA_${targetSchema.toUpperCase()}`;
      const anyCuentaCol = Array.from(availableCols).find(
        (col) => col.startsWith('CUENTA_') && col !== 'CODIGO_CUENTA',
      );
      const cuentaColUpper = availableCols.has(dynamicCuentaCol)
        ? dynamicCuentaCol
        : availableCols.has(`CUENTA_${shortEntidad}`)
          ? `CUENTA_${shortEntidad}`
          : availableCols.has('CUENTA_ENTIDAD')
            ? 'CUENTA_ENTIDAD'
            : availableCols.has('CUENTA_QAPAC')
              ? 'CUENTA_QAPAC'
              : anyCuentaCol || null;
      const cuentaColName = cuentaColUpper ? colNameMap.get(cuentaColUpper) || cuentaColUpper : null;

      const cuentaHeaderName =
        shortEntidad === 'QAPAQ'
          ? 'CUENTA_QAPAC'
          : cuentaColUpper || `CUENTA_${shortEntidad}`;

      const SHEET2_COLUMNS = [
        'PERIODO',
        'CODIGO_SBS',
        'TIPO_CREDITO',
        'CODIGO_CUENTA',
        'MONEDA',
        'DIAS',
        'SALDO',
        'CLASIFICACION CUENTA',
        'ENTIDADFINANCIERA',
        'DOCUMENTO',
        'CANTIDAD EMPRESAS',
        'CLASIFICACION_CLIENTE',
        'TIPO_DEUDA',
        cuentaHeaderName,
        'ES CLIENTE_UNICO',
      ];

      const ws2 = workbook.addWorksheet(sheet2Name);
      ws2.addRow(SHEET2_COLUMNS).commit();

      if (hasMercadoTable) {
        const selectCol = (col: string, fallbackSql = 'NULL') =>
          availableCols.has(col)
            ? `[${colNameMap.get(col) || col}] AS [${col}]`
            : `${fallbackSql} AS [${col}]`;
        const cuentaSelectSql = cuentaColName
          ? `[${cuentaColName}] AS [CUENTA_ENTIDAD_VAL]`
          : `0 AS [CUENTA_ENTIDAD_VAL]`;

        await new Promise<void>((resolve, reject) => {
          const req2 = pool.request();
          req2.stream = true;
          req2.input('periodo', sql.NVarChar(50), periodo);

          const periodoColReal = colNameMap.get('PERIODO') || 'PERIODO';
          const codigoSbsColReal = colNameMap.get('CODIGO_SBS') || 'CODIGO_SBS';

          req2.query(`
            SELECT 
              ${selectCol('PERIODO', '@periodo')},
              ${selectCol('CODIGO_SBS', "''")},
              ${selectCol('TIPO_CREDITO', "''")},
              ${selectCol('CODIGO_CUENTA', "''")},
              ${selectCol('MONEDA', "''")},
              ${selectCol('DIAS', '0')},
              ${selectCol('SALDO', '0')},
              ${selectCol('CLASIFICACION', '0')},
              ${selectCol('ENTIDADFINANCIERA', "''")},
              ${selectCol('DOCUMENTO', "''")},
              ${selectCol('CANTIDAD_EMPRESAS', '0')},
              ${selectCol('CLASIFICACION_CLIENTE', "''")},
              ${selectCol('TIPO_DEUDA', "''")},
              ${cuentaSelectSql},
              ${selectCol('ES_CLIENTE_UNICO', '0')}
            FROM [${targetSchema}].[Mercado]
            ${availableCols.has('PERIODO') ? `WHERE [${periodoColReal}] = @periodo` : ''}
            ${availableCols.has('CODIGO_SBS') ? `ORDER BY [${codigoSbsColReal}] ASC` : ''}
          `);

          req2.on('row', (row) => {
            ws2
              .addRow([
                row.PERIODO,
                row.CODIGO_SBS,
                row.TIPO_CREDITO,
                row.CODIGO_CUENTA,
                row.MONEDA,
                row.DIAS != null ? Number(row.DIAS) : 0,
                row.SALDO != null ? Number(row.SALDO) : 0,
                row.CLASIFICACION != null ? Number(row.CLASIFICACION) : 0,
                this.limpiarRazonSocial(row.ENTIDADFINANCIERA),
                row.DOCUMENTO,
                row.CANTIDAD_EMPRESAS,
                row.CLASIFICACION_CLIENTE,
                row.TIPO_DEUDA,
                row.CUENTA_ENTIDAD_VAL != null ? Number(row.CUENTA_ENTIDAD_VAL) : 0,
                row.ES_CLIENTE_UNICO != null ? Number(row.ES_CLIENTE_UNICO) : 0,
              ])
              .commit();
          });

          req2.on('error', (err) => {
            this.logger.error(`Error en streaming Sheet 2 (${sheet2Name}): ${err.message}`);
            reject(err);
          });

          req2.on('done', () => {
            ws2.commit();
            resolve();
          });
        });
      } else {
        this.logger.warn(
          `La tabla [${targetSchema}].[Mercado] no existe en SQL Server. Se generó la hoja ${sheet2Name} solo con cabeceras.`,
        );
        ws2.commit();
      }

      await this.finalizarWorkbookStream(workbook, outStream);

      // Renombrado atómico
      if (fs.existsSync(tempPath)) {
        if (fs.existsSync(finalPath)) {
          fs.unlinkSync(finalPath);
        }
        fs.renameSync(tempPath, finalPath);
        this.logger.log(`Archivo generado y guardado en caché SSD: ${finalPath}`);
      }
    } catch (err: any) {
      await this.cerrarStreamSeguro(outStream);
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
      throw err;
    }
  }

  /**
   * Exporta a formato CSV (mantenido como respaldo).
   */
  async exportarCsv(
    query: PortfolioDetalleQueryDto,
    schema?: string,
  ): Promise<string> {
    const targetSchema = this.sanitizeSchema(schema);
    const periodo = query.periodo || (await this.getPeriodos(targetSchema))[0] || '202609';
    const entidad = query.entidad;
    const estrategia = query.estrategia;
    const departamento = query.departamento;
    const search = query.search?.trim();

    const whereClauses: string[] = ['PERIODO = @periodo'];
    const params: Record<string, { value: any; type: any }> = {
      periodo: { value: periodo, type: sql.NVarChar(50) },
    };

    if (entidad && entidad !== 'Todas') {
      whereClauses.push(this.buildEntidadCondition(entidad, params));
    }

    if (estrategia && Number(estrategia) > 0) {
      whereClauses.push('ESTRATEGIA = @estrategia');
      params.estrategia = { value: Number(estrategia), type: sql.Int };
    }

    if (departamento && departamento !== 'Todas') {
      whereClauses.push('DEPARTAMENTO = @departamento');
      params.departamento = { value: departamento, type: sql.NVarChar(100) };
    }

    if (search) {
      whereClauses.push('(DOCUMENTO LIKE @search OR RAZONSOCIAL LIKE @search)');
      params.search = { value: `%${search}%`, type: sql.NVarChar(150) };
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const dataSql = `
      SELECT TOP 5000
        PERIODO,
        DOCUMENTO,
        RAZONSOCIAL,
        ISNULL(SALDO_VIGENTE, 0) AS SALDO_VIGENTE,
        ISNULL(SALDO_CASTIGADO, 0) AS SALDO_CASTIGADO,
        ISNULL(DEPARTAMENTO, 'NO DEFINIDO') AS DEPARTAMENTO,
        ISNULL(PROVINCIA, 'NO DEFINIDO') AS PROVINCIA,
        ISNULL(DISTRITO, 'NO DEFINIDO') AS DISTRITO,
        ISNULL(NUMERO_ENTIDADES, '0') AS NUMERO_ENTIDADES,
        ISNULL(CALIFICACION_CLIENTE, 'S/C') AS CALIFICACION_CLIENTE,
        ISNULL(NOR, 0) AS NOR,
        ISNULL(CPP, 0) AS CPP,
        ISNULL(DEF, 0) AS DEF,
        ISNULL(DUD, 0) AS DUD,
        ISNULL(PER, 0) AS PER,
        ISNULL(ESTRATEGIA_DESCRIPCION, '') AS ESTRATEGIA_DESCRIPCION
      FROM [${targetSchema}].[Cliente]
      ${whereSql}
      ORDER BY RAZONSOCIAL ASC
    `;

    const rows = await this.sqlServer.query<any>(dataSql, params);

    const headers = [
      'PERIODO',
      'DOCUMENTO',
      'RAZON_SOCIAL',
      'SALDO_VIGENTE',
      'SALDO_CASTIGADO',
      'DEPARTAMENTO',
      'PROVINCIA',
      'DISTRITO',
      'NUMERO_ENTIDADES',
      'CALIFICACION_CLIENTE',
      'NOR',
      'CPP',
      'DEF',
      'DUD',
      'PER',
      'ESTRATEGIA',
    ];

    const lines = [headers.join(';')];

    for (const r of rows) {
      const line = [
        r.PERIODO,
        r.DOCUMENTO,
        `"${this.limpiarRazonSocial(r.RAZONSOCIAL).replace(/"/g, '""')}"`,
        r.SALDO_VIGENTE != null ? Number(r.SALDO_VIGENTE).toFixed(2) : '0.00',
        r.SALDO_CASTIGADO != null ? Number(r.SALDO_CASTIGADO).toFixed(2) : '0.00',
        this.limpiarTexto(r.DEPARTAMENTO) ?? '',
        this.limpiarTexto(r.PROVINCIA) ?? '',
        this.limpiarTexto(r.DISTRITO) ?? '',
        r.NUMERO_ENTIDADES,
        r.CALIFICACION_CLIENTE,
        r.NOR,
        r.CPP,
        r.DEF,
        r.DUD,
        r.PER,
        r.ESTRATEGIA_DESCRIPCION,
      ].join(';');
      lines.push(line);
    }

    return '\uFEFF' + lines.join('\r\n'); // Incluye BOM para UTF-8 en Excel
  }

  /**
   * Obtiene los KPIs macro y datos comparativos para el Dashboard General del Administrador.
   * Consolida métricas de todas las instituciones cliente registradas en el sistema.
   */
  async getDashboardGeneralAdmin(
    empresas: Array<{ id: number; nombre: string; esquema?: string | null; ruc?: string | null; estado: string }>,
    periodoParam?: string,
  ): Promise<any> {
    const periodo = periodoParam || (await this.getPeriodos())[0] || '202609';

    const empresasStats: any[] = [];
    let granTotalSaldo = 0;
    let granTotalClientes = 0;
    let granTotalSano = 0;
    let granTotalCritico = 0;
    let granTotalExclusivos = 0;
    let granTotalVigentes = 0;
    let granTotalCastigadas = 0;

    const schemasSummedInKpis = new Set<string>();

    for (const emp of empresas) {
      const targetSchema = this.sanitizeSchema(emp.esquema || emp.nombre);
      try {
        const rows = await this.sqlServer.query<any>(
          `SELECT 
            COUNT(*) AS totalClientes,
            SUM(ISNULL(SALDO_TOTAL, 0)) AS totalSaldo,
            SUM(CASE WHEN ESTRATEGIA IN (1, 2) THEN ISNULL(SALDO_TOTAL, 0) ELSE 0 END) AS saldoSano,
            SUM(CASE WHEN ESTRATEGIA = 6 THEN ISNULL(SALDO_TOTAL, 0) ELSE 0 END) AS saldoCritico,
            SUM(CASE WHEN TIPO_CLIENTE LIKE '%EXCLUSIVO%' AND TIPO_CLIENTE NOT LIKE '%NO%' THEN 1 ELSE 0 END) AS clientesExclusivos,
            SUM(ISNULL(SALDO_VIGENTE, 0)) AS deudasVigentes,
            SUM(ISNULL(SALDO_CASTIGADO, 0)) AS deudasCastigadas
           FROM [${targetSchema}].[Cliente]
           WHERE PERIODO = @periodo`,
          { periodo: { value: periodo, type: sql.NVarChar(50) } },
        );
        const r = rows[0] || {};
        const clientes = Number(r.totalClientes || 0);
        const saldo = Number(r.totalSaldo || 0);
        const sano = Number(r.saldoSano || 0);
        const critico = Number(r.saldoCritico || 0);
        const exclusivos = Number(r.clientesExclusivos || 0);
        const vigentes = Number(r.deudasVigentes || 0);
        const castigadas = Number(r.deudasCastigadas || 0);

        empresasStats.push({
          id: emp.id,
          nombre: emp.nombre,
          esquema: emp.esquema || emp.nombre,
          ruc: emp.ruc,
          estado: emp.estado,
          totalClientes: clientes,
          totalSaldo: saldo,
          saldoSano: sano,
          saldoCritico: critico,
          clientesExclusivos: exclusivos,
          clientesNoExclusivos: Math.max(0, clientes - exclusivos),
          deudasVigentes: vigentes,
          deudasCastigadas: castigadas,
        });

        const schemaKey = targetSchema.toUpperCase();
        if (!schemasSummedInKpis.has(schemaKey)) {
          schemasSummedInKpis.add(schemaKey);
          granTotalSaldo += saldo;
          granTotalClientes += clientes;
          granTotalSano += sano;
          granTotalCritico += critico;
          granTotalExclusivos += exclusivos;
          granTotalVigentes += vigentes;
          granTotalCastigadas += castigadas;
        }
      } catch (err: any) {
        this.logger.warn(`No se pudo consultar esquema [${targetSchema}] para empresa ${emp.nombre}: ${err.message}`);
        empresasStats.push({
          id: emp.id,
          nombre: emp.nombre,
          esquema: emp.esquema || emp.nombre,
          ruc: emp.ruc,
          estado: emp.estado,
          totalClientes: 0,
          totalSaldo: 0,
          saldoSano: 0,
          saldoCritico: 0,
        });
      }
    }

    const comparativaEmpresas = empresasStats.map((e) => ({
      ...e,
      participacionSaldo: granTotalSaldo > 0 ? Number(((e.totalSaldo / granTotalSaldo) * 100).toFixed(2)) : 0,
      participacionClientes: granTotalClientes > 0 ? Number(((e.totalClientes / granTotalClientes) * 100).toFixed(2)) : 0,
    }));

    const NOMBRES_ESTRATEGIAS: Record<number, string> = {
      1: '1. FIDELIZACION',
      2: '2. PREVENCION',
      3: '3. MITIGACION',
      4: '4. BLINDAJE',
      5: '5. COBRANZA DIRECCIONADA',
      6: '6. SOLUCION DE CONCILIACION',
    };

    const estrategiasAcum = new Map<
      number,
      { descripcion: string; cantidad: number; saldo: number }
    >();
    for (let id = 1; id <= 6; id++) {
      estrategiasAcum.set(id, {
        descripcion: NOMBRES_ESTRATEGIAS[id],
        cantidad: 0,
        saldo: 0,
      });
    }

    const geografiaAcum = new Map<
      string,
      {
        departamento: string;
        clientes: number;
        exclusivo: number;
        saldo: number;
        deudasVigentes: number;
        deudasCastigadas: number;
        estrategias: Map<number, { nombre: string; cantidad: number }>;
      }
    >();

    const rawSchemas =
      empresas.length > 0
        ? empresas.map((emp) => this.sanitizeSchema(emp.esquema || emp.nombre))
        : ['Qapac'];
    const seenSchemas = new Set<string>();
    const schemasToAggregate: string[] = [];
    for (const s of rawSchemas) {
      const upper = s.toUpperCase();
      if (!seenSchemas.has(upper)) {
        seenSchemas.add(upper);
        schemasToAggregate.push(s);
      }
    }

    for (const targetSchema of schemasToAggregate) {
      const [estCuadro, geoRes] = await Promise.all([
        this.getEstrategiasCuadro({ periodo }, targetSchema),
        this.getGeografia({ periodo }, targetSchema),
      ]);

      for (const item of estCuadro.items) {
        const entry = estrategiasAcum.get(item.id);
        if (entry) {
          entry.cantidad += Number(item.cantidad || 0);
          entry.saldo += Number(item.saldo || 0);
        }
      }

      for (const gItem of geoRes.items) {
        const depKey = String(gItem.departamento || 'NULL')
          .trim()
          .toUpperCase();
        if (!geografiaAcum.has(depKey)) {
          const estMap = new Map<number, { nombre: string; cantidad: number }>();
          for (let id = 1; id <= 6; id++) {
            estMap.set(id, { nombre: NOMBRES_ESTRATEGIAS[id], cantidad: 0 });
          }
          geografiaAcum.set(depKey, {
            departamento: gItem.departamento,
            clientes: 0,
            exclusivo: 0,
            saldo: 0,
            deudasVigentes: 0,
            deudasCastigadas: 0,
            estrategias: estMap,
          });
        }
        const depEntry = geografiaAcum.get(depKey)!;
        depEntry.clientes += Number(gItem.clientes || 0);
        depEntry.exclusivo += Number(gItem.exclusivo || 0);
        depEntry.saldo += Number(gItem.saldo || 0);
        depEntry.deudasVigentes += Number(gItem.deudasVigentes || 0);
        depEntry.deudasCastigadas += Number(gItem.deudasCastigadas || 0);

        if (gItem.estrategias) {
          for (const est of gItem.estrategias) {
            const cur = depEntry.estrategias.get(est.estrategia);
            if (cur) {
              cur.cantidad += Number(est.cantidad || 0);
            }
          }
        }
      }
    }

    const baseTotalClientes =
      granTotalClientes > 0
        ? granTotalClientes
        : Array.from(estrategiasAcum.values()).reduce((acc, it) => acc + it.cantidad, 0);
    const baseTotalSaldo =
      granTotalSaldo > 0
        ? granTotalSaldo
        : Array.from(estrategiasAcum.values()).reduce((acc, it) => acc + it.saldo, 0);

    const estrategiasConsolidadas: EstrategiaResumenDto[] = [1, 2, 3, 4, 5, 6].map((id) => {
      const est = estrategiasAcum.get(id)!;
      const partCli = baseTotalClientes > 0 ? (est.cantidad / baseTotalClientes) * 100 : 0;
      const partSal = baseTotalSaldo > 0 ? (est.saldo / baseTotalSaldo) * 100 : 0;
      return {
        id,
        descripcion: est.descripcion,
        cantidad: est.cantidad,
        saldo: est.saldo,
        participacionClientes: Number(partCli.toFixed(2)),
        participacionSaldo: Number(partSal.toFixed(2)),
        color: COLORES_ESTRATEGIAS[id] || '#999999',
      };
    });

    let geoTotalClientes = 0;
    let geoTotalExclusivo = 0;
    let geoTotalSaldo = 0;
    let geoTotalVigentes = 0;
    let geoTotalCastigadas = 0;

    for (const dep of geografiaAcum.values()) {
      geoTotalClientes += dep.clientes;
      geoTotalExclusivo += dep.exclusivo;
      geoTotalSaldo += dep.saldo;
      geoTotalVigentes += dep.deudasVigentes;
      geoTotalCastigadas += dep.deudasCastigadas;
    }

    const geografiaItems = Array.from(geografiaAcum.values())
      .sort((a, b) => b.clientes - a.clientes)
      .map((dep) => ({
        departamento: dep.departamento,
        clientes: dep.clientes,
        exclusivo: dep.exclusivo,
        saldo: dep.saldo,
        deudasVigentes: dep.deudasVigentes,
        deudasCastigadas: dep.deudasCastigadas,
        participacionClientes:
          geoTotalClientes > 0 ? Number(((dep.clientes / geoTotalClientes) * 100).toFixed(2)) : 0,
        participacionMontos:
          geoTotalSaldo > 0 ? Number(((dep.saldo / geoTotalSaldo) * 100).toFixed(2)) : 0,
        estrategias: [1, 2, 3, 4, 5, 6].map((id) => {
          const e = dep.estrategias.get(id)!;
          return {
            estrategia: id,
            nombre: e.nombre,
            cantidad: e.cantidad,
            participacion:
              geoTotalClientes > 0 ? Number(((e.cantidad / geoTotalClientes) * 100).toFixed(2)) : 0,
          };
        }),
      }));

    const geografiaTotales = {
      clientes: geoTotalClientes,
      exclusivo: geoTotalExclusivo,
      saldo: geoTotalSaldo,
      deudasVigentes: geoTotalVigentes,
      deudasCastigadas: geoTotalCastigadas,
      participacionClientes: geoTotalClientes > 0 ? 100.0 : 0,
      participacionMontos: geoTotalSaldo > 0 ? 100.0 : 0,
    };

    return {
      periodo,
      kpis: {
        totalSaldo: granTotalSaldo,
        totalClientes: granTotalClientes,
        saldoSano: granTotalSano,
        saldoCritico: granTotalCritico,
        pctSano: granTotalSaldo > 0 ? Number(((granTotalSano / granTotalSaldo) * 100).toFixed(1)) : 0,
        pctCritico: granTotalSaldo > 0 ? Number(((granTotalCritico / granTotalSaldo) * 100).toFixed(1)) : 0,
        totalExclusivos: granTotalExclusivos,
        totalNoExclusivos: Math.max(0, granTotalClientes - granTotalExclusivos),
        deudasVigentes: granTotalVigentes,
        deudasCastigadas: granTotalCastigadas,
        totalEmpresasActivas: empresas.length,
      },
      comparativaEmpresas,
      estrategias: estrategiasConsolidadas,
      geografia: geografiaItems,
      geografiaTotales,
    };
  }
}
