// Licencia del producto de cada empresa según el servicio común de licencias de Sulotec. Aquí vive el estado del proceso: caché por empresa
// (5 minutos), peticiones en vuelo compartidas y pausa de 30 s tras un fallo. Reglas de la casa: si Sulotec no responde se sigue con la última
// licencia conocida y, si nunca se conoció, se trata como ACTIVA (nunca se bloquea a un cliente por una caída de Sulotec); con LICENCIAS_TOKEN
// vacío todo está apagado y nada de aquí toca la red. Nada lanza hacia la petición salvo el cupo (409). Producto sin tokens: solo cupo y estado.
import {
  ConflictException,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import { DataSource, type EntityManager } from 'typeorm';

import { UsuarioOrmEntity } from '../auth/infrastructure/persistence/entities/usuarioOrm.entity';
import {
  consultarCupo,
  obtenerLicencia,
  reportarActivos,
  type Cupo,
  type ErrorLicencias,
  type FetchFn,
} from './licencias.cliente';
import {
  crearCache,
  decidir,
  ENLACES,
  esExenta,
  parsearMapeoEmpresas,
  publica,
  PRODUCTO_POR_DEFECTO,
  ROL_EMPRESA,
  ROL_UNIVERSAL,
  textoCupo,
  type Decision,
  type Licencia,
  type LicenciaPublica,
} from './licencias.core';

export const TTL_MS = 5 * 60_000;
export const PAUSA_TRAS_FALLO_MS = 30_000;

// Lo que el guard de autenticación deja en req.user (verificado en el servidor, nunca lo que mande el navegador).
export interface UsuarioLicencia {
  sub?: number;
  rolId: number | null;
  empresaId: number | null;
}

// Tope del plan que se vuelve a comprobar dentro de la transacción del alta.
export interface CupoExigido {
  empresaId: number;
  usuariosMax: number;
  // Quien da el alta es el administrador de Sulotec: el enlace del 409 lo lleva a sulotec.com/licencias
  universal?: boolean;
}

export interface ConfigLicencias {
  url: string;
  token: string;
  producto: string;
  activo: boolean;
  mapa: Map<number, string>;
  invalidas: string[];
}

// Usuario activo (D7): fila de seguridad."Usuarios" con estado ACTIVO de la empresa y rol de empresa. El administrador de Sulotec no ocupa cupo.
export const condicionActivos = (empresaId: number) => ({
  empresaId,
  estado: 'ACTIVO',
  rolId: ROL_EMPRESA,
});

export function errorSinCupo({
  activos,
  usuarios_max,
  universal,
}: {
  activos: number | null | undefined;
  usuarios_max: number | null | undefined;
  universal: boolean;
}): ConflictException {
  return new ConflictException({
    statusCode: 409,
    error: 'Conflict',
    message: textoCupo({ activos, usuarios_max }),
    code: 'LICENCIA_SIN_CUPO',
    activos: activos ?? null,
    usuarios_max: usuarios_max ?? null,
    // El administrador de Sulotec amplía la licencia en sulotec.com/licencias; el cliente la pide en /mi-licencia.
    enlace: universal ? ENLACES.licencias : ENLACES.miLicencia,
  });
}

// Dentro de la transacción que crea o reactiva la cuenta: un candado por empresa (pg_advisory_xact_lock, se suelta al terminar la transacción)
// pone en fila las altas simultáneas de la misma empresa y se recuenta lo que hay en la base. Así dos altas a la vez no pasan las dos con el
// último cupo libre. Sin tope (apagado, sin licencia o Sulotec sin responder) no hace nada.
export async function exigirCupoEnTransaccion(
  manager: EntityManager,
  cupo: CupoExigido | null | undefined,
): Promise<void> {
  if (!cupo || !cupo.empresaId) return;
  // Funciona con el aislamiento por defecto de PostgreSQL (READ COMMITTED): el recuento se hace DESPUÉS de obtener el candado y ve las altas ya
  // confirmadas. Con REPEATABLE READ o SERIALIZABLE la foto se tomaría antes y dejaría de servir.
  await manager.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
    'licencias-cupo:' + cupo.empresaId,
  ]);
  const activos = await manager.count(UsuarioOrmEntity, {
    where: condicionActivos(cupo.empresaId),
  });
  if (activos >= cupo.usuariosMax)
    throw errorSinCupo({
      activos,
      usuarios_max: cupo.usuariosMax,
      universal: Boolean(cupo.universal),
    });
}

let mapeoLeido: {
  texto: string;
  resultado: ReturnType<typeof parsearMapeoEmpresas>;
} | null = null;

