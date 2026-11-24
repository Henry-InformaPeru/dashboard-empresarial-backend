// Reglas de la licencia del producto (lógica pura: sin red ni base, para poder probarlas solas). La única verdad de la licencia de cada empresa
// es el servicio común de licencias de Sulotec (Licencias-Backend); aquí solo se traduce lo que ese servicio respondió a qué peticiones pasan,
// cuáles se bloquean y qué texto ve la persona. Ante la duda (estado nulo o desconocido) se permite. Mismo criterio que GeoMatrix y MiRadar 360
// (docs/licencias/INTEGRACION-PRODUCTOS.md de Sulotec-infra), sin tokens: este producto se licencia solo por usuarios.

export const NOMBRE_PRODUCTO = 'Dashboard Empresarial';
export const PRODUCTO_POR_DEFECTO = 'dashboard';

// Roles del producto: 1 = administrador de Sulotec (universal: no ocupa cupo ni lo frena el guard), 2 = usuario de una empresa cliente.
export const ROL_UNIVERSAL = 1;
export const ROL_EMPRESA = 2;

export const ENLACES = Object.freeze({
  miLicencia: 'https://sulotec.com/mi-licencia',
  licencias: 'https://sulotec.com/licencias',
  contacto: 'contacto@sulotec.com',
});

export type EstadoLicencia =
  'ACTIVA' | 'SOLO_LECTURA' | 'SUSPENDIDA' | 'CANCELADA' | 'SIN_LICENCIA';

// Lo que responde GET /v1/licencias/{uuid} (solo los campos que se usan aquí).
export interface Licencia {
  estado?: string | null;
  plan?: string | null;
  usuarios_max?: number | null;
  usuarios_activos?: number | null;
  puede_crear_usuarios?: boolean | null;
  vencimiento?: string | null;
  dias_para_vencer?: number | null;
}

// Lo que ve la web (GET /licencia). null = licencias apagadas o nunca se pudo leer: la web no muestra nada.
export interface LicenciaPublica {
  estado: string | null;
  plan: string | null;
  usuarios_max: number | null;
  usuarios_activos: number | null;
  puede_crear_usuarios: boolean | null;
  vencimiento: string | null;
  dias_para_vencer: number | null;
  mensaje: string;
  enlace: string;
}

const MENSAJES: Readonly<Record<string, string>> = Object.freeze({
  ACTIVA: '',
  SOLO_LECTURA: `La licencia de ${NOMBRE_PRODUCTO} de tu empresa venció: puedes consultar la información, pero no registrar cambios. Renueva en Sulotec.`,
  SUSPENDIDA: `La licencia de ${NOMBRE_PRODUCTO} de tu empresa está suspendida: no se pueden registrar cambios. Escribe a ${ENLACES.contacto}.`,
  CANCELADA: `La licencia de ${NOMBRE_PRODUCTO} de tu empresa está cancelada. Escribe a ${ENLACES.contacto}.`,
  SIN_LICENCIA: `Esta empresa no tiene una licencia de ${NOMBRE_PRODUCTO} registrada en Sulotec.`,
});

// hasOwn: un estado raro (p. ej. "constructor") no pesca nada del prototipo.
export const mensajeDeEstado = (estado: unknown): string =>
  Object.hasOwn(MENSAJES, String(estado)) ? MENSAJES[String(estado)] : '';

export const textoCupo = ({
  activos,
  usuarios_max,
}: {
  activos: number | null | undefined;
  usuarios_max: number | null | undefined;
}): string =>
  `Tu plan llegó al máximo de usuarios activos (${activos ?? '?'} de ${usuarios_max ?? '?'}). Desactiva un usuario o amplía tu licencia en Sulotec.`;

// Código del 403 por cada estado que bloquea las escrituras. ACTIVA, SIN_LICENCIA, nulo o un estado nuevo no bloquean (D5).
const CODIGOS: Readonly<Record<string, string>> = Object.freeze({
  SOLO_LECTURA: 'LICENCIA_SOLO_LECTURA',
  SUSPENDIDA: 'LICENCIA_SUSPENDIDA',
  CANCELADA: 'LICENCIA_CANCELADA',
});
export const codigoDe = (estado: unknown): string | null =>
  Object.hasOwn(CODIGOS, String(estado)) ? CODIGOS[String(estado)] : null;

const LEE = new Set(['GET', 'HEAD', 'OPTIONS']);
// Rutas que nunca se bloquean: la sesión, la propia licencia (sin ella nadie vería el aviso) y la salud del contenedor.
const PREFIJOS_EXENTOS = Object.freeze(['/auth', '/licencia', '/health']);

const normalizar = (ruta: string | null | undefined): string =>
  (ruta ?? '').split('?')[0].replace(/\/+$/, '') || '/';
const bajo = (ruta: string, prefijo: string): boolean =>
  ruta === prefijo || ruta.startsWith(prefijo + '/');

export interface DatosPeticion {
  metodo: string;
  ruta: string;
  universal: boolean;
  // UUID de Keycloak de la empresa del usuario verificado (null = sin empresa o sin UUID registrado: no se mira nada).
  empresaUuid: string | null;
}

// Peticiones que no se miran nunca (D2): lecturas, el administrador de Sulotec, lo que no es de ninguna empresa y las rutas exentas.
export function esExenta({
  metodo,
  ruta,
  universal,
  empresaUuid,
}: DatosPeticion): boolean {
  if (LEE.has(String(metodo || '').toUpperCase())) return true;
  if (universal) return true;
  if (!empresaUuid) return true;
  const r = normalizar(ruta);
  return PREFIJOS_EXENTOS.some((p) => bajo(r, p));
}

