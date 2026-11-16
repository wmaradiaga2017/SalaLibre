import { DynamicModule, Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import type { DestinationStream } from 'pino';
import { BUSINESS_CONFIG, loadBusinessConfig } from './config/business-config';
import { HttpExceptionFilter } from './errors/http-exception.filter';
import { loggerOptions } from './logging/logger.options';
import { CLOCK, SystemClock } from './time/clock';
import { createValidationPipe } from './validation/validation.pipe';

export interface CommonModuleOptions {
  /** Destino de los logs; solo lo usan las pruebas. Por defecto, stdout. */
  logStream?: DestinationStream;
}

/**
 * Plataforma transversal: logger pino, filtro de errores y ValidationPipe globales, configuración de negocio y reloj.
 * No depende de la base.
 */
@Global()
@Module({})
export class CommonModule {
  static forRoot(options: CommonModuleOptions = {}): DynamicModule {
    return {
      module: CommonModule,
      imports: [LoggerModule.forRoot(loggerOptions(options.logStream))],
      providers: [
        { provide: APP_FILTER, useClass: HttpExceptionFilter },
        { provide: APP_PIPE, useFactory: createValidationPipe },
        // Parámetros de spec §5 (se validan al arrancar) y reloj inyectable.
        { provide: BUSINESS_CONFIG, useFactory: () => loadBusinessConfig() },
        { provide: CLOCK, useClass: SystemClock },
      ],
      exports: [BUSINESS_CONFIG, CLOCK],
    };
  }
}
