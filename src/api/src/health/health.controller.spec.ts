import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('Health', () => {
  async function build(ping: jest.Mock) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: PrismaService, useValue: { ping } }],
    }).compile();
    return moduleRef.get(HealthController);
  }

  it('O5 · GET /health responde {"status":"ok"} tras consultar la base', async () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    const controller = await build(ping);

    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('O5 · GET /health falla si la base no responde', async () => {
    const controller = await build(jest.fn().mockRejectedValue(new Error('sin conexión')));

    await expect(controller.check()).rejects.toThrow('sin conexión');
  });
});
