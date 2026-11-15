import type { Request, Response } from 'express';
import type { Params } from 'nestjs-pino';
import type { DestinationStream } from 'pino';

/** Rutas que pino reemplaza por "[REDACTED]". Nunca se loguean contraseñas, hashes, cookies ni tokens. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'token',
  '*.password',
  '*.passwordHash',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
];

/**
 * Logs JSON con pino (spec §11): cada petición genera una línea con requestId, método, ruta, estado y duración.
 * Los serializadores solo exponen esos campos, así que cabeceras y cuerpos no llegan al log.
 */
export function loggerOptions(stream?: DestinationStream): Params {
  return {
    pinoHttp: [
      {
        level: process.env.NODE_ENV === 'test' ? 'silent' : 'info',
        genReqId: (req) => (req as unknown as Request).id,
        quietReqLogger: true,
        customAttributeKeys: { reqId: 'requestId', responseTime: 'durationMs' },
        serializers: {
          req: (req: Request) => ({ method: req.method, url: req.url }),
          res: (res: Response) => ({ statusCode: res.statusCode }),
        },
        customSuccessMessage: () => 'petición atendida',
        customErrorMessage: () => 'petición con error',
        redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
      },
      stream,
    ] as Params['pinoHttp'],
  };
}
