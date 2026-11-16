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
- **Pruebas contra PostgreSQL real:** desde T06 van en la suite de integración (`api-test`, ver la subsección de T06).
  El script de un solo uso en el contenedor (`docker compose exec -T api node -`) queda solo para comprobaciones
  manuales puntuales, con la salida pegada en `docs/tareas/Txx.md`.
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

### Reservas, tiempo y transacciones fijados en T05 (ver `docs/tareas/T05.md` §5, §6 y §7; B-74)
- **Parámetros de spec §5:** `loadBusinessConfig()` (`common/config/business-config.ts`) los tipa y valida al arrancar
  (zona IANA, `HH:MM`, enteros > 0, apertura < cierre). Se inyectan con `@Inject(BUSINESS_CONFIG)`; nunca leer
  `process.env.BUSINESS_*` ni `BOOKING_*` en otro lugar. Sus valores por defecto son los del spec.
- **"Ahora" siempre del `Clock`** (`@Inject(CLOCK)`, `common/time/clock.ts`), nunca `new Date()` en services ni en el
  dominio: las pruebas lo fijan con `overrides: [{ token: CLOCK, value: { now: () => … } }]`.
- **Zona horaria con `Intl`** (`common/time/zoned-time.ts`: `toLocal`, `localDate`, `startOfLocalDay`, `addDays`,
  `isCalendarDate`), sin librerías ni desfases fijos. Toda fecha "del día" (cierres, auditoría, "hoy") se calcula en
  `BUSINESS_TZ` con estas funciones.
- **Choques (`23P01`):** los traduce `HttpExceptionFilter` con `isExclusionViolation()`. Forma real con Prisma 7.10.1 +
  adapter-pg: `PrismaClientKnownRequestError` con `code: "P2039"` y `meta.driverAdapterError.cause.originalCode === "23P01"`
  (no es `PrismaClientUnknownRequestError`). No duplicar la restricción en código ni hacer una consulta previa de choque.
- **Dentro de `TransactionRunner.run(async (ctx) => …)`, toda llamada a una dependencia recibe el `ctx`**, también las
  lecturas: `findById(id, ctx)`. Una lectura sin `ctx` usa otra conexión del pool (10) y, con muchas transacciones
  esperando un lock, lo agota: todas vencen a los 5 s con 500 `P2028` (B-74, CA10 de T05). Los repositorios que se lean
  dentro de una transacción aceptan `ctx?` y usan `ctx ? prismaTx(ctx) : this.prisma`.
- **Locks (spec §11):** siempre en el orden `date:<AAAA-MM-DD local>` → `user:<uuid>`, para no generar bloqueos
  cruzados. T05b toma solo `date:` y T05a solo `user:`. Después del lock por usuario se relee el usuario con `ctx`.
- **`BookingsService` es la API del módulo de reservas** para T05a (cancelar al desactivar) y T05b (cancelar al cerrar
  un día). `PrismaBookingsRepository.isDateClosed` lee `closures` directamente dentro de la transacción (se queda así
  desde T05b: ver abajo).
- **Contrato de `Booking`:** `cancelledBy` es `{ id, name }` como `owner`; `title` se guarda recortado; las fechas del
  body exigen zona (`Z` o `±hh:mm`), sin zona → 400.
- **Controles automáticos (no quitarlos ni saltarlos):**
  - `test/transactions.spec.ts` recorre `src/` y falla si dentro de un `.run(async (ctx) => …)` hay una llamada
    `this.<dep>.<método>(…)` sin el `ctx` (salvo `logger`). Si una dependencia nueva no toca la base, se agrega a
    `WITHOUT_DB` con su motivo.
  - Las pruebas con repositorios en memoria **no detectan** problemas de pool, locks ni concurrencia: toda escritura
    nueva se verifica también contra PostgreSQL con una ráfaga de peticiones simultáneas (20 o más) y se revisa que el
    log no tenga errores `"level":50`. Desde T06, esa ráfaga se agrega como caso de la suite de integración.
- **Pruebas de reservas:** `test/support/in-memory-bookings.repository.ts` emula `bookings_no_overlap` lanzando el error
  con la forma real de Prisma (`exclusionViolation()`); `test/bookings-service.spec.ts` comprueba con dobles el orden
  `begin → lock date → lock user → lecturas con ctx → INSERT → end`.
- **Verificación manual:** no usar `tee /dev/stderr` para capturar ids (mezcla la salida); usar un script que imprima en
  orden y que al final cancele las reservas creadas (las canceladas quedan como historial).

### Usuarios y cancelación en cascada fijados en T05a (ver `docs/tareas/T05a.md` §6 y §7; B-80)
- **Rutas `/users` en `UsersAdminModule`** (`modules/users/users-admin.module.ts`, con `UsersController` y
  `UsersAdminService`), separado de `UsersModule`: `BookingsModule` importa `UsersModule` y la desactivación necesita
  `BookingsService`, así que juntarlos crearía un ciclo. **No usar `forwardRef`.** Si un módulo nuevo (T05b, T06a)
  necesita un service que a su vez depende del suyo, se resuelve igual: un módulo aparte que importa a ambos.
- **`UsersModule` sigue siendo la API de usuarios** para otros módulos: `UsersService` (`findById(id, ctx?)`, `findAll`,
  `create(ctx, …)`, `update(ctx, …)`, `updatePasswordHash(ctx, …)`). `UsersService.create` normaliza el correo (RN-23).
- **Cancelación en cascada:** `BookingsService.cancelFutureByUser(ctx, userId, cancelledById)` (el `ctx` primero, como
  toda escritura) cancela con un solo `updateManyAndReturn` las `CONFIRMED` con `startAt > ahora` (`Clock`) y devuelve
  los ids, para auditar cada uno en T06a. Las reservas en curso no se cancelan. T05b hace lo mismo para los cierres
  con `cancelConfirmedByDate(ctx, …)` (ver la subsección de T05b).