@Injectable()
export class LicenciasService implements OnApplicationBootstrap {
  private readonly logger = new Logger('Licencias');
  // Se reemplazan en las pruebas (sin red y sin esperar 5 minutos).
  fetchFn: FetchFn = (url, init) => fetch(url, init);
  ahora: () => number = () => Date.now();

  private readonly cache = crearCache<Licencia>({
    ttlMs: TTL_MS,
    ahora: () => this.ahora(),
  });
  private readonly enVuelo = new Map<string, Promise<Licencia | null>>();
  private readonly pausaHasta = new Map<string, number>();
  private readonly ultimoForzado = new Map<string, number>();
  private readonly reportes = new Map<number, { otraVez: boolean }>();

  constructor(private readonly dataSource: DataSource) {}

  // Se lee process.env en cada llamada: un token vacío apaga todo sin más.
  configuracion(): ConfigLicencias {
    const url = String(process.env.LICENCIAS_URL || '').trim();
    const token = String(process.env.LICENCIAS_TOKEN || '').trim();
    const producto =
      String(process.env.LICENCIAS_PRODUCTO || '').trim() ||
      PRODUCTO_POR_DEFECTO;
    const texto = String(process.env.LICENCIAS_EMPRESAS || '');
    if (!mapeoLeido || mapeoLeido.texto !== texto)
      mapeoLeido = { texto, resultado: parsearMapeoEmpresas(texto) };
    return {
      url,
      token,
      producto,
      activo: Boolean(url && token),
      ...mapeoLeido.resultado,
    };
  }

  // UUID de Keycloak de la empresa (id interno → UUID). null si las licencias están apagadas o la empresa no tiene UUID registrado.
  uuidDe(empresaId: number | null | undefined): string | null {
    const cfg = this.configuracion();
    if (!cfg.activo || !empresaId) return null;
    return cfg.mapa.get(empresaId) ?? null;
  }

  esUniversal(usuario: UsuarioLicencia | null | undefined): boolean {
    return usuario?.rolId === ROL_UNIVERSAL;
  }

  private enPausa(uuid: string): boolean {
    return (this.pausaHasta.get(uuid) ?? 0) > this.ahora();
  }

  // Una línea de log por llamada: empresa, llamada, resultado y milisegundos.
  private async medir<T>(
    uuid: string,
    llamada: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    const inicio = Date.now();
    try {
      const r = await fn();
      const estado = (r as { estado?: string } | null)?.estado;
      this.logger.log(
        `licencias_llamada empresa=${uuid} llamada=${llamada} resultado=${estado || 'ok'} ms=${Date.now() - inicio}`,
      );
      return r;
    } catch (error) {
      this.logger.log(
        `licencias_llamada empresa=${uuid} llamada=${llamada} resultado=${(error as ErrorLicencias)?.codigo || 'error'} ms=${Date.now() - inicio}`,
      );
      throw error;
    }
  }

  // 401 = token mal puesto (ERROR, hay que corregirlo); lo demás es una caída (WARN). En ambos casos se sigue con lo último conocido.
  private avisarFallo(
    uuid: string,
    error: unknown,
    evento = 'licencias_fallo',
  ): void {
    const e = error as ErrorLicencias;
    if (e?.status === 401)
      this.logger.error(
        `licencias_token_invalido empresa=${uuid} ${e.message}`,
      );
    else
      this.logger.warn(
        `${evento} empresa=${uuid} ${e?.message ?? String(error)}`,
      );
    this.pausaHasta.set(uuid, this.ahora() + PAUSA_TRAS_FALLO_MS);
  }

  private anotarCupo(uuid: string, cupo: Cupo | null): void {
    if (!cupo || cupo.sin_licencia) return;
    this.cache.tocar(uuid, {
      usuarios_activos: cupo.activos ?? null,
      usuarios_max: cupo.usuarios_max ?? null,
      puede_crear_usuarios: cupo.puede_crear,
      estado: cupo.estado ?? null,
    });
  }

  private async pedirLicencia(
    cfg: ConfigLicencias,
    uuid: string,
    ultima: Licencia | null,
  ): Promise<Licencia | null> {
    try {
      const licencia = await this.medir(uuid, 'licencia', () =>
        obtenerLicencia(cfg, uuid, this.fetchFn),
      );
      if (licencia.estado === 'SIN_LICENCIA')
        this.logger.warn(`licencias_sin_licencia empresa=${uuid}`);
      this.cache.guardar(uuid, licencia);
      this.pausaHasta.delete(uuid);
      return licencia;
    } catch (error) {
      this.avisarFallo(uuid, error);
      return ultima; // la última conocida, o null si nunca se conoció (= se trata como activa)
    }
  }

