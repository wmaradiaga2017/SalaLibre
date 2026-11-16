# CLAUDE.md

## Contexto
App interna de gestion de reservas de salas de reunión (80 personas, 5 salas, RRHH administra). Corre solo en local con
`docker compose up`; no hay despliegue en la nube.
**Todo el código lo escribe el agente.** La persona decide, planifica y revisa.

**Stack:** Node 24 LTS · NestJS · Prisma · PostgreSQL 16 · React 19 + Vite + Tailwind · TanStack Query · Jest · Docker Compose + nginx.

## Documentos (leer antes de cualquier tarea)
| Documento | Para qué | Prioridad ante contradicciones |
|---|---|---|
| `docs/01-spec.md` | Reglas de negocio, permisos, arquitectura, datos y API | 1 (manda) |
| `docs/00-decisiones.md` | El porqué de cada decisión (las reemplazadas no aplican) | 2 |
| `docs/diseño/DESIGN.md` | Guía visual: colores, tipografía, formas y componentes base | 3 |
| `docs/diseño/stitch/*.png` / `*.html` | Referencia visual y de estructura | 4 |
| `docs/02-backlog.md` | Qué hacer y en qué orden | — |

## Ubicacion de codigo
- Para el desarrollo del front y el backend crea la carpeta SRC sino existe y maneja el frontend y backend en carpetas separadas dentro de SRC

## Forma de trabajo
1. Ejecutar **una tarea a la vez, en el orden del backlog**. No empezar una tarea si sus dependencias no están Hechas.
2. Antes de empezar: releer la tarea y las RN, D y secciones de spec y diseño que referencia.
3. **No inventar reglas.** Si algo no está en el spec, aplicar la opción más conservadora y registrarlo en
   "Ambigüedades encontradas" del documento de la tarea.
4. No implementar nada que esté en "Fuera de alcance" (de la tarea o del spec).
5. Antes de cerrar la tarea:
   - Correr la verificación y `npm run lint`, y confirmar que `docker compose up` sigue funcionando.
   - Escribir `docs/tareas/Txx.md` con `docs/tareas/_plantilla-tarea.md`, pegando la salida real.
   - Agregar una fila `AGENTE` al final de `docs/03-bitacora.md`.
   - Actualizar el estado en `docs/02-backlog.md`.
   - Hacer el commit `Txx: <título>`.
6. Detenerse al terminar cada tarea, salvo que la instrucción pida ejecutar el backlog completo.

## Bitácora (`docs/03-bitacora.md`)
- **Hora real, siempre:** antes de escribir cualquier fecha u hora (en la bitácora, en `docs/tareas/Txx.md` o
  en otro documento), obtenerla del sistema con `date "+%Y-%m-%d %H:%M"` (Bash) o
  `Get-Date -Format "yyyy-MM-dd HH:mm"` (PowerShell). **Nunca estimar ni inventar horas.**
- **Solo se agregan filas** al final de la tabla. Nunca se editan ni se borran filas existentes; una corrección es una fila nueva.
- **ID consecutivo:** `B-xx`, a partir de la última fila.
- **Actor:** las filas que genera el agente por su propio trabajo llevan `Agente`. Las que la persona dicta con `/bitacora` llevan `Yo`.
- Se registran también los errores y los reintentos relevantes (tipo `ERROR`), no solo los éxitos.

## Arquitectura del backend
- **Capas:** Controller → Service → Dominio + Repositorio (interfaz) → implementación Prisma.
- **Controllers:** solo HTTP, DTOs y decoradores. **Nunca** importan Prisma ni repositorios.
- **Dominio** (`modules/*/domain/`): reglas puras. **Nunca** importa `@nestjs/*`, `@prisma/*` ni nada de HTTP.
- **Services:** dependen de **interfaces** inyectadas por token, nunca de `PrismaXxxRepository`.
- **Módulos:** solo usan lo que otro módulo exporta (su service), nunca archivos internos ajenos.
- **Escrituras:** usan `TransactionRunner.run(ctx => …)` e incluyen la auditoría en la misma transacción (desde T06a).
- **Lo transversal** (request ID, errores, guards, decoradores) vive en `common/`; no se duplica en los módulos.

