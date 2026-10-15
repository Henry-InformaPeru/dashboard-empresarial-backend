import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LoginUseCase } from './application/useCase/loginUseCase';
import { AuthService } from './domain/services/authService';

import { USUARIO_REPOSITORY } from './application/ports/output/usuarioRepository.port';
import { PASSWORD_HASHER } from './application/ports/output/passwordHasher.port';
import { TOKEN_GENERATOR } from './application/ports/output/tokenGenerator.port';

import { UsuarioOrmEntity } from './infrastructure/persistence/entities/usuarioOrm.entity';
import { UsuarioRepository } from './infrastructure/persistence/repositories/usuarioRepository';

import { BcryptPasswordHasher } from './infrastructure/security/bcrypt/bcryptPasswordHasher';
import { JwtTokenGenerator } from './infrastructure/security/jwt/jwtTokenGenerator';

import { PassportModule } from '@nestjs/passport';

import { ObtenerPerfilUseCase } from './application/useCase/obtenerPerfilUseCase';

import { JwtStrategy } from './infrastructure/security/jwt/jwtStrategy';
import { JwtAuthGuard } from './infrastructure/http/guards/jwtAuthGuard';
import { AccesoActualService } from '../../shared/infrastructure/security/accesoActualService';
import { RolesGuard } from '../../shared/infrastructure/guards/rolesGuard';
import { EmpresaGuard } from '../../shared/infrastructure/guards/empresaGuard';
import { LoginController } from './infrastructure/http/controllers/loginController';
import { ObtenerPerfilController } from './infrastructure/http/controllers/obtenerPerfilController';

@Module({
  imports: [
    TypeOrmModule.forFeature([UsuarioOrmEntity]),

    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '1h',
          algorithm: 'HS256',
        },
      }),
    }),
    PassportModule,
  ],

  controllers: [LoginController, ObtenerPerfilController],

  providers: [
    AuthService,
    ObtenerPerfilUseCase,
    JwtStrategy,
    JwtAuthGuard,
    LoginUseCase,
    AccesoActualService,
    RolesGuard,
    EmpresaGuard,
    {
      provide: USUARIO_REPOSITORY,
      useClass: UsuarioRepository,
    },
    {
      provide: PASSWORD_HASHER,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_GENERATOR,
      useClass: JwtTokenGenerator,
    },
  ],

  exports: [AuthService, PASSWORD_HASHER],
})
export class AuthModule {}