- **Claves de lock:** usar siempre `lockKeys` de `bookings.service.ts` (`lockKeys.user(id)`, `lockKeys.date(d)`), nunca
  escribir el prefijo a mano. Desactivar: `begin → lock user: → findById(ctx) (404) → 422 CANNOT_DEACTIVATE_SELF →
  UPDATE → cascada → commit`.
- **`BCRYPT_ROUNDS` (10) vive en `modules/users/domain/user.ts`** y lo usan auth (cambio) y usuarios (alta y reset). El
  hash se calcula **fuera** de la transacción, para no retener la conexión mientras bcrypt trabaja.
- **Lecturas públicas sin hash (A02):** `PrismaUsersRepository` usa el `select` `PUBLIC` en todo lo que no sea
  `findByEmail`/`findById`; `test/users.spec.ts` lo comprueba.
- **Repositorios en memoria:** en un `update`, ignorar los campos `undefined` como hace Prisma. Los DTOs definen los
  campos opcionales ausentes como `undefined` (`target: es2023`) y `{ ...body }` los trae; aplicarlos borra datos (B-80).
- **Escribir archivos:** con Write o Edit, no con `node -e "…"` dentro de Bash. Bash interpreta los backticks dentro
  de comillas dobles y borra el texto entre ellos (pasó en T05a; se corrigió antes del commit).
- **Pendiente de decisión de la persona:** un ADMIN puede quitarse el rol de ADMIN (solo se prohíbe desactivarse, RN-26).
  No agregar una regla nueva sin que lo diga el spec.
- **Datos que dejó la verificación de T05a** en la base del compose: `prueba.uno@salalibre.local` (activo, contraseña
  `Nueva12345`) y usuarios `rafaga.*` desactivados. No hay `DELETE` de usuarios: en verificaciones nuevas, usar correos
  únicos (por ejemplo con un sufijo de tiempo).

### Cierres fijados en T05b (ver `docs/tareas/T05b.md` §6 y §7)
- **Dependencias entre módulos:** `ClosuresModule` importa `BookingsModule` (cascada, RN-16); el módulo de reservas
  **no** importa el de cierres. RN-10 (`DAY_CLOSED`) la sigue resolviendo `BookingsRepository.isDateClosed` dentro de la
  transacción de la reserva; no pasarla a `ClosuresService` (sería un ciclo). `test/closures.spec.ts` lo comprueba.
- **Fechas de cierre:** `Closure.date` es texto `AAAA-MM-DD` (día de calendario en `BUSINESS_TZ`), nunca un instante.
  `PrismaClosuresRepository` convierte la columna `@db.Date` con `` new Date(`${date}T00:00:00.000Z`) `` y
  `toISOString().slice(0, 10)`. "Hoy" = `localDate(clock.now(), config.timeZone)`; "posterior a hoy" compara las fechas
  como texto (`isAfterToday`). `GET` muestra fecha ≥ hoy; crear y eliminar exigen fecha > hoy (RN-24, D-31).
- **Cancelación por fecha:** `BookingsService.cancelConfirmedByDate(ctx, date, cancelledById)` arma el rango UTC del día
  local con `startOfLocalDay` y llama a `BookingsRepository.cancelConfirmedBetween(ctx, from, to, cancelledById, at)`
  (un solo `updateManyAndReturn`, todas las salas). Devuelve los ids, para auditar cada uno en T06a.
- **Orden en la transacción:**
  - Crear: `422 CLOSURE_IN_PAST` (sin abrir transacción) → `begin → lock date: → INSERT (409 por P2002) → cascada → commit`.
  - Eliminar: `begin → findById(ctx) (404) → 422 → lock date: → DELETE (deleteMany; 0 filas → 404) → commit`. Eliminar
    también toma el lock `date:` para serializarse con las reservas de ese día. No restaura reservas (S-05).
- **Pruebas de cierres:** `InMemoryClosuresRepository` recibe el mismo `Set` que `InMemoryBookingsRepository.closedDates`,
  para que un cierre creado por la API dé `DAY_CLOSED` al reservar, como en la base.
- **Verificación manual de cierres de hoy o pasados:** la API no los deja crear. Para probar el 422 de `DELETE` se
  insertan con `psql` dentro del script de verificación y se borran al final del mismo script; anotarlo en
  `docs/tareas/Txx.md` como paso manual. Al terminar una verificación, no dejar cierres futuros en la base: bloquean las
  reservas de esos días en las tareas siguientes.

### Pruebas de integración fijadas en T06 (ver `docs/tareas/T06.md` §6 y §7)
- **Comando:** `docker compose --profile test run --rm api-test` (S-08). Sale con código 0 si todo pasa y 1 si algo
  falla. `docker compose up` no arranca `api-test`.
- **Infraestructura:** etapa `test` de `src/api/Dockerfile` (parte de `build` y agrega `test/` con
  `COPY --chown=node:node`; **no** usar `chown -R` sobre `/app`, tardó más de 10 min, B-92). El servicio `api-test` no
  publica puertos y depende de `db` (`service_healthy`).
- **Base de pruebas propia, `salalibre_test`, en el mismo servidor `db`** (no hay un segundo PostgreSQL). `test/integration/run.sh`
  se niega a correr si `DATABASE_URL` no apunta a `salalibre_test`; luego `prisma migrate reset --force` → seed →
  `npm run test:int`. La base se recrea en cada corrida: la de desarrollo (`salalibre`) nunca se toca.
