import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig = (
  config: ConfigService,
): TypeOrmModuleOptions => ({
  type: 'postgres',

  host: config.getOrThrow<string>('DB_HOST'),
  port: Number(config.get<string>('DB_PORT', '5432')),

  username: config.getOrThrow<string>('DB_USER'),
  password: config.getOrThrow<string>('DB_PASSWORD'),
  database: config.getOrThrow<string>('DB_NAME'),

  // En la red interna del servidor la base no usa TLS; con una base remota se activa DB_SSL=true
  ssl: config.get<string>('DB_SSL') === 'true',

  autoLoadEntities: true,

  // El esquema vive en db/schema.sql (no se deja que el ORM toque las tablas)
  synchronize: false,
  migrationsRun: false,
  logging: false,
});
