import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

@Injectable()
export class SqlServerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqlServerService.name);
  private pool: sql.ConnectionPool | null = null;
  private connectionPromise: Promise<sql.ConnectionPool | null> | null = null;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.initPool();
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('Conexión a SQL Server cerrada correctamente');
    }
  }

  private async initPool(): Promise<sql.ConnectionPool | null> {
    const host = this.config.get<string>('SQL_SERVER_HOST');
    const user = this.config.get<string>('SQL_SERVER_USER');
    let password = this.config.get<string>('SQL_SERVER_PASSWORD', '');
    if (password.startsWith('Clave:')) {
      password = password.replace(/^Clave:\s*/i, '');
    }

    const database = this.config.get<string>(
      'SQL_SERVER_DATABASE',
      'PORFOLIO',
    );
    const port = Number(this.config.get<number>('SQL_SERVER_PORT', 1433));
    const rawEncrypt = this.config.get('SQL_SERVER_ENCRYPT');
    const encrypt = rawEncrypt === true || rawEncrypt === 'true';

    const rawTrustCert = this.config.get('SQL_SERVER_TRUST_CERT');
    const trustServerCertificate =
      rawTrustCert === true || rawTrustCert === 'true' || rawTrustCert === undefined;

    if (!host || !user) {
      this.logger.warn(
        'SQL_SERVER_HOST o SQL_SERVER_USER no configurados en .env. El módulo de portfolio responderá indicando configuración pendiente.',
      );
      return null;
    }

    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = (async () => {
      try {
        const config: sql.config = {
          server: host,
          port,
          database,
          user,
          password,
          options: {
            encrypt,
            trustServerCertificate,
            enableArithAbort: true,
          },
          pool: {
            max: 20,
            min: 1,
            idleTimeoutMillis: 30000,
          },
          connectionTimeout: 15000,
          requestTimeout: 30000,
        };

        this.logger.log(
          `Conectando a SQL Server (${host}:${port}/${database}) con usuario ${user}...`,
        );
        this.pool = await new sql.ConnectionPool(config).connect();
        this.logger.log('Conexión a SQL Server establecida con éxito');
        return this.pool;
      } catch (error: any) {
        this.logger.error(
          `Error al conectar a SQL Server: ${error.message}. Verifica credenciales de red y servidor en .env`,
        );
        this.pool = null;
        return null;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  async getPool(): Promise<sql.ConnectionPool> {
    if (!this.pool || !this.pool.connected) {
      const pool = await this.initPool();
      if (!pool) {
        throw new Error(
          'No se pudo establecer conexión con SQL Server. Verifica que SQL_SERVER_HOST, SQL_SERVER_USER y SQL_SERVER_PASSWORD estén completos en .env',
        );
      }
      return pool;
    }
    return this.pool;
  }

  async query<T = any>(
    sqlQuery: string,
    params?: Record<string, { value: any; type?: any }>,
  ): Promise<T[]> {
    const pool = await this.getPool();
    const request = pool.request();

    if (params) {
      for (const [key, param] of Object.entries(params)) {
        if (param.type) {
          request.input(key, param.type, param.value);
        } else {
          request.input(key, param.value);
        }
      }
    }

    const result = await request.query<T>(sqlQuery);
    return result.recordset;
  }
}