- **Estructura:** archivos `src/api/test/integration/*.int-spec.ts` con `test/integration/jest.config.json` (`--runInBand`,
  `verbose`). `npm test` (unitarias, `*.spec.ts`) no los recoge: no renombrar a `.spec.ts`. No hay dobles: se levanta
  `AppModule` completo con `IntegrationApp.start()` (`test/integration/support/int-app.ts`).
- **Helpers de `int-app.ts`:** `login`, `createUser`, `createRoom` (nombres y correos únicos con `unique()`), `book`,
  `cancel`, `confirmedIn`, `statusCount`; `nextBusinessDay(offset)` y `at(fecha, 'HH:MM')` en `BUSINESS_TZ`, calculados
  desde "ahora" (nunca fechas fijas). `reset()` borra `bookings` y `closures` antes de cada prueba; usuarios y salas
  quedan. `audit_logs` no se borra (el trigger lo impide).
- **Estados imposibles por la API** (reserva ya empezada, cierre de hoy o pasado) se insertan con `api.prisma` en la
  base de pruebas, no con `psql`.
- **Matriz RBAC (`rbac.int-spec.ts`):** toda ruta nueva se agrega a `ADMIN_ROUTES` o a `AUTHENTICATED_ROUTES`, con un body
  válido para que el 403 no se confunda con un 400. `POST /audit-logs/search` ya está en `ADMIN_ROUTES` (T06a).
- **Carreras (R-01, R-02):** se comprueba el invariante final (ninguna `CONFIRMED` y toda reserva creada cancelada), no
  un orden concreto de las peticiones.
- **Nombres:** `it('RN-xx · P-xx · …')`. Toda escritura nueva agrega aquí su caso de integración, incluida su fila de
  auditoría (como `audit.int-spec.ts`, P-12 y P-15).

### Auditoría fijada en T06a (ver `docs/tareas/T06a.md` §2, §6 y §7)
- **Toda escritura de negocio audita dentro de su `TransactionRunner.run`:** `await this.audit.record(ctx, { action,
  entity, entityId, data })` (o `recordMany` para varias filas en un solo `INSERT`). El módulo importa `AuditModule` y
  usa solo `AuditService`; nunca archivos internos de `modules/audit/` (lo comprueba `test/audit.spec.ts`).
  `AuditModule` no importa ningún módulo de negocio, así cualquiera lo importa sin ciclos.
- **Actor y request ID no se pasan a mano:** salen del contexto de petición (`AsyncLocalStorage`,
  `common/request-context/`), que fija `RequestContextInterceptor` (global, `APP_INTERCEPTOR` en `CommonModule`) después
  de los guards. No moverlo a un middleware previo al body parser: ahí el contexto se pierde. Si falta el request ID o
  el usuario, `record` lanza y la escritura entera se revierte (falla cerrado).
- **`data`:** solo lo mínimo para entender la operación (tabla de `docs/tareas/T06a.md` §2). `AuditService` rechaza
  claves que contengan `password`, `hash`, `token`, `cookie` o `secret`, a cualquier profundidad, y quita los campos
  `undefined` (un `PATCH` parcial guarda solo `changes` con lo enviado). Un `PATCH` sin cambios igual deja su fila.
- **Cascadas (RN-15, RN-16):** las audita `BookingsService` con una fila `BOOKING_CANCELLED` por reserva y
  `data.cause` (`MANUAL`, `USER_DEACTIVATED`, `DAY_CLOSED`); el actor es el ADMIN que desactiva o cierra el día.
- **Consulta (`POST /audit-logs/search`, D-24):** `COUNT` + `skip/take` con los mismos filtros, orden `createdAt` desc y
  `id` desc como desempate (las filas de una transacción comparten `created_at`). `from`/`to` se convierten con
  `startOfLocalDay` en `BUSINESS_TZ` (`to` + 1 día, excluido). `AuditPage.items` no incluye `data` (spec §8). `page`
  tiene tope `AUDIT_PAGE.pageMax` (21 474 836) para que un `OFFSET` fuera de rango dé 400 y no 500. Sin `GET`.
- **Pruebas:** `createApp` reemplaza `AUDIT_REPOSITORY` por `InMemoryAuditRepository` (opción `audit`), que no emula el
  rollback: CA2 se prueba en integración. Los dobles de `AuditService` en las pruebas de orden registran
  `audit <ACCIÓN>` para comprobar que va antes del commit y con el `ctx`. En integración, `api.request(…, { requestId })`
  envía `X-Request-Id` para encontrar las filas de una petición.
- **`audit_logs` no se limpia entre pruebas** (el trigger lo impide): comparar por `requestId` o por diferencia de
  `COUNT`, nunca por un total fijo. Las verificaciones manuales dejan filas permanentes en la base de desarrollo.

### Sistema visual fijado en T07a (ver `docs/tareas/T07a.md` §2, §6 y §7)
- **Sin `tailwind.config.*`:** Tailwind 4 (`@tailwindcss/vite`) se configura en CSS. Todos los tokens viven en el
  `@theme` de `src/web/src/index.css`; un token nuevo se agrega ahí, con su nombre y su origen en `DESIGN.md`.
- **La paleta por defecto de Tailwind está quitada** (`--color-*: initial`): `bg-blue-500`, `text-slate-600`,
  `bg-white` o `text-black` no existen. Usar los tokens (`bg-primary-container`, `text-on-surface`,
  `bg-surface-container-lowest`…) y los nombres agregados para lo que `DESIGN.md` da solo en texto: `canvas`, `mist`,
  `divider`, `ink`, `interactive`, `scrim`, y los tonos de insignia `available-*`, `busy-*`, `maintenance-*`.
  No volver a activar la paleta ni escribir hex, `rgb()` o colores arbitrarios (`bg-[#…]`) en componentes.
