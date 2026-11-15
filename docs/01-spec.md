# Spec: SalaLibre

> **Estado:** Borrador
> **Fecha:** 2026-11-15
> **Objetivo:** Que las 80 personas de la oficina reserven las 5 salas de reunión sin choques y que RRHH las administre, todo en local con un solo `docker compose up`.

Cada decisión citada como `D-xx` está en `00-decisiones.md`.

---

## 1. Contexto y problema

> "App interna de gestión de reservas de salas de reunión (80 personas, 5 salas, RRHH administra)." — `CLAUDE.md`

**Problema:** hoy no hay un registro único de quién usa cada sala y cuándo, así que dos equipos pueden contar con la misma sala a la misma hora.

## 2. Objetivos y no-objetivos

### Objetivos
| ID | Objetivo | Cómo se mide |
|----|----------|--------------|
| O1 | Cero reservas solapadas en la misma sala. | La prueba de concurrencia (§12, P-01) crea 20 reservas simultáneas del mismo hueco y solo 1 queda `CONFIRMED`. |
| O2 | Cualquier persona ve la disponibilidad del día y reserva un hueco libre. | Flujo F-02 completo en la pantalla `/agenda` en menos de 5 clics desde el login. |
| O3 | RRHH administra salas, usuarios y días cerrados sin tocar código. | Flujos F-05, F-06 y F-07 se completan desde la UI. |
| O4 | Toda escritura queda auditada con su request ID. | Cada endpoint de escritura inserta una fila en `audit_logs` en la misma transacción (P-12). |
| O5 | Arranque desde un clon limpio con un solo comando. | `docker compose up` deja `http://localhost:8080` listo, con el seed cargado, sin `.env` ni pasos manuales. |

### No-objetivos
| No-objetivo | Decisión |
|-------------|----------|
| Reservas recurrentes. | D-22 |
| Notificaciones o recordatorios (correo u otros). | D-22 |
| Editar o mover una reserva existente. | D-12 |
| Reservar a nombre de otra persona. | D-13 |
| Autorregistro y recuperación de contraseña por correo. | D-08, D-19 |
| Despliegue en la nube. | D-02 |
| Tope de reservas por persona. | D-15 |

## 3. Usuarios y roles

| Rol | Puede | No puede |
|-----|-------|----------|
| `EMPLOYEE` | Iniciar y cerrar sesión. Ver la agenda del día de las salas activas. Filtrar la agenda por capacidad y equipamiento. Crear reservas para sí. Ver sus reservas. Cancelar sus reservas antes de que empiecen. Cambiar su contraseña. | Ver el título de reservas ajenas (D-20). Cancelar reservas ajenas. Editar reservas. Gestionar salas, usuarios o cierres. Ver la auditoría. |
| `ADMIN` (RRHH) | Todo lo de `EMPLOYEE`. Ver el título de todas las reservas. Cancelar cualquier reserva futura (D-13). Crear, editar y desactivar salas (D-14). Crear, editar, desactivar usuarios y restablecer contraseñas (D-08, D-16, D-19). Crear y eliminar días cerrados (D-23). Consultar la auditoría (D-24). | Crear reservas a nombre de otra persona (D-13). Borrar reservas, salas o usuarios (solo se cancelan o desactivan). Desactivarse a sí mismo (supuesto S-03). Modificar `audit_logs`. |
| Sin sesión | `POST /api/auth/login` y `GET /api/health`. | Cualquier otra ruta (401). |

## 4. Alcance del MVP

### Dentro
- Login con correo y contraseña; sesión de 8 h en cookie (D-03, D-19).
- Cambio de contraseña por el propio usuario (D-19).
- Agenda diaria salas × bloques de 15 min con filtro por capacidad mínima y equipamiento (D-18, D-25).
- Crear reserva con título y asistentes (D-17).
- "Mis reservas" y cancelación (D-12, D-13).
- Administración de salas con equipamiento (D-14, D-25).
- Administración de usuarios con desactivación y restablecimiento de contraseña (D-08, D-16, D-19).
- Días cerrados globales (D-23).
- Consulta paginada de auditoría (D-24).
- Seed idempotente (D-26).

### Fuera (v2)
| Fuera | Motivo |
|-------|--------|
| Recurrencias. | D-22: se difiere por elección de la persona. |
| Notificaciones y recordatorios. | D-22: se difiere por elección de la persona. |
| Edición de reservas. | D-12: se cancela y se crea otra. |
| Reservas a nombre de otro. | D-13. |
| Recuperación de contraseña por correo. | D-19: exige SMTP y rutas públicas extra. |
| Tope de reservas por persona. | D-15: revisar si RRHH detecta acaparamiento. |

## 5. Reglas de negocio

Todas las horas se interpretan en `BUSINESS_TZ` y se guardan en UTC (D-07). Un intervalo de reserva es semiabierto `[startAt, endAt)`: una reserva que termina a las 10:00 no choca con otra que empieza a las 10:00.

