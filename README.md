# SalaLibre

App interna para reservar las salas de reunión de la oficina (80 personas, 5 salas) sin choques de horario.
Cualquier persona ve la agenda del día y reserva un hueco libre; RRHH (rol `ADMIN`) administra salas, usuarios y
días cerrados. Corre **solo en local** con Docker Compose; no hay despliegue en la nube.

**Stack:** Node 24 LTS · NestJS · Prisma · PostgreSQL 16 · React 19 + Vite + Tailwind · TanStack Query · Jest ·
Docker Compose + nginx.

## Cómo levantar (instrucción única)

Requisito: Docker con Docker Compose v2 y el puerto **8080** libre. No hace falta `.env`, Node ni ningún paso previo:
todas las variables tienen valor por defecto en `docker-compose.yml`.

```bash
docker compose up --build
```

(o `docker compose up -d --build` para dejarlo en segundo plano). Cuando `docker compose ps` muestra `db`, `api` y
`web` como `healthy`, la app está en **http://localhost:8080**.

Qué pasa al arrancar, sin intervención:
1. `db` (PostgreSQL 16) arranca y queda sano.
2. `api` (NestJS) aplica las migraciones (`prisma migrate deploy`), ejecuta el seed (idempotente: no duplica datos
   al reiniciar) y arranca.
3. `web` (nginx) sirve el frontend y hace de proxy de `/api` hacia `api`. Es el único servicio con puerto publicado.

Para detenerlo: `docker compose down` (conserva los datos) o `docker compose down -v` (borra la base).

### Usuarios del seed
| Correo | Contraseña | Rol |
|---|---|---|
| `admin@salalibre.local` | `Admin12345` | `ADMIN` (RRHH) |
| `empleado1@salalibre.local` | `Empleado12345` | `EMPLOYEE` |
| `empleado2@salalibre.local` | `Empleado12345` | `EMPLOYEE` |
| `empleado3@salalibre.local` | `Empleado12345` | `EMPLOYEE` |

El seed crea además 5 salas activas (Copán, Roatán, Lempira, Morazán y Pico Bonito). Son contraseñas y un
`JWT_SECRET` **solo de desarrollo**; se cambian con variables de entorno (`SEED_ADMIN_PASSWORD`,
`SEED_USER_PASSWORD`, `JWT_SECRET`) al ejecutar `docker compose`.

## Qué hace
| Pantalla | Ruta | Rol |
|---|---|---|
| Login | `/login` | Público |
| Agenda del día (salas × bloques de 15 min, filtros, reservar, detalle y cancelar) | `/agenda` | Todos |
| Mis reservas (y cancelar) | `/my-bookings` | Todos |
| Mi cuenta (cambio de contraseña) | `/account` | Todos |
| Salas | `/admin/rooms` | ADMIN |
| Usuarios (alta, edición, desactivar, restablecer contraseña) | `/admin/users` | ADMIN |
| Días cerrados | `/admin/closures` | ADMIN |

Las reglas de negocio (horario 07:00–20:00 de lunes a viernes en `America/Tegucigalpa`, bloques de 15 min,
hasta 4 h, hasta 30 días de anticipación, sin choques ni con concurrencia) están en `docs/01-spec.md` §5.

**Recortado:** la pantalla de auditoría (`/admin/audit`, tarea T10c) no se construyó (D-34); el enlace muestra una
página de marcador. La auditoría sí se registra en cada escritura y un ADMIN la consulta por la API con
`POST /api/audit-logs/search`.

## Pruebas
| Qué | Comando | Requisitos |
|---|---|---|
| Unitarias (sin base de datos) | `npm --prefix src/api ci` y luego `npm --prefix src/api test` (genera antes el cliente Prisma, que no se versiona) | Node 24 en la máquina |
| Integración contra PostgreSQL real | `docker compose --profile test run --rm api-test` | Solo Docker; usa su propia base `salalibre_test` y la recrea en cada corrida (la de la app no se toca) |
| Lint | `npm --prefix src/api run lint` y `npm --prefix src/web run lint` (tras `npm --prefix src/web ci`) | Node 24 |

`docker compose up` no arranca `api-test`; solo corre con `--profile test`.

## Mapa del repositorio
```
docker-compose.yml        servicios db, api, web (y api-test con --profile test)
src/api/                  API NestJS + Prisma (migraciones, seed, pruebas en test/)
src/web/                  Frontend React (features/ por dominio + shared/), servido por nginx
CLAUDE.md                 reglas para el agente: arquitectura, seguridad y decisiones técnicas fijadas por tarea
.claude/                  comandos y skills del agente (/ejecutar-tarea, /bitacora, spec, spec-impl)
docs/
  00-decisiones.md        por qué de cada decisión (D-01 … D-34)
  01-spec.md              qué hace el sistema: reglas, permisos, datos, API, pantallas y pruebas (manda ante contradicciones)
  02-backlog.md           tareas en orden de ejecución, con DoR, DoD, criterios de aceptación y verificación
  03-bitacora.md          registro con hora real de todo lo que pasó (agente y persona)
  tareas/Txx.md           lo que hizo el agente en cada tarea, con la salida real de su verificación y la revisión
  diseño/                 guía visual (DESIGN.md) y prototipos de Stitch
  sesiones/               sesiones exportadas del agente
```

## Cómo se trabajó con el agente
Todo el código lo escribió un agente (Claude Code); la persona decidió, planificó y revisó.

1. **Spec y decisiones:** con la skill `spec`, el agente preguntó y redactó `docs/01-spec.md`; cada respuesta de la
   persona quedó como decisión `D-xx` en `docs/00-decisiones.md`.
2. **Backlog:** `docs/02-backlog.md` divide el trabajo en tareas S/M/L con criterios Dado/Cuando/Entonces y comandos
   de verificación exactos. Una tarea solo empieza si cumple la DoR y sus dependencias están Hechas.
3. **Ejecución:** cada tarea se ejecutó con `/ejecutar-tarea Txx` (`.claude/commands/ejecutar-tarea.md`): fila de
   inicio en la bitácora, plan, código, verificación real (pruebas, lint, `docker compose up`), `docs/tareas/Txx.md`
   con la salida, fila de fin y commit `Txx: <título>`. El agente se detiene al final de cada tarea.
4. **Revisión:** la persona revisa cada tarea (sección 8 de `docs/tareas/Txx.md`), la registra con `/bitacora` y la
   pasa a Hecha. Lo aprendido en la revisión se fija en `CLAUDE.md` para las tareas siguientes.

### Reconstruir el proyecto desde cero con un agente
Con un repositorio que tenga solo `CLAUDE.md`, `.claude/`, `docs/` y este README, abrir Claude Code en la raíz y
ejecutar las tareas en el orden de `docs/02-backlog.md`, una por una:

```
/ejecutar-tarea T01
/ejecutar-tarea T02
…  (el orden y el estado de cada tarea están en la tabla "Resumen" del backlog)
```

Al terminar, `docker compose up --build` levanta todo como se describe arriba.