- **Formas y medidas:** `rounded-base` (4 px, controles e insignias), `rounded-lg` (8 px, contenedores y modales),
  `rounded-full` (avatares y píldoras); tipografía con `text-headline-*`, `text-body-*`, `text-label-*`, `text-code-sm`
  (ya traen alto de línea, espaciado y peso); espaciado con nombre (`gutter`, `margin`, `space-*`); modales
  `max-w-modal-sm` (480 px) y `max-w-modal-md` (640 px); sombras `shadow-elevated` y `shadow-modal`. Horas, fechas y
  capacidades siempre con la utilidad `tnum`.
- **Fuente e iconos locales:** Inter con `@fontsource-variable/inter` (importada en `main.tsx`, familia
  `'Inter Variable'`) e iconos con `lucide-react` (no Material Symbols). Nunca fuentes, iconos, imágenes ni scripts
  por CDN o URL externa; los iconos van con `aria-hidden="true"` y el estado siempre lleva texto.
- **Componentes base en `src/web/src/shared/ui/`**, importados desde `shared/ui` (el `index.ts`): las pantallas los
  reutilizan en lugar de repetir estilos. Formularios con `Field` (render prop que entrega `id`, `aria-describedby` y
  `aria-invalid` al control), diálogos con `Modal`/`ConfirmDialog` (nunca `alert()` ni `confirm()`), avisos con
  `useToast()` dentro de `ToastProvider` (lo monta T07), errores del API con `ErrorState` o `Banner` y su `requestId`.
  `Badge` solo ofrece tonos: cada pantalla decide el tono de cada estado.
- **Contraste AA:** el texto de ejemplo de los campos usa `on-surface-variant`, no `outline` (4,49:1 sobre blanco).
  Al combinar un token de texto con uno de fondo que no esté en la tabla de `docs/tareas/T07a.md` §2, medir el
  contraste y anotarlo en el documento de la tarea.
- **Sin pruebas automáticas de frontend (S-09):** el comportamiento accesible (foco, Escape, `aria-*`) se comprueba en
  el navegador. Si se usa una página temporal de demostración, se borra antes del commit (no hay página de demo
  permanente). En `react-refresh`, los hooks y helpers van en archivos aparte de los componentes (como
  `toast-context.ts` e `initials.ts`) para que el lint no dé avisos.

### Frontend base fijado en T07 (ver `docs/tareas/T07.md` §6 y §7)
- **Dependencias agregadas** (versión exacta): `@tanstack/react-query` 5.107.1, `react-hook-form` 7.92.0, `zod` 4.6.7,
  `react-router` 8.5.1 (D-01 no nombra router) y `@hookform/resolvers` 7.0.6 (une RHF con Zod). No agregar otras para lo
  mismo. Rutas declarativas con `BrowserRouter`/`Routes`/`Route` importados de `react-router`.
- **`shared/apiClient.ts` es la única forma de llamar al API:** `apiClient.get/post/patch/delete` con prefijo `/api` y
  `credentials: 'include'`. Los errores llegan como `ApiError` (`status`, `code`, `message`, `requestId`); para
  mostrarlos se usa `toApiError(e)` con `ErrorState` o `Banner` y su `requestId`. Nunca `fetch` directo en una pantalla.
- **401:** el `apiClient` llama al manejador que registra `AuthProvider` (`setUnauthorizedHandler`): vacía la caché, deja
  la sesión en `null` y navega a `/login`. Solo `authService` usa `skipUnauthorizedHandler` (login, logout y `me`); no
  usarlo en otras peticiones. El 409 `BOOKING_CONFLICT` ya trae el mensaje de F-02; recargar la agenda es de T08/T09.
- **Sesión:** `useAuth()` (`features/auth/auth-context.ts`) da `status`, `user`, `signIn` y `signOut`. La sesión vive en
  la consulta `ME_QUERY_KEY` (`['auth','me']`); al limpiar la caché se conserva esa clave. Nada de tokens ni datos de
  sesión en `localStorage`, `sessionStorage` ni `document.cookie` (T07, CA8).
- **Rutas (`App.tsx`):** `/login` pública; el resto dentro de `ProtectedRoute` → `SessionLayout`; `/admin/*` dentro de
  `RequireRole role="ADMIN"`. Una pantalla nueva reemplaza su `PlaceholderPage` en `App.tsx`. Tras el login siempre se
  va a `/agenda`; `/login` con sesión, `/admin` a secas y rutas desconocidas redirigen a `/agenda`.
- **Navegación por rol:** los enlaces se definen en `features/auth/SessionLayout.tsx` (`COMMON_NAV`, `ADMIN_NAV`);
  `shared/layout/AppLayout` solo recibe `navItems` y no importa nada de `features/` (`shared` no depende de features).
- **Formularios:** RHF + Zod con `zodResolver`, `noValidate` en el `<form>` y errores mostrados con `Field`. Zod 4 usa
  `{ error: '…' }` y `z.email()`. Los textos de error van en español y junto al campo.
- **`LoginForm` y `PasswordField`** ya exponen `onFocusChange`, `onPasswordVisibleChange` y `onSubmitStatusChange` para
  T07c, que solo debe cambiar `LoginPage` y agregar los personajes, sin pasarles el valor de la contraseña.
- **Manejador general de 401 comprobado en T07b:** con la sesión invalidada en el servidor, `PATCH /auth/password` dio
  401 y la app llevó a `/login`.

