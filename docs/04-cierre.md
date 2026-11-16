# 04 · Reporte de cierre

> Reporte de cierre con la DoD marcada y su evidencia. Las horas salen de `docs/03-bitacora.md` y las salidas, de la
> verificación real de T11 (`docs/tareas/T11.md` §5).

> **Fecha de cierre:** 2026-11-16 02:31 · **Último commit antes de este reporte:** `208bad0` · **Ejecución del agente:**
> 4 h 32 min sumando inicio–fin de las 22 tareas (detalle en `03-bitacora.md`)

## 1. Definition of Done de la prueba
| # | Requisito | Estado | Evidencia |
|---|---|---|---|
| 1 | `docker compose up` levanta la base de datos, la API y el frontend desde un clon limpio, sin pasos manuales | ✅ | T11 (B-173): `git clone` en una carpeta nueva, sin `node_modules`, sin `.env` y tras `docker compose down -v`; imágenes construidas **sin caché**; `db`, `api` y `web` healthy, login visible en `http://localhost:8080`, seed idempotente tras dos reinicios (salida abajo) |
| 2 | Cada tarea del backlog tiene su documento en `/docs/tareas` | ✅ | 22 de 22 tareas ejecutadas, cada una con su revisión en §8 (tabla de §2). T10c no se ejecutó: recortada por decisión (D-34, B-170), declarada en §3 |
| 3 | El README explica cómo levantar el proyecto | ✅ | `README.md` § "Cómo levantar (instrucción única)": `docker compose up --build`, URL, credenciales del seed y pruebas; es la instrucción que se ejecutó en el clon limpio de T11 |

### Verificación desde un clon limpio (T11, 2026-11-16)
```bash
docker compose down -v
git clone . <carpeta nueva> && cd <carpeta nueva>
docker compose build --no-cache && docker compose up -d
docker compose ps
curl localhost:8080/api/health
docker compose restart api   # ×2, esperando healthy
docker compose exec -T db psql -U salalibre -d salalibre -c "SELECT (SELECT count(*) FROM users) AS usuarios, (SELECT count(*) FROM rooms) AS salas;"
npm --prefix src/api ci && npm --prefix src/api test
docker compose --profile test run --rm api-test
```
```
real	6m10.670s
SERVICE   STATUS                    PORTS
api       Up 20 seconds (healthy)   3000/tcp
db        Up 31 seconds (healthy)   5432/tcp
web       Up 15 seconds (healthy)   0.0.0.0:8080->8080/tcp, [::]:8080->8080/tcp

{"status":"ok"}

api-1  | No pending migrations to apply.
api-1  | {"msg":"seed aplicado","users":4,"rooms":5,"roomsCreated":false}
 usuarios | salas
----------+-------
        4 |     5

Test Suites: 14 passed, 14 total
Tests:       159 passed, 159 total

Test Suites: 7 passed, 7 total
Tests:       78 passed, 78 total
```
Flujo de humo (CA7 de T11): login de empleado1 → reservar (201) → aparece en Mis reservas → cancelar (200,
`CANCELLED`) → ADMIN crea una sala (201); un EMPLOYEE que intenta crear una sala recibe 403.

### Ensayo de reconstrucción (instrucción única del README)
| Campo | Resultado |
|---|---|
| Fecha / agente | <completar: fecha y hora reales (registrarlo también con `/bitacora`)> · Claude Code, sesión nueva sin contexto previo, sobre un clon con solo `docs/`, `CLAUDE.md` y `README.md` |
| ¿Reconstruyó solo? | Total: Sí |

