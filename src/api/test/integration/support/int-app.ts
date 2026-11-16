import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../../src/app.module';
import { loadBusinessConfig } from '../../../src/common/config/business-config';
import { configureApp } from '../../../src/common/configure-app';
import { addDays, localDate, startOfLocalDay } from '../../../src/common/time/zoned-time';
import { PrismaService } from '../../../src/prisma/prisma.service';

/**
 * Soporte de las pruebas de integración (T06, S-08): la app completa (`AppModule`) contra PostgreSQL real, sin dobles.
 * Corre dentro del contenedor `api-test` con `DATABASE_URL` apuntando a `salalibre_test` (la recrea `run.sh`).
 */

export interface ApiError {
  error: { code: string; message: string; requestId: string };
}

export interface BookingBody {
  id: string;
  roomId: string;
  owner: { id: string; name: string };
  title: string | null;
  status: 'CONFIRMED' | 'CANCELLED';
  isMine: boolean;
  startAt: string;
  endAt: string;
}

export interface RoomBody {
  id: string;
  name: string;
  capacity: number;
  isActive: boolean;
}

export interface UserBody {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
}

/** Credenciales del seed (spec §10, D-26; el compose las define con sus valores por defecto). */
export const SEED = {
  admin: { email: 'admin@salalibre.local', password: process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345' },
  emp1: { email: 'empleado1@salalibre.local', password: process.env.SEED_USER_PASSWORD ?? 'Empleado12345' },
  emp2: { email: 'empleado2@salalibre.local', password: process.env.SEED_USER_PASSWORD ?? 'Empleado12345' },
};

export const TEST_PASSWORD = 'Integracion123';

export const config = loadBusinessConfig();

/** Sufijo único por llamada, para nombres y correos que no choquen entre pruebas ni entre corridas. */
export const unique = () => randomUUID().slice(0, 8);

/**
 * Próximo día hábil (lunes a viernes) posterior a hoy en `BUSINESS_TZ`, calculado desde "ahora" (nunca fijo).
 * `offset` salta más días hábiles, para pruebas que necesitan fechas distintas.
 */
export function nextBusinessDay(offset = 0): string {
  let date = localDate(new Date(), config.timeZone);
  let remaining = offset + 1;
  while (remaining > 0) {
    date = addDays(date, 1);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      remaining -= 1;
    }
  }
  return date;
}

/** Instante ISO de `date` a la hora local `HH:MM` en `BUSINESS_TZ`. */
export function at(date: string, time: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(startOfLocalDay(date, config.timeZone).getTime() + (h * 60 + m) * 60_000).toISOString();
}

export function today(): string {
  return localDate(new Date(), config.timeZone);
}

export class IntegrationApp {
  private constructor(
    readonly app: INestApplication,
    readonly baseUrl: string,
    readonly prisma: PrismaService,
  ) {}

  static async start(): Promise<IntegrationApp> {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication({ bufferLogs: true, rawBody: true });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    return new IntegrationApp(app, `${await app.getUrl()}/api`, moduleRef.get(PrismaService));
  }

  async close(): Promise<void> {
    await this.app.close();
  }

  /** Limpieza entre pruebas: reservas y cierres. Usuarios y salas se crean con nombres únicos y quedan. */
  async reset(): Promise<void> {
    await this.prisma.booking.deleteMany({});
    await this.prisma.closure.deleteMany({});
  }

  request(
    method: string,
    path: string,
    options: { cookie?: string; body?: unknown; requestId?: string } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {};
    if (options.requestId) headers['X-Request-Id'] = options.requestId; // T06a: para buscar las filas de auditoría
    if (options.cookie) headers.Cookie = options.cookie;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  }

  /** Inicia sesión y devuelve `access_token=<jwt>` para el header `Cookie`. */
  async login(email: string, password: string): Promise<string> {
    const res = await this.request('POST', '/auth/login', { body: { email, password } });
    if (res.status !== 200) {
      throw new Error(`login de ${email} respondió ${res.status}`);
    }
    const header = res.headers.getSetCookie().find((c) => c.startsWith('access_token='));
    return header?.split(';')[0] ?? '';
  }

  /** Crea un usuario con la API (como ADMIN) y devuelve su id y su cookie. */
  async createUser(adminCookie: string, role: 'ADMIN' | 'EMPLOYEE' = 'EMPLOYEE') {
    const email = `int.${unique()}@salalibre.local`;
    const res = await this.request('POST', '/users', {
      cookie: adminCookie,
      body: { name: `Prueba ${email}`, email, password: TEST_PASSWORD, role },
    });
    if (res.status !== 201) {
      throw new Error(`POST /users respondió ${res.status}`);
    }
    const user = (await res.json()) as UserBody;
    return { ...user, cookie: await this.login(email, TEST_PASSWORD) };
  }

  /** Crea una sala con la API (como ADMIN) con nombre único. */
  async createRoom(adminCookie: string, capacity = 10): Promise<RoomBody> {
    const res = await this.request('POST', '/rooms', {
      cookie: adminCookie,
      body: { name: `Sala Int ${unique()}`, capacity, location: 'Piso de pruebas', equipment: [] },
    });
    if (res.status !== 201) {
      throw new Error(`POST /rooms respondió ${res.status}`);
    }
    return (await res.json()) as RoomBody;
  }

  book(
    cookie: string,
    roomId: string,
    date: string,
    start: string,
    end: string,
    extra: Record<string, unknown> = {},
  ): Promise<Response> {
    return this.request('POST', '/bookings', {
      cookie,
      body: { roomId, startAt: at(date, start), endAt: at(date, end), title: 'Reunión de prueba', attendees: 2, ...extra },
    });
  }

  cancel(cookie: string, id: string): Promise<Response> {
    return this.request('POST', `/bookings/${id}/cancel`, { cookie });
  }

  /** Reservas `CONFIRMED` de una sala que empiezan en `[from, to)`, leídas directamente de la base. */
  confirmedIn(where: { roomId?: string; userId?: string; from: Date; to?: Date }) {
    return this.prisma.booking.count({
      where: {
        status: 'CONFIRMED',
        roomId: where.roomId,
        userId: where.userId,
        startAt: { gte: where.from, ...(where.to ? { lt: where.to } : {}) },
      },
    });
  }
}

export async function body<T = ApiError>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** Cuenta los códigos de estado de un conjunto de respuestas, p. ej. `{ 201: 1, 409: 19 }`. */
export function statusCount(responses: Response[]): Record<number, number> {
  const count: Record<number, number> = {};
  for (const r of responses) count[r.status] = (count[r.status] ?? 0) + 1;
  return count;
}