### Mi cuenta fijado en T07b (ver `docs/tareas/T07b.md` §6 y §7)
- **Mutaciones que llevan contraseñas** (login, cambio, alta de usuario y reset en T10a): `useMutation({ …, gcTime: 0 })`
  y, si el formulario sigue montado después del envío, `reset()` de la mutación en `onSettled`, para que la contraseña
  no quede en la caché de TanStack Query. Nunca `console.log` de valores de formularios.
- **Errores del API en formularios:** un error de regla de negocio que corresponde a un campo (`INVALID_CURRENT_PASSWORD`;
  después, por ejemplo, `EMAIL_TAKEN` o `ROOM_NAME_TAKEN`) va a ese campo con `setError(campo, { message }, { shouldFocus:
  true })` y el mensaje del API. Todo error inesperado o sin campo va a un `Banner` con su `requestId`, encima del formulario.
- **Éxito de un formulario:** `useToast().show({ tone: 'success', message })` y limpiar el formulario con `reset(...)`.
- **Validación del cliente igual a la del API** (por ejemplo, contraseña ≥ 8, RN-18), con mensajes en español junto al campo.
  Si con eso el 400 del API no se puede provocar desde la pantalla, se comprueba con una petición directa y se anota en
  `docs/tareas/Txx.md`.
- **`PasswordField`** se reutiliza en todo campo de contraseña, con `autoComplete` `current-password` o `new-password`.
  No hay campo de confirmación (el spec no lo pide).
- **Verificación con usuarios del seed:** si una prueba cambia la contraseña de uno, se restaura la del seed al terminar
  y se comprueba con un login por `curl`.

### Login visual fijado en T07c (ver `docs/tareas/T07c.md` §6 y §7; B-124, B-127)
- **Estructura:** `LoginPage` compone la pantalla; `AnimatedCharacters` (SVG propio) solo recibe `focus`,
  `passwordVisible` y `submitStatus`, nunca la contraseña. La pose sale de la función pura `characterState.ts`
  (prioridad `loading`/`error`/`success` > `peeking` > `password` > `email` > `idle`) y las poses viven en
  `animated-characters.css` según `data-pose`. El cursor lo sigue `useCharacterLook.ts` (un listener y un
  `requestAnimationFrame`, limpiados al desmontar). No agregar librerías de animación.
- **`LoginForm`** expone además `afterPassword` (enlace "¿Olvidaste tu contraseña?") y `successDelayMs` (tope 1000 ms;
  `LoginPage` usa 700, o 0 con movimiento reducido) y una región `role="status"`. `PasswordField` no quita el foco del
  campo al pulsar el ojo con el ratón (`onMouseDown` con `preventDefault`).
- **Colores que no son utilidades de Tailwind** (degradados del SVG): tokens en un bloque `@theme static` de
  `index.css` (como `--color-char-*`), usados con `var(--color-…)`. Nunca hex en componentes ni en CSS de features.
- **Animaciones CSS en SVG:** la animación reemplaza el `transform` del elemento animado; la posición va en un `<g
  transform>` que lo envuelve (B-124). Toda animación se apaga con `@media (prefers-reduced-motion: reduce)` y en
  ese modo los estados se siguen distinguiendo sin movimiento; el JS consulta `usePrefersReducedMotion()`.
- **Login responsive:** dos columnas desde 1024 px (`lg`); por debajo, cabecera compacta (logo e ilustración, sin
  titular ni pie). La tarjeta mide `clamp(480px, 100dvh − 48px, 812px)` y la ilustración ocupa el alto restante
  (`flex-1`, `preserveAspectRatio="xMidYMax meet"`). No volver a un alto mínimo fijo (B-127).
- **Verificación de pantallas a pantalla completa:** al 100 % de zoom y en ventanas bajas, no solo en la del navegador
  de pruebas (que puede estar con otro zoom: B-127 pasó por verificar al 67 %). Medir con iframes de tamaño fijo en px
  CSS (por ejemplo 1366×607, 1280×600, 1024×560, 1920×937, 768×900, 390×700 y 360×640) que `scrollHeight` y
  `scrollWidth` no superen la ventana, y anotar las medidas en `docs/tareas/Txx.md`.
- **`prefers-reduced-motion` no se puede emular** con la herramienta del navegador del agente: se comprueban las reglas
  en `document.styleSheets` y la emulación en DevTools queda como paso manual de la revisión.

### Agenda fijada en T08 (ver `docs/tareas/T08.md` §6 y §7; B-133)
- **Fechas y horas en el frontend solo con `shared/datetime`** (`localDate`, `localMinutes`, `formatTime`,
  `formatMinutes`, `zonedInstant`, `addDays`, `isWeekday`, `formatLongDate`…), con `Intl` y `BUSINESS_TZ`; nunca
  `toLocaleString` sin zona, `getHours()` ni desfases fijos. Una "fecha" es texto `AAAA-MM-DD`; "ahora" sale de `useNow()`.
- **Horario y zona como constantes del spec §5** (`shared/datetime/zoned.ts` y `features/bookings/agenda-config.ts`): el
  API no los expone. Si cambian los valores por defecto del spec, se cambian también ahí.
- **Datos de la agenda en `features/bookings/agenda-queries.ts`:** `useRooms`, `useBookings(date)` y `useClosures`, con
  las claves de `agendaKeys` (`['bookings','day',date]`, `['rooms']`, `['closures']`). T08a y T09 invalidan con
  `agendaKeys.bookings` (todas las fechas) o `agendaKeys.bookingsOf(date)`; no escribir las claves a mano.
- **La UI no decide disponibilidad:** solo oculta la acción en huecos ya empezados (`startAt` ≤ ahora, RN-05), cubiertos
  por una reserva o de un día cerrado. Lo demás (RN-06 en el último día, capacidad…) lo responde el API al reservar.
