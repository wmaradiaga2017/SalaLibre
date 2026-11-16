# 02 · Backlog (en orden de ejecución)

> Las tareas se ejecutan **en el orden de la tabla**. Ninguna empieza si no cumple la **DoR**, y ninguna se
> cierra si no cumple la **DoD por tarea**.
> **Los IDs nunca se renumeran.** Las tareas agregadas después usan sufijo (T02a, T03a, T05a, T05b, T06a, T07a, T07b, T07c, T08a, T10a, T10b, T10c) para que las
> referencias que ya existían en decisiones, diseño y bitácora sigan siendo válidas.

## Definition of Ready (DoR)
> El PDF de la prueba exige la DoR pero no la define. Esta es la mía (D-27).

Una tarea está **lista para el agente** cuando tiene:
- [ ] **ID y objetivo** en una frase (qué valor entrega).
- [ ] **Trazabilidad:** las RN-xx, D-xx y secciones del spec (o de `docs/diseño/DESIGN.md`) que implementa.
- [ ] **Dependencias** cerradas (las tareas previas ya están en estado Hecha).
- [ ] **Alcance:** qué archivos o módulos toca, respetando la estructura del spec §10 y las reglas de capas de `CLAUDE.md`.
- [ ] **Fuera de alcance:** qué NO debe hacer el agente en esta tarea.
- [ ] **Criterios de aceptación** verificables, en formato Dado / Cuando / Entonces.
- [ ] **Seguridad y auditoría:** qué rol o roles acceden y qué acción de auditoría genera (o "no aplica").
- [ ] **Verificación:** comandos exactos que prueban que funciona.
- [ ] **Estimación** (S ≤ 15 min · M ≤ 30 min · L ≤ 60 min). Si es más que L, se divide.

## Definition of Done por tarea
- [ ] Se cumplen todos los criterios de aceptación.
- [ ] Los comandos de verificación pasan, y su salida queda en `docs/tareas/Txx.md`.
- [ ] Se respetan las reglas de capas (`CLAUDE.md`, spec §10) y `npm run lint` no da errores.
- [ ] `docker compose up` sigue levantando todo.
- [ ] Está escrito `docs/tareas/Txx.md`.
- [ ] Hay una entrada en `03-bitacora.md`.
- [ ] Hay un commit `Txx: <título>`.

## Estados
`Pendiente → Lista (cumple DoR) → En curso → En revisión (la reviso yo) → Hecha` · o `Bloqueada (motivo)`

## Convenciones de verificación

Todos los comandos manuales de las tareas usan estas variables y cookies. Se preparan una vez por sesión de terminal, con el sistema levantado (`docker compose up -d --build`). Requieren `curl` y `jq` en la máquina.

```bash
BASE=http://localhost:8080/api
H='Content-Type: application/json'
# Cookies de sesión (datos del seed, spec §10 y D-26)
curl -s -c /tmp/admin.txt -H "$H" -d '{"email":"admin@salalibre.local","password":"Admin12345"}'      $BASE/auth/login
curl -s -c /tmp/emp1.txt  -H "$H" -d '{"email":"empleado1@salalibre.local","password":"Empleado12345"}' $BASE/auth/login
curl -s -c /tmp/emp2.txt  -H "$H" -d '{"email":"empleado2@salalibre.local","password":"Empleado12345"}' $BASE/auth/login
# Sala de prueba (la primera por nombre: Sala Copán, capacidad 8) y próximo lunes (UTC)
ROOM=$(curl -s -b /tmp/emp1.txt $BASE/rooms | jq -r '.[0].id')
D=$(date -u -d 'next monday' +%F)   # 16:00Z–17:00Z = 10:00–11:00 en America/Tegucigalpa (UTC-6)
```

- Pruebas unitarias (sin base): `npm --prefix src/api test`.
- Pruebas de integración (PostgreSQL real): `docker compose --profile test run --rm api-test` (spec S-08, se crea en T06).
- Lint: `npm --prefix src/api run lint` y `npm --prefix src/web run lint`.
- Base de datos de desarrollo (defaults del compose, T01): usuario, base y contraseña `salalibre`. Acceso: `docker compose exec db psql -U salalibre -d salalibre`.
- Las verificaciones manuales que crean datos (reservas, salas, usuarios, cierres) los cancelan o revierten al final para dejar el seed como estaba.

## Resumen
| Orden | ID | Título | Dep. | Est. | Recortable | Estado | Doc |
|---|---|---|---|---|---|---|---|
| 1 | T01 | Esqueleto del monorepo y compose (db, api Nest con health, web nginx con proxy) | — | M | No | Hecha | [T01](tareas/T01.md) |
| 2 | T02 | Modelo de datos, migraciones (EXCLUDE + `audit_logs` inmutable) y seed | T01 | M | No | Hecha | [T02](tareas/T02.md) |
| 3 | T02a | Plataforma transversal de la API: request ID, logger, filtro de errores, ValidationPipe, helmet, Swagger, TransactionRunner | T02 | M | No | Hecha | [T02a](tareas/T02a.md) |
| 4 | T03 | Auth: login y logout con cookie, `/me`, guard global (denegación por defecto), `RolesGuard` | T02a | M | No | Hecha | [T03](tareas/T03.md) |
| 5 | T03a | Cambio de contraseña propio (`PATCH /auth/password`) | T03 | S | No | Hecha | [T03a](tareas/T03a.md) |
| 6 | T04 | Módulo de salas (repositorio + service + controller, solo ADMIN para escritura) | T03 | M | No | Hecha | [T04](tareas/T04.md) |
| 7 | T05 | Módulo de reservas: dominio (RN-02 a RN-13), `BookingPolicy`, repositorio, locks, 23P01 → 409 | T04 | L | No | Hecha | [T05](tareas/T05.md) |
| 8 | T05a | Módulo de usuarios (ADMIN): alta, edición, desactivación con cancelación en cascada, reset de contraseña | T05, T03a | M | No | Hecha | [T05a](tareas/T05a.md) |
| 9 | T05b | Módulo de cierres (ADMIN): días cerrados que cancelan reservas | T05 | M | No | Hecha | [T05b](tareas/T05b.md) |
| 10 | T06 | Pruebas de integración: infraestructura `api-test`, choques, concurrencia y matriz RBAC | T05a, T05b | L | No | En revisión | [T06](tareas/T06.md) |
| 11 | T06a | Auditoría: `AuditService` transaccional en todas las escrituras + `POST /audit-logs/search` | T06 | M | **Sí** | Pendiente | |
| 12 | T07a | Sistema visual base (tokens, componentes de `shared/ui`) | T01 | M | No | Pendiente | |
| 13 | T07 | Frontend: `apiClient`, auth (login, logout, `/me`), layout y rutas protegidas por rol | T03, T07a | M | No | Pendiente | |
| 14 | T07b | Mi cuenta: cambio de contraseña | T03a, T07 | S | No | Pendiente | |
| 15 | T07c | Login: composición visual de la imagen y personajes animados | T07a, T07 | L | **Sí** | Pendiente | |
| 16 | T08 | Agenda del día: grilla salas × bloques de 15 min, selector de día, filtros, cierres | T05b, T07 | L | No | Pendiente | |
| 17 | T08a | Reservar desde la agenda: formulario modal y manejo del 409 | T08 | M | No | Pendiente | |
| 18 | T09 | Mis reservas + cancelar (propias y, para ADMIN, ajenas desde la agenda) | T08a | M | No | Pendiente | |
| 19 | T10 | Admin de salas | T04, T07 | M | No | Pendiente | |
| 20 | T10a | Admin de usuarios | T05a, T07 | M | No | Pendiente | |
| 21 | T10b | Admin de cierres | T05b, T07 | M | No | Pendiente | |
| 22 | T10c | Auditoría: pantalla de consulta paginada | T06a, T07 | M | **Sí** | Pendiente | |
| 23 | T11 | README final y verificación desde un clon limpio | todas | S | No | Pendiente | |

**Esfuerzo total estimado:** 4 L + 16 M + 3 S ≈ 12,75 h de ejecución del agente, sin contar la revisión. Si se recortan T06a y T10c se ahorra ≈ 1 h, pero se pierde O4 (auditoría), P-12, P-15, F-08 y parte de D-05: habría que declararlo en `04-cierre.md`. Recortar T07c ahorra ≈ 1 h más y solo afecta a lo visual: el login funcional queda en T07.

**Por qué este orden:**
- **T01:** primero, que el sistema levante.
- **T02a:** lo transversal, construido una sola vez para que todos los módulos lo usen.
- **T03 a T05b:** el núcleo de la API: seguridad, reservas y administración. Los módulos de usuarios y cierres van después de reservas porque desactivar un usuario y crear un cierre cancelan reservas (RN-15, RN-16) y comparten los locks de §11.
- **T06:** las pruebas de integración van cuando existen todas las rutas, porque la matriz RBAC (P-14) y las carreras (R-01, R-02) necesitan los cuatro módulos.
- **T06a:** la auditoría, recortable si falta tiempo. Se agrega al final de la API porque solo añade llamadas dentro de transacciones que ya existen.
- **T07a a T10c:** la UI, cuando los contratos ya son estables. El login funcional va en T07 y su acabado visual (T07c, recortable) después, para no bloquear la agenda. T07a depende solo de T01, así que puede construirse antes si hace falta.

---

## T01 · Esqueleto del monorepo y compose
| Campo | Valor |
|---|---|
| Objetivo | Que `docker compose up` levante `db`, `api` (NestJS con `/api/health`) y `web` (nginx con proxy) desde un clon limpio |
| Trazabilidad | O5 · D-01, D-02 · spec §10 (servicios, estructura de carpetas), §11 (accesibilidad no aplica aún) |
| Dependencias | — |
| Estimación | M |
| Seguridad / auditoría | Roles: público (`/api/health`). Auditoría: no aplica. OWASP A05: `api` corre sin root, solo se publica el 8080, sin secretos reales en el repositorio |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `docker-compose.yml` (servicios `db`, `api`, `web` según spec §10: healthchecks, `depends_on: service_healthy`, todas las variables con `${VAR:-valor}`), `.gitattributes` (`* text=auto eol=lf`), `.gitignore`, `.dockerignore`.
- `src/api/`: `package.json`, `tsconfig`, configuración de ESLint, `Dockerfile` multi-stage desde `node:24-alpine` con usuario no root, `src/main.ts` con prefijo global `/api`, `src/app.module.ts`, `src/health/` mínimo.
- `src/web/`: Vite + React 19 + TypeScript + Tailwind, `Dockerfile` (etapa Node que compila y etapa nginx), `nginx.conf` con proxy `/api` → `api:3000` y fallback de SPA a `index.html`, página placeholder.
- Variables del spec §5 (tabla "Parámetros configurables") declaradas con su valor por defecto en el servicio `api`.

**Fuera de alcance:**
- Prisma, esquema, migraciones y seed (T02). El health de esta tarea no consulta la base.
- Auth, módulos de negocio, componentes visuales (T07a).

**Criterios de aceptación:**
- **CA1** · Dado un clon limpio sin `.env`, cuando ejecuto `docker compose up -d --build`, entonces `db`, `api` y `web` quedan `healthy`.
- **CA2** · Cuando pido `GET http://localhost:8080/api/health`, entonces recibo 200 `{"status":"ok"}` a través de nginx.
- **CA3** · Cuando abro `http://localhost:8080/` y una ruta de la SPA como `/agenda`, entonces nginx devuelve el HTML de la app en ambas (fallback de SPA).
- **CA4** · Dado el sistema levantado, cuando listo los puertos publicados, entonces solo `web` publica el 8080 y `db` y `api` no publican puertos.
- **CA5** · Dado el contenedor `api` en ejecución, cuando consulto su usuario, entonces no es root.
- **CA6** · Dado el código de `api` y `web`, cuando ejecuto el lint de cada uno, entonces terminan sin errores.
- **CA7** · Dado el repositorio, cuando reviso `.gitattributes`, entonces contiene `* text=auto eol=lf`.

**Verificación:**
```bash
docker compose up -d --build
docker compose ps                                    # db, api, web → healthy
curl -s localhost:8080/api/health                    # {"status":"ok"}
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/agenda   # 200
docker compose ps --format '{{.Name}} {{.Publishers}}'           # solo web publica 8080
docker compose exec api whoami                       # distinto de root
npm --prefix src/api run lint && npm --prefix src/web run lint
cat .gitattributes                                   # * text=auto eol=lf
```

**Notas para el agente:** Defaults de la base en el compose: `POSTGRES_USER`, `POSTGRES_DB` y `POSTGRES_PASSWORD` = `salalibre` (solo desarrollo local). El healthcheck de `api` pega a `http://localhost:3000/api/health` y el de `web` a `http://localhost:8080/`. Toda dependencia fuera de la lista de D-01 se registra con su motivo en `docs/tareas/T01.md`.

---