  // La licencia cruda de la empresa (por su UUID), { estado: 'SIN_LICENCIA' } o null si está apagado o nunca se pudo leer.
  async licenciaDe(
    uuid: string | null,
    { forzar = false }: { forzar?: boolean } = {},
  ): Promise<Licencia | null> {
    const cfg = this.configuracion();
    if (!cfg.activo || !uuid) return null;
    const guardada = this.cache.obtener(uuid);
    if (guardada?.vigente && !forzar) return guardada.valor;
    // Tras un fallo no se pregunta durante la pausa, ni siquiera forzando; y forzar (?refrescar=1) vale una vez cada 30 s por empresa,
    // para que nadie pueda martillar a Sulotec desde la web.
    if (this.enPausa(uuid)) return guardada?.valor ?? null;
    if (forzar && guardada) {
      if (
        (this.ultimoForzado.get(uuid) ?? 0) + PAUSA_TRAS_FALLO_MS >
        this.ahora()
      ) {
        if (guardada.vigente) return guardada.valor;
      } else this.ultimoForzado.set(uuid, this.ahora());
    }
    const enCurso = this.enVuelo.get(uuid);
    if (enCurso) return enCurso;
    const pedido = this.pedirLicencia(
      cfg,
      uuid,
      guardada?.valor ?? null,
    ).finally(() => this.enVuelo.delete(uuid));
    this.enVuelo.set(uuid, pedido);
    return pedido;
  }

  // GET /licencia: la empresa sale del usuario verificado en el servidor. El administrador de Sulotec sin empresa no ve franja.
  async licenciaPublica(
    usuario: UsuarioLicencia,
    { forzar = false }: { forzar?: boolean } = {},
  ): Promise<{
    exento: boolean;
    empresa: { id: number; uuid: string | null } | null;
    licencia: LicenciaPublica | null;
  }> {
    const universal = this.esUniversal(usuario);
    const empresaId = usuario?.empresaId ?? null;
    const uuid = this.uuidDe(empresaId);
    const licencia = publica(await this.licenciaDe(uuid, { forzar }), {
      universal,
    });
    return {
      exento: universal,
      empresa: empresaId ? { id: empresaId, uuid } : null,
      licencia,
    };
  }

  // Guard de escrituras (D1 a D5) para una petición ya autenticada. Nunca lanza.
  async decidirPeticion({
    metodo,
    ruta,
    usuario,
  }: {
    metodo: string;
    ruta: string;
    usuario: UsuarioLicencia | null | undefined;
  }): Promise<Decision & { estado?: string | null }> {
    if (!this.configuracion().activo || !usuario) return { permitir: true };
    const datos = {
      metodo,
      ruta,
      universal: this.esUniversal(usuario),
      empresaUuid: this.uuidDe(usuario.empresaId),
    };
    if (esExenta(datos)) return { permitir: true };
    const estado = (await this.licenciaDe(datos.empresaUuid))?.estado ?? null;
    const decision = decidir({ ...datos, estado });
    return decision.permitir ? decision : { ...decision, estado };
  }

  // Justo antes de crear una cuenta de empresa ACTIVA o de reactivarla (D6): pregunta el cupo en vivo. Sin cupo lanza el 409. El cupo es del
  // plan y se exige a todos, también al administrador de Sulotec (en este producto es quien da de alta las cuentas; él amplía el plan en
  // sulotec.com/licencias). Si Sulotec no responde se respeta la última licencia conocida si decía que no se podía crear; si no, se permite.
  // Devuelve el tope para recontar dentro de la transacción del alta, o null si no hay tope que comprobar.
  async verificarCupo(
    empresaId: number | null,
    { universal = false }: { universal?: boolean } = {},
  ): Promise<CupoExigido | null> {
    const cfg = this.configuracion();
    const uuid = this.uuidDe(empresaId);
    if (!cfg.activo || !uuid || !empresaId) return null;
    let cupo: Cupo;
    try {
      cupo = await this.medir(uuid, 'cupo', () =>
        consultarCupo(cfg, uuid, this.fetchFn),
      );
    } catch (error) {
      this.avisarFallo(uuid, error);
      const ultima = this.cache.obtener(uuid)?.valor;
      if (ultima?.puede_crear_usuarios === false) {
        throw errorSinCupo({
          activos: ultima.usuarios_activos,
          usuarios_max: ultima.usuarios_max,
          universal,
        });
      }
      this.logger.warn(`licencias_cupo_sin_verificar empresa=${uuid}`);
      return null;
    }
    this.anotarCupo(uuid, cupo);
    // Si Sulotec dice que no hay cupo, se le manda el recuento real (por si se perdió un aviso de baja) para que el siguiente intento ya lo vea.
    if (cupo.puede_crear === false) this.reportarLuego(empresaId);
    if (cupo.puede_crear === false)
      throw errorSinCupo({
        activos: cupo.activos,
        usuarios_max: cupo.usuarios_max,
        universal,
      });
    if (cupo.sin_licencia || cupo.usuarios_max == null) return null;
    return { empresaId, usuariosMax: Number(cupo.usuarios_max), universal };
  }