## 2. Qué quedó
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
| 10 | T06 | Pruebas de integración: infraestructura `api-test`, choques, concurrencia y matriz RBAC | T05a, T05b | L | No | Hecha | [T06](tareas/T06.md) |
| 11 | T06a | Auditoría: `AuditService` transaccional en todas las escrituras + `POST /audit-logs/search` | T06 | M | **Sí** | Hecha | [T06a](tareas/T06a.md) |
| 12 | T07a | Sistema visual base (tokens, componentes de `shared/ui`) | T01 | M | No | Hecha | [T07a](tareas/T07a.md) |
| 13 | T07 | Frontend: `apiClient`, auth (login, logout, `/me`), layout y rutas protegidas por rol | T03, T07a | M | No | Hecha | [T07](tareas/T07.md) |
| 14 | T07b | Mi cuenta: cambio de contraseña | T03a, T07 | S | No | Hecha | [T07b](tareas/T07b.md) |
| 15 | T07c | Login: composición visual de la imagen y personajes animados | T07a, T07 | L | **Sí** | Hecha | [T07c](tareas/T07c.md) |
| 16 | T08 | Agenda del día: grilla salas × bloques de 15 min, selector de día, filtros, cierres | T05b, T07 | L | No | Hecha | [T08](tareas/T08.md) |
| 17 | T08a | Reservar desde la agenda: formulario modal y manejo del 409 | T08 | M | No | Hecha | [T08a](tareas/T08a.md) |
| 18 | T09 | Mis reservas + cancelar (propias y, para ADMIN, ajenas desde la agenda) | T08a | M | No | Hecha | [T09](tareas/T09.md) |
| 19 | T10 | Admin de salas | T04, T07 | M | No | Hecha | [T10](tareas/T10.md) |
| 20 | T10a | Admin de usuarios | T05a, T07 | M | No | Hecha | [T10a](tareas/T10a.md) |
| 21 | T10b | Admin de cierres | T05b, T07 | M | No | Hecha | [T10b](tareas/T10b.md) |
| 23 | T11 | README final y verificación desde un clon limpio | todas | S | No | Hecha | [T11](tareas/T11.md) |

**Pruebas que respaldan lo entregado** (nombres con la regla, `it('RN-xx · P-xx · …')`):
- Choques y concurrencia (RN-01, P-01 a P-04): `test/integration/bookings-conflicts.int-spec.ts`, 20 `POST` simultáneos al mismo hueco → 1 × 201 y 19 × 409.
- Reglas de reserva (RN-02 a RN-13, P-05 a P-09): `test/bookings-rules.spec.ts`, `test/bookings.spec.ts` y `test/integration/bookings-rules.int-spec.ts`.
- Desactivación y cierres con cancelación en cascada y carreras (RN-14 a RN-16, RN-24, P-10, P-11, R-01, R-02): `users-deactivation.int-spec.ts` y `closures.int-spec.ts`.
- Matriz de permisos (RN-21, P-14): `rbac.int-spec.ts`. Auditoría (D-05, RN-25, P-12, P-15): `audit.int-spec.ts`. Formato de error y request ID (D-06, P-17): `errors.int-spec.ts`.
- Seed idempotente (P-18): dos reinicios de `api` en el clon limpio (§1).

## 3. Qué no quedó (y por qué)
| Elemento | Motivo | Qué haría falta |
|---|---|---|
| Pantalla de auditoría (T10c, `/admin/audit`) | Falta de tiempo: la persona la recortó (D-34, B-170); era recortable. La auditoría sí se escribe en cada escritura y se consulta con `POST /api/audit-logs/search` (solo ADMIN); el enlace muestra un aviso de sección recortada (B-174) | `features/audit/` con filtros, tabla paginada y `useAuditSearch` sobre el endpoint existente (estimada M, ≤ 30 min, en el backlog) |
| Vista móvil | Fuera de alcance | Ajustar la grilla de disponibilidad a una columna por día |
| Reservas recurrentes y notificaciones | Fuera de alcance (D-22) | Implementar modelo de recurrencia y librería de notificaciones |
| Cancelar reservas futuras de una sala inactiva desde la UI | Pendiente de decisión: la agenda no muestra salas inactivas (D-14), así que esas reservas no se ven (T10) | Decidir la regla; por ejemplo, cancelarlas al desactivar la sala, como RN-15 con los usuarios |
| Impedir que un ADMIN se quite su propio rol | Pendiente de decisión: el spec solo prohíbe desactivarse (RN-26); la API y la pantalla lo permiten (T05a, T10a) | Agregar la regla al spec si se quiere y validarla en `UsersAdminService` |