## Seguridad (obligatorio)
- **Denegación por defecto:** `JwtAuthGuard` es global. Solo `POST /auth/login` y `GET /health` llevan `@Public()`. No agregar más rutas públicas sin que lo diga el spec.
- **Roles:** con `@Roles('ADMIN')` + `RolesGuard`.
- **Propiedad** ("solo lo tuyo"): se resuelve en `BookingPolicy` (dominio), no en el controller.
- **Sesión:** JWT en la cookie `access_token` con `httpOnly`, `SameSite=Strict` y `Path=/api`. El frontend **nunca** maneja tokens; usa `credentials: 'include'` y `GET /auth/me`.
- **Contraseñas** con **bcryptjs** (no `bcrypt` nativo).
- **Entradas:** `ValidationPipe` con `whitelist` + `forbidNonWhitelisted`.
- **Errores:** sin stack traces en las respuestas.
- **Nunca** loguear ni auditar contraseñas, hashes, cookies ni tokens.
- Los guards del frontend son solo para la experiencia de uso; **toda** autorización real está en la API.

## Errores, trazabilidad y auditoría
- **Formato de error único:** `{ error: { code, message, requestId } }`. El código PostgreSQL `23P01` se traduce a 409 `BOOKING_CONFLICT`.
- **Códigos:** 400 formato · 401 sin sesión · 403 sin permiso · 404 no existe · 409 conflicto · 422 regla de negocio.
- **Request ID:** en cada log (pino, JSON), en el header `X-Request-Id`, en los errores y en `audit_logs`.
- **Auditoría:** `audit_logs` solo recibe filas nuevas.
- **Tests:** los nombres incluyen la regla, por ejemplo `it('RN-03 · …')`.

## Datos
- La restricción anti-choques (`EXCLUDE USING gist`) y el trigger de inmutabilidad de `audit_logs` viven en migraciones SQL propias: **nunca se eliminan, regeneran ni reemplazan por código**.
- Las fechas se guardan en UTC (`timestamptz`). La zona del negocio es `BUSINESS_TZ`.
- El seed es idempotente (upsert).

## Docker
- Nada de pasos manuales. Las variables tienen valor por defecto en el compose (`${VAR:-valor}`), así que no hace falta `.env`.
- **`api`:** `prisma migrate deploy` → seed → arranque. Healthchecks con `depends_on: condition: service_healthy`.
- **Puertos:** solo se publica el **8080** (nginx). `api` y `db` quedan en la red interna; nginx hace proxy de `/api`.
- **Imágenes:** `node:24-alpine` y `postgres:16-alpine`. Builds multi-stage con `npm ci`. La API corre con un usuario no root.
- **Saltos de línea:** `.gitattributes` con `* text=auto eol=lf`, porque se desarrolla en Windows y un `.sh` con CRLF rompe el contenedor.

## Frontend
- Estructura por features (`features/auth|bookings|rooms|users|closures|audit`) + `shared/`.
- **TanStack Query** para los datos del servidor; **React Hook Form + Zod** para los formularios.
- **Un único `apiClient`:** maneja el 401 (lleva a `/login`) y el 409, y muestra el `requestId` en los errores.
- Antes de cualquier tarea de UI, leer `docs/diseño/DESIGN.md` y la imagen de la pantalla.
- `docs/diseño/DESIGN.md` es solo guía visual (colores, tipografía, formas y componentes base). En funcionalidad
  (pantallas, estados, permisos, flujos) manda `docs/01-spec.md`; si el diseño de Stitch muestra algo que el spec no
  contempla, no se implementa.
- El HTML de Stitch se reescribe como componentes React; nunca se copia como página estática.
- Solo se usan los tokens del diseño, sin colores sueltos.

## Dependencias
- Versiones **exactas** en `package.json` y `package-lock.json` en el repositorio.
- No agregar dependencias que no estén en el spec sin registrarlas en el documento de la tarea con su motivo.

