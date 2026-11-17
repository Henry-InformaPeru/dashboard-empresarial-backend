import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/authModule';
import { EmpresaOrmEntity } from '../empresas/infrastructure/persistence/entities/empresaOrm.entity';
import { SqlServerService } from '../../shared/infrastructure/database/sqlServer.service';
import { PortfolioService } from './application/services/portfolio.service';
import { PortfolioController } from './infrastructure/controllers/portfolio.controller';
import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([EmpresaOrmEntity]),
  ],
  controllers: [PortfolioController],
  providers: [SqlServerService, PortfolioService, RolesGuard],
  exports: [PortfolioService, SqlServerService],
})
export class PortfolioModule {}