- **Privacidad (RN-17):** el texto de una tarjeta es `title ?? 'Ocupado'` (`bookingHeadline`), y **toda** variante de
  tarjeta, incluida la compacta, muestra también el nombre del dueño (B-133). Nunca rellenar el título desde otro dato.
- **Punto de conexión para T08a:** `AgendaPage` recibe `onSelectSlot(roomId, startAt)` (hoy no hace nada); los huecos
  libres son `<button>` con `aria-label` "Sala, HH:MM, libre". Las tarjetas no son enfocables hasta T09, que las vuelve
  botones.
- **`cn` no fusiona clases** (no hay `tailwind-merge`): una clase pasada en `className` no reemplaza la del componente
  base si chocan (p. ej. `w-44` contra el `w-full` de `Input`). El tamaño se pone en un contenedor (B-133).
- **Grillas con desplazamiento horizontal:** columnas `minmax(<mín>px, 1fr)` sin `min-w-max` en el contenedor (con él las
  columnas toman su ancho máximo de contenido y no reparten el espacio). Los elementos enfocables bajo un encabezado o
  eje fijos llevan `scroll-mt-*`/`scroll-ml-*` para no quedar tapados al recibir el foco (B-133).
- **Verificar "hoy" en fin de semana o fuera de horario:** se reemplaza `Date` en la página (clase que devuelve un
  instante fijo sin argumentos) y se espera el tick de `useNow` (≤ 60 s); anotarlo como paso manual en `docs/tareas/Txx.md`.
  No usar esperas largas dentro de una sola llamada de `javascript_tool` (vence a los 45 s).

### Formulario de reserva fijado en T08a (ver `docs/tareas/T08a.md` §6 y §7; B-141)
- **Sin doble envío:** `isPending` de TanStack Query **no alcanza** con `handleSubmit` de React Hook Form, que valida de
  forma asíncrona (tres clics seguidos mandaron 3 `POST`, B-141). Todo formulario que crea algo usa un candado síncrono
  (`useRef`) tomado en el `onSubmit` antes de validar y soltado en `onInvalid` y en `onSettled` de la mutación, como
  `BookingFormModal`. Además, botón con `loading` y modal con `dismissible={!isPending}`.
- **Errores de la API en un solo mapa por formulario** (`features/bookings/booking-errors.ts`): código → mensaje en
  español y, si corresponde, campo. Con campo → `setError(campo, …, { shouldFocus: true })`; sin campo o desconocido →
  `Banner` con el `requestId`. El 409 `BOOKING_CONFLICT` usa el texto del spec ("Ese horario acaba de ocuparse.").
- **Mensajes y validaciones con las constantes** de `agenda-config.ts` y `booking-form.ts` (horario, días de
  anticipación, duraciones), nunca con "07:00", "30 días" o "4 horas" escritos a mano.
- **`useCreateBooking`** invalida `agendaKeys.bookings` al crear y ante un 409; ante `DAY_CLOSED` también
  `agendaKeys.closures` y ante `ROOM_INACTIVE` `agendaKeys.rooms`. T09 sigue el mismo criterio al cancelar.
- **Fechas al API** con `zonedInstant(fecha, minutos).toISOString()` (UTC con `Z`), nunca armando el texto a mano.
- **Verificar errores que la pantalla no deja provocar** (422 que los selectores ya evitan): en la página se reemplaza
  `window.fetch` para que ese `POST` responda el cuerpo de error real (`{ error: { code, message, requestId } }`) y se
  comprueba dónde aparece el mensaje; aparte, se confirma por `curl` que la API devuelve el código. Anotarlo como paso
  manual en `docs/tareas/Txx.md`. Contar los `POST` con un contenedor de `fetch` para comprobar el doble envío.

### Mis reservas y cancelar fijados en T09 (ver `docs/tareas/T09.md` §6 y §7; B-147)
- **Qué acciones ofrece la UI** sobre una reserva lo decide una función pura (`features/bookings/booking-actions.ts`:
  `canCancel(booking, isAdmin, now)` = `CONFIRMED`, inicio > ahora, propia o `ADMIN`). Es solo experiencia de uso: la
  API autoriza con `BookingPolicy` (403/422) y audita. No repetir la regla dentro de los componentes.
- **"Ahora" para decidir acciones:** `actionNow(useNow(), query.dataUpdatedAt)`, no `useNow()` solo. `useNow` se
  actualiza cada 60 s sin alinearse al minuto, y tras un 422 `BOOKING_ALREADY_STARTED` el botón seguía visible hasta el
  siguiente tick (B-147).
- **Invalidación:** `useCancelBooking` invalida `agendaKeys.bookings` en `onSettled` (también ante error), que cubre la
  agenda de cada día y Mis reservas (`agendaKeys.mine` cuelga de `['bookings']`). Las pantallas de administración que
  cancelen reservas en cascada (T10a, T10b) invalidan esa misma clave.
- **Errores "desactualizados"** (`STALE_CANCEL_ERRORS` en `booking-errors.ts`: `BOOKING_ALREADY_STARTED`,
  `BOOKING_ALREADY_CANCELLED`): cierran el diálogo, muestran un aviso de error con el `requestId` y la lista se recarga.
  Cualquier otro error queda en un `Banner` dentro del diálogo.
- **Diálogos de confirmación** (`ConfirmDialog`): muestran qué se afecta y la consecuencia, con foco inicial en
  "Volver" y candado síncrono (`useRef`) contra el doble envío, como los formularios de T08a.
- **Tarjetas de la agenda:** son `<button aria-haspopup="dialog">` (con `scroll-mt-*`) que abren `BookingDetailDialog`.
  Del detalle a la confirmación se cierra uno y se abre el otro; `Modal` devuelve el foco a la tarjeta.