export type Decision =
  | { permitir: true }
  | { permitir: false; statusCode: 403; code: string; mensaje: string };

// SOLO_LECTURA (vencida): lecturas sí, escrituras no. SUSPENDIDA o CANCELADA: tampoco escrituras. Los usuarios de empresa de este producto
// solo consultan (las altas y bajas las hace el administrador de Sulotec, que está exento), así que no hace falta abrir excepciones.
export function decidir(
  datos: DatosPeticion & { estado: string | null },
): Decision {
  if (esExenta(datos)) return { permitir: true };
  const code = codigoDe(datos.estado);
  if (!code) return { permitir: true };
  return {
    permitir: false,
    statusCode: 403,
    code,
    mensaje: mensajeDeEstado(datos.estado),
  };
}

// Lo que ve la web (D9). null = licencias apagadas o nunca se pudo leer (no se muestra nada).
export function publica(
  licencia: Licencia | null,
  { universal = false }: { universal?: boolean } = {},
): LicenciaPublica | null {
  if (!licencia) return null;
  const enlace = universal ? ENLACES.licencias : ENLACES.miLicencia;
  const estado = licencia.estado ?? null;
  if (estado === 'SIN_LICENCIA') {
    return {
      estado,
      plan: null,
      usuarios_max: null,
      usuarios_activos: null,
      puede_crear_usuarios: null,
      vencimiento: null,
      dias_para_vencer: null,
      mensaje: mensajeDeEstado(estado),
      enlace,
    };
  }
  return {
    estado,
    plan: licencia.plan ?? null,
    usuarios_max: licencia.usuarios_max ?? null,
    usuarios_activos: licencia.usuarios_activos ?? null,
    puede_crear_usuarios: licencia.puede_crear_usuarios ?? null,
    vencimiento: licencia.vencimiento ?? null,
    dias_para_vencer: licencia.dias_para_vencer ?? null,
    mensaje: mensajeDeEstado(estado),
    enlace,
  };
}

// ---- Empresa → UUID de Keycloak ----
// Este producto todavía no guarda el UUID de Keycloak de cada empresa. Mientras tanto se toma de LICENCIAS_EMPRESAS, que asocia el id interno
// de la empresa (comercial."Empresas".id_empresa) con su UUID del grupo «Empresas» de la cuenta Sulotec: "3=3f1c2a7e-...,7=0a1b2c3d-...".
// Una empresa que no está en la lista no consulta nada (como si las licencias estuvieran apagadas para ella). Lo que no se entiende se ignora.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function parsearMapeoEmpresas(texto: string | null | undefined): {
  mapa: Map<number, string>;
  invalidas: string[];
} {
  const mapa = new Map<number, string>();
  const invalidas: string[] = [];
  const usados = new Set<string>();
  for (const parte of (texto ?? '').split(/[,;\s]+/)) {
    if (!parte) continue;
    const [idTexto, uuidTexto, ...resto] = parte.split(/[=:]/);
    const id = Number(idTexto);
    const uuid = String(uuidTexto ?? '').toLowerCase();
    // Un UUID repetido para dos empresas mezclaría sus cupos: se rechaza la segunda.
    if (
      resto.length ||
      !/^\d+$/.test(idTexto ?? '') ||
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      !UUID.test(uuid) ||
      mapa.has(id) ||
      usados.has(uuid)
    ) {
      invalidas.push(parte);
      continue;
    }
    mapa.set(id, uuid);
    usados.add(uuid);
  }
  return { mapa, invalidas };
}

// ---- Caché por empresa con vencimiento ----
// Una entrada vencida no se borra sola: se devuelve marcada como no vigente, porque ante una caída del servicio la última licencia conocida vale
// más que nada. Memoria acotada: pasado el tope se borra lo vencido y, si aún sobra, lo más antiguo. `ahora` se inyecta para probarla.
export interface Cache<T> {
  obtener(clave: string): { valor: T; vigente: boolean } | null;
  guardar(clave: string, valor: T): void;
  tocar(clave: string, parcial: Partial<T>): boolean;
  vaciar(): void;
}

export function crearCache<T>({
  ttlMs = 5 * 60_000,
  maximo = 500,
  ahora = () => Date.now(),
}: { ttlMs?: number; maximo?: number; ahora?: () => number } = {}): Cache<T> {
  const filas = new Map<string, { valor: T; vence: number }>();
  return {
    obtener(clave) {
      const fila = filas.get(clave);
      return fila ? { valor: fila.valor, vigente: fila.vence > ahora() } : null;
    },
    guardar(clave, valor) {
      filas.delete(clave);
      filas.set(clave, { valor, vence: ahora() + ttlMs });
      if (filas.size > maximo) {
        const t = ahora();
        for (const [k, f] of filas) if (f.vence <= t) filas.delete(k);
        for (const k of filas.keys()) {
          if (filas.size <= maximo) break;
          filas.delete(k);
        }
      }
    },
    // Mezcla datos frescos (el cupo recién consultado) sin renovar el vencimiento.
    tocar(clave, parcial) {
      const fila = filas.get(clave);
      if (!fila) return false;
      fila.valor = { ...fila.valor, ...parcial };
      return true;
    },
    vaciar() {
      filas.clear();
    },
  };
}