| ID | Regla | Error si falla | Decisión |
|----|-------|----------------|----------|
| RN-01 | Dos reservas `CONFIRMED` de la misma sala no se solapan. Lo garantiza la base de datos. | 409 `BOOKING_CONFLICT` | D-04 |
| RN-02 | `startAt` y `endAt` caen en minuto múltiplo de `BOOKING_SLOT_MINUTES` (15), con segundos y milisegundos en 0. | 422 `INVALID_SLOT` | D-10 |
| RN-03 | La duración está entre `BOOKING_MIN_MINUTES` (15) y `BOOKING_MAX_MINUTES` (240) minutos, ambos incluidos. | 422 `INVALID_DURATION` | D-10 |
| RN-04 | La reserva cae de lunes a viernes, el mismo día, con `startAt` ≥ `BUSINESS_OPEN_TIME` (07:00) y `endAt` ≤ `BUSINESS_CLOSE_TIME` (20:00). | 422 `OUTSIDE_BUSINESS_HOURS` | D-09 |
| RN-05 | `startAt` es posterior al instante actual. | 422 `BOOKING_IN_PAST` | D-11 |
| RN-06 | `startAt` es anterior o igual a ahora + `BOOKING_MAX_DAYS_AHEAD` (30) días. | 422 `TOO_FAR_AHEAD` | D-11 |
| RN-07 | `attendees` es entero ≥ 1 y ≤ `capacity` de la sala. | 400 si no es entero ≥ 1 · 422 `CAPACITY_EXCEEDED` si supera la capacidad | D-17 |
| RN-08 | `title` tiene entre 1 y 100 caracteres tras quitar espacios de los extremos. | 400 `VALIDATION_ERROR` | D-17 |
| RN-09 | No se crean reservas en una sala con `isActive = false`. | 422 `ROOM_INACTIVE` | D-14 |
| RN-10 | No se crean reservas en una fecha registrada en `closures`. | 422 `DAY_CLOSED` | D-23 |
| RN-11 | Solo el dueño o un `ADMIN` cancela una reserva. | 403 `FORBIDDEN` | D-12, D-13 |
| RN-12 | Solo se cancela una reserva `CONFIRMED` cuyo `startAt` es posterior al instante actual. | 422 `BOOKING_ALREADY_STARTED` · 422 `BOOKING_ALREADY_CANCELLED` | D-12, D-13 |
| RN-13 | Las reservas no se editan ni se borran. Cancelar pone `status = CANCELLED`, `cancelledAt` y `cancelledById`. | — (no existe endpoint) | D-12 |
| RN-14 | Un usuario con `isActive = false` no inicia sesión y toda petición con su cookie responde 401. Se verifica el estado en cada petición. | 401 `INVALID_CREDENTIALS` (login) · 401 `UNAUTHENTICATED` (resto) | D-16, D-19 |
| RN-15 | Desactivar un usuario cancela sus reservas `CONFIRMED` con `startAt` futuro, en la misma transacción y auditado. | — | D-16 |
| RN-16 | Crear un cierre cancela las reservas `CONFIRMED` de esa fecha, en la misma transacción y auditado. | — | D-23 |
| RN-17 | Para un `EMPLOYEE`, la API omite `title` en reservas cuyo dueño no es él (`title: null`). El `ADMIN` recibe siempre el título. | — | D-20 |
| RN-18 | La contraseña tiene al menos 8 caracteres. Cambiarla exige la contraseña actual correcta. | 400 `VALIDATION_ERROR` · 422 `INVALID_CURRENT_PASSWORD` | D-19 |
| RN-19 | La sesión dura `JWT_EXPIRES_IN` (8 h) y no se renueva. | 401 `UNAUTHENTICATED` al vencer | D-19 |
| RN-20 | No hay tope de reservas activas por persona. | — | D-15 |
| RN-21 | Solo `ADMIN` gestiona salas, usuarios, cierres y auditoría. | 403 `FORBIDDEN` | D-08, D-14, D-23, D-24 |
| RN-22 | `room.name` es único (sin distinguir mayúsculas) con 1–60 caracteres. `capacity` es entero entre 1 y 100. `equipment` es un subconjunto sin repetidos de `PROJECTOR`, `VIDEOCONF`, `WHITEBOARD`, `TV`. | 409 `ROOM_NAME_TAKEN` · 400 `VALIDATION_ERROR` | D-14, D-25 |
| RN-23 | `user.email` es único y se guarda en minúsculas. | 409 `EMAIL_TAKEN` | D-08 |
| RN-24 | Solo se crea un cierre para una fecha posterior a hoy y no repetida. | 422 `CLOSURE_IN_PAST` · 409 `CLOSURE_EXISTS` | D-23, S-04 |
| RN-25 | La auditoría se devuelve ordenada por `createdAt` desc. `pageSize` por defecto 20, máximo 100. `page` empieza en 1. | 400 `VALIDATION_ERROR` | D-24 |
| RN-26 | Un `ADMIN` no puede desactivarse a sí mismo. | 422 `CANNOT_DEACTIVATE_SELF` | S-03 |