### Versiones y herramientas fijadas en T01 (ver `docs/tareas/T01.md` §6)
- **NestJS 12**, que se publica **solo como ESM**. La API compila a CommonJS y en ejecución carga Nest con el
  `require(esm)` nativo de Node 24, sin flags.
- **TypeScript 6.0.x** (no la 7) en `api` y `web`: typescript-eslint y ts-jest aún no soportan la 7. No subir a la 7
  hasta que ambos la soporten.
- **Jest** corre con `node --experimental-vm-modules` (script `npm test` de `src/api`) para poder cargar los paquetes
  ESM de Nest. `tsconfig` de la API con `module: nodenext` e `isolatedModules: true`. No cambiar el script por `jest` a secas.
- **Build de la API con `tsc -p tsconfig.build.json`**, sin `@nestjs/cli`.
- **Imagen de nginx:** `nginx:1.30-alpine` (etapa final de `web`).

### Versiones y herramientas fijadas en T02 (ver `docs/tareas/T02.md` §6 y §7)
- **Prisma 7.10.1** (no la etiqueta `latest` de npm, que apunta a una 8.0.0-rc). Usa `prisma.config.ts`, el generador
  `prisma-client` con `output` en `src/api/src/generated/prisma` (CommonJS, no se versiona, lo genera `npm run build`)
  y el adaptador `@prisma/adapter-pg`. `prisma` va en `dependencies` porque `migrate deploy` corre en la imagen final.
- **Seed compilado con `tsc`** (`tsconfig.seed.json` → `dist/seed/prisma/seed.js`), sin `tsx` ni `ts-node`.
  El arranque de `api` es `docker-entrypoint.sh`: `prisma migrate deploy` → seed → `node dist/main.js`.
- **Seed de salas:** las 5 salas solo se crean si la tabla `rooms` está vacía, para no recrear una sala que el ADMIN
  haya renombrado. Los usuarios sí usan `upsert` por email con `update: {}`. Comportamiento aprobado por la persona.
- **Trigger de `audit_logs`:** `BEFORE UPDATE OR DELETE OR TRUNCATE ... FOR EACH STATEMENT`, para que falle aunque la
  sentencia no afecte filas.
- **Jest:** `moduleNameMapper` `^(\.{1,2}/.*)\.js$ → $1` para resolver los imports `.js` del cliente generado.
- **Restricciones SQL propias en la migración `init`:** índice único `lower(name)`, CHECK de capacidad, asistentes,
  `end_at > start_at`, `email = lower(email)` y `rooms.equipment NOT NULL`.

### Plataforma transversal fijada en T02a (ver `docs/tareas/T02a.md` §6 y §7)
- **Dependencias agregadas:** `pino`, `pino-http`, `nestjs-pino`, `helmet`, `cookie-parser`, `@nestjs/swagger`,
  `class-validator`, `class-transformer` (y `@types/cookie-parser` en dev). No agregar otras para lo mismo.
- **Errores de negocio:** siempre `throw new AppError('<CODIGO>', '<mensaje en español>')` con un código de
  `common/errors/error-codes.ts` (spec §8); el estado HTTP sale del código. `AppError` no depende de Nest y se puede usar
  en el dominio. Nunca construir el JSON de error a mano: lo arma `HttpExceptionFilter`.
- **`configureApp()`** (`common/configure-app.ts`) monta request ID, helmet, `cookie-parser`, prefijo `/api` y Swagger;
  lo usan `main.ts` y las pruebas HTTP. `CommonModule.forRoot({ logStream })` acepta un destino de logs solo para pruebas.
- **`X-Request-Id`:** se respeta el del cliente solo si cumple `^[A-Za-z0-9._-]{1,64}$`; si no, se genera un UUID.
- **Transacciones:** los services inyectan `@Inject(TRANSACTION_RUNNER) TransactionRunner`; los repositorios Prisma
  obtienen el cliente con `prismaTx(ctx)`. Claves de `ctx.advisoryLock(key)` con prefijo: `date:<YYYY-MM-DD>` (reservas
  y cierres) y `user:<uuid>` (reservas y desactivación de usuario).
