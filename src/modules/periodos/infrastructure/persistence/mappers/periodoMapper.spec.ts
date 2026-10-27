import { PeriodoMapper } from './periodoMapper';
import type { DashboardPeriodoOrmEntity } from '../entities/dashboardPeriodoOrm.entity';

// Vínculos de mentira: ninguno es un reporte real
const token = (k: string) =>
  Buffer.from(JSON.stringify({ k, t: 'TENANT-DE-PRUEBA', c: 4 })).toString(
    'base64url',
  );
const DEL_PERIODO = `https://app.powerbi.com/view?r=${token('DEL-PERIODO')}`;
const DEL_REPORTE = `https://app.powerbi.com/view?r=${token('DEL-REPORTE')}`;

const registro = (urlPowerbi: string | null): DashboardPeriodoOrmEntity => ({
  id: 1,
  dashboardId: 7,
  periodo: '202610',
  urlPowerbi,
  urlMega: null,
  fechaCreacion: new Date('2026-10-27T12:00:00Z'),
});

describe('PeriodoMapper', () => {
  it('un periodo con vínculo propio usa el suyo, aunque el reporte tenga otro', () => {
    expect(
      PeriodoMapper.toDomain(registro(DEL_PERIODO), DEL_REPORTE).urlPowerbi,
    ).toBe(DEL_PERIODO);
  });

  it('un periodo sin vínculo propio usa el del reporte', () => {
    expect(PeriodoMapper.toDomain(registro(null), DEL_REPORTE).urlPowerbi).toBe(
      DEL_REPORTE,
    );
    expect(PeriodoMapper.toDomain(registro(''), DEL_REPORTE).urlPowerbi).toBe(
      DEL_REPORTE,
    );
  });

  it('si ninguno tiene vínculo, queda en null', () => {
    expect(PeriodoMapper.toDomain(registro(null)).urlPowerbi).toBeNull();
    expect(PeriodoMapper.toDomain(registro(null), null).urlPowerbi).toBeNull();
  });

  it('si antes se guardó el HTML completo, devuelve solo el vínculo', () => {
    const html = `<iframe title="Huancayo" src="${DEL_PERIODO}" frameborder="0"></iframe>`;

    expect(PeriodoMapper.toDomain(registro(html)).urlPowerbi).toBe(DEL_PERIODO);
    expect(PeriodoMapper.toDomain(registro(null), html).urlPowerbi).toBe(
      DEL_PERIODO,
    );
  });
});