### Parámetros configurables
| Variable | Valor por defecto | Usada en |
|----------|-------------------|----------|
| `BUSINESS_TZ` | `America/Tegucigalpa` | RN-04, RN-10, RN-24 (D-21) |
| `BUSINESS_OPEN_TIME` | `07:00` | RN-04 |
| `BUSINESS_CLOSE_TIME` | `20:00` | RN-04 |
| `BOOKING_SLOT_MINUTES` | `15` | RN-02 |
| `BOOKING_MIN_MINUTES` | `15` | RN-03 |
| `BOOKING_MAX_MINUTES` | `240` | RN-03 |
| `BOOKING_MAX_DAYS_AHEAD` | `30` | RN-06 |
| `JWT_EXPIRES_IN` | `8h` | RN-19 |
| `JWT_SECRET` | `dev-only-change-me` | Firma del JWT |
| `SEED_ADMIN_PASSWORD` | `Admin12345` | Seed (D-26) |
| `SEED_USER_PASSWORD` | `Empleado12345` | Seed (D-26) |

## 6. Flujos principales

**F-01 · Iniciar sesión**
1. La persona abre `http://localhost:8080` y el frontend llama `GET /api/auth/me`.
2. Si responde 401, el frontend redirige a `/login`.
3. Envía correo y contraseña a `POST /api/auth/login`.
4. La API responde 200 con el usuario y la cookie `access_token`. El frontend va a `/agenda`.
5. **Error:** credenciales incorrectas o usuario inactivo → 401 `INVALID_CREDENTIALS`. Se muestra "Correo o contraseña incorrectos" sin decir cuál.

**F-02 · Reservar desde la agenda**
1. En `/agenda` la persona elige el día. El frontend pide `GET /api/rooms`, `GET /api/bookings?date=AAAA-MM-DD` y `GET /api/closures`.
2. Opcionalmente filtra columnas por capacidad mínima y equipamiento (filtro en el cliente sobre la lista de salas).
3. Hace clic en un bloque libre. Se abre el formulario con sala e inicio precargados.
4. Completa fin, título y asistentes, y envía `POST /api/bookings`.
5. La API valida RN-02..RN-10 y la base aplica RN-01. Responde 201.
6. El frontend invalida la consulta de la agenda y muestra la reserva.
7. **Error:** otra persona tomó el hueco un instante antes → 409 `BOOKING_CONFLICT`. El `apiClient` muestra "Ese horario acaba de ocuparse" con el `requestId` y la agenda se recarga.

**F-03 · Cancelar una reserva propia**
1. En `/my-bookings` la persona pulsa "Cancelar" en una reserva futura `CONFIRMED`.
2. Confirma en un diálogo de la app (no `window.confirm`).
3. El frontend envía `POST /api/bookings/:id/cancel`. La API aplica RN-11 y RN-12 vía `BookingPolicy`.
4. Responde 200 con la reserva en `CANCELLED`.
5. **Error:** la reserva ya empezó → 422 `BOOKING_ALREADY_STARTED`.

**F-04 · ADMIN cancela una reserva ajena**
1. En `/agenda` el ADMIN ve título y dueño de cada reserva.
2. Pulsa la reserva y luego "Cancelar". Sigue F-03 desde el paso 2.
3. `audit_logs` registra al ADMIN como actor.

**F-05 · ADMIN gestiona salas**
1. En `/admin/rooms` ve todas las salas, activas e inactivas.
2. Crea con `POST /api/rooms` o edita con `PATCH /api/rooms/:id` (incluye `isActive`).
3. **Error:** nombre repetido → 409 `ROOM_NAME_TAKEN`.

**F-06 · ADMIN gestiona usuarios**
1. En `/admin/users` ve todos los usuarios.
2. Crea con `POST /api/users` asignando contraseña inicial.
3. Desactiva con `PATCH /api/users/:id` y `isActive: false`. Se cancelan sus reservas futuras (RN-15).
4. Restablece contraseña con `POST /api/users/:id/reset-password`.
5. **Error:** correo repetido → 409 `EMAIL_TAKEN`. Intentar desactivarse → 422 `CANNOT_DEACTIVATE_SELF`.

**F-07 · ADMIN registra un día cerrado**
1. En `/admin/closures` elige fecha y motivo.
2. La pantalla advierte cuántas reservas se cancelarán (dato de `GET /api/bookings?date=`).
3. Envía `POST /api/closures`. Se cancelan las reservas de ese día (RN-16).
4. **Error:** fecha ya cerrada → 409 `CLOSURE_EXISTS`. Fecha de hoy o pasada → 422 `CLOSURE_IN_PAST`.

**F-08 · ADMIN consulta la auditoría**
1. En `/admin/audit` el frontend envía `POST /api/audit-logs/search` con `{ page: 1, pageSize: 20 }`.
2. La persona ajusta rango de fechas y acción. El frontend repite la búsqueda con esos campos en el body.
3. Navega entre páginas con "Anterior" y "Siguiente". La URL del navegador no cambia con los filtros.