- **Pruebas HTTP con el `fetch` nativo de Node 24** (sin `supertest`), levantando la app en `127.0.0.1` y puerto 0.
  Las pruebas de plataforma viven en `src/api/test/` con controladores de prueba fuera del código de producción.
- **Pruebas contra PostgreSQL real** antes de T06: con un script de un solo uso ejecutado en el contenedor
  (`docker compose exec -T api node -`), fuera del repositorio y con la salida pegada en `docs/tareas/Txx.md`.
- **Swagger en `/api/docs`** lo sirve Express fuera del router de Nest, así que el guard global no lo cubre. Por decisión
  de la persona (D-33), **solo se monta fuera de producción** (`NODE_ENV !== 'production'`); en el compose responde 404 (T03, CA8).

### Autenticación fijada en T03 (ver `docs/tareas/T03.md` §6 y §7)
- **`@nestjs/jwt` sin passport** (no agregar `@nestjs/passport`, `passport` ni `passport-jwt`). JWT HS256 con
  `JWT_SECRET`, payload solo `sub` y `role`, duración `JWT_EXPIRES_IN` sin renovación. La cookie `access_token` lleva
  `Expires` igual al vencimiento del JWT.
- **`JwtAuthGuard` y `RolesGuard` viven en `common/auth/`** y se registran como `APP_GUARD` en `AuthModule` (primero sesión,
  luego rol). El guard de sesión depende de la interfaz `SessionResolver` (token `SESSION_RESOLVER`, en
  `common/auth/session.ts`), que implementa `AuthService`; `common/` nunca importa archivos de `modules/`.
- **En cada petición se relee el usuario** (RN-14); `@Roles()` usa el rol **releído de la base**, no el del token.
  `req.user` es un `SessionUser` y se obtiene con `@CurrentUser()`.
- **Login:** mismo 401 `INVALID_CREDENTIALS` para clave incorrecta, correo inexistente o usuario inactivo, con comparación
  bcrypt de relleno cuando el correo no existe. Se loguea `event: login` con `result` (y `userId` si es correcto), nunca
  el correo, la contraseña ni el token.
- **Módulo `users`:** dominio en `domain/` (`PublicUser`, `UserWithCredentials`, `toPublicUser`, `normalizeEmail`),
  interfaz `UsersRepository` con token `USERS_REPOSITORY` y `PrismaUsersRepository` en `infrastructure/`. Otros módulos
  usan solo `UsersService`.
- **Pruebas de auth** con un repositorio en memoria (`test/support/in-memory-users.repository.ts`, vía
  `overrideProvider(USERS_REPOSITORY)`) y controladores de prueba en `test/support/`, sin base de datos.
- **Commits del agente:** agregar los archivos por ruta, nunca `git add -A` (B-54: se coló un `.bak` del editor).

### Cambio de contraseña fijado en T03a (ver `docs/tareas/T03a.md` §6 y §7)
- **Hashes nuevos con bcryptjs de costo 10**, el mismo del seed (`BCRYPT_ROUNDS`). No usar otro costo en T05a (reset).
- **Escrituras de repositorio reciben el `TransactionContext`:** por ejemplo `UsersRepository.updatePasswordHash(ctx, id, hash)`,
  implementado con `prismaTx(ctx)`, así solo se pueden llamar dentro de `TransactionRunner.run`. Otros módulos escriben a
  través del service (`UsersService.updatePasswordHash(ctx, …)`).
- **Cambiar la contraseña no invalida sesiones** (el spec no lo pide). La nueva igual a la actual se acepta.
- **Logs de eventos de seguridad:** `event: password_change` con `result` y `userId`, como el login; nunca contraseñas ni hashes.
- **Pruebas de auth:** los helpers comunes (`createApp`, `json`, `sessionCookie`, `silent`, `capture`) viven en
  `test/support/auth-app.ts`; `createApp` reemplaza `TRANSACTION_RUNNER` por `InMemoryTransactionRunner`.