- **Verificación:**
  - **Reservas ya empezadas o que empiezan pronto** (la API no deja crearlas): se insertan con `psql` en el script de
    verificación (por ejemplo, `start_at = now() + interval '75 seconds'`) y se borran al final del mismo script.
    Antes de borrarlas, comprobar que no tengan filas en `audit_logs`.
  - **Estado de error de una consulta:** el `queryClient` reintenta una vez los 5xx, así que la simulación tiene que
    fallar **dos** veces seguidas para que se vea el error. Para el estado de carga, recargar la página primero (con
    `staleTime` de 30 s, la caché no vuelve a pedir los datos al navegar dentro de la app).
  - **Esperas largas** (por ejemplo, hasta que empiece una reserva): repartirlas en varias llamadas de
    `javascript_tool`, cada una de menos de 45 s.
  - **Credenciales de prueba generadas:** leer el valor del archivo **antes** de usarlo, nunca en llamadas paralelas
    (en T09 un login dio 401 por eso).
- **Datos que dejó la verificación de T09** en la base de desarrollo: el usuario `t09.vacia.<sufijo>@salalibre.local`
  (activo, sin reservas) y reservas `T09 …` canceladas como historial.

### Admin de salas fijado en T10 (ver `docs/tareas/T10.md` §6 y §7; B-153)
- **`features/rooms/` es dueño de las salas en el frontend:** `types.ts` (`Room`, `Equipment`, `EQUIPMENT`,
  `EQUIPMENT_LABELS`, `ROOM_LIMITS` igual al API), `equipment-icons.tsx` y `rooms-queries.ts` (`roomKeys`, `useRooms`,
  `useCreateRoom`, `useUpdateRoom`). La agenda los importa de ahí (`bookings/types.ts` reexporta; `agendaKeys.rooms` es
  `roomKeys.all`). No volver a declarar `Room` ni el equipamiento en otra feature. Las pantallas de T10a–T10c siguen
  el mismo criterio: los tipos y las consultas de una entidad viven en su feature.
- **Toda mutación de salas invalida `roomKeys.all`** en `onSettled` (también ante error): así la agenda deja de mostrar
  una sala desactivada sin recargar.
- **Formularios de administración** (sala; después usuario y cierre): modal `size="md"` (640 px), esquema Zod con los
  mismos límites que el DTO (texto obligatorio "no solo espacios" con `trim()` en el `refine`, sin recortar el valor
  enviado), mapa de códigos del API a campos (`ROOM_NAME_TAKEN` → `name`; igual `EMAIL_TAKEN` en T10a) y candado síncrono
  (`useRef`) contra el doble envío, como `RoomFormModal`. Editar manda solo los campos cambiados; sin cambios, se cierra
  sin llamar al API (no deja una fila de auditoría vacía).
- **Activar/desactivar en tablas:** botones con texto en la columna de acciones (no interruptor). Desactivar pasa por
  `ConfirmDialog` con la consecuencia; activar es directo. Ambos con candado contra el doble clic y aviso del resultado.
  El estado `isActive` no se edita en el modal.
- **`shared/ui/Table` tiene `relative` en el contenedor:** sin él, los `sr-only` (posición absoluta) escapan del
  `overflow-x-auto` y la página entera se desplaza en horizontal en pantallas estrechas (B-153). No quitarlo. Toda tabla
  nueva se mide con iframes de 1920 a 360 px (`scrollWidth` del documento ≤ ancho de la ventana).
- **Tamaño del bundle:** desde T10 `vite build` avisa que el JS supera 500 kB (505 kB). Es un aviso, no un error; dividir
  el código no está pedido en ninguna tarea.
- **Pendiente de decisión de la persona:** las reservas futuras de una sala inactiva no se pueden cancelar desde la UI
  (la agenda no muestra salas inactivas, D-14). No agregar nada sin que lo diga el spec.
- **Datos que dejó la verificación de T10** en la base de desarrollo: "Sala Prueba T10" **inactiva** y la reserva
  "T10 reserva futura" cancelada. "Sala Prueba" (inactiva) ya existía antes. No hay `DELETE` de salas: en verificaciones
  nuevas, usar nombres únicos y dejarlas inactivas al terminar para no agregar columnas a la agenda.

### Admin de usuarios fijado en T10a (ver `docs/tareas/T10a.md` §6 y §7; B-159)
- **`features/users/` es dueño del usuario en el frontend:** `types.ts` (`User`, `Role`, `ROLES`, `ROLE_LABELS`,
  `USER_LIMITS` igual al API); `features/auth/types.ts` solo los reexporta para la sesión. No volver a declararlos en auth.
- **Consultas y mutaciones en `users-queries.ts`** (`userKeys`, `useUsers`, `useCreateUser`, `useUpdateUser`,
  `useResetPassword`). Toda mutación invalida `userKeys.all`; desactivar invalida además `agendaKeys.bookings` (cascada
  de RN-15, como pide la regla de T09); si el ADMIN se edita a sí mismo, se recarga `ME_QUERY_KEY` para que la sesión
  tenga el rol de la base. T10b (cierres que cancelan reservas) invalida `agendaKeys.bookings` igual.
- **Mutaciones con contraseña** (alta y restablecer): `gcTime: 0` en el hook y `reset()` de la mutación en `onSettled`
  del `mutate`; el modal se desmonta al terminar y los avisos nunca muestran la contraseña. Campos con `PasswordField`
  y `autoComplete="new-password"`. La auditoría de `USER_PASSWORD_RESET` va con `data` vacío.