**F-09 · Cambiar mi contraseña**
1. En `/account` ingresa la contraseña actual y la nueva.
2. Envía `PATCH /api/auth/password`. Responde 204.
3. **Error:** contraseña actual incorrecta → 422 `INVALID_CURRENT_PASSWORD`.

## 7. Modelo de datos

**Convenciones**
- PostgreSQL 16. Tablas y columnas en `snake_case`; modelos Prisma en `PascalCase` con campos `camelCase` mapeados.
- IDs `uuid` generados por la base (`gen_random_uuid()`).
- Fechas y horas en `timestamptz` UTC (D-07). `closures.date` es `date` en `BUSINESS_TZ`.
- Sin borrado físico de reservas, salas ni usuarios: se cancelan o desactivan. Única excepción: `closures` (supuesto S-05).
- `users.email` en minúsculas. `rooms.name` único sin distinguir mayúsculas.

### `users`
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | uuid | PK |
| `email` | text | NOT NULL, UNIQUE, en minúsculas |
| `name` | text | NOT NULL, 1–100 caracteres |
| `password_hash` | text | NOT NULL, bcryptjs |
| `role` | enum `Role` (`EMPLOYEE`, `ADMIN`) | NOT NULL, default `EMPLOYEE` |
| `is_active` | boolean | NOT NULL, default `true` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL |

### `rooms`
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | uuid | PK |
| `name` | text | NOT NULL, 1–60 caracteres, índice único sobre `lower(name)` |
| `capacity` | integer | NOT NULL, CHECK `capacity BETWEEN 1 AND 100` |
| `location` | text | NOT NULL, 1–100 caracteres |
| `equipment` | enum `Equipment`[] (`PROJECTOR`, `VIDEOCONF`, `WHITEBOARD`, `TV`) | NOT NULL, default `{}` |
| `is_active` | boolean | NOT NULL, default `true` |
| `created_at` | timestamptz | NOT NULL, default `now()` |
| `updated_at` | timestamptz | NOT NULL |

### `bookings`
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | uuid | PK |
| `room_id` | uuid | NOT NULL, FK → `rooms.id` |
| `user_id` | uuid | NOT NULL, FK → `users.id` (dueño) |
| `title` | text | NOT NULL, 1–100 caracteres |
| `attendees` | integer | NOT NULL, CHECK `attendees >= 1` |
| `start_at` | timestamptz | NOT NULL |
| `end_at` | timestamptz | NOT NULL, CHECK `end_at > start_at` |
| `status` | enum `BookingStatus` (`CONFIRMED`, `CANCELLED`) | NOT NULL, default `CONFIRMED` |
| `cancelled_at` | timestamptz | NULL |
| `cancelled_by_id` | uuid | NULL, FK → `users.id` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

Índices: `(room_id, start_at)` y `(user_id, start_at)`.

Restricción anti-choque (RN-01, D-04), en migración SQL propia `src/api/prisma/migrations/<timestamp>_bookings_no_overlap/migration.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    room_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  ) WHERE (status = 'CONFIRMED');
```

### `closures`
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | uuid | PK |
| `date` | date | NOT NULL, UNIQUE |
| `reason` | text | NOT NULL, 1–100 caracteres |
| `created_by_id` | uuid | NOT NULL, FK → `users.id` |
| `created_at` | timestamptz | NOT NULL, default `now()` |

### `audit_logs`
| Campo | Tipo | Restricciones |
|-------|------|---------------|
| `id` | uuid | PK |
| `actor_id` | uuid | NULL, FK → `users.id` (NULL solo en el seed) |
| `action` | enum `AuditAction` | NOT NULL |
| `entity` | text | NOT NULL (`booking`, `room`, `user`, `closure`) |
| `entity_id` | uuid | NOT NULL |
| `data` | jsonb | NOT NULL, default `{}`. Nunca contiene contraseñas, hashes, cookies ni tokens. |
| `request_id` | text | NOT NULL |
| `created_at` | timestamptz | NOT NULL, default `now()` |

Índice: `(created_at DESC)`.

`AuditAction`: `BOOKING_CREATED`, `BOOKING_CANCELLED`, `ROOM_CREATED`, `ROOM_UPDATED`, `USER_CREATED`, `USER_UPDATED`, `USER_PASSWORD_RESET`, `USER_PASSWORD_CHANGED`, `CLOSURE_CREATED`, `CLOSURE_DELETED`.

Inmutabilidad (D-05), en migración SQL propia `src/api/prisma/migrations/<timestamp>_audit_logs_immutable/migration.sql`: un trigger `BEFORE UPDATE OR DELETE ON audit_logs` que lanza una excepción.

## 8. Contrato de la API

Todas las rutas cuelgan de `/api` (prefijo global de NestJS). nginx hace proxy de `/api` a `api:3000`.

### Formato de error (D-06)
```json
{ "error": { "code": "BOOKING_CONFLICT", "message": "La sala ya está reservada en ese horario.", "requestId": "3f1c9a2e-7b5d-4c1e-9f0a-2d6b8e4a1c33" } }
```