## T02 · Modelo de datos, migraciones y seed
| Campo | Valor |
|---|---|
| Objetivo | Persistir usuarios, salas, reservas, cierres y auditoría con las garantías de base de datos (sin choques, auditoría inmutable) y un seed idempotente |
| Trazabilidad | RN-01, RN-22, RN-23 · D-01, D-04, D-05, D-07, D-25, D-26 · spec §7, §10 (arranque y seed), S-07 |
| Dependencias | T01 |
| Estimación | M |
| Seguridad / auditoría | Roles: ninguno (solo base de datos). Auditoría: crea la tabla `audit_logs` y su trigger de inmutabilidad; las filas las escribe T06a. OWASP A02: contraseñas con bcryptjs; A08: migraciones SQL propias que nunca se regeneran |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/prisma/schema.prisma`: modelos `PascalCase` con `@@map` a `snake_case` y los enums `Role`, `Equipment`, `BookingStatus`, `AuditAction` (spec §7). IDs `uuid` con default de la base.
- `src/api/prisma/migrations/<timestamp>_init/` generada por Prisma, más los CHECK de §7 (`capacity BETWEEN 1 AND 100`, `attendees >= 1`, `end_at > start_at`) y el índice único sobre `lower(rooms.name)`, en SQL propio si Prisma no los expresa.
- `src/api/prisma/migrations/<timestamp>_bookings_no_overlap/migration.sql` con el SQL de spec §7 (`btree_gist` + `EXCLUDE USING gist`).
- `src/api/prisma/migrations/<timestamp>_audit_logs_immutable/migration.sql` con el trigger `BEFORE UPDATE OR DELETE` que lanza excepción.
- `src/api/prisma/seed.ts` idempotente con `upsert` (spec §10, D-26, S-07).
- `src/api/src/prisma/` (`PrismaModule`, `PrismaService`) y `GET /api/health` ahora ejecuta una consulta a la base.
- Arranque de `api`: `prisma migrate deploy` → seed → `node dist/main.js`.

**Fuera de alcance:**
- Endpoints, repositorios de módulos, `AuditService` (T06a), reservas o cierres de ejemplo.

**Criterios de aceptación:**
- **CA1** · Dado un volumen de base vacío, cuando arranca `api`, entonces se aplican todas las migraciones y el seed crea 1 `ADMIN`, 3 `EMPLOYEE` y 5 salas activas (Sala Copán 8, Sala Roatán 4, Sala Lempira 12, Sala Morazán 6, Sala Pico Bonito 20).
- **CA2** · Dado el seed ya aplicado, cuando `api` se reinicia, entonces no duplica filas ni sobrescribe la contraseña de un usuario existente.
- **CA3** · Dada una reserva `CONFIRMED` de 10:00 a 11:00 en la sala A, cuando se inserta por SQL otra `CONFIRMED` de 10:30 a 11:30 en A, entonces la base falla con SQLSTATE `23P01`.
- **CA4** · Dada esa reserva, cuando se inserta 11:00–12:00 en A, o 10:00–11:00 en la sala B, o una `CANCELLED` solapada en A, entonces se acepta.
- **CA5** · Cuando se hace `UPDATE` o `DELETE` sobre `audit_logs`, entonces la base lanza una excepción; el `INSERT` funciona.
- **CA6** · Cuando se inserta una sala con nombre repetido sin distinguir mayúsculas, capacidad 0 o 101, un usuario con correo repetido o una reserva con 0 asistentes, entonces la base lo rechaza.
- **CA7** · Dado el seed aplicado, cuando reviso las contraseñas guardadas, entonces son hashes bcryptjs y nunca texto en claro; y cuando pido `GET /api/health`, entonces responde `{"status":"ok"}` tras consultar la base.

**Verificación:**
```bash
docker compose down -v && docker compose up -d --build
P="docker compose exec -T db psql -U salalibre -d salalibre"
$P -c "SELECT email, role FROM users ORDER BY email;"        # 1 ADMIN + 3 EMPLOYEE
$P -c "SELECT name, capacity FROM rooms ORDER BY name;"      # 5 salas
$P -c "SELECT left(password_hash,4) FROM users LIMIT 1;"     # $2a$ o $2b$
docker compose restart api && sleep 15
$P -c "SELECT count(*) FROM users;"                          # sigue en 4
$P <<'SQL'
BEGIN;
INSERT INTO bookings (room_id,user_id,title,attendees,start_at,end_at)
  SELECT r.id,u.id,'A',1,'2030-01-07 16:00+00','2030-01-07 17:00+00' FROM rooms r, users u
  WHERE r.name='Sala Copán' AND u.email='empleado1@salalibre.local';
INSERT INTO bookings (room_id,user_id,title,attendees,start_at,end_at)
  SELECT r.id,u.id,'B',1,'2030-01-07 16:30+00','2030-01-07 17:30+00' FROM rooms r, users u
  WHERE r.name='Sala Copán' AND u.email='empleado1@salalibre.local';   -- ERROR ... bookings_no_overlap
ROLLBACK;
SQL
$P <<'SQL'
BEGIN;
INSERT INTO audit_logs (action,entity,entity_id,request_id) VALUES ('ROOM_CREATED','room',gen_random_uuid(),'t');
UPDATE audit_logs SET entity='x';                                      -- ERROR: inmutable
ROLLBACK;
SQL
curl -s localhost:8080/api/health
```

**Notas para el agente:** Las dos migraciones SQL propias nunca se eliminan, regeneran ni reemplazan por código (D-04, D-05); `prisma migrate dev` no debe tocarlas. El seed no escribe en `audit_logs`. `update: {}` en el `upsert` de usuarios para no pisar contraseñas.

---

## T02a · Plataforma transversal de la API
| Campo | Valor |
|---|---|
| Objetivo | Construir una sola vez lo que comparten todos los módulos: request ID, logs, errores, validación, cabeceras de seguridad y transacciones |
| Trazabilidad | P-17 · D-01, D-05, D-06 · spec §8 (formato de error, `X-Request-Id`), §10, §11 (seguridad, observabilidad) |
| Dependencias | T02 |
| Estimación | M |
| Seguridad / auditoría | Roles: público. Auditoría: no aplica (`TransactionRunner` queda listo para T06a). OWASP A05: helmet y sin stack traces; A09: logs sin secretos; A03: `ValidationPipe` con `whitelist` |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/common/`: middleware o interceptor de request ID (header `X-Request-Id`), `http-exception.filter.ts` (formato `{ error: { code, message, requestId } }`), `AppError` base con `code` y estado HTTP, `TransactionRunner` (`run(ctx => …)` sobre `prisma.$transaction`, con helper `advisoryLock(key)` que ejecuta `pg_advisory_xact_lock`).
- Logger JSON con pino (`requestId`, método, ruta, estado, duración; redacta `password`, `cookie`, `authorization`).
- `ValidationPipe` global (`whitelist`, `forbidNonWhitelisted`, `transform`) que produce 400 `VALIDATION_ERROR`; helmet; `cookie-parser`; Swagger en `/api/docs`.
- Pruebas en `src/api/test/` con un controlador de prueba que no forma parte del módulo de producción.

**Fuera de alcance:**
- Mapeo `23P01` → 409 (T05), guards de auth (T03), módulos de negocio, escritura de auditoría (T06a).

**Criterios de aceptación:**
- **CA1** · Cuando cualquier ruta responde, incluida una inexistente, entonces trae el header `X-Request-Id` (se genera un UUID si el cliente no lo envía).
- **CA2** · Dada una ruta inexistente, cuando se solicita, entonces 404 con `{ "error": { "code": "NOT_FOUND", "message": …, "requestId": … } }` y el `requestId` coincide con el header.
- **CA3** · Dado un body con un campo desconocido o inválido, cuando llega a una ruta con DTO, entonces 400 `VALIDATION_ERROR`.
- **CA4** · Dada una excepción no controlada, cuando ocurre, entonces 500 `INTERNAL_ERROR` sin stack trace ni detalles internos.
- **CA5** · Dada cualquier petición, cuando la API la atiende, entonces genera un log JSON con `requestId`, método, ruta, estado y duración, y nunca aparecen contraseñas, cookies ni cabeceras de autorización.
- **CA6** · Dada una operación dentro de `TransactionRunner.run`, cuando termina bien, entonces se confirma; cuando el callback lanza, entonces se revierte; y cuando se llama `advisoryLock`, entonces ejecuta `pg_advisory_xact_lock` dentro de la transacción.
- **CA7** · Dada cualquier respuesta, cuando reviso sus cabeceras, entonces incluye las de helmet (p. ej. `X-Content-Type-Options: nosniff`); y cuando pido `/api/docs`, entonces responde.

**Verificación:**
```bash
docker compose up -d --build
curl -si localhost:8080/api/health | grep -i -E "x-request-id|x-content-type-options"
curl -s localhost:8080/api/no-existe            # {"error":{"code":"NOT_FOUND",...,"requestId":"..."}}
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/api/docs
docker compose logs api --tail 5                # líneas JSON con requestId
npm --prefix src/api test
npm --prefix src/api run lint
```

**Notas para el agente:** helmet, pino, `cookie-parser`, Swagger y `class-validator` no están en la lista de D-01: regístralos con su motivo en `docs/tareas/T02a.md`. Los errores de negocio de las demás tareas se lanzan como `AppError` con su `code` de spec §8.

---

