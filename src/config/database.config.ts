import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'mssql',

  host: config.getOrThrow<string>('DB_HOST'),
  port: Number(config.get<string>('DB_PORT', '1433')),

  username: config.getOrThrow<string>('DB_USER'),
  password: config.getOrThrow<string>('DB_PASSWORD'),
  database: config.getOrThrow<string>('DB_NAME'),

  entities: [],

  synchronize: false,
  migrationsRun: false,
  logging: false,

  options: {
    encrypt: config.get<string>('DB_ENCRYPT') === 'true',
    trustServerCertificate:
      config.get<string>('DB_TRUST_SERVER_CERTIFICATE') === 'true',
  },
});