| HTTP | Códigos |
|------|---------|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHENTICATED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `BOOKING_CONFLICT`, `ROOM_NAME_TAKEN`, `EMAIL_TAKEN`, `CLOSURE_EXISTS` |
| 422 | `INVALID_SLOT`, `INVALID_DURATION`, `OUTSIDE_BUSINESS_HOURS`, `BOOKING_IN_PAST`, `TOO_FAR_AHEAD`, `CAPACITY_EXCEEDED`, `ROOM_INACTIVE`, `DAY_CLOSED`, `BOOKING_ALREADY_STARTED`, `BOOKING_ALREADY_CANCELLED`, `INVALID_CURRENT_PASSWORD`, `CLOSURE_IN_PAST`, `CANNOT_DEACTIVATE_SELF` |
| 500 | `INTERNAL_ERROR` (sin stack trace) |

Toda respuesta lleva el header `X-Request-Id`.

### Endpoints
| Método y ruta | Rol | Descripción |
|---------------|-----|-------------|
| `GET /api/health` | Público | `{ "status": "ok" }`. Comprueba conexión a la base. |
| `POST /api/auth/login` | Público | Body `{ email, password }`. 200 con `User` y cookie `access_token`. |
| `POST /api/auth/logout` | Autenticado | Borra la cookie. 204. |
| `GET /api/auth/me` | Autenticado | 200 con `User`. |
| `PATCH /api/auth/password` | Autenticado | Body `{ currentPassword, newPassword }`. 204. |
| `GET /api/rooms` | Autenticado | `EMPLOYEE`: salas activas. `ADMIN`: todas. 200 con `Room[]` ordenado por `name`. |
| `POST /api/rooms` | ADMIN | Body `{ name, capacity, location, equipment }`. 201 con `Room`. |
| `PATCH /api/rooms/:id` | ADMIN | Body parcial `{ name?, capacity?, location?, equipment?, isActive? }`. 200 con `Room`. |
| `GET /api/bookings?date=AAAA-MM-DD` | Autenticado | Reservas `CONFIRMED` de ese día (en `BUSINESS_TZ`) de todas las salas. Aplica RN-17. 200 con `Booking[]`. |
| `GET /api/bookings/mine` | Autenticado | Reservas propias con `endAt` ≥ inicio del día actual, ambos estados, ordenadas por `startAt`. 200 con `Booking[]`. |
| `POST /api/bookings` | Autenticado | Body `{ roomId, startAt, endAt, title, attendees }`. Fechas ISO 8601 con zona. 201 con `Booking`. |
| `POST /api/bookings/:id/cancel` | Dueño o ADMIN | 200 con `Booking`. |
| `GET /api/closures` | Autenticado | Cierres con `date` ≥ hoy, ordenados por fecha. 200 con `Closure[]`. |
| `POST /api/closures` | ADMIN | Body `{ date, reason }`. 201 con `Closure` y `cancelledBookings` (número). |
| `DELETE /api/closures/:id` | ADMIN | Solo cierres con `date` > hoy. 204. No restaura reservas canceladas (S-05). |
| `GET /api/users` | ADMIN | 200 con `User[]` ordenado por `name`. |
| `POST /api/users` | ADMIN | Body `{ name, email, password, role }`. 201 con `User`. |
| `PATCH /api/users/:id` | ADMIN | Body parcial `{ name?, role?, isActive? }`. 200 con `User`. |
| `POST /api/users/:id/reset-password` | ADMIN | Body `{ newPassword }`. 204. |
| `POST /api/audit-logs/search` | ADMIN | Body `{ page?, pageSize?, from?, to?, action? }`. `from` y `to` son `AAAA-MM-DD` en `BUSINESS_TZ`, ambos incluidos. 200 con `AuditPage`. Lectura vía POST por D-24. |

### Objetos
`User`
```json
{ "id": "b6a1…", "email": "empleado1@salalibre.local", "name": "Empleado Uno", "role": "EMPLOYEE", "isActive": true }
```

`Room`
```json
{ "id": "9c2e…", "name": "Sala Copán", "capacity": 8, "location": "Piso 2", "equipment": ["PROJECTOR", "WHITEBOARD"], "isActive": true }
```

`Booking` (vista de un `EMPLOYEE` sobre una reserva ajena: `title` es `null`)
```json
{
  "id": "4d7f…",
  "roomId": "9c2e…",
  "roomName": "Sala Copán",
  "owner": { "id": "b6a1…", "name": "Empleado Uno" },
  "title": "Planificación Q1",
  "attendees": 6,
  "startAt": "2026-11-16T15:00:00.000Z",
  "endAt": "2026-11-16T16:00:00.000Z",
  "status": "CONFIRMED",
  "cancelledAt": null,
  "cancelledBy": null,
  "isMine": true
}
```

`Closure`
```json
{ "id": "a01b…", "date": "2026-12-24", "reason": "Nochebuena" }
```

