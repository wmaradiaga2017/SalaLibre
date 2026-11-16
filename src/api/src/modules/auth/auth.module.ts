import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { SESSION_RESOLVER } from '../../common/auth/session';
import { AuditModule } from '../audit/audit.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

@Module({
  imports: [
    UsersModule,
    AuditModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: requireEnv('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          // RN-19: la sesión dura JWT_EXPIRES_IN (8 h) y no se renueva.
          expiresIn: requireEnv('JWT_EXPIRES_IN') as `${number}h`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: SESSION_RESOLVER, useExisting: AuthService },
    // El orden importa: primero la sesión (401) y después el rol (403), como pide D-32.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
