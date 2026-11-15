import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash, hashSync } from 'bcryptjs';
import { PinoLogger } from 'nestjs-pino';
import type { SessionResolver, SessionRole, SessionUser } from '../../common/auth/session';
import { AppError } from '../../common/errors/app-error';
import { TRANSACTION_RUNNER, type TransactionRunner } from '../../common/transaction/transaction-runner';
import { toPublicUser, type PublicUser } from '../users/domain/user';
import { UsersService } from '../users/users.service';

/** Payload del JWT: solo `sub` y `role` (spec §11). `iat` y `exp` los agrega la librería. */
interface JwtPayload {
  sub: string;
  role: SessionRole;
}

// Hash bcrypt de relleno (mismo costo que el seed): se compara cuando el correo no existe para que el tiempo de
// respuesta no delate si la cuenta existe. Se genera una sola vez al cargar el módulo.
const DUMMY_HASH = hashSync('salalibre-dummy-password', 10);

const INVALID_CREDENTIALS_MESSAGE = 'Correo o contraseña incorrectos.';

/** Costo de bcryptjs para los hashes nuevos; el mismo que usa el seed. */
const BCRYPT_ROUNDS = 10;

export interface LoginResult {
  user: PublicUser;
  token: string;
  /** Vencimiento del token (para el `Max-Age` de la cookie). */
  expiresAt: Date;
}

@Injectable()
export class AuthService implements SessionResolver {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly logger: PinoLogger,
    @Inject(TRANSACTION_RUNNER) private readonly tx: TransactionRunner,
  ) {
    this.logger.setContext(AuthService.name);
  }

  /** RN-14 y F-01: credenciales incorrectas, correo inexistente o usuario inactivo → el mismo 401. */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.users.findByEmailWithCredentials(email);
    const passwordOk = await compare(password, user?.passwordHash ?? DUMMY_HASH);

    if (!user || !passwordOk || !user.isActive) {
      this.logger.info({ event: 'login', result: 'failed' }, 'login rechazado'); // S-02: el login queda en los logs
      throw new AppError('INVALID_CREDENTIALS', INVALID_CREDENTIALS_MESSAGE);
    }

    const payload: JwtPayload = { sub: user.id, role: user.role };
    const token = await this.jwt.signAsync(payload);
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    this.logger.info({ event: 'login', result: 'ok', userId: user.id }, 'login correcto');

    return { user: toPublicUser(user), token, expiresAt: new Date(exp * 1000) };
  }

  /**
   * RN-18 y F-09: cambia la contraseña propia si la actual es correcta. No invalida las sesiones abiertas
   * (T03a, notas: el spec no lo pide). Nunca loguea contraseñas ni hashes (CA5).
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    await this.tx.run(async (ctx) => {
      const user = await this.users.findById(userId);
      if (!user || !user.isActive) {
        throw new AppError('UNAUTHENTICATED', 'Necesitas iniciar sesión.');
      }
      if (!(await compare(currentPassword, user.passwordHash))) {
        this.logger.info({ event: 'password_change', result: 'failed', userId }, 'cambio de contraseña rechazado');
        throw new AppError('INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.');
      }
      await this.users.updatePasswordHash(ctx, user.id, await hash(newPassword, BCRYPT_ROUNDS));
      // T06a agrega aquí la auditoría USER_PASSWORD_CHANGED, dentro de la misma transacción.
    });
    this.logger.info({ event: 'password_change', result: 'ok', userId }, 'contraseña cambiada');
  }

  /** Valida el JWT y relee el usuario en cada petición (RN-14, RN-19). */
  async resolve(token: string): Promise<SessionUser | null> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token, { algorithms: ['HS256'] });
    } catch {
      return null; // firma inválida, vencido o mal formado
    }
    if (typeof payload.sub !== 'string') {
      return null;
    }
    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      return null;
    }
    return toPublicUser(user);
  }
}