- **Pruebas que revisan los logs reales** (con `NODE_ENV=development` y `capture()`) van en un archivo `.spec.ts` propio:
  si se crea antes otra app en el mismo archivo, el logger queda en `silent` y los logs llegan vacíos (B-60).

### Salas y validación de entradas fijadas en T04 (ver `docs/tareas/T04.md` §2, §6 y §7; revisión B-68)
- **Módulo `rooms`** con la misma estructura que `users`: dominio puro en `domain/` (`EQUIPMENT`, `ROOM_LIMITS`, `Room`),
  interfaz `RoomsRepository` (token `ROOMS_REPOSITORY`) y `PrismaRoomsRepository` en `infrastructure/`. Otros módulos
  (T05) usan solo `RoomsService`. Sin `DELETE`: las salas se desactivan (D-14).
- **Unicidad por la base, no por consulta previa:** el nombre único lo garantiza el índice `lower(name)`; el repositorio
  Prisma traduce `P2002` a `AppError('ROOM_NAME_TAKEN')` y `P2025` a `NOT_FOUND`. Hacer lo mismo con `EMAIL_TAKEN` (T05a)
  y `CLOSURE_EXISTS` (T05b).
- **Reglas de los DTOs (correcciones de la revisión de T04, obligatorias en todos los módulos):**
  - **Texto obligatorio** (nombres, ubicaciones, motivos…): `@IsString()` + `@Length(…)` + `@NotBlank()`
    (`common/validation/decorators.ts`); solo espacios → 400. Excepción: contraseñas. No se recortan espacios.
  - **Campos opcionales de un `PATCH`:** `@OptionalNotNull()`, **nunca** `@IsOptional()` (deja pasar `null` a la base)
    ni `@ValidateIf` solo. `null` → 400 `VALIDATION_ERROR` "`<campo>` (no puede ser null)". `PATCH {}` → 200 sin cambios.
  - **Cuerpos que no son UTF-8 válido → 400** en toda la API: `configureApp()` registra los parsers `json` y
    `urlencoded` y detrás `rejectNonUtf8Body` (`common/validation/utf8-body.ts`), que lee `req.rawBody`. Por eso **toda**
    app Nest se crea con `rawBody: true` (`main.ts`, `test/support/auth-app.ts`, cualquier `createNestApplication` nuevo).
- **Controles automáticos de esas reglas** (no quitarlos ni saltarlos; si fallan, se corrige el código):
  - `test/conventions.spec.ts`: recorre `src/modules/**/dto/*.dto.ts` y falla si un texto obligatorio no tiene
    `@NotBlank()` o un campo opcional no tiene `@OptionalNotNull()`, y si alguna app Nest se crea sin `rawBody: true`.
  - ESLint (`eslint.config.mjs`): `no-restricted-imports` prohíbe importar `IsOptional` de `class-validator` en `src/`.
  - Cada módulo nuevo agrega su prueba de capas como la de `test/rooms.spec.ts` (CA8): sin imports de otros módulos
    internos, controller sin Prisma ni repositorios, dominio sin `@nestjs`/`@prisma`.
- **Pruebas de módulos de negocio:** `createApp(repo, { modules, overrides, runner })` de `test/support/auth-app.ts`
  monta el módulo con repositorios en memoria que emulan las restricciones de la base (ver
  `test/support/in-memory-rooms.repository.ts`).
- **Verificación manual con `curl` desde Git Bash (B-66):** el texto con tildes o `ñ` se envía **siempre** con escapes
  Unicode en el JSON (`"Sala Roatán"`), nunca escrito literal: Git Bash no lo manda en UTF-8 y ahora la API lo
  rechaza con 400. Antes de un `PATCH` sobre datos del seed, confirmar el id y revertir al terminar.
- **`jq` no está instalado** en la máquina de desarrollo: en las verificaciones se usa `node -e` para leer el JSON y se
  anota en `docs/tareas/Txx.md`.
