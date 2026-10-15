import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthModule } from '../auth/authModule';

import { EmpresaOrmEntity } from './infrastructure/persistence/entities/empresaOrm.entity';

import { EmpresaRepository } from './infrastructure/persistence/repositories/empresaRepository';

import { EMPRESA_REPOSITORY } from './application/ports/output/empresaRepository.port';

import { ListarEmpresasUseCase } from './application/useCase/listarEmpresasUseCase';
import { ObtenerEmpresaUseCase } from './application/useCase/obtenerEmpresaUseCase';

import { ListarEmpresasController } from './infrastructure/http/controllers/listarEmpresasController';
import { ObtenerEmpresaController } from './infrastructure/http/controllers/obtenerEmpresaController';

import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';
import { EmpresaGuard } from '../../shared/infrastructure/guards/empresaGuard';

@Module({
  imports: [TypeOrmModule.forFeature([EmpresaOrmEntity]), AuthModule],
  controllers: [ListarEmpresasController, ObtenerEmpresaController],
  providers: [
    ListarEmpresasUseCase,
    ObtenerEmpresaUseCase,
    RolesGuard,
    EmpresaGuard,
    {
      provide: EMPRESA_REPOSITORY,
      useClass: EmpresaRepository,
    },
  ],
})
export class EmpresasModule {}