`AuditPage`
```json
{
  "items": [
    { "id": "e3f0…", "createdAt": "2026-11-15T08:40:12.000Z", "actor": { "id": "b6a1…", "name": "Admin RRHH" }, "action": "BOOKING_CANCELLED", "entity": "booking", "entityId": "4d7f…", "requestId": "3f1c9a2e-…" }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 134
}
```

## 9. Pantallas

La guía visual está en `docs/diseño/DESIGN.md` (solo visual, D-28); las pantallas de Stitch irán en `docs/diseño/stitch/`. Este spec fija contenido y rutas.

| Pantalla | Ruta | Rol | Contenido |
|----------|------|-----|-----------|
| Login | `/login` | Público | Correo, contraseña, botón "Entrar". |
| Agenda | `/agenda` (inicio tras login) | Autenticado | Selector de día (hoy … hoy + 30, solo L–V). Columnas = salas activas filtradas. Filas = bloques de 15 min de 07:00 a 20:00. Filtros: capacidad mínima y equipamiento. Reserva propia con título; ajena con "Ocupado" + nombre (`EMPLOYEE`) o título + nombre (`ADMIN`). Clic en hueco libre abre el formulario de reserva. Día cerrado: banner con el motivo y sin huecos clicables. |
| Formulario de reserva | Modal sobre `/agenda` | Autenticado | Sala, inicio, fin (selectores de 15 min), título, asistentes. Muestra capacidad de la sala. |
| Mis reservas | `/my-bookings` | Autenticado | Lista de reservas propias con estado y botón "Cancelar" solo si `CONFIRMED` y futura. |
| Mi cuenta | `/account` | Autenticado | Cambio de contraseña. |
| Salas | `/admin/rooms` | ADMIN | Tabla de salas con estado, crear y editar en modal, activar/desactivar. |
| Usuarios | `/admin/users` | ADMIN | Tabla de usuarios, crear, editar rol y nombre, activar/desactivar, restablecer contraseña. |
| Cierres | `/admin/closures` | ADMIN | Lista de cierres futuros, crear (con aviso de reservas afectadas), eliminar. |
| Auditoría | `/admin/audit` | ADMIN | Filtros de fecha y acción, tabla paginada (fecha, actor, acción, entidad, requestId), "Anterior"/"Siguiente" y total. La URL no contiene filtros ni página. |

**Estados en todas las pantallas con datos**
- **Cargando:** esqueleto o spinner en el área de datos; los botones de envío se deshabilitan mientras hay una petición en curso.
- **Vacío:** texto específico ("No tienes reservas próximas", "No hay cierres programados", "Sin registros para estos filtros"). En la agenda vacía, todos los huecos se ven libres.
- **Error:** mensaje del `apiClient` con el `requestId` y botón "Reintentar".
- **Sin permiso:** un `EMPLOYEE` no ve los enlaces de `/admin/*`. Si entra por URL, ve "No tienes permiso para ver esta página" (la API igualmente responde 403).
- **Sin sesión:** cualquier 401 lleva a `/login`.

## 10. Arquitectura

```
Navegador ──► nginx :8080 ──┬── /        → archivos estáticos de web (React)
                            └── /api/*   → api:3000 (NestJS) ──► db:5432 (PostgreSQL 16)
```

### Servicios de `docker-compose.yml`
| Servicio | Imagen | Puerto | Healthcheck | Depende de |
|----------|--------|--------|-------------|------------|
| `db` | `postgres:16-alpine` | interno 5432 | `pg_isready -U $POSTGRES_USER` | — |
| `api` | build `src/api/Dockerfile` desde `node:24-alpine`, multi-stage, usuario no root | interno 3000 | `GET http://localhost:3000/api/health` | `db` (`service_healthy`) |
| `web` | build `src/web/Dockerfile`: etapa `node:24-alpine` compila Vite, etapa final nginx sirve estáticos y proxy | **8080** publicado | `GET http://localhost:8080/` | `api` (`service_healthy`) |

Arranque de `api`: `prisma migrate deploy` → seed → `node dist/main.js` (D-02). Todas las variables tienen default con `${VAR:-valor}` en el compose. `.gitattributes` con `* text=auto eol=lf`.

### Estructura de carpetas (D-29)
```
src/
  api/
    prisma/schema.prisma
    prisma/migrations/          # incluye las dos migraciones SQL propias (§7)
    prisma/seed.ts
    src/common/                 # request ID, filtro de errores, guards, decoradores, TransactionRunner
    src/modules/auth/
    src/modules/users/
    src/modules/rooms/
    src/modules/bookings/       # domain/ con BookingPolicy y reglas RN-02..RN-12
    src/modules/closures/
    src/modules/audit/
    test/
  web/
    src/features/auth/
    src/features/bookings/
    src/features/rooms/
    src/features/users/
    src/features/closures/
    src/features/audit/
    src/shared/                 # apiClient, layout, componentes base
docker-compose.yml
.gitattributes
```

Stack según D-01. Cada módulo de `api` sigue Controller → Service → Dominio + Repositorio (interfaz) → implementación Prisma, según `CLAUDE.md`.

