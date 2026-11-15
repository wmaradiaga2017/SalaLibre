import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Writable } from 'node:stream';
import { CommonModule } from '../src/common/common.module';
import { configureApp } from '../src/common/configure-app';
import { PlatformTestController } from './support/platform-test.controller';

interface ErrorResponse {
  error: { code: string; message: string; requestId: string };
}

async function json<T = ErrorResponse>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

const UUID =/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Plataforma transversal (T02a)', () => {
  let app: INestApplication;
  let baseUrl: string;
  const logLines: string[] = [];

  beforeAll(async () => {
    process.env.NODE_ENV = 'development'; // el logger de pruebas no debe quedar en silencio
    const logStream = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        logLines.push(...chunk.toString().split('\n').filter(Boolean));
        callback();
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [CommonModule.forRoot({ logStream })],
      controllers: [PlatformTestController],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    baseUrl = `${await app.getUrl()}/api`;
  });

  afterAll(async () => {
    await app.close();
    process.env.NODE_ENV = 'test';
  });

  it('D-06 · toda respuesta trae X-Request-Id con un UUID generado si el cliente no lo envía', async () => {
    const ok = await fetch(`${baseUrl}/test/ok`);
    const missing = await fetch(`${baseUrl}/no-existe`);

    expect(ok.headers.get('x-request-id')).toMatch(UUID);
    expect(missing.headers.get('x-request-id')).toMatch(UUID);
  });

  it('D-06 · respeta un X-Request-Id seguro del cliente y reemplaza uno inseguro', async () => {
    const kept = await fetch(`${baseUrl}/test/ok`, { headers: { 'X-Request-Id': 'abc-123' } });
    const replaced = await fetch(`${baseUrl}/test/ok`, { headers: { 'X-Request-Id': 'x'.repeat(100) } });

    expect(kept.headers.get('x-request-id')).toBe('abc-123');
    expect(replaced.headers.get('x-request-id')).toMatch(UUID);
  });

  it('D-06 · ruta inexistente → 404 NOT_FOUND con requestId igual al header', async () => {
    const res = await fetch(`${baseUrl}/no-existe`);
    const body = await json(res);

    expect(res.status).toBe(404);
    expect(body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.any(String), requestId: res.headers.get('x-request-id') },
    });
  });

  it('D-06 · campo desconocido en el body → 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/test/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ana', attendees: 2, extra: true }),
    });
    const body = await json(res);

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('extra');
  });

  it('D-06 · campo inválido o JSON mal formado → 400 VALIDATION_ERROR', async () => {
    const invalid = await fetch(`${baseUrl}/test/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', attendees: 0 }),
    });
    const malformed = await fetch(`${baseUrl}/test/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"name":',
    });

    expect(invalid.status).toBe(400);
    expect((await json(invalid)).error.code).toBe('VALIDATION_ERROR');
    expect(malformed.status).toBe(400);
    expect((await json(malformed)).error.code).toBe('VALIDATION_ERROR');
  });

  it('D-06 · body válido pasa el ValidationPipe y se transforma', async () => {
    const res = await fetch(`${baseUrl}/test/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Ana', attendees: 3 }),
    });

    expect(res.status).toBe(201);
    expect(await json(res)).toEqual({ name: 'Ana', attendees: 3 });
  });

  it('P-17 · excepción no controlada → 500 INTERNAL_ERROR sin stack trace ni detalles internos', async () => {
    const res = await fetch(`${baseUrl}/test/boom`);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(500);
    expect(Object.keys(body.error).sort()).toEqual(['code', 'message', 'requestId']);
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(text).not.toMatch(/detalle interno|db:5432|stack|at .*\.ts/);
  });

  it('D-06 · AppError → su estado y código de spec §8', async () => {
    const res = await fetch(`${baseUrl}/test/business`);

    expect(res.status).toBe(422);
    expect((await json(res)).error).toMatchObject({ code: 'ROOM_INACTIVE', message: 'La sala está inactiva.' });
  });

  it('spec §11 · log JSON por petición con requestId, método, ruta, estado y duración, sin secretos', async () => {
    const res = await fetch(`${baseUrl}/test/echo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'access_token=cookie-secreta',
        Authorization: 'Bearer token-secreto',
      },
      body: JSON.stringify({ name: 'Ana', attendees: 1, password: 'Clave-Secreta-1' }),
    });
    const requestId = res.headers.get('x-request-id');
    await new Promise((resolve) => setTimeout(resolve, 50));

    const line = logLines.map((l) => JSON.parse(l)).find((l) => l.requestId === requestId && l.res);
    expect(line).toMatchObject({
      requestId,
      req: { method: 'POST', url: '/api/test/echo' },
      res: { statusCode: 400 },
      durationMs: expect.any(Number),
    });
    const allLogs = logLines.join('\n');
    expect(allLogs).not.toMatch(/cookie-secreta|token-secreto|Clave-Secreta-1/);
  });

  it('spec §11 · cabeceras de helmet y Swagger en /api/docs', async () => {
    const health = await fetch(`${baseUrl}/test/ok`);
    const docs = await fetch(`${baseUrl}/docs`);

    expect(health.headers.get('x-content-type-options')).toBe('nosniff');
    expect(docs.status).toBe(200);
  });
});
