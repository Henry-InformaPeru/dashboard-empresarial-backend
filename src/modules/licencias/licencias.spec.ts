/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method, @typescript-eslint/no-base-to-string */
import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import {
  crearCache,
  decidir,
  parsearMapeoEmpresas,
  publica,
  ROL_EMPRESA,
  ROL_UNIVERSAL,
} from './licencias.core';
import type { FetchFn } from './licencias.cliente';
import {
  exigirCupoEnTransaccion,
  LicenciasService,
  PAUSA_TRAS_FALLO_MS,
  TTL_MS,
} from './licencias.service';

const UUID_A = '3f1c2a7e-9b1d-4c7a-8e2f-0a1b2c3d4e5f';
const UUID_B = '0a1b2c3d-4e5f-4c7a-8e2f-3f1c2a7e9b1d';
const cliente = { sub: 10, rolId: ROL_EMPRESA, empresaId: 3 };
const universal = { sub: 1, rolId: ROL_UNIVERSAL, empresaId: null };

describe('licencias.core', () => {
  const base = {
    metodo: 'POST',
    ruta: '/dashboards/1/periodos',
    universal: false,
    empresaUuid: UUID_A,
  };

  it('ACTIVA, SIN_LICENCIA, nulo o un estado desconocido no bloquean', () => {
    for (const estado of [
      'ACTIVA',
      'SIN_LICENCIA',
      null,
      'OTRO',
      'constructor',
    ]) {
      expect(decidir({ ...base, estado })).toEqual({ permitir: true });
    }
  });

  it('SOLO_LECTURA, SUSPENDIDA y CANCELADA bloquean las escrituras con su codigo', () => {
    expect(decidir({ ...base, estado: 'SOLO_LECTURA' })).toMatchObject({
      permitir: false,
      statusCode: 403,
      code: 'LICENCIA_SOLO_LECTURA',
    });
    expect(decidir({ ...base, estado: 'SUSPENDIDA' })).toMatchObject({
      permitir: false,
      code: 'LICENCIA_SUSPENDIDA',
    });
    expect(
      decidir({ ...base, metodo: 'DELETE', estado: 'CANCELADA' }),
    ).toMatchObject({ permitir: false, code: 'LICENCIA_CANCELADA' });
  });

  it('las lecturas siempre pasan, aun vencida o suspendida', () => {
    for (const metodo of ['GET', 'HEAD', 'OPTIONS']) {
      expect(decidir({ ...base, metodo, estado: 'SUSPENDIDA' })).toEqual({
        permitir: true,
      });
    }
  });

  it('el universal, sin empresa y las rutas exentas nunca se frenan', () => {
    expect(decidir({ ...base, universal: true, estado: 'CANCELADA' })).toEqual({
      permitir: true,
    });
    expect(
      decidir({ ...base, empresaUuid: null, estado: 'CANCELADA' }),
    ).toEqual({ permitir: true });
    expect(
      decidir({ ...base, ruta: '/auth/login', estado: 'CANCELADA' }),
    ).toEqual({ permitir: true });
    expect(
      decidir({ ...base, ruta: '/licencia?refrescar=1', estado: 'CANCELADA' }),
    ).toEqual({ permitir: true });
    // Un prefijo parecido no es exento
    expect(
      decidir({ ...base, ruta: '/authx', estado: 'CANCELADA' }),
    ).toMatchObject({ permitir: false });
  });

  it('publica: null si apagado; SIN_LICENCIA sin datos; enlace segun quien mira', () => {
    expect(publica(null)).toBeNull();
    expect(publica({ estado: 'SIN_LICENCIA' })).toMatchObject({
      estado: 'SIN_LICENCIA',
      usuarios_max: null,
      enlace: 'https://sulotec.com/mi-licencia',
    });
    expect(
      publica(
        { estado: 'ACTIVA', usuarios_max: 5, dias_para_vencer: 3 },
        { universal: true },
      ),
    ).toMatchObject({
      estado: 'ACTIVA',
      usuarios_max: 5,
      dias_para_vencer: 3,
      enlace: 'https://sulotec.com/licencias',
    });
  });

  it('mapeo de empresas: acepta id=uuid, rechaza basura, duplicados y un UUID en dos empresas', () => {
    const { mapa, invalidas } = parsearMapeoEmpresas(
      `3=${UUID_A.toUpperCase()}, 7:${UUID_B}, x=${UUID_A}, 0=${UUID_B}, 3=${UUID_B}, 9=${UUID_A}, 8=no-es-uuid`,
    );
    expect([...mapa.entries()]).toEqual([
      [3, UUID_A],
      [7, UUID_B],
    ]);
    expect(invalidas).toHaveLength(5);
    expect(parsearMapeoEmpresas('').mapa.size).toBe(0);
  });

  it('cache: vence pero conserva el ultimo valor conocido', () => {
    let t = 0;
    const cache = crearCache<{ estado: string }>({
      ttlMs: 100,
      ahora: () => t,
    });
    cache.guardar('a', { estado: 'ACTIVA' });
    expect(cache.obtener('a')).toEqual({
      valor: { estado: 'ACTIVA' },
      vigente: true,
    });
    t = 200;
    expect(cache.obtener('a')).toEqual({
      valor: { estado: 'ACTIVA' },
      vigente: false,
    });
  });
});