### Datos de ejemplo (seed idempotente con upsert, D-26)
- `admin@salalibre.local` · rol `ADMIN` · contraseña `SEED_ADMIN_PASSWORD`.
- `empleado1@salalibre.local`, `empleado2@salalibre.local`, `empleado3@salalibre.local` · rol `EMPLOYEE` · contraseña `SEED_USER_PASSWORD`.
- 5 salas activas con capacidades y equipamiento variados (nombres en S-07).
- Sin reservas ni cierres de ejemplo.
- El seed no sobrescribe contraseñas ni datos de usuarios que ya existen.

## 11. Requisitos no funcionales

- **Concurrencia:** RN-01 la garantiza `bookings_no_overlap`, no una consulta previa. Crear cierre (RN-16) y crear reserva toman `pg_advisory_xact_lock` sobre la fecha afectada dentro de su transacción. Desactivar usuario (RN-15) y crear reserva toman `pg_advisory_xact_lock` sobre el `userId`.
- **Seguridad:** según `CLAUDE.md` (D-03): `JwtAuthGuard` global, `RolesGuard`, `ValidationPipe` con `whitelist` y `forbidNonWhitelisted`, bcryptjs, sin stack traces. El JWT lleva solo `sub` y `role`; en cada petición se relee el usuario para aplicar RN-14.
- **Rendimiento:** con 80 usuarios y 5 salas, cada endpoint responde en menos de 300 ms en local con el seed cargado.
- **Accesibilidad mínima:** formularios con `label` asociado, foco visible, navegación por teclado en la agenda y contraste AA con los tokens de `docs/diseño/DESIGN.md`.
- **Observabilidad:** logs JSON con pino incluyendo `requestId`, método, ruta, estado y duración. Nunca se loguean contraseñas, hashes, cookies ni tokens.

## 12. Estrategia de pruebas

**Comandos**
- Unitarias (dominio, sin base): `npm --prefix api test`.
- Integración contra PostgreSQL real: `docker compose --profile test run --rm api-test` (S-08).
- Lint: `npm --prefix api run lint` y `npm --prefix web run lint`.
- Humo: `docker compose up` desde un clon limpio y login con el seed en `http://localhost:8080`.

Los nombres de prueba incluyen la regla, por ejemplo `it('RN-01 · …')`.

**Casos obligatorios.** El riesgo central es el choque de reservas, así que P-01..P-04 son los primeros en escribirse.

| ID | Tipo | Caso |
|----|------|------|
| P-01 | Integración | RN-01 · 20 `POST /api/bookings` simultáneos al mismo hueco y sala: 1 responde 201 y 19 responden 409 `BOOKING_CONFLICT`. |
| P-02 | Integración | RN-01 · Reservas contiguas (`10:00–11:00` y `11:00–12:00`) se aceptan. |
| P-03 | Integración | RN-01 · Una reserva `CANCELLED` no bloquea el hueco. |
| P-04 | Integración | RN-01 · Solapamiento parcial en la misma sala → 409; mismo horario en otra sala → 201. |
| P-05 | Unitaria | RN-02, RN-03 · Minuto no múltiplo de 15, duración 0, 14, 241 min → error; 15 y 240 min → válido. |
| P-06 | Unitaria | RN-04 · Sábado, 06:45, fin 20:15, reserva que cruza medianoche → error; 07:00–20:00 de lunes → válido (en `America/Tegucigalpa`). |
| P-07 | Unitaria | RN-05, RN-06 · Pasado y > 30 días → error; justo 30 días → válido. |
| P-08 | Integración | RN-07, RN-09, RN-10 · Asistentes > capacidad, sala inactiva y día cerrado → 422 con su código. |
| P-09 | Unitaria + integración | RN-11, RN-12 · `BookingPolicy`: dueño cancela futura; otro EMPLOYEE → 403; ADMIN → 200; ya empezada → 422. |
| P-10 | Integración | RN-14, RN-15 · Desactivar usuario cancela sus reservas futuras; su cookie vigente pasa a 401. |
| P-11 | Integración | RN-16, RN-24 · Crear cierre cancela las reservas del día; repetido → 409; hoy → 422. |
| P-12 | Integración | D-05 · Cada escritura deja una fila en `audit_logs` con `requestId`; `UPDATE` o `DELETE` sobre `audit_logs` falla. |
| P-13 | Integración | RN-17 · `EMPLOYEE` recibe `title: null` en reservas ajenas; `ADMIN` recibe el título. |
| P-14 | Integración | RN-21 · `EMPLOYEE` recibe 403 en `/api/rooms` (POST/PATCH), `/api/users`, `/api/closures` (POST/DELETE) y `/api/audit-logs/search`. Sin cookie → 401 en todas salvo las dos públicas. |
| P-15 | Integración | RN-25 · `POST /api/audit-logs/search` devuelve `total` correcto, orden desc, filtra por `from`/`to`/`action`; `pageSize` 101 → 400. |
| P-16 | Integración | RN-18, RN-23, RN-22 · Contraseña corta → 400; actual incorrecta → 422; correo y nombre de sala repetidos → 409. |
| P-17 | Integración | D-06 · Ningún error incluye stack trace; todos tienen `code`, `message`, `requestId` y el header `X-Request-Id`. |
| P-18 | Humo | O5 · `docker compose up` desde un clon limpio deja la app operativa y el seed se puede ejecutar dos veces sin duplicar datos. |