- **Edición de usuario:** solo nombre y rol; el correo se muestra deshabilitado. El correo del alta no se recorta ni se
  pasa a minúsculas en el cliente (lo normaliza el API, RN-23). Mismo patrón de formulario que T10 (modal de 640 px,
  candado, errores por campo: `EMAIL_TAKEN` → `email`; editar sin cambios no llama al API). Restablecer usa el modal de
  480 px.
- **Acción propia prohibida (RN-26):** en la fila del ADMIN con sesión, "Desactivar" va `disabled` con la etiqueta "No
  puedes desactivar tu propia cuenta"; un error del API al activar/desactivar se muestra en un aviso con su `requestId`.
  Para probar el 422 desde la pantalla se simula la respuesta con `window.fetch` y se confirma aparte contra el API real.
- **Avisos (toasts) en las verificaciones:** duran 4 s (éxito) u 8 s (error), así que se capturan con un
  `MutationObserver` sobre las regiones `aria-live` instalado antes de la acción; leer la página después no alcanza.
- **Si el verificador de permisos del modo automático deja de dar veredicto** varias veces seguidas (B-159), detenerse
  y avisar a la persona antes de llegar al límite de intentos; al retomar, pedir de nuevo `tabs_context_mcp`.
- **Credenciales de prueba generadas:** en un archivo del scratchpad, nunca en el repositorio, el chat ni
  `docs/tareas/Txx.md`.
- **Pendiente de decisión de la persona** (sigue desde T05a): un ADMIN puede quitarse el rol de ADMIN; la pantalla lo
  permite, como el API.
- **Datos que dejó la verificación de T10a** en la base de desarrollo: `t10a.prueba.mwiy29he@salalibre.local` ("Prueba
  Dos Editada", Empleado) **inactivo** y su reserva cancelada. Bundle del frontend: 517 kB (aviso de Vite).

### Admin de cierres fijado en T10b (ver `docs/tareas/T10b.md` §6 y §7; B-165)
- **`features/closures/` es dueño de los cierres en el frontend:** `types.ts` (`Closure`, `CLOSURE_LIMITS` y
  `closureKeys`) y `closures-queries.ts` (`useClosures`, `useCreateClosure`, `useDeleteClosure`). `bookings/types.ts`
  reexporta `Closure`; `agendaKeys.closures` es `closureKeys.all`; `AgendaPage` importa `useClosures` de `features/closures`.
- **Sin ciclos de imports entre features:** si dos features se necesitan (aquí `closures-queries` usa `agendaKeys` y la
  agenda usa la clave de cierres), la clave compartida va en un archivo sin imports (`closures/types.ts`) y no se
  reexportan hooks en la dirección contraria. Un ciclo con uso en el nivel del módulo rompe según el orden de carga.
- **Invalidaciones:** crear un cierre invalida `closureKeys.all` y `agendaKeys.bookings` (cascada de RN-16); eliminarlo
  solo `closureKeys.all` (no restaura reservas, S-05).
- **Aviso previo con datos frescos:** `useBookings(date, { fresh: true })` (`staleTime: 0`) para contar las reservas que
  se cancelarán; la acción que las cancela queda deshabilitada hasta tener el número (si el conteo falla, error con
  `requestId` y "Reintentar"). No inventar un endpoint de conteo.
- **Confirmación de acciones que cancelan reservas en un formulario:** dos pasos dentro del mismo `Modal` (datos →
  confirmación con la consecuencia), no un `ConfirmDialog` encima de otro modal. Un error del API que corresponde a un
  campo del paso 1 vuelve a ese paso y se aplica en un efecto con el mensaje guardado en un `useRef`.
- **No llamar a `setState` dentro de un `useEffect`:** la regla `react-hooks/set-state-in-effect` de ESLint lo marca como
  error (B-165). Para un valor que solo se consume en el efecto, usar `useRef`.
- **Textos con número:** separar singular y plural ("Se canceló 1 reserva." / "Se cancelaron N reservas."), también en
  las etiquetas (`bookingsLabel`).
- **Fechas de calendario en formularios:** `input type="date"` con `min` = `addDays(hoy, 1)` y validación Zod con "hoy"
  de `localDate(useNow())`, comparando texto `AAAA-MM-DD`; una fecha válida se comprueba con `addDays(d, 0) === d`. En
  las verificaciones, el valor se fija con el `setter` nativo de `HTMLInputElement.value` y un evento `input`.
- **`Banner` no tiene tono de advertencia:** un aviso de consecuencia destructiva usa `error`; uno neutro, `info`. No
  agregar tonos ni colores nuevos sin pasar por los tokens.
- **Verificación de cierres de hoy:** se insertan con `psql` incluyendo `created_by_id` (`NOT NULL`), se comprueba que
  no tengan filas en `audit_logs` y se borran en el mismo script. Al terminar no quedan cierres en la base.
- **Datos que dejó la verificación de T10b** en la base de desarrollo: la reserva "T10b reserva del miercoles" de
  empleado1 cancelada como historial. Bundle del frontend: 527 kB (aviso de Vite).

### T10c recortada (D-34, B-170)
- **T10c (pantalla de auditoría `/admin/audit`) no se ejecuta:** la persona la recortó por falta de tiempo. No crear
  `features/audit/` ni la pantalla, aunque el spec §9 la liste; el recorte se declara en `docs/04-cierre.md` (T11).
- La auditoría sigue completa en la API (T06a) y se consulta con `POST /api/audit-logs/search` (solo ADMIN).
- Decidido en T11 (B-174): el enlace "Auditoría" del ADMIN se mantiene y `/admin/audit` muestra `PlaceholderPage` con
  un aviso (`Banner` `info`) de que la sección se recortó y la auditoría se sigue registrando. No quitarlo ni cambiarlo
  sin que la persona lo pida.
