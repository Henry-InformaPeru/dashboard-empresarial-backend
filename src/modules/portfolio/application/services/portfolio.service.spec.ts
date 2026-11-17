import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { PortfolioService } from './portfolio.service';
import { SqlServerService } from '../../../../shared/infrastructure/database/sqlServer.service';

describe('PortfolioService - Export Disk Cache TTL & Invalidation', () => {
  let service: PortfolioService;
  let mockSqlServer: jest.Mocked<Partial<SqlServerService>>;
  let tmpWorkspaceDir: string;
  let exportsDir: string;
  let cwdSpy: jest.SpyInstance;

  const createMockResponse = () => {
    const stream = new EventEmitter() as any;
    stream.headers = {} as Record<string, any>;
    stream.headersSent = false;
    stream.statusCode = 200;
    stream.setHeader = jest.fn((key: string, val: any) => {
      stream.headers[key] = val;
    });
    stream.status = jest.fn((code: number) => {
      stream.statusCode = code;
      return stream;
    });
    stream.json = jest.fn(() => stream);
    stream.write = jest.fn(() => true);
    stream.end = jest.fn(() => {
      stream.emit('finish');
      stream.emit('close');
    });
    stream.on = EventEmitter.prototype.on.bind(stream);
    stream.once = EventEmitter.prototype.once.bind(stream);
    stream.emit = EventEmitter.prototype.emit.bind(stream);
    stream.removeListener = EventEmitter.prototype.removeListener.bind(stream);
    return stream;
  };

  const createStreamingPoolMock = (rowsSheet1: any[] = [], rowsSheet2: any[] = []) => {
    let streamCallCount = 0;
    return {
      request: jest.fn().mockImplementation(() => {
        const req = new EventEmitter() as any;
        req.stream = false;
        req.input = jest.fn().mockReturnThis();
        req.query = jest.fn().mockImplementation(() => {
          if (req.stream) {
            streamCallCount++;
            const currentCall = streamCallCount;
            setImmediate(() => {
              const rows = currentCall === 1 ? rowsSheet1 : rowsSheet2;
              for (const r of rows) {
                req.emit('row', r);
              }
              req.emit('done', {});
            });
            return undefined;
          }
          return Promise.resolve({ recordset: [] });
        });
        return req;
      }),
    };
  };

  beforeEach(() => {
    tmpWorkspaceDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-cache-spec-'));
    exportsDir = path.join(tmpWorkspaceDir, 'storage', 'exports');
    cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tmpWorkspaceDir);

    mockSqlServer = {
      query: jest.fn().mockResolvedValue([{ PERIODO: '202609' }]),
      getPool: jest.fn(),
    };

    service = new PortfolioService(mockSqlServer as unknown as SqlServerService);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
    try {
      fs.rmSync(tmpWorkspaceDir, { recursive: true, force: true });
    } catch {}
  });

  describe('setMantenimientoEstado - Automatic Cache Invalidation', () => {
    it('deletes all cached .xlsx files in storage/exports/ when maintenance mode is toggled, while preserving .tmp files', () => {
      fs.mkdirSync(exportsDir, { recursive: true });
      const cachedPadron = path.join(
        exportsDir,
        'cache_padron_QAPAC_202609_QAPAC_est0_depTODOS.xlsx',
      );
      const cachedFull = path.join(exportsDir, 'QAPAQ_202609_FILE.xlsx');
      const inFlightTmp = path.join(exportsDir, 'QAPAQ_202609_FILE.xlsx.tmp');

      fs.writeFileSync(cachedPadron, Buffer.alloc(1024, 'a'));
      fs.writeFileSync(cachedFull, Buffer.alloc(2048, 'b'));
      fs.writeFileSync(inFlightTmp, Buffer.alloc(512, 'c'));

      const estado = service.setMantenimientoEstado(true, 'Actualizando base', 'adminUser');

      expect(estado.activo).toBe(true);
      expect(estado.actualizadoPor).toBe('adminUser');
      expect(fs.existsSync(cachedPadron)).toBe(false);
      expect(fs.existsSync(cachedFull)).toBe(false);
      // In-flight .tmp file must be preserved
      expect(fs.existsSync(inFlightTmp)).toBe(true);

      // Toggling maintenance mode off also invalidates any cached .xlsx files
      fs.writeFileSync(cachedFull, Buffer.alloc(2048, 'd'));
      const estadoOff = service.setMantenimientoEstado(false, undefined, 'adminUser');
      expect(estadoOff.activo).toBe(false);
      expect(fs.existsSync(cachedFull)).toBe(false);
    });

    it('succeeds cleanly even when storage/exports/ does not exist yet', () => {
      expect(fs.existsSync(exportsDir)).toBe(false);
      const estado = service.setMantenimientoEstado(true);
      expect(estado.activo).toBe(true);
    });
  });

  describe('exportarPadronExcel - 30d TTL & Opportunistic Cleanup', () => {
    const cacheFileName = 'cache_padron_QAPAC_202609_QAPAC_est0_depTODOS.xlsx';

    it('serves from SSD cache without querying SQL Server when cached file is younger than 30 days', async () => {
      fs.mkdirSync(exportsDir, { recursive: true });
      const cacheFilePath = path.join(exportsDir, cacheFileName);
      fs.writeFileSync(cacheFilePath, Buffer.alloc(1500, 'x'));

      // Set mtime to 15 days ago (within 30d TTL)
      const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
      fs.utimesSync(cacheFilePath, fifteenDaysAgo, fifteenDaysAgo);

      const res = createMockResponse();
      await service.exportarPadronExcel({ periodo: '202609' }, res, 'Qapac');

      expect(mockSqlServer.getPool).not.toHaveBeenCalled();
      expect(res.headers['Content-Disposition']).toContain('padron_clientes_202609.xlsx');
    });

    it('regenerates from SQL Server when cached file is older than 30 days and cleans up stale files', async () => {
      fs.mkdirSync(exportsDir, { recursive: true });
      const cacheFilePath = path.join(exportsDir, cacheFileName);
      fs.writeFileSync(cacheFilePath, Buffer.alloc(1500, 'x'));

      // Set mtime to 31 days ago (expired > 30d TTL)
      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      fs.utimesSync(cacheFilePath, thirtyOneDaysAgo, thirtyOneDaysAgo);

      // Also create an unrelated expired .xlsx (32d old), a fresh .xlsx (5d old),
      // a stale .tmp (2h old), and an active .tmp (1min old)
      const otherExpiredXlsx = path.join(exportsDir, 'cache_padron_OLD_202608.xlsx');
      const otherFreshXlsx = path.join(exportsDir, 'cache_padron_FRESH_202609.xlsx');
      const staleTmp = path.join(exportsDir, 'abandoned_export.xlsx.tmp');
      const activeTmp = path.join(exportsDir, 'active_export.xlsx.tmp');

      fs.writeFileSync(otherExpiredXlsx, Buffer.alloc(1000, 'o'));
      fs.writeFileSync(otherFreshXlsx, Buffer.alloc(1000, 'f'));
      fs.writeFileSync(staleTmp, Buffer.alloc(500, 's'));
      fs.writeFileSync(activeTmp, Buffer.alloc(500, 'a'));

      const thirtyTwoDaysAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

      fs.utimesSync(otherExpiredXlsx, thirtyTwoDaysAgo, thirtyTwoDaysAgo);
      fs.utimesSync(otherFreshXlsx, fiveDaysAgo, fiveDaysAgo);
      fs.utimesSync(staleTmp, twoHoursAgo, twoHoursAgo);
      fs.utimesSync(activeTmp, oneMinuteAgo, oneMinuteAgo);

      const poolMock = createStreamingPoolMock([
        {
          PERIODO: '202609',
          DOCUMENTO: '12345678',
          RAZONSOCIAL: 'CLIENTE NUEVO',
          SALDO_VIGENTE: 1200,
          SALDO_CASTIGADO: 0,
          DEPARTAMENTO: 'LIMA',
          PROVINCIA: 'LIMA',
          DISTRITO: 'MIRAFLORES',
          NUMERO_ENTIDADES: '1',
          CALIFICACION_CLIENTE: 'NOR',
          NOR: 100,
          CPP: 0,
          DEF: 0,
          DUD: 0,
          PER: 0,
          ESTRATEGIA_DESCRIPCION: '1. FIDELIZACION',
        },
      ]);
      (mockSqlServer.getPool as jest.Mock).mockResolvedValue(poolMock);

      const res = createMockResponse();
      await service.exportarPadronExcel({ periodo: '202609' }, res, 'Qapac');

      // SQL Server must have been queried to regenerate the expired file
      expect(mockSqlServer.getPool).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(cacheFilePath)).toBe(true);
      const refreshedStats = fs.statSync(cacheFilePath);
      expect(Date.now() - refreshedStats.mtimeMs).toBeLessThan(10000);

      // Opportunistic cleanup assertions
      expect(fs.existsSync(otherExpiredXlsx)).toBe(false);
      expect(fs.existsSync(staleTmp)).toBe(false);
      expect(fs.existsSync(otherFreshXlsx)).toBe(true);
      expect(fs.existsSync(activeTmp)).toBe(true);
    });
  });

  describe('exportarArchivoCompleto - 30d TTL & Opportunistic Cleanup', () => {
    const fullFileName = 'QAPAQ_202609_FILE.xlsx';

    it('serves from SSD cache without querying SQL Server when cached file is younger than 30 days', async () => {
      fs.mkdirSync(exportsDir, { recursive: true });
      const filePath = path.join(exportsDir, fullFileName);
      fs.writeFileSync(filePath, Buffer.alloc(2048, 'z'));

      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      fs.utimesSync(filePath, tenDaysAgo, tenDaysAgo);

      const res = createMockResponse();
      await service.exportarArchivoCompleto('202609', 'Qapac', res, 'Qapac');

      expect(mockSqlServer.getPool).not.toHaveBeenCalled();
      expect(res.headers['Content-Disposition']).toContain(fullFileName);
    });

    it('regenerates from SQL Server when cached file is older than 30 days', async () => {
      fs.mkdirSync(exportsDir, { recursive: true });
      const filePath = path.join(exportsDir, fullFileName);
      fs.writeFileSync(filePath, Buffer.alloc(2048, 'z'));

      const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
      fs.utimesSync(filePath, thirtyOneDaysAgo, thirtyOneDaysAgo);

      const poolMock = createStreamingPoolMock(
        [
          {
            PERIODO: '202609',
            ENTIDAD_FINANCIERA: 'FINANCIERA QAPAQ S.A.',
            CODIGO_SBS: '001',
            TIPO_DOCUMENTO: '1',
            DOCUMENTO: '87654321',
            RAZONSOCIAL: 'EMPRESA DEMO',
            TIPO_CLIENTE: 'EXCLUSIVO',
            FILA_DESCRIPCION: '1. AL DIA',
            COLUMNA_DESCRIPCION: '1. AL DIA',
            SALDO_CLIENTE: 500,
            SALDO_MERCADO: 500,
            SALDO_VIGENTE: 500,
            SALDO_CASTIGADO: 0,
            SALDO_OTROS: 0,
            SALDO_TOTAL: 500,
            FILA: 1,
            COLUMNA: 1,
            ESTRATEGIA: 1,
            ESTRATEGIA_DESCRIPCION: '1. FIDELIZACION',
            UBIGEO: '150101',
            DEPARTAMENTO: 'LIMA',
            PROVINCIA: 'LIMA',
            DISTRITO: 'LIMA',
            NUMERO_ENTIDADES: 1,
            NOR: 100,
            CPP: 0,
            DEF: 0,
            DUD: 0,
            PER: 0,
            CALIFICACION_CLIENTE: 'NOR',
          },
        ],
        [],
      );
      (mockSqlServer.getPool as jest.Mock).mockResolvedValue(poolMock);

      const res = createMockResponse();
      await service.exportarArchivoCompleto('202609', 'Qapac', res, 'Qapac');

      expect(mockSqlServer.getPool).toHaveBeenCalledTimes(1);
      expect(fs.existsSync(filePath)).toBe(true);
      const refreshedStats = fs.statSync(filePath);
      expect(Date.now() - refreshedStats.mtimeMs).toBeLessThan(10000);
    });
  });
});
