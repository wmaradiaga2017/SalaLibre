import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { requestIdMiddleware } from './request-id/request-id.middleware';

/**
 * Configuración HTTP compartida por `main.ts` y las pruebas.
 * Se llama antes de `listen`, así los middlewares de Express quedan delante del router de Nest.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.useLogger(app.get(Logger));
  app.use(requestIdMiddleware);
  app.use(helmet());
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('SalaLibre API').setDescription('API de reservas de salas (spec §8)').setVersion('1.0').build(),
  );
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: true });

  return app;
}
