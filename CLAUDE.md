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
