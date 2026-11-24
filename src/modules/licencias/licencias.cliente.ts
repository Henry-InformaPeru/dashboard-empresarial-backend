// Cliente HTTP del servicio común de licencias de Sulotec (Licencias-Backend). Solo arma las peticiones y lee las respuestas; quien lo usa
// (licencias.service.ts) decide qué hacer si falla. `fetchFn` se inyecta para probarlo sin red. Contrato v1: Authorization Bearer <token>, todo
// en JSON, errores { error: 'CODIGO', mensaje } y 404 { error: 'SIN_LICENCIA' } cuando la empresa no tiene el producto contratado.
import type { Licencia } from './licencias.core';

export const TIEMPO_MS = 3000;

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

export interface ConfigCliente {
  url: string;
  token: string;
}

export class ErrorLicencias extends Error {
  constructor(
    readonly codigo: string,
    mensaje?: string | null,
    readonly status: number | null = null,
  ) {
    super('Licencias ' + codigo + (mensaje ? ': ' + mensaje : ''));
  }
}

export interface Cupo {
  puede_crear: boolean;
  activos?: number | null;
  usuarios_max?: number | null;
  estado?: string | null;
  sin_licencia?: boolean;
}

const SIN_LICENCIA = 'SIN_LICENCIA';

// Una petición → { status, body }. Red o tiempo agotado → ErrorLicencias('RED'). El 404 SIN_LICENCIA es una respuesta (la empresa no tiene el
// producto), no un error; cualquier otro no-2xx lanza con el código que mandó el servicio o HTTP_<status>.
async function pedir(
  { url, token }: ConfigCliente,
  ruta: string,
  fetchFn: FetchFn,
  { metodo = 'GET', cuerpo }: { metodo?: string; cuerpo?: unknown } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const direccion = String(url || '').replace(/\/+$/, '') + ruta;
  let r: Response;
  try {
    r = await fetchFn(direccion, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(TIEMPO_MS),
      ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
    });
  } catch (error: unknown) {
    const e = error as { message?: string; cause?: { message?: string } };
    throw new ErrorLicencias(
      'RED',
      e?.cause?.message || e?.message || String(error),
    );
  }
  const body = (await r.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (r.status === 404 && body?.error === SIN_LICENCIA)
    return { status: 404, body };
  if (r.status < 200 || r.status >= 300) {
    throw new ErrorLicencias(
      typeof body?.error === 'string' ? body.error : 'HTTP_' + r.status,
      typeof body?.mensaje === 'string' ? body.mensaje : null,
      r.status,
    );
  }
  if (!body || typeof body !== 'object') {
    throw new ErrorLicencias(
      'RESPUESTA_INVALIDA',
      'La respuesta del servicio no es JSON',
      r.status,
    );
  }
  return { status: r.status, body };
}

const rutaDe = (empresaUuid: string, sufijo = ''): string =>
  `/v1/licencias/${encodeURIComponent(empresaUuid)}${sufijo}`;

// §4.1 La licencia de la empresa; { estado: 'SIN_LICENCIA' } si no tiene el producto contratado.
export async function obtenerLicencia(
  cfg: ConfigCliente,
  empresaUuid: string,
  fetchFn: FetchFn,
): Promise<Licencia> {
  const { status, body } = await pedir(cfg, rutaDe(empresaUuid), fetchFn);
  return status === 404 ? { estado: SIN_LICENCIA } : body;
}

// §4.2 ¿Puede crear o reactivar un usuario? Sin licencia no hay cupo que exigir.
export async function consultarCupo(
  cfg: ConfigCliente,
  empresaUuid: string,
  fetchFn: FetchFn,
): Promise<Cupo> {
  const { status, body } = await pedir(
    cfg,
    rutaDe(empresaUuid, '/cupo'),
    fetchFn,
  );
  return status === 404
    ? { estado: SIN_LICENCIA, puede_crear: true, sin_licencia: true }
    : (body as unknown as Cupo);
}

// §4.3 Cuántos usuarios activos tiene la empresa; responde igual que §4.2.
export async function reportarActivos(
  cfg: ConfigCliente,
  empresaUuid: string,
  activos: number,
  fetchFn: FetchFn,
): Promise<Cupo> {
  const { status, body } = await pedir(
    cfg,
    rutaDe(empresaUuid, '/usuarios-activos'),
    fetchFn,
    {
      metodo: 'PUT',
      cuerpo: { activos: Number(activos) },
    },
  );
  return status === 404
    ? { estado: SIN_LICENCIA, puede_crear: true, sin_licencia: true }
    : (body as unknown as Cupo);
}