  async contarActivos(empresaId: number): Promise<number> {
    return this.dataSource
      .getRepository(UsuarioOrmEntity)
      .count({ where: condicionActivos(empresaId) });
  }

  // Cuenta los usuarios activos de la empresa y se lo dice a Sulotec. Nunca lanza.
  async reportarActivosDeEmpresa(empresaId: number): Promise<Cupo | null> {
    const cfg = this.configuracion();
    const uuid = this.uuidDe(empresaId);
    if (!cfg.activo || !uuid) return null;
    try {
      const activos = await this.contarActivos(empresaId);
      const cupo = await this.medir(uuid, 'usuarios-activos', () =>
        reportarActivos(cfg, uuid, activos, this.fetchFn),
      );
      this.anotarCupo(uuid, cupo);
      return cupo;
    } catch (error) {
      this.logger.warn(
        `licencias_reporte_fallo empresa=${uuid} ${(error as Error)?.message}`,
      );
      return null;
    }
  }

  // Tras crear, activar, desactivar o eliminar una cuenta: se reporta sin demorar la respuesta. Los reportes de una empresa van en serie y cada
  // uno cuenta justo antes de enviar; si llegan avisos mientras uno está en curso se hace UNO más al terminar (un conteo viejo nunca pisa uno nuevo).
  reportarLuego(empresaId: number | null | undefined): void {
    if (!empresaId || !this.uuidDe(empresaId)) return;
    const enCurso = this.reportes.get(empresaId);
    if (enCurso) {
      enCurso.otraVez = true;
      return;
    }
    const estado = { otraVez: false };
    this.reportes.set(empresaId, estado);
    void (async () => {
      do {
        estado.otraVez = false;
        await this.reportarActivosDeEmpresa(empresaId);
      } while (estado.otraVez);
    })()
      .catch(() => undefined)
      .finally(() => this.reportes.delete(empresaId));
  }

  // Al arrancar: cada empresa con UUID reporta sus activos (Sulotec queda alineado aunque se haya perdido algún aviso) y se avisa en el log de
  // las empresas activas que aún no tienen UUID (no tendrán licencia hasta agregarlas a LICENCIAS_EMPRESAS). No demora el arranque.
  onApplicationBootstrap(): void {
    const cfg = this.configuracion();
    if (!cfg.activo) {
      this.logger.log('Licencias de Sulotec apagadas (LICENCIAS_TOKEN vacío)');
      return;
    }
    if (cfg.invalidas.length)
      this.logger.warn(
        `LICENCIAS_EMPRESAS tiene entradas que no se entienden y se ignoran: ${cfg.invalidas.join(', ')}`,
      );
    void this.alinear(cfg).catch((error: unknown) =>
      this.logger.warn(
        `licencias_alineacion_fallo ${(error as Error)?.message}`,
      ),
    );
  }

  private async alinear(cfg: ConfigLicencias): Promise<void> {
    const filas: Array<{ id_empresa: number; nombre: string }> =
      await this.dataSource.query(
        `SELECT id_empresa, nombre FROM comercial."Empresas" WHERE estado = 'ACTIVO'`,
      );
    const sinUuid = filas.filter((e) => !cfg.mapa.has(Number(e.id_empresa)));
    if (sinUuid.length) {
      this.logger.warn(
        `Empresas activas sin UUID de Keycloak en LICENCIAS_EMPRESAS (sin licencia): ${sinUuid.map((e) => `${e.id_empresa} ${e.nombre}`).join('; ')}`,
      );
    }
    for (const id of cfg.mapa.keys()) await this.reportarActivosDeEmpresa(id);
    this.logger.log(`licencias_activos_alineados empresas=${cfg.mapa.size}`);
  }

  // Solo para pruebas.
  vaciar(): void {
    this.cache.vaciar();
    this.enVuelo.clear();
    this.pausaHasta.clear();
    this.ultimoForzado.clear();
  }
}
