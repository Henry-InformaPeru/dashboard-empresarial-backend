import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { databaseConfig } from './config/database.config';
import { envValidationSchema } from './config/env.validation';
import { AuthModule } from './modules/auth/authModule';
import { EmpresasModule } from './modules/empresas/empresasModule';
import { DashboardsModule } from './modules/dashboards/dashboardsModule';
import { PeriodosModule } from './modules/periodos/periodosModule';
import { AsignacionesModule } from './modules/asignaciones/asignacionesModule';
import { UsuariosModule } from './modules/usuarios/usuariosModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: databaseConfig,
    }),

    AuthModule,
    EmpresasModule,
    DashboardsModule,
    PeriodosModule,
    AsignacionesModule,
    UsuariosModule,
  ],
})
export class AppModule {}