## 13. Riesgos y supuestos

| ID | Riesgo o supuesto | Mitigación / motivo |
|----|-------------------|---------------------|
| R-01 | Carrera entre crear un cierre y crear una reserva del mismo día. | Advisory lock por fecha (§11) y P-11. |
| R-02 | Carrera entre desactivar un usuario y que ese usuario reserve. | Advisory lock por `userId` (§11) y P-10. |
| R-03 | Errores de zona horaria en los bordes del día. | Toda validación de RN-04/RN-10 convierte a `BUSINESS_TZ`; P-06 cubre los bordes. Honduras no tiene horario de verano. |
| R-04 | Un JWT robado sigue válido hasta 8 h. | Cookie `httpOnly` + `SameSite=Strict`; desactivar al usuario lo corta (RN-14). Aceptado para una app local. |
| S-01 | `POST /api/auth/logout` existe y requiere sesión. | No figura en `CLAUDE.md`, pero sin él no se puede cerrar sesión con una cookie `httpOnly`. No agrega rutas públicas. |
| S-02 | El login no se audita. | `audit_logs` registra escrituras de negocio; el login queda en los logs de pino. |
| S-03 | Un ADMIN no puede desactivarse a sí mismo (RN-26). | Opción conservadora: evita quedarse sin ningún ADMIN activo. |
| S-04 | Un cierre solo se crea para fechas posteriores a hoy. | Opción conservadora: evita cancelar reservas en curso, que RN-12 no permite cancelar. |
| S-05 | Un ADMIN puede eliminar un cierre futuro; las reservas canceladas no se restauran. | Sin esto, un cierre creado por error sería permanente. Es el único borrado físico. |
| S-07 | Nombres de las 5 salas del seed: Sala Copán (8), Sala Roatán (4), Sala Lempira (12), Sala Morazán (6), Sala Pico Bonito (20). | Datos de ejemplo; el ADMIN puede renombrarlas. |
| S-08 | Las pruebas de integración corren en un servicio `api-test` del perfil `test` del compose, en la red interna, porque `db` no publica puertos. | `docker compose up` normal no lo arranca. |
| S-09 | Sin pruebas automáticas de frontend en el MVP. | El stack solo declara Jest para la API; el frontend se verifica con el humo P-18 y los flujos de §6. |

## 14. Trazabilidad

Las tareas se completan cuando exista `docs/02-backlog.md`.

| Regla | Endpoint | Pantalla | Tarea | Prueba |
|-------|----------|----------|-------|--------|
| RN-01 | `POST /api/bookings` | `/agenda` | — | P-01, P-02, P-03, P-04 |
| RN-02, RN-03 | `POST /api/bookings` | Formulario de reserva | — | P-05 |
| RN-04 | `POST /api/bookings` | `/agenda` | — | P-06 |
| RN-05, RN-06 | `POST /api/bookings` | `/agenda` | — | P-07 |
| RN-07, RN-08 | `POST /api/bookings` | Formulario de reserva | — | P-08, P-16 |
| RN-09 | `POST /api/bookings`, `PATCH /api/rooms/:id` | `/agenda`, `/admin/rooms` | — | P-08 |
| RN-10 | `POST /api/bookings`, `GET /api/closures` | `/agenda` | — | P-08 |
| RN-11, RN-12, RN-13 | `POST /api/bookings/:id/cancel` | `/my-bookings`, `/agenda` | — | P-09 |
| RN-14, RN-15 | `POST /api/auth/login`, `PATCH /api/users/:id` | `/login`, `/admin/users` | — | P-10 |
| RN-16, RN-24 | `POST /api/closures` | `/admin/closures` | — | P-11 |
| RN-17 | `GET /api/bookings`, `GET /api/bookings/mine` | `/agenda` | — | P-13 |
| RN-18 | `PATCH /api/auth/password`, `POST /api/users/:id/reset-password` | `/account`, `/admin/users` | — | P-16 |
| RN-19 | `POST /api/auth/login` | `/login` | — | P-10 |
| RN-20 | `POST /api/bookings` | `/agenda` | — | P-01 (sin 422 por tope) |
| RN-21 | Rutas ADMIN | `/admin/*` | — | P-14 |
| RN-22 | `POST/PATCH /api/rooms` | `/admin/rooms` | — | P-16 |
| RN-23 | `POST /api/users` | `/admin/users` | — | P-16 |
| RN-25 | `POST /api/audit-logs/search` | `/admin/audit` | — | P-15 |
| RN-26 | `PATCH /api/users/:id` | `/admin/users` | — | P-10 |