// ---- Servicio: red simulada, sin base ----
type Respuesta = { status: number; body: unknown } | Error;

function servicio(
  respuestas: Respuesta[],
  { activos = 0 }: { activos?: number } = {},
) {
  const llamadas: Array<{ url: string; metodo: string; cuerpo: unknown }> = [];
  const dataSource = {
    getRepository: () => ({ count: jest.fn(async () => activos) }),
    query: jest.fn(async () => []),
  } as unknown as DataSource;
  const s = new LicenciasService(dataSource);
  let t = 1_000_000;
  s.ahora = () => t;
  const fetchFn: FetchFn = async (url, init) => {
    llamadas.push({
      url,
      metodo: String(init.method),
      cuerpo: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const r = respuestas.shift();
    if (!r) throw new Error('sin respuesta preparada');
    if (r instanceof Error) throw r;
    return { status: r.status, json: async () => r.body } as Response;
  };
  s.fetchFn = fetchFn;
  return {
    s,
    llamadas,
    avanzar: (ms: number) => {
      t += ms;
    },
  };
}

describe('LicenciasService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.LICENCIAS_URL = 'http://licencias:3200';
    process.env.LICENCIAS_TOKEN = 'dashboard.secreto';
    process.env.LICENCIAS_PRODUCTO = 'dashboard';
    process.env.LICENCIAS_EMPRESAS = `3=${UUID_A},7=${UUID_B}`;
  });
  afterAll(() => {
    process.env = env;
  });

  it('apagado (sin token): no toca la red, no bloquea y no exige cupo', async () => {
    process.env.LICENCIAS_TOKEN = '';
    const { s, llamadas } = servicio([]);
    expect(await s.licenciaPublica(cliente)).toMatchObject({ licencia: null });
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toEqual({ permitir: true });
    expect(await s.verificarCupo(3, { universal: true })).toBeNull();
    s.reportarLuego(3);
    expect(llamadas).toHaveLength(0);
  });

  it('la empresa sale del usuario verificado: consulta el UUID de SU empresa y nunca otro', async () => {
    const { s, llamadas } = servicio([
      { status: 200, body: { estado: 'ACTIVA', usuarios_max: 5 } },
    ]);
    const r = await s.licenciaPublica(cliente);
    expect(r.empresa).toEqual({ id: 3, uuid: UUID_A });
    expect(llamadas[0].url).toBe(
      `http://licencias:3200/v1/licencias/${UUID_A}`,
    );
  });

  it('empresa sin UUID en LICENCIAS_EMPRESAS: no consulta ni bloquea', async () => {
    const { s, llamadas } = servicio([]);
    const otra = { ...cliente, empresaId: 99 };
    expect(await s.licenciaPublica(otra)).toMatchObject({
      licencia: null,
      empresa: { id: 99, uuid: null },
    });
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: otra }),
    ).toEqual({ permitir: true });
    expect(await s.verificarCupo(99)).toBeNull();
    expect(llamadas).toHaveLength(0);
  });

  it('estados: vencida bloquea escrituras y no lecturas; universal nunca', async () => {
    const { s } = servicio([{ status: 200, body: { estado: 'SOLO_LECTURA' } }]);
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toMatchObject({ permitir: false, code: 'LICENCIA_SOLO_LECTURA' });
    expect(
      await s.decidirPeticion({ metodo: 'GET', ruta: '/x', usuario: cliente }),
    ).toEqual({ permitir: true });
    expect(
      await s.decidirPeticion({
        metodo: 'POST',
        ruta: '/x',
        usuario: { ...universal, empresaId: 3 },
      }),
    ).toEqual({ permitir: true });
  });

  it('404 SIN_LICENCIA no bloquea nada ni exige cupo', async () => {
    const { s } = servicio([
      { status: 404, body: { error: 'SIN_LICENCIA' } },
      { status: 404, body: { error: 'SIN_LICENCIA' } },
    ]);
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toEqual({ permitir: true });
    expect(await s.verificarCupo(3)).toBeNull();
  });

  it('servicio caido: sigue con la ultima licencia conocida y espera antes de reintentar', async () => {
    const { s, llamadas, avanzar } = servicio([
      { status: 200, body: { estado: 'SUSPENDIDA' } },
      new TypeError('fetch failed'),
    ]);
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toMatchObject({ permitir: false, code: 'LICENCIA_SUSPENDIDA' });
    avanzar(TTL_MS + 1);
    // Cae: se usa la ultima conocida (SUSPENDIDA)
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toMatchObject({ permitir: false, code: 'LICENCIA_SUSPENDIDA' });
    // En pausa: no vuelve a preguntar
    await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente });
    expect(llamadas).toHaveLength(2);
    // Pasada la pausa vuelve a preguntar
    avanzar(PAUSA_TRAS_FALLO_MS + 1);
    await expect(
      s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).resolves.toBeDefined();
    expect(llamadas).toHaveLength(3);
  });

  it('servicio caido sin licencia conocida: se trata como activa', async () => {
    const { s } = servicio([{ status: 503, body: { error: 'X' } }]);
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toEqual({ permitir: true });
  });

  it('401 (token mal puesto) se trata como caida, no bloquea', async () => {
    const { s } = servicio([
      { status: 401, body: { error: 'TOKEN_INVALIDO' } },
    ]);
    expect(
      await s.decidirPeticion({ metodo: 'POST', ruta: '/x', usuario: cliente }),
    ).toEqual({ permitir: true });
  });

  it('cupo: libre devuelve el tope; lleno lanza 409 con enlace segun quien crea', async () => {
    const { s } = servicio([
      {
        status: 200,
        body: {
          puede_crear: true,
          activos: 4,
          usuarios_max: 5,
          estado: 'ACTIVA',
        },
      },
      {
        status: 200,
        body: {
          puede_crear: false,
          activos: 5,
          usuarios_max: 5,
          estado: 'ACTIVA',
        },
      },
    ]);
    expect(await s.verificarCupo(3, { universal: true })).toEqual({
      empresaId: 3,
      usuariosMax: 5,
      universal: true,
    });
    await expect(s.verificarCupo(3, { universal: true })).rejects.toMatchObject(
      {
        response: {
          code: 'LICENCIA_SIN_CUPO',
          activos: 5,
          usuarios_max: 5,
          enlace: 'https://sulotec.com/licencias',
        },
      },
    );
  });

  it('cupo con el servicio caido: respeta la ultima licencia si decia que no; si no, deja pasar', async () => {
    const lleno = servicio([
      {
        status: 200,
        body: {
          estado: 'ACTIVA',
          puede_crear_usuarios: false,
          usuarios_activos: 5,
          usuarios_max: 5,
        },
      },
      new TypeError('fetch failed'),
    ]);
    await lleno.s.licenciaDe(UUID_A);
    await expect(lleno.s.verificarCupo(3)).rejects.toBeInstanceOf(
      ConflictException,
    );

    const libre = servicio([new TypeError('fetch failed')]);
    expect(await libre.s.verificarCupo(3)).toBeNull();
  });

  it('reportarLuego manda el recuento de activos de esa empresa', async () => {
    const { s, llamadas } = servicio(
      [
        {
          status: 200,
          body: { puede_crear: true, activos: 2, usuarios_max: 5 },
        },
      ],
      { activos: 2 },
    );
    s.reportarLuego(3);
    await new Promise((r) => setTimeout(r, 10));
    expect(llamadas[0]).toMatchObject({
      url: `http://licencias:3200/v1/licencias/${UUID_A}/usuarios-activos`,
      metodo: 'PUT',
      cuerpo: { activos: 2 },
    });
  });
});

describe('exigirCupoEnTransaccion', () => {
  const manager = (activos: number) => {
    const m = {
      query: jest.fn(async () => []),
      count: jest.fn(async () => activos),
    };
    return m as unknown as EntityManager & typeof m;
  };

  it('sin tope no toca la base', async () => {
    const m = manager(99);
    await exigirCupoEnTransaccion(m, null);
    expect(m.query).not.toHaveBeenCalled();
  });

  it('toma el candado de la empresa, recuenta solo sus cuentas de empresa activas y frena al llegar al tope', async () => {
    const m = manager(5);
    await expect(
      exigirCupoEnTransaccion(m, { empresaId: 3, usuariosMax: 5 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(m.query).toHaveBeenCalledWith(
      'SELECT pg_advisory_xact_lock(hashtext($1))',
      ['licencias-cupo:3'],
    );
    expect(m.count).toHaveBeenCalledWith(expect.anything(), {
      where: { empresaId: 3, estado: 'ACTIVO', rolId: ROL_EMPRESA },
    });
    await expect(
      exigirCupoEnTransaccion(manager(4), { empresaId: 3, usuariosMax: 5 }),
    ).resolves.toBeUndefined();
  });
});