## T03 · Auth: login, logout, `/me`, guard global y roles
| Campo | Valor |
|---|---|
| Objetivo | Iniciar y cerrar sesión con cookie `httpOnly`, consultar el usuario actual y proteger toda la API con denegación por defecto |
| Trazabilidad | RN-14, RN-19, RN-21 · D-03, D-16, D-19, D-33, S-01, S-02 · spec §5, §8 (`/auth/*`), §11, F-01 · P-10 (parcial), P-14 (parcial; matriz completa en T06) |
| Dependencias | T02a |
| Estimación | M |
| Seguridad / auditoría | Roles: público (`login`, `health`); autenticado (`logout`, `me`). Auditoría: no aplica (el login queda en logs de pino, S-02). OWASP A07: mensaje genérico, bcryptjs, cookie `httpOnly` + `SameSite=Strict` + `Path=/api`; A01: denegación por defecto; A05: Swagger (`/api/docs`) solo fuera de producción |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/auth/**` (controller, service, dto, estrategia JWT) y `src/api/src/modules/users/` mínimo: `UsersRepository` (interfaz) + implementación Prisma con `findByEmail` y `findById`.
- `src/api/src/common/`: `JwtAuthGuard` global (`APP_GUARD`), `RolesGuard`, decoradores `@Public()`, `@Roles()`, `@CurrentUser()`.
- `src/api/src/common/configure-app.ts`: Swagger en `/api/docs` solo se monta si `NODE_ENV` no es `production`. Express lo sirve fuera del router de Nest, así que el guard global no lo cubre.

**Fuera de alcance:**
- Cambio de contraseña (T03a), CRUD de usuarios (T05a), escritura de auditoría, frontend.

**Criterios de aceptación:**
- **CA1** · Dado el seed, cuando `POST /api/auth/login` recibe credenciales correctas, entonces 200 con `{ id, email, name, role, isActive }` (sin hash) y `Set-Cookie: access_token` con `HttpOnly; SameSite=Strict; Path=/api`.
- **CA2** · Dadas credenciales incorrectas, correo inexistente o usuario inactivo, cuando se hace login, entonces 401 `INVALID_CREDENTIALS` con el mismo mensaje en los tres casos.
- **CA3** · Dada una cookie válida, cuando `GET /api/auth/me`, entonces 200 con el usuario; sin cookie, entonces 401 `UNAUTHENTICATED`.
- **CA4** · Dado un usuario con `isActive = false` y una cookie aún vigente, cuando llama a cualquier ruta, entonces 401 `UNAUTHENTICATED` (RN-14: se relee el usuario en cada petición).
- **CA5** · Dada una cookie con JWT vencido o firma inválida, cuando llama a cualquier ruta, entonces 401 `UNAUTHENTICATED`. El JWT dura `JWT_EXPIRES_IN` (8 h), no se renueva (RN-19) y su payload solo lleva `sub` y `role`.
- **CA6** · Dada una sesión, cuando `POST /api/auth/logout`, entonces 204 y la cookie queda borrada.
- **CA7** · Dada una ruta nueva sin `@Public()`, cuando se llama sin sesión, entonces 401; dada una ruta con `@Roles('ADMIN')`, cuando la llama un `EMPLOYEE`, entonces 403 `FORBIDDEN`.
- **CA8** · Dado `NODE_ENV=production` (el valor del compose), cuando pido `GET /api/docs`, entonces 404 `NOT_FOUND` con el formato de error; dado otro `NODE_ENV` (desarrollo o pruebas), cuando lo pido, entonces responde 200.

**Verificación:**
```bash
docker compose up -d --build
# Variables y cookies de la sección "Convenciones de verificación"
curl -si -c /tmp/emp1.txt -H "$H" -d '{"email":"empleado1@salalibre.local","password":"Empleado12345"}' $BASE/auth/login | grep -i set-cookie
curl -s -b /tmp/emp1.txt $BASE/auth/me                                   # el usuario
curl -s $BASE/auth/me                                                    # 401 UNAUTHENTICATED
curl -s -H "$H" -d '{"email":"empleado1@salalibre.local","password":"mala"}' $BASE/auth/login   # 401 INVALID_CREDENTIALS
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/emp1.txt -X POST $BASE/auth/logout            # 204
curl -s $BASE/docs                                                       # 404 NOT_FOUND (compose con NODE_ENV=production)
npm --prefix src/api test -- auth
npm --prefix src/api run lint
```

**Notas para el agente:** No agregues límite de intentos (throttler) ni el código 429: no están en el spec (§8 lista 400, 401, 403, 404, 409, 422 y 500). `logout` no está en `CLAUDE.md` pero se justifica en S-01. Swagger (`/api/docs`) solo se sirve fuera de producción (D-33): lo decidió la persona tras T02a, porque `CLAUDE.md` solo permite como públicas `POST /auth/login` y `GET /health`. El caso 200 de CA8 se prueba en `src/api/test/` con `NODE_ENV` distinto de `production`.

---

## T03a · Cambio de contraseña propio
| Campo | Valor |
|---|---|
| Objetivo | Que cualquier persona cambie su contraseña indicando la actual |
| Trazabilidad | RN-18 · D-19 · spec §5, §8 (`PATCH /api/auth/password`), F-09 · P-16 (parcial) |
| Dependencias | T03 |
| Estimación | S |
| Seguridad / auditoría | Roles: autenticado. Auditoría: `USER_PASSWORD_CHANGED`, que se conecta en T06a. OWASP A07: exige la contraseña actual, hash bcryptjs, nunca se loguea |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/auth/` (endpoint `PATCH /auth/password`, `ChangePasswordDto`) y `UsersRepository.updatePasswordHash`. La escritura va dentro de `TransactionRunner` para que T06a solo agregue la llamada de auditoría.

**Fuera de alcance:**
- Restablecer contraseña de otro (T05a), recuperación por correo (D-19), pantalla (T07b), escritura de auditoría (T06a).

**Criterios de aceptación:**
- **CA1** · Dado un usuario autenticado, cuando envía la contraseña actual correcta y una nueva de al menos 8 caracteres, entonces 204, y a partir de ese momento entra con la nueva y no con la anterior.
- **CA2** · Dada una contraseña actual incorrecta, cuando se envía, entonces 422 `INVALID_CURRENT_PASSWORD` y la contraseña no cambia.
- **CA3** · Dada una nueva contraseña de menos de 8 caracteres o campos faltantes, cuando se envía, entonces 400 `VALIDATION_ERROR`.
- **CA4** · Dada una petición sin sesión, cuando se envía, entonces 401 `UNAUTHENTICATED`.
- **CA5** · Dado un cambio de contraseña, exitoso o fallido, cuando reviso la respuesta, los logs y los errores, entonces nunca contienen contraseñas ni hashes.

**Verificación:**
```bash
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/emp1.txt -X PATCH -H "$H" -d '{"currentPassword":"Empleado12345","newPassword":"Nueva12345"}' $BASE/auth/password   # 204
curl -s -H "$H" -d '{"email":"empleado1@salalibre.local","password":"Nueva12345"}' $BASE/auth/login                 # 200
curl -s -b /tmp/emp1.txt -X PATCH -H "$H" -d '{"currentPassword":"mala","newPassword":"Otra12345"}' $BASE/auth/password   # 422 INVALID_CURRENT_PASSWORD
curl -s -b /tmp/emp1.txt -X PATCH -H "$H" -d '{"currentPassword":"Nueva12345","newPassword":"corta"}' $BASE/auth/password # 400 VALIDATION_ERROR
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/emp1.txt -X PATCH -H "$H" -d '{"currentPassword":"Nueva12345","newPassword":"Empleado12345"}' $BASE/auth/password   # 204 (revierte)
docker compose logs api | grep -c "Nueva12345"   # 0
npm --prefix src/api test -- auth && npm --prefix src/api run lint
```

**Notas para el agente:** No invalides sesiones existentes al cambiar la contraseña: el spec no lo pide (no hay refresh y RN-14 solo mira `isActive`).

---

## T04 · Módulo de salas
| Campo | Valor |
|---|---|
| Objetivo | Listar salas según el rol y permitir que ADMIN las cree, edite y desactive con su equipamiento |
| Trazabilidad | RN-09 (el indicador `isActive`; la validación al reservar está en T05), RN-21, RN-22 · D-14, D-25 · spec §7 (`rooms`), §8 (`/rooms`), F-05 · P-14, P-16 (parcial) |
| Dependencias | T03 |
| Estimación | M |
| Seguridad / auditoría | Roles: `GET` autenticado (`EMPLOYEE` solo activas, `ADMIN` todas); `POST` y `PATCH` solo ADMIN. Auditoría: `ROOM_CREATED` y `ROOM_UPDATED`, que se conectan en T06a. OWASP A01: el filtro por rol vive en el servicio, no en la UI; A03: DTO con enum de equipamiento |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/rooms/**`: controller, service, `rooms.repository.ts` (interfaz), `prisma-rooms.repository.ts`, dto.

**Fuera de alcance:**
- Reglas de reserva (T05), cancelar reservas al desactivar (D-14 lo prohíbe: las futuras se mantienen), borrado de salas, auditoría (T06a), frontend (T10).

**Criterios de aceptación:**
- **CA1** · Dado un `EMPLOYEE`, cuando `GET /api/rooms`, entonces recibe solo salas con `isActive = true` ordenadas por `name`; dado un `ADMIN`, recibe todas.
- **CA2** · Dado un `ADMIN`, cuando `POST /api/rooms` con `{ name, capacity, location, equipment }` válidos, entonces 201 con la `Room`.
- **CA3** · Dado un `EMPLOYEE`, cuando hace `POST` o `PATCH` en `/api/rooms`, entonces 403 `FORBIDDEN`.
- **CA4** · Dado un nombre ya existente (sin distinguir mayúsculas, p. ej. "sala copán"), cuando se crea o se edita, entonces 409 `ROOM_NAME_TAKEN`.
- **CA5** · Dados capacidad 0 o 101, nombre vacío o de más de 60 caracteres, ubicación vacía o de más de 100, o equipamiento con un valor fuera de la lista o repetido, cuando se envía, entonces 400 `VALIDATION_ERROR`.
- **CA6** · Dado un `PATCH` con `{ "isActive": false }`, cuando lo envía un ADMIN, entonces 200 y la sala queda desactivada sin borrarse. No existe endpoint `DELETE`.
- **CA7** · Dado un id inexistente, cuando `PATCH /api/rooms/:id`, entonces 404 `NOT_FOUND`; dado un id que no es UUID, entonces 400.
- **CA8** · Dado el código del módulo de salas, cuando reviso sus imports, entonces no importa nada del módulo de reservas y `rooms.controller.ts` no importa Prisma.

**Verificación:**
```bash
curl -s -b /tmp/emp1.txt $BASE/rooms | jq 'length'                 # 5
curl -s -b /tmp/emp1.txt -X POST -H "$H" -d '{"name":"X","capacity":4,"location":"P1","equipment":[]}' $BASE/rooms   # 403 FORBIDDEN
curl -s -b /tmp/admin.txt -H "$H" -d '{"name":"Sala Prueba","capacity":6,"location":"Piso 1","equipment":["TV","TV"]}' $BASE/rooms   # 400 por equipo repetido
NEW=$(curl -s -b /tmp/admin.txt -H "$H" -d '{"name":"Sala Prueba","capacity":6,"location":"Piso 1","equipment":["TV","WHITEBOARD"]}' $BASE/rooms | tee /dev/stderr | jq -r .id)
curl -s -b /tmp/admin.txt -H "$H" -d '{"name":"sala prueba","capacity":6,"location":"Piso 1","equipment":[]}' $BASE/rooms   # 409 ROOM_NAME_TAKEN
curl -s -b /tmp/admin.txt -X PATCH -H "$H" -d '{"isActive":false}' $BASE/rooms/$NEW                                        # isActive false
curl -s -b /tmp/emp1.txt $BASE/rooms | jq 'length'                 # 5 (la desactivada no aparece)
grep -rn "prisma" src/api/src/modules/rooms/rooms.controller.ts && echo "FALLA" || echo "OK"
npm --prefix src/api test -- rooms && npm --prefix src/api run lint
```

**Notas para el agente:** La sala de prueba creada queda inactiva; no se borra (no existe `DELETE`). Si ensucia el entorno, `docker compose down -v` la elimina.

---

## T05 · Módulo de reservas con reglas de negocio
| Campo | Valor |
|---|---|
| Objetivo | Crear, listar y cancelar reservas garantizando que no haya choques, con todas las reglas de horario, duración y permisos |
| Trazabilidad | O1 · RN-01 a RN-13, RN-17, RN-20 · D-04, D-06, D-07, D-09 a D-13, D-15, D-17, D-20, D-23, D-32 · spec §5, §7, §8, §11 (concurrencia), F-02, F-03, F-04 · P-05, P-06, P-07, P-09 (unitarias; la integración va en T06) |
| Dependencias | T04 |
| Estimación | L |
| Seguridad / auditoría | Roles: autenticado; cancelar solo dueño o ADMIN (`BookingPolicy`). Auditoría: `BOOKING_CREATED` y `BOOKING_CANCELLED`, que se conectan en T06a. OWASP A01: sin IDOR (`/mine` solo propias, cancelar ajenas solo ADMIN), RN-17 aplicada en la API; A04: la concurrencia la resuelve la base |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/bookings/**`: controller, service, dto, `domain/booking-rules.ts` (RN-02 a RN-08, puro y sin NestJS ni Prisma), `domain/booking.policy.ts`, `bookings.repository.ts` (interfaz), `prisma-bookings.repository.ts`.
- Configuración tipada de los parámetros de spec §5 (`BUSINESS_TZ`, `BUSINESS_OPEN_TIME`, `BUSINESS_CLOSE_TIME`, `BOOKING_SLOT_MINUTES`, `BOOKING_MIN_MINUTES`, `BOOKING_MAX_MINUTES`, `BOOKING_MAX_DAYS_AHEAD`).
- Mapeo `23P01` → 409 `BOOKING_CONFLICT` en `common/http-exception.filter.ts`.
- Al crear: dentro de `TransactionRunner`, `pg_advisory_xact_lock` sobre la fecha afectada y sobre el `userId` (spec §11); consulta de `closures` para RN-10.
- Endpoints: `GET /api/bookings?date=`, `GET /api/bookings/mine`, `POST /api/bookings`, `POST /api/bookings/:id/cancel`.

**Fuera de alcance:**
- Frontend, escritura de auditoría (T06a), crear o borrar cierres (T05b), desactivar usuarios (T05a), edición o borrado de reservas (RN-13), recurrentes, pruebas de integración (T06).

**Criterios de aceptación:**
- **CA1** · Dado un empleado autenticado y una sala activa, cuando crea una reserva válida (día hábil futuro, 10:00–11:00 hora Tegucigalpa, título, asistentes ≤ capacidad), entonces 201 con la `Booking` (`status: CONFIRMED`, `isMine: true`).
- **CA2** · Dada una reserva activa de 10:00 a 11:00 en la sala A, cuando otro usuario pide 10:30–11:30 en A, entonces 409 `BOOKING_CONFLICT` con `requestId`.
- **CA3** · Dada esa reserva, cuando se pide 11:00–12:00 en A, entonces 201 (intervalo semiabierto, RN-01).
- **CA4** · Cuando `startAt` o `endAt` no caen en múltiplo de 15 minutos con segundos en 0 (p. ej. 10:10), entonces 422 `INVALID_SLOT`; cuando la duración es menor de 15 o mayor de 240 minutos, entonces 422 `INVALID_DURATION`.
- **CA5** · Cuando la reserva cae en sábado o domingo, empieza antes de las 07:00, termina después de las 20:00 o cruza la medianoche (evaluado en `America/Tegucigalpa`), entonces 422 `OUTSIDE_BUSINESS_HOURS`.
- **CA6** · Cuando `startAt` no es posterior a ahora, entonces 422 `BOOKING_IN_PAST`; cuando supera ahora + 30 días, entonces 422 `TOO_FAR_AHEAD`; con justo 30 días, entonces 201.
- **CA7** · Cuando `attendees` supera la capacidad, entonces 422 `CAPACITY_EXCEEDED`; cuando no es entero ≥ 1 o el `title` queda vacío o de más de 100 caracteres tras recortar, entonces 400 `VALIDATION_ERROR`; en sala inactiva, 422 `ROOM_INACTIVE`; en una fecha de `closures`, 422 `DAY_CLOSED`.
- **CA8** · Cuando el dueño cancela una reserva futura `CONFIRMED`, entonces 200 con `status: CANCELLED`, `cancelledAt` y `cancelledBy`; cuando un `EMPLOYEE` cancela una ajena, 403 `FORBIDDEN`; cuando lo hace un `ADMIN`, 200; si ya empezó, 422 `BOOKING_ALREADY_STARTED`; si ya estaba cancelada, 422 `BOOKING_ALREADY_CANCELLED`; id inexistente, 404.
- **CA9** · Dada una reserva cancelada de 10:00 a 11:00, cuando se reserva el mismo horario en la misma sala, entonces 201.
- **CA10** · Dadas dos solicitudes simultáneas por el mismo hueco, cuando la base devuelve `23P01`, entonces la API responde 409 `BOOKING_CONFLICT` y nunca 500.
- **CA11** · Dado un día con reservas, cuando pido `GET /api/bookings?date=`, entonces recibo solo las `CONFIRMED` de ese día (en `BUSINESS_TZ`) de todas las salas, con `title: null` en las ajenas para un `EMPLOYEE` (RN-17) y con título para el `ADMIN`; y cuando pido `GET /api/bookings/mine`, entonces recibo solo las propias con `endAt` ≥ inicio del día actual, en ambos estados, ordenadas por `startAt`.
- **CA12** · Dado un empleado con 6 reservas futuras activas, cuando crea otra válida, entonces 201 (RN-20: sin tope).
- **CA13** · Dada la creación de una reserva, cuando se ejecuta el servicio, entonces toma `pg_advisory_xact_lock` sobre la fecha y sobre el `userId` dentro de la misma transacción (prueba unitaria con repositorio simulado).
- **CA14** · Dado el código del módulo de reservas, cuando reviso sus imports, entonces `bookings.controller.ts` no importa Prisma y `domain/` no importa nada de `@nestjs/*` ni de `@prisma/*`.
- **CA15** · Dado el módulo de reservas, cuando llamo `PATCH`, `PUT` o `DELETE` sobre `/api/bookings/:id`, entonces responde 404 porque no existe endpoint de edición ni de borrado (RN-13).
- **CA16** · Dada una reserva que incumple varias reglas a la vez (p. ej. sábado a las 10:10 en una sala inactiva), cuando se crea, entonces la API responde el primer error según spec §8 «Orden de validación» (aquí 422 `INVALID_SLOT`); y dada una reserva ya cancelada cuyo inicio ya pasó, cuando se cancela, entonces 422 `BOOKING_ALREADY_CANCELLED` (prueba unitaria).

**Verificación:**
```bash
docker compose up -d --build
npm --prefix src/api test -- bookings
npm --prefix src/api run lint
grep -rE "@nestjs|@prisma" src/api/src/modules/bookings/domain && echo "FALLA: el dominio no es puro" || echo "OK"
grep -n "prisma" src/api/src/modules/bookings/bookings.controller.ts && echo "FALLA" || echo "OK"
# Manual (variables y cookies de "Convenciones")
B=$(curl -s -b /tmp/emp1.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${D}T16:00:00Z\",\"endAt\":\"${D}T17:00:00Z\",\"title\":\"Demo\",\"attendees\":2}" $BASE/bookings | tee /dev/stderr | jq -r .id)   # 201
curl -s -b /tmp/emp2.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${D}T16:30:00Z\",\"endAt\":\"${D}T17:30:00Z\",\"title\":\"Choque\",\"attendees\":2}" $BASE/bookings    # 409 BOOKING_CONFLICT
curl -s -b /tmp/emp2.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${D}T16:10:00Z\",\"endAt\":\"${D}T17:00:00Z\",\"title\":\"X\",\"attendees\":2}" $BASE/bookings         # 422 INVALID_SLOT
curl -s -b /tmp/emp2.txt "$BASE/bookings?date=$D" | jq '.[0].title'        # null (ajena)
curl -s -b /tmp/admin.txt "$BASE/bookings?date=$D" | jq '.[0].title'       # "Demo"
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/emp2.txt -X POST $BASE/bookings/$B/cancel   # 403
curl -s -b /tmp/emp1.txt -X POST $BASE/bookings/$B/cancel | jq -r .status                      # CANCELLED
```

**Notas para el agente:** La restricción `EXCLUDE` ya existe (T02); no la dupliques en código. Valida en el dominio para dar un mensaje claro, pero confía en la base para la concurrencia. Prisma no tiene un código propio para `23P01`: puede llegar como `PrismaClientUnknownRequestError` o dentro de `meta`; confirma la forma real contra la base (la prueba P-01 de T06 la ejercita) y déjala escrita en `docs/tareas/T05.md`. Para la zona horaria usa `Intl` o una librería de zonas (no fijes UTC-6 a mano) y regístrala si es dependencia nueva (D-01). El orden de los errores lo fija spec §8 «Orden de validación» (D-32); respétalo en el dominio y en el servicio.

---

## T05a · Módulo de usuarios (ADMIN)
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. dé de alta, edite y desactive usuarios y restablezca contraseñas; desactivar cancela sus reservas futuras |
| Trazabilidad | RN-14, RN-15, RN-18, RN-21, RN-23, RN-26 · D-08, D-16, D-19, S-03 · spec §7 (`users`), §8 (`/users`), §11 (lock por `userId`), F-06 · P-10, P-16 (parcial; integración en T06) |
| Dependencias | T05, T03a |
| Estimación | M |
| Seguridad / auditoría | Roles: solo ADMIN. Auditoría: `USER_CREATED`, `USER_UPDATED`, `USER_PASSWORD_RESET` y `BOOKING_CANCELLED` por cada reserva cancelada en cascada, que se conectan en T06a. OWASP A01: 403 a `EMPLOYEE`; A02: nunca se devuelve `password_hash`; A04: lock por `userId` |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/users/**` (controller, service, dto), ampliando `UsersRepository` con `findAll`, `create`, `update`.
- `BookingsRepository.cancelFutureByUser(userId, cancelledById, ctx)` para cancelar en la misma transacción.
- Endpoints: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id`, `POST /api/users/:id/reset-password`.

**Fuera de alcance:**
- Autorregistro, borrado de usuarios, restaurar reservas al reactivar (D-16), pantalla (T10a), escritura de auditoría (T06a).

**Criterios de aceptación:**
- **CA1** · Dado un `ADMIN`, cuando `GET /api/users`, entonces 200 con todos los usuarios ordenados por `name` y sin `passwordHash`; dado un `EMPLOYEE`, 403.
- **CA2** · Dado un `ADMIN`, cuando `POST /api/users` con `{ name, email, password, role }` válidos, entonces 201 con el `User` y el correo guardado en minúsculas.
- **CA3** · Dado un correo ya existente (sin distinguir mayúsculas), cuando se crea, entonces 409 `EMAIL_TAKEN`; con contraseña de menos de 8 caracteres, correo inválido, nombre vacío o rol inválido, 400 `VALIDATION_ERROR`.
- **CA4** · Dado un `PATCH` con `{ name?, role?, isActive? }`, cuando se envía, entonces 200 con el `User`; con campos no permitidos (`email`, `password`), 400.
- **CA5** · Dado un usuario con k reservas `CONFIRMED` futuras, cuando un ADMIN lo desactiva, entonces en una sola transacción, con lock sobre su `userId`, esas reservas pasan a `CANCELLED` (con `cancelledBy` = el ADMIN) y las reservas pasadas no cambian; si algo falla, no queda nada a medias.
- **CA6** · Dado un usuario desactivado, cuando intenta login, entonces 401 `INVALID_CREDENTIALS`; con una cookie vigente, 401 `UNAUTHENTICATED`.
- **CA7** · Dado un ADMIN, cuando intenta desactivarse a sí mismo, entonces 422 `CANNOT_DEACTIVATE_SELF`.
- **CA8** · Dado un ADMIN, cuando `POST /api/users/:id/reset-password` con una `newPassword` de al menos 8 caracteres, entonces 204 y el usuario entra con la nueva.
- **CA9** · Dado un id inexistente, cuando se edita o se restablece, entonces 404 `NOT_FOUND`.
- **CA10** · Dado un usuario inactivo, cuando un ADMIN lo reactiva (`isActive: true`), entonces 200 y sus reservas canceladas no se restauran.

**Verificación:**
```bash
curl -s -b /tmp/emp1.txt -o /dev/null -w "%{http_code}\n" $BASE/users                                      # 403
U=$(curl -s -b /tmp/admin.txt -H "$H" -d '{"name":"Prueba Uno","email":"Prueba.Uno@SalaLibre.local","password":"Prueba12345","role":"EMPLOYEE"}' $BASE/users | tee /dev/stderr | jq -r .id)   # 201, email en minúsculas
curl -s -b /tmp/admin.txt -H "$H" -d '{"name":"Otra","email":"prueba.uno@salalibre.local","password":"Prueba12345","role":"EMPLOYEE"}' $BASE/users   # 409 EMAIL_TAKEN
curl -s -c /tmp/uno.txt -H "$H" -d '{"email":"prueba.uno@salalibre.local","password":"Prueba12345"}' $BASE/auth/login
curl -s -b /tmp/uno.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${D}T18:00:00Z\",\"endAt\":\"${D}T19:00:00Z\",\"title\":\"Se cancela\",\"attendees\":1}" $BASE/bookings | jq -r .status   # CONFIRMED
curl -s -b /tmp/admin.txt -X PATCH -H "$H" -d '{"isActive":false}' $BASE/users/$U | jq -r .isActive      # false
curl -s -b /tmp/uno.txt $BASE/bookings/mine | jq -r '.error.code'                                          # UNAUTHENTICATED (cookie vigente de usuario inactivo)
curl -s -b /tmp/admin.txt "$BASE/bookings?date=$D" | jq 'map(select(.title=="Se cancela")) | length'      # 0 (ya no está CONFIRMED)
ME=$(curl -s -b /tmp/admin.txt $BASE/auth/me | jq -r .id)
curl -s -b /tmp/admin.txt -X PATCH -H "$H" -d '{"isActive":false}' $BASE/users/$ME                         # 422 CANNOT_DEACTIVATE_SELF
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/admin.txt -H "$H" -d '{"newPassword":"Nueva12345"}' $BASE/users/$U/reset-password   # 204
npm --prefix src/api test -- users && npm --prefix src/api run lint
```

**Notas para el agente:** La desactivación y el lock por `userId` son los que cierran el riesgo R-02; la prueba de carrera está en T06. El `PATCH` no acepta `email` (RN-23 solo aplica al alta).

---

## T05b · Módulo de cierres (ADMIN)
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. registre y elimine días cerrados; crear uno cancela las reservas de esa fecha |
| Trazabilidad | RN-10, RN-16, RN-21, RN-24 · D-23, D-31, S-04, S-05 · spec §7 (`closures`), §8 (`/closures`), §11 (lock por fecha), F-07 · P-11 (integración en T06) |
| Dependencias | T05 |
| Estimación | M |
| Seguridad / auditoría | Roles: `GET` autenticado; `POST` y `DELETE` solo ADMIN. Auditoría: `CLOSURE_CREATED`, `CLOSURE_DELETED` y `BOOKING_CANCELLED` por cada reserva cancelada, que se conectan en T06a. OWASP A01; A04: lock por fecha |
| Estado | Hecha |

**Alcance (archivos o módulos):**
- `src/api/src/modules/closures/**` (controller, service, dto, repositorio de interfaz + Prisma).
- `BookingsRepository.cancelConfirmedByDate(date, cancelledById, ctx)`.
- Endpoints: `GET /api/closures`, `POST /api/closures`, `DELETE /api/closures/:id`.

**Fuera de alcance:**
- Cierres por sala o por rango (spec: global y por fecha), restaurar reservas al eliminar un cierre (S-05), pantalla (T10b), escritura de auditoría (T06a).

**Criterios de aceptación:**
- **CA1** · Dado un usuario autenticado, cuando `GET /api/closures`, entonces 200 con los cierres de fecha ≥ hoy (en `BUSINESS_TZ`) ordenados por fecha.
- **CA2** · Dado un ADMIN y una fecha posterior a hoy con k reservas `CONFIRMED` (de cualquier sala), cuando `POST /api/closures` con `{ date, reason }`, entonces 201 con el `Closure` y `cancelledBookings: k`, y esas reservas quedan `CANCELLED` en la misma transacción, con lock sobre la fecha.
- **CA3** · Dada una fecha de hoy o pasada, cuando se crea, entonces 422 `CLOSURE_IN_PAST`; dada una fecha ya cerrada, 409 `CLOSURE_EXISTS`; con `reason` vacío o de más de 100 caracteres o fecha mal formada, 400 `VALIDATION_ERROR`.
- **CA4** · Dado un día cerrado, cuando alguien crea una reserva en esa fecha, entonces 422 `DAY_CLOSED`.
- **CA5** · Dado un cierre con fecha posterior a hoy, cuando un ADMIN hace `DELETE /api/closures/:id`, entonces 204 y las reservas ya canceladas no se restauran; dado un cierre de hoy o pasado, entonces 422 `CLOSURE_IN_PAST`.
- **CA6** · Dado un `EMPLOYEE`, cuando hace `POST` o `DELETE` en `/api/closures`, entonces 403 `FORBIDDEN`.
- **CA7** · Dado un id inexistente, cuando se elimina, entonces 404 `NOT_FOUND`.

**Verificación:**
```bash
W=$(date -u -d 'next wednesday +7 days' +%F)
curl -s -b /tmp/emp1.txt -o /dev/null -w "%{http_code}\n" -H "$H" -d "{\"date\":\"$W\",\"reason\":\"x\"}" $BASE/closures   # 403
curl -s -b /tmp/emp1.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${W}T16:00:00Z\",\"endAt\":\"${W}T17:00:00Z\",\"title\":\"Cae\",\"attendees\":1}" $BASE/bookings | jq -r .status   # CONFIRMED
C=$(curl -s -b /tmp/admin.txt -H "$H" -d "{\"date\":\"$W\",\"reason\":\"Prueba\"}" $BASE/closures | tee /dev/stderr | jq -r .id)   # 201, cancelledBookings: 1
curl -s -b /tmp/admin.txt -H "$H" -d "{\"date\":\"$W\",\"reason\":\"Otra\"}" $BASE/closures                          # 409 CLOSURE_EXISTS
curl -s -b /tmp/emp1.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${W}T18:00:00Z\",\"endAt\":\"${W}T19:00:00Z\",\"title\":\"No\",\"attendees\":1}" $BASE/bookings   # 422 DAY_CLOSED
curl -s -b /tmp/admin.txt -H "$H" -d "{\"date\":\"$(date +%F)\",\"reason\":\"Hoy\"}" $BASE/closures                    # 422 CLOSURE_IN_PAST
curl -s -b /tmp/emp1.txt $BASE/closures | jq 'length'                                                                  # 1
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/admin.txt -X DELETE $BASE/closures/$C                                # 204
npm --prefix src/api test -- closures && npm --prefix src/api run lint
```

**Notas para el agente:** Eliminar un cierre de hoy o pasado responde 422 `CLOSURE_IN_PAST` (spec RN-24 y §8). La fecha de cierre es una fecha del calendario en `BUSINESS_TZ`, no un instante UTC.

---

## T06 · Pruebas de integración, concurrencia y matriz RBAC
| Campo | Valor |
|---|---|
| Objetivo | Probar contra PostgreSQL real el riesgo central (choques de reserva) y los permisos de cada ruta |
| Trazabilidad | O1 · RN-01, RN-07 a RN-11, RN-13 a RN-17, RN-21 a RN-24 · D-04, D-06, D-27, S-08 · spec §12 · P-01 a P-04, P-08, P-09 (integración), P-10, P-11, P-13, P-14, P-16, P-17 |
| Dependencias | T05a, T05b |
| Estimación | L |
| Seguridad / auditoría | Roles: no aplica (son pruebas). Auditoría: no aplica (P-12 y P-15 van en T06a). Cubre OWASP A01 (matriz de roles) y A04 (concurrencia) |
| Estado | En revisión |

**Alcance (archivos o módulos):**
- `docker-compose.yml`: servicio `api-test` en el perfil `test` (S-08), en la red interna, con su propia base de pruebas; `docker compose up` normal no lo arranca.
- `src/api/test/**`: arranque de la app, helpers de login, fábricas y limpieza entre pruebas, y los casos P-01 a P-04, P-08, P-09, P-10, P-11, P-13, P-14, P-16 y P-17. Script `npm run test:int`.

**Fuera de alcance:**
- Pruebas de frontend (S-09), auditoría (T06a), humo del clon limpio (T11).

**Criterios de aceptación:**
- **CA1** · Dado el compose, cuando ejecuto `docker compose --profile test run --rm api-test`, entonces migra una base de pruebas, corre toda la suite de integración y termina con código 0.
- **CA2** · Dados 20 `POST /api/bookings` simultáneos al mismo hueco y sala (P-01), cuando se resuelven todos, entonces exactamente 1 responde 201 y 19 responden 409 `BOOKING_CONFLICT`, y en la base queda 1 reserva `CONFIRMED`.
- **CA3** · Dados los casos P-02 a P-04, cuando se ejecutan, entonces las reservas contiguas (10–11 y 11–12) se aceptan, una `CANCELLED` no bloquea el hueco, un solape parcial en la misma sala da 409 y el mismo horario en otra sala da 201.
- **CA4** · Dados los casos P-08, P-09, P-13, P-16 y P-17, cuando se ejecutan, entonces pasan: errores 422 de capacidad, sala inactiva y día cerrado; cancelar como dueño, otro, ADMIN y con reserva ya empezada; `title: null` para `EMPLOYEE` en reservas ajenas; contraseña corta, actual incorrecta, correo y nombre de sala repetidos; y ningún error trae stack trace y todos traen `code`, `message`, `requestId` y `X-Request-Id`.
- **CA5** · Dado un usuario con reservas futuras, cuando se desactiva, entonces se cancelan sus reservas futuras y su cookie vigente pasa a 401; y dada la desactivación concurrente a 10 intentos de reserva del mismo usuario (R-02), cuando termina, entonces no queda ninguna reserva `CONFIRMED` futura suya.
- **CA6** · Dado un día con reservas, cuando se crea un cierre, entonces se cancelan las reservas del día, repetirlo da 409 y crearlo para hoy da 422; y dado un cierre concurrente a 10 intentos de reserva en esa fecha (R-01), cuando termina, entonces no queda ninguna `CONFIRMED` ese día.
- **CA7** · Dada cada ruta de ADMIN (`POST` y `PATCH /rooms`, `/users*`, `POST` y `DELETE /closures`, `POST /audit-logs/search`), cuando la llama un `EMPLOYEE`, entonces 403, y sin cookie, 401; y cuando se llama sin sesión a cualquier ruta que no sea `login` ni `health`, entonces 401 (P-14).
- **CA8** · Dada la suite completa, cuando la ejecuto dos veces seguidas, entonces da el mismo resultado y cada prueba lleva en su nombre la regla que cubre (`it('RN-01 · …')`).
- **CA9** · Dado el compose, cuando ejecuto `docker compose up -d`, entonces no arranca `api-test`; y cuando ejecuto `npm --prefix src/api test`, entonces las unitarias siguen pasando.

**Verificación:**
```bash
docker compose --profile test run --rm api-test              # código 0
docker compose --profile test run --rm api-test              # segunda corrida, mismo resultado
docker compose up -d && docker compose ps --services | grep -c api-test   # 0
npm --prefix src/api test
npm --prefix src/api run lint
grep -rn "it('RN-01" src/api/test | head -3
```

**Notas para el agente:** Las fechas de las pruebas se calculan a partir de "ahora" (próximo día hábil), nunca fijas. Para la concurrencia usa peticiones HTTP reales con `Promise.all` y verifica que el pool de conexiones permita 20 simultáneas.

---

## T06a · Auditoría transaccional y consulta paginada
| Campo | Valor |
|---|---|
| Objetivo | Registrar toda escritura de negocio en `audit_logs` dentro de su misma transacción y exponer la consulta paginada para ADMIN |
| Trazabilidad | O4 · RN-25 · D-05, D-24, S-02 · spec §7 (`audit_logs`), §8 (`POST /api/audit-logs/search`), F-08 · P-12, P-15 |
| Dependencias | T06 |
| Estimación | M |
| Seguridad / auditoría | Roles: consulta solo ADMIN. Auditoría: es la propia tarea; genera las 10 `AuditAction` de spec §7. `data` nunca contiene contraseñas, hashes, cookies ni tokens. OWASP A09 |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/api/src/modules/audit/**`: `AuditService.record(ctx, { action, entity, entityId, data })`, controller de `POST /audit-logs/search`, dto, repositorio de interfaz + Prisma (`COUNT` + `LIMIT/OFFSET`).
- Conectar `AuditService` en: salas (crear, editar), reservas (crear, cancelar), usuarios (crear, editar, restablecer contraseña), cambio de contraseña propio, cierres (crear, eliminar) y las cancelaciones en cascada de RN-15 y RN-16 (una fila `BOOKING_CANCELLED` por reserva).
- Pruebas P-12 y P-15 en `src/api/test/`.

**Fuera de alcance:**
- Auditar el login (S-02), exportar, firmas o cadenas hash, pantalla (T10c), modificar `audit_logs` (inmutable).

**Criterios de aceptación:**
- **CA1** · Dada cada una de las 10 `AuditAction`, cuando se ejecuta su operación, entonces se inserta exactamente 1 fila con `actor_id`, `entity`, `entity_id`, `request_id` igual al header `X-Request-Id` y `data` sin secretos.
- **CA2** · Dada una operación que falla (409 o 422) o una transacción que se revierte, cuando termina, entonces no queda fila de auditoría.
- **CA3** · Dado un usuario con k reservas futuras, cuando se desactiva, entonces quedan 1 `USER_UPDATED` y k `BOOKING_CANCELLED`; y dado un cierre con k reservas, cuando se crea, entonces quedan 1 `CLOSURE_CREATED` y k `BOOKING_CANCELLED`.
- **CA4** · Cuando alguien inicia sesión, entonces no se inserta ninguna fila de auditoría.
- **CA5** · Dado un ADMIN, cuando `POST /api/audit-logs/search` con `{ page?, pageSize?, from?, to?, action? }`, entonces 200 con `{ items, page, pageSize, total }` ordenado por `createdAt` desc, con `page` 1 y `pageSize` 20 por defecto, `from` y `to` (`AAAA-MM-DD`, incluidos, en `BUSINESS_TZ`) y `action` como filtros, y `total` que respeta los filtros.
- **CA6** · Dados `pageSize` 101 o 0, `page` 0, fecha mal formada o `action` inválida, cuando se envía, entonces 400 `VALIDATION_ERROR`; con un `EMPLOYEE`, 403; sin sesión, 401.
- **CA7** · Cuando se intenta `UPDATE` o `DELETE` sobre `audit_logs`, entonces la base sigue rechazándolo (P-12); no existe `GET` de auditoría y los filtros nunca viajan en la URL (D-24).

**Verificación:**
```bash
docker compose --profile test run --rm api-test              # incluye P-12 y P-15
npm --prefix src/api test -- audit
npm --prefix src/api run lint
curl -s -b /tmp/admin.txt -H "$H" -d '{"page":1,"pageSize":5}' $BASE/audit-logs/search | jq '{page,pageSize,total,primera:.items[0].action}'
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/emp1.txt  -H "$H" -d '{}' $BASE/audit-logs/search                  # 403
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/admin.txt -H "$H" -d '{"pageSize":101}' $BASE/audit-logs/search    # 400
curl -s -o /dev/null -w "%{http_code}\n" -b /tmp/admin.txt $BASE/audit-logs                                          # 404 (sin GET)
docker compose exec -T db psql -U salalibre -d salalibre -c "SELECT count(*) FROM audit_logs WHERE request_id IS NULL OR request_id = '';"   # 0
```

**Notas para el agente:** `TransactionRunner` y la forma de `ctx` ya existen (T02a); esta tarea solo agrega llamadas dentro de transacciones existentes. Documenta en `docs/tareas/T06a.md` qué lleva `data` en cada acción, sin secretos. **Recortable:** si se recorta, se pierden O4, P-12, P-15, F-08 y la parte de auditoría de D-05, y T10c también se recorta; debe quedar declarado en `docs/04-cierre.md`.

---

## T07a · Sistema visual base
| Campo | Valor |
|---|---|
| Objetivo | Dejar los tokens de `DESIGN.md` y los componentes base listos para que las pantallas se construyan sin repetir estilos |
| Trazabilidad | D-01, D-28 · spec §9 (estados de pantalla), §11 (accesibilidad) · diseño: `docs/diseño/DESIGN.md` (Colores, Tipografía, Formas, Componentes 2, 6 y 7) |
| Dependencias | T01 |
| Estimación | M |
| Seguridad / auditoría | Roles: no aplica. Auditoría: no aplica. Sin recursos externos (CDN, fuentes ni imágenes remotas), lo que reduce la superficie de la cadena de suministro (OWASP A08) |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/tailwind.config.*` y estilos globales con los tokens de `DESIGN.md` (colores, radios, espaciado, tipografía, utilidad de cifras tabulares).
- Inter e iconos empaquetados como dependencias locales (registrar paquete y motivo).
- `src/web/src/shared/ui/`: `Button` (primario, secundario, peligro, cargando), `Input`, `Select`, `Field` (label asociado y error), `CheckboxGroup` o `MultiSelect` (equipamiento), `Badge` o píldora de estado, `Modal` (480 y 640 px), `ConfirmDialog`, `Table`, `Spinner` y `Skeleton`, `EmptyState`, `ErrorState` (mensaje, `requestId` y "Reintentar"), `Toast`, `Avatar` con iniciales, `Banner`.
- Logo y favicon locales en `src/web/public/`, copiados de `docs/diseño/img/` (`logo.svg` y `logo-icon.svg`).

**Fuera de alcance:**
- Pantallas, `apiClient`, rutas y datos reales. No dejes una página de demostración permanente.

**Criterios de aceptación:**
- **CA1** · Dado `DESIGN.md`, cuando se usan sus tokens en Tailwind (p. ej. `bg-primary-container`, `text-on-surface`), entonces los componentes no contienen colores hexadecimales sueltos.
- **CA2** · Dada la app compilada, cuando se carga en el navegador, entonces no hace ninguna petición a dominios externos: sin CDN, fuentes ni imágenes remotas.
- **CA3** · Dados los componentes base, cuando los uso, entonces `Button` tiene estados hover, foco visible, deshabilitado y cargando; `Field` asocia el mensaje de error con `aria-describedby`; y `Modal` se cierra con Escape, atrapa el foco y lo devuelve al cerrar.
- **CA4** · Dadas las horas y capacidades en pantalla, cuando se muestran cifras, entonces la utilidad de cifras tabulares (`tnum`) está disponible y aplicable.
- **CA5** · Dada la app servida, cuando pido `/logo.svg` y el favicon, entonces se sirven desde la propia app.
- **CA6** · Dadas las insignias de estado, cuando se mide el contraste de su texto y su fondo, entonces cumplen AA y el resultado se anota en `docs/tareas/T07a.md`.
- **CA7** · Dado el código de `web`, cuando ejecuto lint y build, entonces terminan sin errores.

**Verificación:**
```bash
npm --prefix src/web run lint
npm --prefix src/web run build
grep -rEn "https?://(fonts|cdn|lh3|unpkg|cdnjs)|googleapis|gstatic|cdn\.tailwindcss" src/web/src src/web/index.html src/web/public && echo "FALLA: recursos externos" || echo "OK"
docker compose up -d --build web && curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/logo.svg   # 200
```

**Notas para el agente:** `DESIGN.md` y los prototipos de `docs/diseño/stitch/` son solo referencia visual; el spec manda (D-28). No copies el HTML de los prototipos. El radio sigue "Formas" (4 px, 8 px, círculo), no la configuración de Tailwind de Stitch.

---

## T07 · Frontend base: `apiClient`, auth, layout y rutas protegidas
| Campo | Valor |
|---|---|
| Objetivo | Que la persona inicie sesión, vea la navegación según su rol y que las rutas queden protegidas |
| Trazabilidad | RN-14, RN-19, RN-21 · D-03, D-06, D-19, D-28 · spec §6 (F-01), §9 (Login y estados de pantalla), §10 (estructura `src/web/`) · diseño: «Estructura global»; Login: prototipo `login` (el acabado visual va en T07c) |
| Dependencias | T03, T07a |
| Estimación | M |
| Seguridad / auditoría | Roles: público (`/login`), autenticado y ADMIN (`/admin/*`). Auditoría: no aplica. OWASP A01: la UI no sustituye a la API (que igual responde 403); A07: mensaje de login genérico; sin tokens en JavaScript |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/shared/apiClient.ts`: `fetch` con `credentials: 'include'`, lectura del formato `{ error: { code, message, requestId } }`, `ApiError`, y todo 401 limpia la sesión y lleva a `/login`.
- `src/web/src/shared/layout/`: barra superior con navegación por rol y menú de usuario (Mi cuenta, Cerrar sesión).
- `src/web/src/features/auth/`: `AuthProvider` (`GET /auth/me`), `authService.ts` (login, logout y `me` sobre `apiClient`), `LoginPage` sencilla, `LoginForm` (correo, contraseña y botón "Iniciar sesión"; props opcionales `onFocusChange`, `onPasswordVisibleChange` y `onSubmitStatusChange` para T07c), `PasswordField` (mostrar u ocultar), `ProtectedRoute`, `RequireRole`, página "No tienes permiso para ver esta página".
- Router con las rutas de spec §9 como marcadores (`/login`, `/agenda`, `/my-bookings`, `/account`, `/admin/rooms`, `/admin/users`, `/admin/closures`, `/admin/audit`); `/` redirige a `/agenda`. TanStack Query, React Hook Form y Zod configurados.

**Fuera de alcance:**
- Contenido de las pantallas (T07b y siguientes), el acabado visual del login y los personajes (T07c), "Recordarme", acceso con Google, "Crea una cuenta" y cualquier simulación de autenticación, tokens en `localStorage` o `sessionStorage`.

**Criterios de aceptación:**
- **CA1** · Dada una persona sin sesión, cuando abre `/` o cualquier ruta protegida, entonces el frontend llama `GET /api/auth/me`, recibe 401 y redirige a `/login`.
- **CA2** · Dadas credenciales correctas, cuando pulsa "Iniciar sesión", entonces llega a `/agenda` y la barra muestra su nombre.
- **CA3** · Dadas credenciales incorrectas, cuando pulsa "Iniciar sesión", entonces ve "Correo o contraseña incorrectos" (sin decir cuál) y el botón queda deshabilitado mientras la petición está en curso.
- **CA4** · Dado un `EMPLOYEE`, cuando navega, entonces no ve enlaces a `/admin/*` y si entra por URL ve "No tienes permiso para ver esta página"; dado un `ADMIN`, ve Salas, Usuarios, Cierres y Auditoría.
- **CA5** · Dada una sesión, cuando pulsa "Cerrar sesión", entonces se llama `POST /api/auth/logout`, se vacía la caché de TanStack Query y vuelve a `/login`.
- **CA6** · Dada una sesión que ya no es válida, cuando cualquier petición recibe 401, entonces el usuario llega a `/login`.
- **CA7** · Dado un error de la API, cuando se muestra en pantalla, entonces incluye el mensaje con el `requestId`.
- **CA8** · Dado el código de `web`, cuando busco `localStorage`, `sessionStorage` y `document.cookie`, entonces no se usan para la sesión.
- **CA9** · Dado un correo vacío o con formato inválido, o una contraseña vacía, cuando se envía, entonces el error aparece junto al campo y no se llama a la API; no hay regla de longitud de contraseña.
- **CA10** · Dado el botón del ojo de `PasswordField`, cuando se pulsa, entonces alterna mostrar y ocultar la contraseña, cambia su nombre accesible ("Mostrar contraseña" y "Ocultar contraseña") y su `aria-pressed`.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
grep -rEn "localStorage|sessionStorage|document\.cookie" src/web/src && echo "FALLA" || echo "OK"
docker compose up -d --build
# Manual en http://localhost:8080 :
#  1) abrir /agenda sin sesión → termina en /login
#  2) entrar con empleado1@salalibre.local / Empleado12345 → /agenda, sin enlaces de admin
#  3) abrir /admin/rooms → "No tienes permiso para ver esta página"
#  4) cerrar sesión, entrar con admin@salalibre.local / Admin12345 → ve los 4 enlaces de admin
#  5) contraseña incorrecta → "Correo o contraseña incorrectos"; correo inválido o contraseña vacía → error junto al campo, sin petición
```

**Notas para el agente:** Aquí el login es funcional y sencillo, con los componentes de T07a; la composición de dos columnas y los personajes son T07c (imagen en `docs/diseño/stitch/login`). La autenticación es la real del API, no una simulación. El frontend nunca maneja tokens: la cookie es `httpOnly` (D-03).

---

## T07b · Mi cuenta: cambio de contraseña
| Campo | Valor |
|---|---|
| Objetivo | Que la persona cambie su contraseña desde `/account` |
| Trazabilidad | RN-18 · D-19 · spec §6 (F-09), §9 (Mi cuenta) · diseño: sin prototipo (Componentes 6 y 7, formulario base) |
| Dependencias | T03a, T07 |
| Estimación | S |
| Seguridad / auditoría | Roles: autenticado. Auditoría: la genera la API (`USER_PASSWORD_CHANGED`, T06a). OWASP A07: la contraseña no se guarda en estado persistente ni se loguea |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/auth/AccountPage.tsx`, esquema Zod y mutación `PATCH /auth/password`.

**Fuera de alcance:**
- Otros datos de perfil, recuperación por correo, campo de confirmación de la contraseña (el spec pide solo actual y nueva).

**Criterios de aceptación:**
- **CA1** · Dada la contraseña actual correcta y una nueva de al menos 8 caracteres, cuando envía, entonces recibe 204, ve un aviso de éxito y el formulario se limpia.
- **CA2** · Dada una contraseña actual incorrecta (422 `INVALID_CURRENT_PASSWORD`), cuando envía, entonces ve el mensaje en el campo de la contraseña actual.
- **CA3** · Dada una nueva contraseña de menos de 8 caracteres, cuando envía, entonces la validación del cliente lo impide, y el 400 de la API también se muestra bien.
- **CA4** · Dado el formulario de Mi cuenta, cuando lo uso, entonces los campos tienen `label` asociado, foco visible y el botón queda deshabilitado mientras la petición está en curso.
- **CA5** · Dada una contraseña escrita, cuando se envía o falla el envío, entonces no se imprime en consola ni se guarda fuera del formulario.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
# Manual: entrar como empleado3@salalibre.local / Empleado12345 → /account →
#  cambiar a "Nueva12345" (éxito) → cerrar sesión → entrar con la nueva →
#  volver a /account y restaurar "Empleado12345" → probar actual incorrecta y nueva corta.
```

---

## T07c · Login: composición visual y personajes animados
| Campo | Valor |
|---|---|
| Objetivo | Dejar la pantalla `/login` fiel a la imagen de diseño, con los cuatro personajes que reaccionan al foco, a la visibilidad de la contraseña y al envío |
| Trazabilidad | D-28 (diseño solo guía visual; el spec manda) · D-30 (login con personajes) · D-03, D-08, D-19 · RN-14, RN-19 · spec §6 (F-01), §8 (`/auth/login`), §9 (Login), §11 (accesibilidad) · diseño: `docs/diseño/stitch/login` y la sección «Login» de `DESIGN.md` |
| Dependencias | T07a, T07 |
| Estimación | L |
| Seguridad / auditoría | Roles: público. Auditoría: no aplica (S-02). OWASP A07: la contraseña no se guarda ni se loguea y no llega a los personajes; mensaje de error genérico; sin envíos duplicados |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/auth/LoginPage.tsx`: composición de dos columnas en escritorio y cabecera compacta más formulario en móvil.
- `src/web/src/features/auth/AnimatedCharacters.tsx`: los cuatro personajes en SVG propio, con cuerpos, caras, ojos, pupilas y bocas como grupos separados; recibe solo `focus` (`none`, `email` o `password`), `passwordVisible` y `submitStatus` (`idle`, `loading`, `error` o `success`).
- `src/web/src/features/auth/useCharacterLook.ts`: seguimiento del cursor con desplazamiento pequeño y limitado.
- `src/web/src/features/auth/characterState.ts`: función pura que decide el estado visual a partir de las tres entradas.
- Estilos CSS de las poses y transiciones. Los eventos `onFocusChange`, `onPasswordVisibleChange` y `onSubmitStatusChange` de `LoginForm` y `PasswordField` ya existen desde T07.

**Fuera de alcance:**
- "Recordarme", "Acceso con Google", "Crea una cuenta", recuperación por correo (D-19), autorregistro (D-08) y cualquier simulación de autenticación o función `authenticate`.
- Librerías de animación o 3D, CDN, imágenes externas, cambios en el contrato de la API, guardar credenciales.

**Criterios de aceptación:**
- **CA1** · Dada una ventana de escritorio de 1280×800, cuando abro `/login`, entonces la pantalla reproduce la imagen: tarjeta centrada de borde fino con dos columnas casi iguales; a la izquierda logo, texto, ilustración y pie; a la derecha el formulario centrado y su pie. Las diferencias que queden se anotan en `docs/tareas/T07c.md`.
- **CA2** · Dados anchos de 360, 390 y 768 px, cuando abro `/login`, entonces el bloque visual es una cabecera compacta, el formulario queda debajo, no hay desplazamiento horizontal y no se superponen personajes, logo ni textos.
- **CA3** · Dados los textos de la pantalla, cuando los reviso, entonces coinciden con la imagen, el botón dice "Iniciar sesión", el año del pie es el actual, y no aparecen "Recordarme", "Acceso con Google", "Crea una cuenta" ni "Demo interactiva".
- **CA4** · Dado el enlace "¿Olvidaste tu contraseña?", cuando se pulsa, entonces se muestra un aviso accesible con la explicación de que la recuperación por correo no está disponible y que RR. HH. restablece la contraseña; no navega ni simula el envío de un correo.
- **CA5** · Dadas credenciales válidas, cuando se envía el formulario, entonces se llama `POST /api/auth/login` mediante `authService`, se llega a `/agenda` y no hay token ni contraseña en JavaScript; con credenciales incorrectas se ve "Correo o contraseña incorrectos".
- **CA6** · Dado un correo vacío o con formato inválido, o una contraseña vacía, cuando se envía, entonces el mensaje aparece junto al campo y no se llama a la API; no existe ninguna regla de longitud de contraseña.
- **CA7** · Dado el envío en curso, cuando se pulsa el botón otra vez, entonces no se duplica la petición, el botón muestra un indicador de carga y una región `role="status"` anuncia carga, error y éxito.
- **CA8** · Dado el reposo, cuando se carga la pantalla, entonces los personajes entran con suavidad, parpadean con tiempos distintos y sus pupilas siguen el cursor con un desplazamiento limitado, sin impedir usar el formulario.
- **CA9** · Dado el foco en el correo, cuando escribo, entonces los personajes se inclinan ligeramente hacia el formulario y sus pupilas siguen el cursor.
- **CA10** · Dado el foco en la contraseña oculta, cuando escribo, entonces los cuatro miran hacia la izquierda, alejándose del formulario, con el cuerpo inclinado, la cara desplazada y los ojos abiertos; uno mira ligeramente hacia arriba; las pupilas no siguen el cursor y la postura dura mientras el campo tenga el foco.
- **CA11** · Dada la contraseña visible, cuando cambio el foco a cualquier sitio, entonces los cuatro mantienen los ojos cerrados, en postura de privacidad y sin seguir el cursor (este estado tiene prioridad sobre el foco); al ocultarla, si la contraseña conserva el foco vuelven a mirar a la izquierda, si lo tiene otro campo recuperan el comportamiento de ese campo, y si ninguno lo tiene vuelven al reposo.
- **CA12** · Dado el envío, el error y el éxito, cuando ocurren, entonces hay un movimiento de espera discreto, una expresión de preocupación o sacudida breve, y una pequeña celebración; los eventos de foco no los interrumpen (prioridad: `loading`, `error` y `success` sobre `peeking`, `password`, `email` e `idle`), tras un error vuelven a la postura que corresponda al foco, y la celebración no retrasa más de 1 s la llegada a `/agenda`.
- **CA13** · Dado el contrato de `AnimatedCharacters`, cuando reviso sus props, entonces solo recibe `focus`, `passwordVisible` y `submitStatus`, nunca el valor de la contraseña.
- **CA14** · Dado el desmontaje de la pantalla, cuando salgo de `/login`, entonces se eliminan los listeners del puntero y los temporizadores de parpadeo y se cancelan las animaciones pendientes, sin errores en consola; el código no usa consultas globales al DOM para manipular campos controlados.
- **CA15** · Dada la accesibilidad, cuando uso solo el teclado, entonces puedo completar el formulario; los campos tienen etiqueta visible y `autocomplete` apropiado (`email` o `username`, y `current-password`); los errores se asocian al campo (`aria-describedby`); el botón de contraseña cambia su nombre accesible ("Mostrar contraseña" y "Ocultar contraseña") y su `aria-pressed`; el foco es visible; y la ilustración y los destellos llevan `aria-hidden="true"`.
- **CA16** · Dado `prefers-reduced-motion: reduce`, cuando abro `/login`, entonces no hay entrada animada, parpadeos ni seguimiento del cursor, y los estados siguen distinguiéndose por la pose y la expresión.
- **CA17** · Dado el código de `web`, cuando busco dependencias de animación y recursos externos, entonces todo es SVG, CSS y JavaScript propios, sin CDN; y lint y build terminan sin errores.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
grep -rEn "document\.(querySelector|getElementById)" src/web/src/features/auth && echo "FALLA" || echo "OK"
grep -rEn "https?://(fonts|cdn|lh3|unpkg|cdnjs)|googleapis|gstatic" src/web/src src/web/index.html && echo "FALLA" || echo "OK"
grep -rEn "Recordarme|Google|Crea una cuenta|Demo interactiva" src/web/src/features/auth && echo "FALLA" || echo "OK"
docker compose up -d --build
# Manual en http://localhost:8080/login (sin sesión):
#  1) 1280×800: comparar con docs/diseño/stitch/login; 390 y 768 px en las herramientas de desarrollo: sin scroll horizontal
#  2) enfocar el correo → se inclinan hacia el formulario; mover el cursor → las pupilas lo siguen
#  3) enfocar la contraseña y escribir → los cuatro miran a la izquierda; mover el cursor → las pupilas no lo siguen
#  4) pulsar el ojo → ojos cerrados; hacer Tab a otro control → siguen cerrados; ocultar con el foco en la contraseña → vuelven a mirar a la izquierda
#  5) enviar vacío y con correo inválido → errores junto a cada campo, sin petición en la pestaña de red
#  6) contraseña incorrecta → "Correo o contraseña incorrectos" y reacción de error; entrar con admin@salalibre.local / Admin12345 → celebración breve y /agenda
#  7) pulsar "¿Olvidaste tu contraseña?" → aviso con la explicación
#  8) activar "prefers-reduced-motion" en las herramientas de desarrollo → sin movimiento, estados aún distintos
#  9) consola del navegador sin errores propios de la app
```

**Notas para el agente:** La imagen de `docs/diseño/stitch/login` es la autoridad visual; sus colores orientativos están en `DESIGN.md` («Login»). Si algún texto de la imagen no se lee, usa uno breve y coherente en español, sin inventar funciones. No pidas código de referencia: constrúyelo desde la imagen y esta tarea. Mantén `characterState.ts` como función pura (el spec no pide pruebas de frontend, S-09, pero así queda lista para probarse). El spec §9 ya describe el login con "Iniciar sesión" y los personajes animados. **Recortable:** si falta tiempo, se mantiene el login funcional de T07 y se omite esta tarea.

---

## T08 · Agenda del día
| Campo | Valor |
|---|---|
| Objetivo | Mostrar la disponibilidad del día de todas las salas en una grilla de 15 minutos con filtros, para que cualquiera vea qué está libre |
| Trazabilidad | O2 · RN-04, RN-10, RN-17 · D-09, D-18, D-20, D-23, D-25 · spec §6 (F-02 pasos 1–2, F-04 paso 1), §9 (Agenda y estados) · diseño: prototipo `agenda_general_de_salas_timeline_en_tiempo_real`; DESIGN «Arquitectura de la línea de tiempo», Componentes 1, 3 y 7 |
| Dependencias | T05b, T07 |
| Estimación | L |
| Seguridad / auditoría | Roles: autenticado. Auditoría: no aplica. OWASP A01: un `EMPLOYEE` no recibe los títulos ajenos (la API los omite, RN-17) y la UI no los reconstruye |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/bookings/`: `AgendaPage`, `DayPicker`, grilla de línea de tiempo, `BookingCard`, `RoomFilters`, hooks `useRooms`, `useBookings(date)` y `useClosures`.
- `src/web/src/shared/datetime/`: utilidades de fecha y hora en `BUSINESS_TZ` (`America/Tegucigalpa`).

**Fuera de alcance:**
- Formulario y `POST` de reserva (T08a), cancelar (T09), vista semanal, arrastrar para seleccionar, línea de métricas, check-in.

**Criterios de aceptación:**
- **CA1** · Dado un día hábil, cuando abro `/agenda`, entonces veo una columna por sala activa (5 en el seed) y 52 filas de 15 minutos de 07:00 a 20:00 en hora de Tegucigalpa, con 64 px por hora.
- **CA2** · Dado el selector de día, cuando lo uso, entonces ofrece de hoy a hoy + 30 y solo lunes a viernes: si hoy es sábado, la primera opción es el lunes, y no se puede elegir fuera de rango.
- **CA3** · Dadas reservas en la agenda, cuando las veo, entonces una propia se ve con su título, una ajena para un `EMPLOYEE` se ve "Ocupado" con el nombre del dueño y sin título, y para un `ADMIN` con título y nombre.
- **CA4** · Dado el filtro de capacidad mínima, cuando lo aplico, entonces se ocultan las salas con menos capacidad; dado el filtro de equipamiento con uno o más equipos, entonces quedan solo las salas que tienen todos los equipos pedidos; sin filtros se ven todas.
- **CA5** · Dado un día presente en `GET /api/closures`, cuando abro la agenda de esa fecha, entonces se muestra un banner con el motivo y ningún hueco es clicable.
- **CA6** · Dados los estados de pantalla, cuando la agenda carga, está vacía, falla o la sesión vence, entonces hay esqueleto al cargar, todos los huecos libres si no hay reservas, mensaje de error con `requestId` y "Reintentar", y un 401 lleva a `/login`.
- **CA7** · Dados los huecos libres, cuando navego con teclado (Tab y Enter), entonces se alcanzan y llaman a `onSelectSlot(roomId, startAt)`; y los huecos ya pasados y los de un día cerrado no son clicables.
- **CA8** · Dado el día de hoy, cuando se muestra la agenda, entonces aparece la línea de hora actual; con cualquier otro día, no aparece.
- **CA9** · Dada una reserva en la agenda, cuando se dibuja, entonces ocupa de su inicio a su fin alineada a la grilla, y las de menos de 30 minutos usan la tarjeta compacta.
- **CA10** · Dado un cambio de día, cuando lo elijo en el selector, entonces se vuelve a pedir `GET /api/bookings?date=`.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Datos de prueba (variables de "Convenciones"; D es el próximo lunes)
B1=$(curl -s -b /tmp/emp1.txt -H "$H" -d "{\"roomId\":\"$ROOM\",\"startAt\":\"${D}T16:00:00Z\",\"endAt\":\"${D}T17:00:00Z\",\"title\":\"Planificación\",\"attendees\":3}" $BASE/bookings | jq -r .id)
# Manual en http://localhost:8080/agenda (elegir ese lunes):
#  - como empleado2: la tarjeta de Copán dice "Ocupado" + nombre de empleado1, sin título
#  - como empleado1: ve "Planificación"; como admin: título y nombre
#  - filtro capacidad ≥ 10 → quedan Lempira y Pico Bonito; filtro PROJECTOR/TV según seed
#  - crear un cierre para otro día (como admin, curl de T05b) → banner con motivo, sin huecos clicables
#  - tab hasta un hueco libre y Enter → no abre formulario aún (lo hace T08a)
curl -s -b /tmp/emp1.txt -X POST $BASE/bookings/$B1/cancel | jq -r .status   # limpieza
```

**Notas para el agente:** Toma del prototipo la composición, no el HTML ni sus funciones extra (DESIGN: «Prototipos de referencia»). No calcules disponibilidad con reglas propias: lo que muestra la grilla sale de `GET /api/bookings`, y la API decide al reservar. Los equipos se muestran con etiquetas en español (Proyector, Videoconferencia, Pizarra, TV).

---

## T08a · Reservar desde la agenda
| Campo | Valor |
|---|---|
| Objetivo | Crear una reserva desde un hueco libre y manejar el choque (409) con un mensaje claro |
| Trazabilidad | O2 · RN-01 a RN-10 (mostrar los errores de la API) · D-17 · spec §6 (F-02 pasos 3–7), §9 (Formulario de reserva) · diseño: prototipo `nueva_reserva_prevenci_n_activa_de_choques` (parcial); Componentes 4 y 7 |
| Dependencias | T08 |
| Estimación | M |
| Seguridad / auditoría | Roles: autenticado. Auditoría: la genera la API (`BOOKING_CREATED`, T06a). Las validaciones del cliente son comodidad; la API decide |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/bookings/BookingFormModal.tsx`, `useCreateBooking`, esquema Zod, selectores de inicio y fin en pasos de 15 minutos, mapa de códigos de error a mensajes en español en un solo archivo.

**Fuera de alcance:**
- Edición de reservas, recurrencia, sugerencia de franja o sala alternativa, departamento, cancelar (T09).

**Criterios de aceptación:**
- **CA1** · Dado un clic en un hueco libre, cuando se abre el modal, entonces trae la sala y el inicio precargados, muestra la capacidad de la sala y ofrece un selector de fin en pasos de 15 minutos, título y asistentes.
- **CA2** · Dado un envío válido, cuando se confirma, entonces `POST /api/bookings` con fechas ISO 8601 con zona, el modal se cierra, la agenda se refresca y muestra la reserva, y aparece un aviso de éxito.
- **CA3** · Dado que otra persona tomó el hueco un instante antes, cuando se envía, entonces se ve "Ese horario acaba de ocuparse" con el `requestId` y la agenda se recarga.
- **CA4** · Dados un título vacío o de más de 100 caracteres, o asistentes que no son un entero ≥ 1, cuando se intenta enviar, entonces se marcan los campos y no se envía; con asistentes mayores que la capacidad se avisa, y si la API responde 422 `CAPACITY_EXCEEDED` también se muestra.
- **CA5** · Dados los códigos 422 `INVALID_SLOT`, `INVALID_DURATION`, `OUTSIDE_BUSINESS_HOURS`, `BOOKING_IN_PAST`, `TOO_FAR_AHEAD`, `ROOM_INACTIVE` y `DAY_CLOSED`, cuando la API los devuelve, entonces cada uno muestra un mensaje específico en español.
- **CA6** · Dada una petición de reserva en curso, cuando intento enviar otra vez, entonces el botón de envío está deshabilitado (sin doble envío).
- **CA7** · Dado el modal de reserva, cuando lo uso, entonces cada campo tiene `label` asociado, el foco inicial va al título, Escape lo cierra y el foco vuelve al hueco.
- **CA8** · Dado un usuario recién autenticado, cuando reserva un hueco libre, entonces lo logra en 5 clics o menos desde el login (O2).

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Manual en dos ventanas (empleado1 y empleado2), ambas en /agenda del mismo lunes:
#  1) empleado1 reserva Copán 10:00–11:00 → aparece en su agenda
#  2) empleado2, con la agenda sin recargar, intenta Copán 10:30–11:30 → "Ese horario acaba de ocuparse" + requestId, y la agenda se recarga
#  3) probar título vacío, asistentes 0 y asistentes 9 (Copán tiene capacidad 8)
curl -s -b /tmp/emp1.txt "$BASE/bookings/mine" | jq -r '.[] | select(.title=="<título>") | .id'   # luego cancelar para limpiar
```

---

## T09 · Mis reservas y cancelar
| Campo | Valor |
|---|---|
| Objetivo | Que cada persona vea sus reservas y las cancele, y que ADMIN cancele reservas ajenas desde la agenda |
| Trazabilidad | RN-11, RN-12, RN-13 · D-12, D-13 · spec §6 (F-03, F-04), §9 (Mis reservas) · diseño: prototipo `mis_reservas_check_in_con_liberaci_n_autom_tic`; Componentes 2, 6 y 7 |
| Dependencias | T08a |
| Estimación | M |
| Seguridad / auditoría | Roles: autenticado (propias); ADMIN cancela ajenas desde `/agenda`. Auditoría: la genera la API (`BOOKING_CANCELLED`, T06a). OWASP A01: ocultar el botón no sustituye al 403 de la API |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/bookings/MyBookingsPage.tsx`, `useMyBookings`, `useCancelBooking`, `CancelBookingDialog` (sobre `ConfirmDialog`).
- En `AgendaPage`: al pulsar una reserva, un detalle con título (según rol), dueño y, cuando corresponde, "Cancelar".

**Fuera de alcance:**
- Editar o reprogramar (D-12), check-in, historial largo, exportar.

**Criterios de aceptación:**
- **CA1** · Dado `/my-bookings`, cuando carga, entonces lista las reservas propias (confirmadas y canceladas) con `endAt` desde el inicio de hoy, ordenadas por `startAt`, con sala, fecha y hora en Tegucigalpa, título y estado.
- **CA2** · Dada una reserva, cuando se muestra, entonces el botón "Cancelar" aparece solo si está `CONFIRMED` y empieza en el futuro.
- **CA3** · Dado "Cancelar", cuando se pulsa, entonces se abre un diálogo propio de la app (no `window.confirm`); al confirmar se llama `POST /api/bookings/:id/cancel`, la reserva pasa a Cancelada y se actualizan la lista y la agenda.
- **CA4** · Dados los errores 422 `BOOKING_ALREADY_STARTED` o `BOOKING_ALREADY_CANCELLED`, cuando la API los devuelve, entonces se muestra el mensaje en español y se recarga la lista.
- **CA5** · Dado que no hay reservas, cuando carga, entonces se lee "No tienes reservas próximas".
- **CA6** · Dado un `ADMIN` en `/agenda`, cuando abre una reserva ajena futura, entonces ve título y dueño y puede cancelarla (F-04); un `EMPLOYEE` no ve acción de cancelar en reservas ajenas.
- **CA7** · Dada la pantalla, cuando carga o falla la petición, entonces se muestran el estado de carga y el de error (con `requestId` y "Reintentar").

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Preparar: empleado1 crea una reserva futura (curl de T05) y otra de las que se cancelan.
# Manual:
#  1) empleado1 en /my-bookings: ve la reserva con "Cancelar" → cancelar → diálogo propio → pasa a Cancelada
#  2) la reserva cancelada no tiene botón
#  3) admin en /agenda: abre la reserva de empleado1 → ve título y dueño → cancela
#  4) empleado2 abre una reserva ajena → no hay acción de cancelar
```

---

## T10 · Admin de salas
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. administre las salas desde `/admin/rooms` |
| Trazabilidad | RN-09, RN-21, RN-22 · D-14, D-25 · spec §6 (F-05), §9 (Salas) · diseño: prototipo `consola_de_administraci_n_y_reglas_de_rrhh`; Componentes 6 y 7 |
| Dependencias | T04, T07 |
| Estimación | M |
| Seguridad / auditoría | Roles: solo ADMIN (la API igual responde 403). Auditoría: la genera la API (`ROOM_CREATED`, `ROOM_UPDATED`, T06a) |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/rooms/`: `AdminRoomsPage`, `RoomFormModal`, hooks de lectura y escritura.

**Fuera de alcance:**
- KPIs, bloqueos por horario, borrado de salas.

**Criterios de aceptación:**
- **CA1** · Dada la pantalla, cuando carga, entonces muestra una tabla con todas las salas (activas e inactivas): nombre, capacidad, ubicación, equipamiento y estado.
- **CA2** · Dado el botón de crear, cuando se completa un modal con nombre, capacidad (1 a 100), ubicación y equipamiento (lista fija con etiquetas en español) y se envía, entonces 201 y la sala aparece en la tabla.
- **CA3** · Dada una sala existente, cuando se edita en el modal, entonces se envía `PATCH` con los cambios y se refleja en la tabla.
- **CA4** · Dada una sala activa, cuando se desactiva, entonces `PATCH` con `isActive: false`, el estado cambia a Inactiva y deja de aparecer en la agenda de un `EMPLOYEE`; sus reservas futuras no se tocan (D-14); se puede reactivar.
- **CA5** · Dado un nombre repetido, cuando se envía, entonces se muestra el error 409 `ROOM_NAME_TAKEN` en el campo del nombre.
- **CA6** · Dado el formulario de sala, cuando se valida en el cliente, entonces coincide con RN-22 (nombre 1–60, capacidad 1–100, ubicación 1–100).
- **CA7** · Dado un `EMPLOYEE`, cuando entra por URL, entonces ve "No tienes permiso para ver esta página".
- **CA8** · Dada la pantalla, cuando carga, está vacía o falla, entonces se muestran los estados de carga, vacío y error (con `requestId` y "Reintentar").

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Manual como admin en /admin/rooms:
#  crear "Sala Prueba" (capacidad 6, Piso 1, TV + Pizarra) → aparece
#  crear otra con el mismo nombre en minúsculas → error en el campo
#  editar la capacidad → se refleja
#  desactivar → como empleado1 ya no aparece en /agenda; reactivar o dejarla inactiva
#  como empleado1, entrar a /admin/rooms → "No tienes permiso para ver esta página"
```

---

## T10a · Admin de usuarios
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. dé de alta, edite, desactive y restablezca la contraseña de usuarios desde `/admin/users` |
| Trazabilidad | RN-15, RN-18, RN-21, RN-23, RN-26 · D-08, D-16, D-19, S-03 · spec §6 (F-06), §9 (Usuarios) · diseño: prototipo `gesti_n_y_creaci_n_de_usuarios_rrhh`; Componentes 6 y 7 |
| Dependencias | T05a, T07 |
| Estimación | M |
| Seguridad / auditoría | Roles: solo ADMIN. Auditoría: la genera la API (`USER_CREATED`, `USER_UPDATED`, `USER_PASSWORD_RESET` y las cancelaciones, T06a). OWASP A07: ninguna contraseña se muestra ni se guarda tras enviarla |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/users/`: `AdminUsersPage`, `UserFormModal`, `ResetPasswordModal`, hooks.

**Fuera de alcance:**
- Carga masiva, departamentos, cupos, penalizaciones, filtros, paginación, historial, borrado.

**Criterios de aceptación:**
- **CA1** · Dada la pantalla, cuando carga, entonces muestra todos los usuarios ordenados por nombre: nombre, correo, rol ("Empleado" o "Administrador RRHH") y estado (Activo o Inactivo).
- **CA2** · Dado el alta con nombre, correo, contraseña inicial (al menos 8 caracteres) y rol, cuando se envía, entonces 201 y el usuario aparece; con un correo repetido se muestra el 409 `EMAIL_TAKEN` en el campo.
- **CA3** · Dada la edición, cuando se abre, entonces solo se pueden cambiar el nombre y el rol; el correo no es editable.
- **CA4** · Dado "Desactivar", cuando se pulsa, entonces un diálogo avisa que se cancelarán sus reservas futuras (RN-15); al confirmar, `PATCH` con `isActive: false` y el estado cambia a Inactivo. Reactivar es posible y no restaura reservas.
- **CA5** · Dado "Restablecer contraseña", cuando se envía una nueva de al menos 8 caracteres, entonces 204 y aparece un aviso de éxito.
- **CA6** · Dada la fila del propio ADMIN, cuando se ve, entonces la acción de desactivar está deshabilitada; y si la API responde 422 `CANNOT_DEACTIVATE_SELF`, se muestra el mensaje.
- **CA7** · Dada una contraseña enviada, cuando termina la operación, entonces no se muestra ni se conserva, y la pantalla no tiene filtros ni paginación.
- **CA8** · Dado un `EMPLOYEE`, cuando entra por URL, entonces ve "No tienes permiso para ver esta página"; los estados de carga y error están presentes.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Manual como admin en /admin/users:
#  crear "Prueba Dos" con correo repetido de otro usuario → error 409 en el campo
#  crear con correo nuevo → entrar con él en otra ventana y reservar para mañana hábil
#  desactivarlo → el diálogo avisa de la cancelación → su sesión abierta recibe 401 y su reserva queda cancelada
#  restablecer su contraseña y reactivar → puede entrar con la nueva; la reserva sigue cancelada
#  la fila del admin tiene "Desactivar" deshabilitado
```

**Notas para el agente:** No existe un endpoint que cuente las reservas futuras de otro usuario, así que el aviso de desactivar es general y no muestra el número. No lo inventes.

---

## T10b · Admin de cierres
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. registre y elimine días cerrados desde `/admin/closures`, sabiendo cuántas reservas se cancelarán |
| Trazabilidad | RN-10, RN-16, RN-21, RN-24 · D-23, S-04, S-05 · spec §6 (F-07), §9 (Cierres) · diseño: sin prototipo (Componentes 6 y 7, modal y banner) |
| Dependencias | T05b, T07 |
| Estimación | M |
| Seguridad / auditoría | Roles: solo ADMIN. Auditoría: la genera la API (`CLOSURE_CREATED`, `CLOSURE_DELETED`, `BOOKING_CANCELLED`, T06a) |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/closures/`: `AdminClosuresPage`, `ClosureFormModal`, hooks sobre `GET`, `POST` y `DELETE /api/closures` y `GET /api/bookings?date=`.

**Fuera de alcance:**
- Cierres por sala o por rango, restaurar reservas, editar un cierre.

**Criterios de aceptación:**
- **CA1** · Dada la pantalla, cuando carga, entonces lista los cierres futuros (fecha y motivo) ordenados por fecha; sin cierres se lee "No hay cierres programados".
- **CA2** · Dado el alta, cuando se elige una fecha posterior a hoy y un motivo de 1 a 100 caracteres, entonces antes de confirmar la pantalla advierte cuántas reservas se cancelarán, contando las que devuelve `GET /api/bookings?date=`.
- **CA3** · Dado que se confirma, cuando la API responde 201, entonces se muestra "Se cancelaron N reservas" con `cancelledBookings` y la lista se actualiza.
- **CA4** · Dada una fecha repetida (409 `CLOSURE_EXISTS`) o de hoy o pasada (422 `CLOSURE_IN_PAST`), cuando se envía, entonces se muestra el mensaje en español.
- **CA5** · Dado "Eliminar" sobre un cierre futuro, cuando se pulsa, entonces un diálogo aclara que no se restauran las reservas canceladas; al confirmar, 204 y desaparece.
- **CA6** · Dado un día cerrado, cuando se abre `/agenda` en esa fecha, entonces aparece el banner con el motivo (integración con T08).
- **CA7** · Dado un `EMPLOYEE`, cuando entra por URL, entonces ve "No tienes permiso para ver esta página"; los estados de carga y error están presentes.

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Preparar: empleado1 reserva en un miércoles futuro (curl de T05).
# Manual como admin en /admin/closures:
#  crear cierre para ese miércoles → la pantalla avisa "1 reserva" → confirmar → "Se cancelaron 1 reservas"
#  repetir la fecha → "ya está cerrado"; elegir hoy → mensaje de fecha pasada
#  abrir /agenda ese miércoles → banner con el motivo
#  eliminar el cierre → diálogo → desaparece; la reserva sigue cancelada
```

---

## T10c · Auditoría: pantalla de consulta paginada
| Campo | Valor |
|---|---|
| Objetivo | Que RR. HH. consulte la auditoría paginada desde el backend, con filtros de fecha y acción, sin datos en la URL |
| Trazabilidad | O4 · RN-21, RN-25 · D-24 · spec §6 (F-08), §9 (Auditoría) · diseño: prototipo `registro_de_auditor_a_y_trazabilidad`; Componentes 2, 6 y 7 |
| Dependencias | T06a, T07 |
| Estimación | M |
| Seguridad / auditoría | Roles: solo ADMIN. Auditoría: solo lectura (esta pantalla no genera filas). OWASP A09 |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `src/web/src/features/audit/`: `AuditPage`, filtros, tabla, paginación, hook `useAuditSearch` sobre `POST /api/audit-logs/search`.

**Fuera de alcance:**
- Exportar CSV o PDF, cadena hash, filtros por sala o actor, IP, detalle JSON, indicador "En vivo".

**Criterios de aceptación:**
- **CA1** · Dada la pantalla, cuando carga, entonces envía `POST /api/audit-logs/search` con `{ page: 1, pageSize: 20 }` y muestra la tabla con fecha (hora de Tegucigalpa), actor, acción (etiqueta en español), entidad y `requestId`.
- **CA2** · Dados el rango de fechas y la acción, cuando se aplican, entonces se repite la búsqueda con esos campos en el body y se vuelve a la página 1.
- **CA3** · Dado el pie de la tabla, cuando navego entre páginas, entonces muestra "Anterior", "Siguiente" y el total; "Anterior" está deshabilitado en la página 1 y "Siguiente" en la última.
- **CA4** · Dados filtros y página, cuando cambian, entonces la URL del navegador no cambia: no hay parámetros de consulta (D-24).
- **CA5** · Dado que no hay resultados, cuando se consulta, entonces se lee "Sin registros para estos filtros"; si hay error, se muestra con el `requestId` y "Reintentar".
- **CA6** · Dado un `EMPLOYEE`, cuando entra por URL, entonces ve "No tienes permiso para ver esta página".

**Verificación:**
```bash
npm --prefix src/web run lint && npm --prefix src/web run build
docker compose up -d --build
# Manual como admin en /admin/audit (con operaciones previas ya hechas en el sistema):
#  la tabla muestra acciones recientes; el total coincide con el que devuelve la API
curl -s -b /tmp/admin.txt -H "$H" -d '{"page":1,"pageSize":20}' $BASE/audit-logs/search | jq .total
#  filtrar por acción BOOKING_CREATED → solo esas filas; "Siguiente" cambia de página y la URL no cambia
#  filtrar por una fecha sin eventos → "Sin registros para estos filtros"
```

**Notas para el agente:** **Recortable** junto con T06a. Si T06a no se hizo, esta tarea no se ejecuta.

---

## T11 · README final y verificación desde un clon limpio
| Campo | Valor |
|---|---|
| Objetivo | Dejar una instrucción única y probada con la que un agente reconstruya y levante todo desde cero |
| Trazabilidad | O5 · D-02, D-27 · spec §10, §12 (P-18) · prueba técnica: README y `04-cierre.md` |
| Dependencias | T01 a T10c (si T06a y T10c se recortaron, se declara) |
| Estimación | S |
| Seguridad / auditoría | Roles: no aplica. Auditoría: no aplica. Verifica que el repositorio solo contiene valores por defecto de desarrollo, sin secretos reales |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `README.md`: qué es SalaLibre, la instrucción `docker compose up`, la URL, las credenciales del seed, cómo correr las pruebas, el mapa de `docs/` y cómo se trabajó con el agente.
- Revisión de `docs/tareas/` y de la bitácora; sin cambios de código salvo lo que impida el arranque limpio.

**Fuera de alcance:**
- Funciones nuevas. `docs/04-cierre.md` lo redacta la persona con la evidencia (DoD global).

**Criterios de aceptación:**
- **CA1** · Dado un clon nuevo (carpeta limpia, sin `node_modules`, sin `.env` y sin volúmenes), cuando ejecuto `docker compose up --build`, entonces todo queda `healthy` y `http://localhost:8080` muestra el login.
- **CA2** · Dado el seed, cuando entro con `admin@salalibre.local` / `Admin12345` y con `empleado1@salalibre.local` / `Empleado12345`, entonces ambos inician sesión.
- **CA3** · Dado el sistema levantado, cuando reinicio `api` dos veces, entonces el seed no duplica datos (P-18).
- **CA4** · Dado el clon limpio, cuando corro `npm --prefix src/api test` y `docker compose --profile test run --rm api-test`, entonces ambos pasan.
- **CA5** · Dado el README, cuando un agente lo sigue, entonces la instrucción única basta y no requiere ningún paso manual adicional.
- **CA6** · Dado el repositorio, cuando reviso `git status`, entonces queda limpio, `.gitattributes` está presente y no hay secretos reales.
- **CA7** · Dado el sistema levantado, cuando ejecuto el flujo de humo, entonces funciona: login → reservar → ver en Mis reservas → cancelar → ADMIN crea una sala.

**Verificación:**
```bash
docker compose down -v
rm -rf /tmp/clean && git clone . /tmp/clean && cd /tmp/clean
docker compose up -d --build
docker compose ps                                                         # todo healthy
curl -s -o /dev/null -w "%{http_code}\n" localhost:8080/                  # 200
docker compose restart api && sleep 15 && docker compose restart api && sleep 15
docker compose exec -T db psql -U salalibre -d salalibre -c "SELECT (SELECT count(*) FROM users) AS usuarios, (SELECT count(*) FROM rooms) AS salas;"   # 4 y 5
npm --prefix src/api test
docker compose --profile test run --rm api-test
git status --short                                                        # vacío
grep -rEn "BEGIN (RSA|PRIVATE)|AKIA[0-9A-Z]{16}" . --exclude-dir=node_modules --exclude-dir=.git && echo "FALLA" || echo "OK"
```

**Notas para el agente:** El README debe poder seguirse sin conocer el repositorio: el evaluador borra el código y un agente lo reconstruye desde esa instrucción.

---

## Trazabilidad para el spec §14

Fuente de la columna "Tarea" de `01-spec.md` §14, que ya está copiada allí. Si cambia una tarea, se actualizan las dos tablas.

| Regla | Tarea | Prueba |
|---|---|---|
| RN-01 | T02 (restricción), T05 | P-01, P-02, P-03, P-04 → T06 |
| RN-02, RN-03 | T05 | P-05 → T05 (unitaria) |
| RN-04 | T05 | P-06 → T05 (unitaria) |
| RN-05, RN-06 | T05 | P-07 → T05 (unitaria) |
| RN-07, RN-08 | T05 (reglas), T08a (formulario) | P-08, P-16 → T06 |
| RN-09 | T04 (indicador), T05 (validación), T10 | P-08 → T06 |
| RN-10 | T05 (validación), T05b, T08 (banner), T10b | P-08 → T06 |
| RN-11, RN-12, RN-13 | T05, T09 | P-09 → T05 (unitaria) y T06 |
| RN-14 | T03, T05a | P-10 → T06 |
| RN-15 | T05a, T10a | P-10 → T06 |
| RN-16 | T05b, T10b | P-11 → T06 |
| RN-17 | T05, T08 | P-13 → T06 |
| RN-18 | T03a, T05a, T07b, T10a | P-16 → T06 |
| RN-19 | T03, T07, T07c | P-10 → T06 |
| RN-20 | T05 | P-01 (sin 422 por tope) → T06 |
| RN-21 | T03, T04, T05a, T05b, T06a, T07, T10 a T10c | P-14 → T06 |
| RN-22 | T02, T04, T10 | P-16 → T06 |
| RN-23 | T02, T05a, T10a | P-16 → T06 |
| RN-24 | T05b, T10b | P-11 → T06 |
| RN-25 | T06a, T10c | P-15 → T06a |
| RN-26 | T05a, T10a | P-10 → T06 |
| D-05 (auditoría) | T02 (trigger), T06a | P-12 → T06a |
| D-06 (formato de error) | T02a | P-17 → T06 |
| O5 (arranque limpio) | T01, T11 | P-18 → T11 |

---

## Plantilla de tarea (copiar por cada tarea nueva)

### T<xx> · <Título>
| Campo | Valor |
|---|---|
| Objetivo | <una frase> |
| Trazabilidad | RN-<xx> · D-<xx> · spec §<x> · diseño §<x> (prototipo: `docs/diseño/stitch/<carpeta>`) |
| Dependencias | T<xx> |
| Estimación | S / M / L |
| Seguridad / auditoría | Roles: <…> · Acción de auditoría: <… / no aplica> |
| Estado | Pendiente |

**Alcance (archivos o módulos):**
- `<ruta>`

**Fuera de alcance:**
- <lo que el agente NO debe hacer aquí>

**Criterios de aceptación:**
- **CA1** · Dado <contexto>, cuando <acción>, entonces <resultado observable>.
- **CA2** · ...

**Verificación:**
```bash
<comando 1>
<comando 2 → resultado esperado>
```

**Notas para el agente:** <gotchas>
