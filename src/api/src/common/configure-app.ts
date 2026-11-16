import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { requestIdMiddleware } from './request-id/request-id.middleware';
import { rejectNonUtf8Body } from './validation/utf8-body';

/**
 * Configuración HTTP compartida por `main.ts` y las pruebas.
 * Se llama antes de `listen`, así los middlewares de Express quedan delante del router de Nest.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useLogger(app.get(Logger));
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  // Los parsers se registran aquí (Nest no agrega los suyos si ya existen) para poner detrás la validación UTF-8.
  // Requiere crear la app con `rawBody: true`, que guarda el cuerpo crudo en `req.rawBody` (revisión de T04).
  const express = app as NestExpressApplication;
  express.useBodyParser('json');
  express.useBodyParser('urlencoded', { extended: true });
  app.use(rejectNonUtf8Body);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // D-33: Express sirve Swagger fuera del router de Nest (el guard global no lo cubre), así que solo se monta
  // fuera de producción. En el compose (NODE_ENV=production), /api/docs responde 404.
  if (process.env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('SalaLibre API')
        .setDescription('API de reservas de salas (spec §8)')
        .setVersion('1.0')
        .addCookieAuth('access_token')
        .build(),
    );
    SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });
  }

  return app;
}