## 4. Qué falló en mi plan
| # | Qué pasó | Impacto | Causa raíz | Ref. bitácora |
|---|---|---|---|---|
| 1 | Mi máquina tuvo un reinicio forzoso a mitad de T08a | Obligó al agente a analizar dónde se había quedado (código sin commit); T08a tomó 38 min, la única tarea que superó su estimación (M, ≤ 30 min) | Problemas con un disco local | B-140 · `docs/sesiones/2026-11-16-011140-T08-T09-fallasEnMaquinaReinicio.txt` |
| 2 | El verificador de permisos del modo automático dejó de dar veredicto varias veces seguidas durante la verificación de T10a | El agente se detuvo para no agotar el límite de intentos; se retomó en una pestaña nueva y algunos pasos con `curl` se hicieron desde la página | Falla transitoria del verificador del modo automático (externa al proyecto) | B-159 |
| 3 | En T05, 20 reservas simultáneas dieron 11 × 500 (`P2028`) en vez de 409 | Bloqueante hasta corregirlo; las pruebas con repositorios en memoria pasaban | Una lectura dentro de la transacción sin `ctx` usaba otra conexión del pool y lo agotaba; los dobles en memoria no detectan pool, locks ni concurrencia | B-74 |
| 4 | Un `PATCH` desde Git Bash con "SALA COPÁN" renombró una sala del seed a `SALA COP�N` | Dato del seed dañado durante la verificación de T04 | Git Bash en Windows no envía UTF-8; la API aceptaba cuerpos con bytes inválidos (desde entonces responde 400) | B-66 |
| 5 | Tres clics seguidos en "Reservar" mandaron 3 `POST` | Doble envío en el formulario de T08a | `handleSubmit` de React Hook Form valida de forma asíncrona e `isPending` aún era `false`; se resolvió con un candado síncrono | B-141 |
| 6 | En el clon limpio de T11 las pruebas unitarias fallaron en 9 de 14 suites | Se detectó recién en la última tarea | El cliente Prisma generado no se versiona y en la copia de trabajo ya existía; se agregó `pretest` | B-172 |
| 7 | Herramientas en Windows: un script de Python cortó un archivo por la codificación de stdin y un `git add -A` coló un `.bak` del editor en un commit | Commits corregidos después | Codificación de la consola en Windows y agregar archivos sin revisarlos; desde entonces se agrega por ruta | B-52, B-54 |

## 5. Qué cambiaría si lo hiciera de nuevo
> Propuesta del agente a partir de la bitácora; la persona la revisa y ajusta.

- Probar el clon limpio (build sin caché, pruebas unitarias e integración) desde T01 y repetirlo a mitad del proyecto, no solo en T11: el fallo de B-172 estuvo oculto desde T02.
- Exigir desde la primera escritura (T04/T05) un caso contra PostgreSQL real con ráfaga de peticiones simultáneas: los dobles en memoria no mostraron el agotamiento del pool (B-74).
- Fijar en `CLAUDE.md`, antes de la primera verificación manual, el entorno de la máquina (Git Bash sin UTF-8, `jq` no instalado, npm 12): varias fallas vinieron de ahí (B-52, B-66).
- Poner en los criterios de aceptación de cada formulario de UI el doble envío y la medición en anchos fijos (360 a 1920 px): se encontraron en la verificación y no en el diseño de la tarea (B-133, B-141, B-153).
- Hacer commits intermedios y exportar la sesión con más frecuencia para recuperarse de una falla de la máquina (B-140).
- Medir también el tiempo de revisión: la ejecución del agente sumó 4 h 32 min contra 12,75 h estimadas, pero la bitácora no muestra cuánto tomó revisar cada tarea.

## 6. Métricas
| Métrica | Valor |
|---|---|
| Tareas planificadas / terminadas | 23 / 22 (T10c recortada, D-34) |
| Tiempo de ejecución del agente | 4 h 32 min (suma de inicio–fin por tarea en la bitácora); estimado en el backlog: ≈ 12,75 h. Solo T08a superó su estimación (B-140) |
| Periodo | Planificación desde 2026-11-14 20:52 (B-01); ejecución de 2026-11-15 14:02 (inicio de T01) a 2026-11-16 02:20 (fin de T11) |
| Entradas de bitácora | 177 (B-01 a B-177): 82 AGENTE, 36 CORRECCIÓN, 26 REVISIÓN, 20 ERROR, 9 DECISIÓN, 3 MANUAL, 1 HITO |
| Decisiones registradas | 34 (D-01 a D-34) |
| Sesiones del agente exportadas | 10 (en `docs/sesiones/`) |
| Intervenciones manuales en código | 0 (§8 de los 22 documentos de tareas: "Código tocado a mano: No"). Las 3 entradas MANUAL son de diseño con Stitch y redacción del backlog (B-08, B-14, B-15) |
| Pruebas | Unitarias: 159 pasan / 0 fallan (14 suites). Integración contra PostgreSQL: 78 pasan / 0 fallan (7 suites). Una corrida intermitente con fallos no reproducida (B-172) |

## 7. Evidencias
- En la sección "Qué quedó" está referenciado el documento de cada tarea, con su verificación real (§5) y su revisión (§8).
- La bitácora (`docs/03-bitacora.md`) registra con hora real el inicio y el fin de cada tarea, los errores y las revisiones.
- Las decisiones están en `docs/00-decisiones.md` y lo aprendido en cada revisión quedó fijado en `CLAUDE.md`.
