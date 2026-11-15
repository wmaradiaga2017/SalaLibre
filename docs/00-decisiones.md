# 00 · Decisiones

SalaLibre es una app interna de reservas de salas de reunión (80 personas, 5 salas, RRHH administra) que corre solo en local con `docker compose up`.
Principio rector: las decisiones las toma la persona; el agente las redacta con sus palabras y no inventa reglas.

## Índice
| ID | Tema |
|----|------|
| D-01 | Stack técnico |
| D-02 | Ejecución local con un solo `docker compose up` |
| D-03 | Sesión con JWT en cookie httpOnly |
| D-04 | Anti-choques garantizado en la base de datos |
| D-05 | Auditoría solo de inserción |
| D-06 | Formato de error único y códigos HTTP |
| D-07 | Fechas en UTC y zona de negocio `BUSINESS_TZ` |
| D-08 | Alta de usuarios: seed + ADMIN |
| D-09 | Horario reservable L–V 07:00–20:00 |
| D-10 | Duración en bloques de 15 min, de 15 min a 4 h |
| D-11 | Anticipación máxima de 30 días |
| D-12 | Cancelación por el dueño antes del inicio, sin edición |
| D-13 | ADMIN ve todas las reservas y cancela cualquiera |
| D-14 | Gestión de salas por ADMIN con desactivación |
| D-15 | Sin tope de reservas por persona |
| D-16 | Usuario desactivado: sin acceso y reservas futuras canceladas |
| D-17 | Reserva con título y asistentes ≤ capacidad |
| D-18 | Pantalla principal: agenda diaria salas × horas |
| D-19 | Contraseñas: ADMIN fija la inicial, el usuario la cambia; JWT 8 h |
| D-20 | Privacidad: reservas ajenas como "Ocupado" + nombre |
| D-21 | `BUSINESS_TZ` por defecto `America/Tegucigalpa` |
| D-22 | Fuera del MVP: recurrencias y notificaciones |
| D-23 | Días cerrados globales que cancelan reservas existentes |
| D-24 | Auditoría: `POST /audit-logs/search` paginada en BD con filtros en el body |
| D-25 | Equipamiento de lista fija y filtro en la agenda |
| D-26 | Seed: 1 ADMIN + 3 EMPLOYEE + 5 salas; ADMIN también reserva |
| D-27 | DoR definida por mí (el enunciado no la define) y DoD |
| D-28 | Diseño visual de SalaLibre |
| D-29 | Código en `src/api` y `src/web` |
| D-30 | Login con "Iniciar sesión" y personajes animados |
| D-31 | Eliminar un cierre de hoy o pasado: 422 `CLOSURE_IN_PAST` |
| D-32 | Orden de validación de los errores |

---

## D-01 · Stack técnico
- **Duda:** ¿Con qué tecnologías se construye?
- **Opciones:** Decisión cerrada en `CLAUDE.md`; no se abrieron alternativas.
- **Decisión:** "Node 24 LTS · NestJS · Prisma · PostgreSQL 16 · React 19 + Vite + Tailwind · TanStack Query · Jest · Docker Compose + nginx." Contraseñas con bcryptjs. Formularios con React Hook Form + Zod.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** Cualquier dependencia fuera de esta lista debe registrarse con su motivo en el documento de la tarea.
- **Afecta a:** spec §10, §11

## D-02 · Ejecución local con un solo `docker compose up`
- **Duda:** ¿Dónde y cómo corre la app?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** "Corre solo en local con `docker compose up`; no hay despliegue en la nube." "Nada de pasos manuales." Solo se publica el puerto 8080 (nginx). `api` ejecuta `prisma migrate deploy` → seed → arranque.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** Sin HTTPS en local; la cookie no lleva `Secure` obligatorio en este entorno.
- **Afecta a:** spec §10

## D-03 · Sesión con JWT en cookie httpOnly
- **Duda:** ¿Cómo se mantiene la sesión?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** "JWT en la cookie `access_token` con `httpOnly`, `SameSite=Strict` y `Path=/api`. El frontend nunca maneja tokens; usa `credentials: 'include'` y `GET /auth/me`." `JwtAuthGuard` global; solo `POST /auth/login` y `GET /health` son públicos.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** —
- **Afecta a:** spec §8, §11

## D-04 · Anti-choques garantizado en la base de datos
- **Duda:** ¿Qué impide que dos reservas de la misma sala se solapen si se crean a la vez?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** Restricción `EXCLUDE USING gist` en una migración SQL propia. El código `23P01` se traduce a 409 `BOOKING_CONFLICT`. La migración nunca se elimina, regenera ni reemplaza por código.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** Requiere la extensión `btree_gist`.
- **Afecta a:** spec §7, §11, §12

## D-05 · Auditoría solo de inserción
- **Duda:** ¿Cómo se registra quién hizo qué?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** "`audit_logs` solo recibe filas nuevas", protegida por un trigger de inmutabilidad en migración SQL propia. Las escrituras usan `TransactionRunner.run(ctx => …)` e incluyen la auditoría en la misma transacción. Cada fila lleva el request ID.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** —
- **Afecta a:** spec §7, §10

## D-06 · Formato de error único y códigos HTTP
- **Duda:** ¿Cómo responde la API cuando algo falla?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** `{ error: { code, message, requestId } }`. 400 formato · 401 sin sesión · 403 sin permiso · 404 no existe · 409 conflicto · 422 regla de negocio. Sin stack traces.
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** —
- **Afecta a:** spec §8

## D-07 · Fechas en UTC y zona de negocio `BUSINESS_TZ`
- **Duda:** ¿En qué zona se guardan y validan las fechas?
- **Opciones:** Decisión cerrada en `CLAUDE.md`.
- **Decisión:** "Las fechas se guardan en UTC (`timestamptz`). La zona del negocio es `BUSINESS_TZ`."
- **Por qué:** Fijado por la persona en `CLAUDE.md`.
- **Costo/riesgo:** —
- **Afecta a:** spec §7, RN de horario

## D-08 · Alta de usuarios: seed + ADMIN
- **Duda:** ¿Cómo se crean las cuentas de las 80 personas en el MVP?
- **Opciones:** A) Seed + ADMIN crea. B) Solo seed. C) Autorregistro.
- **Decisión:** A) "El seed crea un ADMIN y usuarios de ejemplo. RRHH (ADMIN) da de alta y desactiva cuentas desde la app. Sin autorregistro."
- **Por qué:** Aceptó la recomendación: "es una app interna".
- **Costo/riesgo:** Agrega pantalla y endpoints de gestión de usuarios.
- **Afecta a:** spec §3, §4, §8, §9

## D-09 · Horario reservable L–V 07:00–20:00
- **Duda:** ¿En qué franja se puede reservar una sala (en `BUSINESS_TZ`)?
- **Opciones:** A) L–V 08:00–18:00. B) L–V 07:00–20:00. C) Cualquier día y hora.
- **Decisión:** B) L–V 07:00–20:00.
- **Por qué:** "Franja amplia para reuniones tempranas o tardías."
- **Costo/riesgo:** —
- **Afecta a:** spec §5

## D-10 · Duración en bloques de 15 min, de 15 min a 4 h
- **Duda:** ¿Qué límites tiene una reserva?
- **Opciones:** A) Bloques 15 min, 15 min–4 h. B) Bloques 30 min, 30 min–2 h. C) Libre, máx 8 h.
- **Decisión:** A) "Inicio y fin múltiplos de 15 min; mínimo 15 min, máximo 4 h."
- **Por qué:** Aceptó la recomendación: "Evita reservas de día completo que bloqueen salas."
- **Costo/riesgo:** —
- **Afecta a:** spec §5

## D-11 · Anticipación máxima de 30 días
- **Duda:** ¿Con cuánto tiempo hacia adelante se puede reservar?
- **Opciones:** A) 30 días. B) 14 días. C) 90 días.
- **Decisión:** A) Hasta 30 días. "No se permiten reservas en el pasado."
- **Por qué:** Aceptó la recomendación: "Evita acaparar salas meses antes."
- **Costo/riesgo:** —
- **Afecta a:** spec §5

## D-12 · Cancelación por el dueño antes del inicio, sin edición
- **Duda:** ¿Qué puede hacer el dueño (EMPLOYEE) con su propia reserva?
- **Opciones:** A) Cancelar antes de empezar, sin editar. B) Cancelar y editar antes de empezar. C) Cancelar también durante la reunión.
- **Decisión:** A) "El dueño cancela hasta la hora de inicio. Para cambiar horario, cancela y crea otra. La reserva queda con estado CANCELLED (no se borra)."
- **Por qué:** Aceptó la recomendación: "para conservar historial".
- **Costo/riesgo:** Mover una reserva exige dos pasos y puede perder el hueco entre ambos.
- **Afecta a:** spec §5, §7, §8

## D-13 · ADMIN ve todas las reservas y cancela cualquiera
- **Duda:** ¿Qué puede hacer RRHH (ADMIN) con reservas ajenas?
- **Opciones:** A) Ver todas y cancelar cualquiera. B) Lo anterior + reservar a nombre de otro. C) Solo administra salas y usuarios.
- **Decisión:** A) "ADMIN ve todas las reservas y puede cancelar cualquiera futura; queda auditado quién canceló. No crea reservas a nombre de otros."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** —
- **Afecta a:** spec §3, §5, `BookingPolicy`

## D-14 · Gestión de salas por ADMIN con desactivación
- **Duda:** ¿Qué se puede hacer con las 5 salas en el MVP?
- **Opciones:** A) ADMIN crea, edita y desactiva. B) Solo seed. C) ADMIN crea/edita y desactivar cancela futuras.
- **Decisión:** A) "Campos: nombre, capacidad, ubicación. Desactivar (no borrar) impide nuevas reservas; las futuras existentes se mantienen. El seed crea las 5."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Una sala desactivada puede conservar reservas futuras que RRHH debe cancelar a mano si hace falta.
- **Afecta a:** spec §5, §7, §8, §9

## D-15 · Sin tope de reservas por persona
- **Duda:** ¿Cuántas reservas activas puede tener un EMPLOYEE?
- **Opciones:** A) Sin tope. B) Máximo 5 activas. C) Máximo 1 por día.
- **Decisión:** A) Sin tope.
- **Por qué:** Aceptó la recomendación: "Ya limitan la anticipación de 30 días y la duración de 4 h; menos reglas para 80 personas."
- **Costo/riesgo:** Una persona podría acaparar salas dentro de la ventana de 30 días.
- **Revisar si:** RRHH detecta acaparamiento.
- **Afecta a:** spec §4, §5

## D-16 · Usuario desactivado: sin acceso y reservas futuras canceladas
- **Duda:** ¿Qué pasa con la sesión y las reservas futuras de un usuario que RRHH desactiva?
- **Opciones:** A) No entra; reservas se cancelan. B) No entra; reservas se mantienen.
- **Decisión:** A) "Login devuelve 401 y cualquier request con su cookie también. Sus reservas futuras pasan a CANCELLED en la misma transacción, auditadas."
- **Por qué:** Aceptó la recomendación: "Libera salas de quien ya no está."
- **Costo/riesgo:** La desactivación no es reversible respecto a las reservas canceladas.
- **Afecta a:** spec §5, §6, §8

## D-17 · Reserva con título y asistentes ≤ capacidad
- **Duda:** ¿Qué captura el formulario además de sala, inicio y fin?
- **Opciones:** A) Título obligatorio + asistentes ≤ capacidad. B) Solo título. C) Nada más.
- **Decisión:** A) "title (1–100 caracteres) y attendees (entero ≥ 1). Si attendees > capacidad de la sala → 422."
- **Por qué:** Aceptó la recomendación: "Ayuda a elegir sala adecuada."
- **Costo/riesgo:** —
- **Afecta a:** spec §5, §7, §8

## D-18 · Pantalla principal: agenda diaria salas × horas
- **Duda:** ¿Qué ve el usuario tras el login?
- **Opciones:** A) Agenda diaria salas × horas. B) Lista de salas + formulario. C) Solo "Mis reservas".
- **Decisión:** A) "Selector de día; columnas = salas activas, filas = bloques de 15 min de 07:00 a 20:00. Huecos libres clicables para reservar. Más 'Mis reservas' en otra ruta."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Pantalla más compleja en móvil.
- **Afecta a:** spec §8, §9

## D-19 · Contraseñas: ADMIN fija la inicial, el usuario la cambia; JWT 8 h
- **Duda:** ¿Cómo se gestionan contraseñas y sesión?
- **Opciones:** A) ADMIN fija la inicial; usuario la cambia; JWT 8 h. B) Solo ADMIN fija/restablece. C) Recuperación por correo.
- **Decisión:** A) "RRHH asigna contraseña al crear/restablecer. El usuario puede cambiarla (actual + nueva, mín 8 caracteres). Sesión de 8 h sin refresh. Sin recuperación por correo."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Un JWT emitido sigue siendo válido hasta 8 h tras un cambio de contraseña, salvo que se verifique el estado del usuario en cada request.
- **Afecta a:** spec §5, §8, §9, §11

## D-20 · Privacidad: reservas ajenas como "Ocupado" + nombre
- **Duda:** ¿Qué ve un EMPLOYEE de las reservas de otras personas?
- **Opciones:** A) Título + nombre del dueño. B) Solo "Ocupado" + nombre. C) Solo "Ocupado".
- **Decisión:** B) El EMPLOYEE ve "Ocupado" y el nombre del dueño; la API omite `title` en reservas ajenas. El ADMIN sí recibe el título.
- **Por qué:** "Reuniones confidenciales." El ADMIN lo ve "para poder decidir cancelaciones".
- **Costo/riesgo:** Si el frontend recibe el título por error se filtra; por eso se omite en la API, no en la UI.
- **Afecta a:** spec §5, §8, §9

## D-21 · `BUSINESS_TZ` por defecto `America/Tegucigalpa`
- **Duda:** ¿Qué valor por defecto tiene `BUSINESS_TZ`?
- **Opciones:** A) America/Tegucigalpa. B) America/Mexico_City. C) America/Bogota. D) Europe/Madrid.
- **Decisión:** A) `America/Tegucigalpa`.
- **Por qué:** "La oficina está en Honduras."
- **Costo/riesgo:** —
- **Afecta a:** spec §5, §10

## D-22 · Fuera del MVP: recurrencias y notificaciones
- **Duda:** ¿Qué se difiere a v2?
- **Opciones:** Recurrencias y notificaciones · Feriados y cierres · Pantalla de auditoría · Equipamiento y filtros.
- **Decisión:** Solo "Recurrencias y notificaciones" quedan fuera. Feriados, pantalla de auditoría y equipamiento con filtros quedan dentro (ver D-23, D-24, D-25).
- **Por qué:** Elección de la persona.
- **Costo/riesgo:** El MVP crece en tres funciones de administración.
- **Afecta a:** spec §2, §4

## D-23 · Días cerrados globales que cancelan reservas existentes
- **Duda:** ¿Cómo funcionan feriados y cierres?
- **Opciones:** A) ADMIN registra días cerrados globales y se cancelan las reservas de ese día. B) Días cerrados; reservas existentes se mantienen. C) Fuera.
- **Decisión:** A) "Tabla closures (date, reason). Ese día nadie reserva ninguna sala (422 DAY_CLOSED). Crear un cierre con reservas existentes las cancela, auditado."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Carrera entre crear un cierre y crear una reserva del mismo día; se mitiga en spec §11.
- **Afecta a:** spec §5, §7, §8, §9

## D-24 · Auditoría: `POST /audit-logs/search` paginada en BD con filtros en el body
- **Duda:** ¿Qué muestra la pantalla de auditoría y cómo se pide?
- **Opciones:** A) Lista paginada con filtros por GET. B) Últimas 100 sin filtros. C) Fuera. (Seguimiento: body con pageSize, body con page fijo, cursor.)
- **Decisión:** "Lista paginada pero no muestres información por GET en la URL, carga la lista paginada y dejemos desde el backend un servicio que nos brinde esa información y configura la paginación desde backend con bd." Se concreta como `POST /audit-logs/search` con body `{ page, pageSize, from, to, action }`; el backend hace COUNT + LIMIT/OFFSET ordenado por `createdAt` desc y responde `{ items, page, pageSize, total }`. `pageSize` por defecto 20, máximo 100. Solo ADMIN.
- **Por qué:** La persona no quiere los datos de consulta en la URL y quiere la paginación resuelta en el backend contra la base de datos.
- **Costo/riesgo:** Es una lectura vía POST; se documenta como excepción a REST.
- **Afecta a:** spec §8, §9

## D-25 · Equipamiento de lista fija y filtro en la agenda
- **Duda:** ¿Cómo se modelan el equipamiento y los filtros?
- **Opciones:** A) Lista fija de equipos + filtro en agenda. B) Texto libre sin filtro. C) Fuera.
- **Decisión:** A) "Sala con equipment: subconjunto de PROJECTOR, VIDEOCONF, WHITEBOARD, TV. La agenda filtra columnas por capacidad mínima y equipos requeridos."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Agregar un equipo nuevo requiere migración.
- **Afecta a:** spec §7, §8, §9

## D-26 · Seed: 1 ADMIN + 3 EMPLOYEE + 5 salas; ADMIN también reserva
- **Duda:** ¿Qué datos de ejemplo crea el seed y puede ADMIN reservar?
- **Opciones:** A) 1 ADMIN + 3 EMPLOYEE. B) Lo anterior + reservas de ejemplo. C) Solo 1 ADMIN + 5 salas.
- **Decisión:** A) "admin@salalibre.local y empleado1..3@salalibre.local; contraseñas por env con default (SEED_ADMIN_PASSWORD, SEED_USER_PASSWORD). 5 salas. ADMIN también reserva para sí con las mismas RN."
- **Por qué:** Aceptó la recomendación.
- **Costo/riesgo:** Contraseñas por defecto conocidas; aceptable porque solo corre en local.
- **Afecta a:** spec §3, §10

## D-28 · Diseño visual de SalaLibre
- **Duda:** ¿Qué papel tiene el diseño hecho en Stitch (`docs/diseño/DESIGN.md`) frente al spec?
- **Opciones:** —
- **Decisión:** "DESIGN.md solo guía visual; el spec manda." DESIGN.md define colores, tipografía, formas y componentes base. En funcionalidad (pantallas, estados, permisos, flujos) manda `docs/01-spec.md`; lo que muestre el diseño y el spec no contemple no se implementa.
- **Por qué:** Elección de la persona.
- **Costo/riesgo:** —
- **Afecta a:** CLAUDE.md (Documentos, Frontend), `docs/diseño/DESIGN.md`, spec §9

## D-29 · Código en `src/api` y `src/web`
- **Duda:** ¿Dónde vive el código del backend y del frontend dentro del repositorio?
- **Opciones:** A) `api/` y `web/` en la raíz (estructura original del spec §10). B) `src/api` y `src/web`.
- **Decisión:** B) "src/api, src/web". El backend vive en `src/api/` y el frontend en `src/web/`; `docker-compose.yml` y `.gitattributes` quedan en la raíz.
- **Por qué:** Regla de la persona en `CLAUDE.md` (Ubicación de código): frontend y backend en carpetas separadas dentro de `src/`.
- **Costo/riesgo:** —
- **Afecta a:** spec §7 (rutas de las migraciones SQL propias), §10 (servicios y estructura de carpetas), `docs/02-backlog.md` (rutas y comandos de todas las tareas), CLAUDE.md

## D-30 · Login con "Iniciar sesión" y personajes animados
- **Duda:** ¿La pantalla de login sigue el spec §9 original (botón "Entrar", sin personajes) o el prototipo de Stitch?
- **Opciones:** A) Spec original: correo, contraseña y botón "Entrar". B) Prototipo `docs/diseño/stitch/login`: botón "Iniciar sesión" y personajes animados.
- **Decisión:** B) "Usa Iniciar sesión y personajes en T07c, actualiza el spec §9." Los personajes son SVG y CSS propios, reaccionan al foco, a la contraseña visible y al resultado del envío, y nunca reciben el valor de la contraseña. "¿Olvidaste tu contraseña?" solo muestra un aviso (D-19). Sin "Recordarme", acceso con Google ni registro (D-08).
- **Por qué:** Elección de la persona.
- **Costo/riesgo:** T07c es L. Es recortable: si se recorta, queda el login funcional de T07 con "Iniciar sesión" y sin personajes.
- **Afecta a:** spec §9 (Login), `docs/02-backlog.md` (T07, T07c)

## D-31 · Eliminar un cierre de hoy o pasado: 422 `CLOSURE_IN_PAST`
- **Duda:** ¿Qué responde `DELETE /api/closures/:id` si el cierre es de hoy o de una fecha pasada? El spec solo decía que se eliminan cierres con `date` > hoy.
- **Opciones:** —
- **Decisión:** "Usa 422 CLOSURE_IN_PAST." Es el mismo código que al crear un cierre de hoy o pasado (RN-24).
- **Por qué:** Elección de la persona.
- **Costo/riesgo:** —
- **Afecta a:** spec §5 (RN-24), §8 (`DELETE /api/closures/:id`), §12 (P-11), `docs/02-backlog.md` (T05b)

## D-32 · Orden de validación de los errores
- **Duda:** Cuando una petición incumple varias reglas a la vez, ¿qué error responde? El spec no fijaba el orden de los 422.
- **Opciones:** —
- **Decisión:** La persona delegó la definición al agente ("define tú el orden de los 422"). Se responde el primer error en este orden: 401 → 403 → 400 → 404 → reglas de negocio. En `POST /api/bookings`: `INVALID_SLOT` → `INVALID_DURATION` → `OUTSIDE_BUSINESS_HOURS` → `BOOKING_IN_PAST` → `TOO_FAR_AHEAD` → `ROOM_INACTIVE` → `CAPACITY_EXCEEDED` → `DAY_CLOSED` → 409 `BOOKING_CONFLICT`. Al cancelar: 404 → 403 → `BOOKING_ALREADY_CANCELLED` → `BOOKING_ALREADY_STARTED`. El detalle por operación está en spec §8 «Orden de validación».
- **Por qué:** Propuesta del agente. Primero lo que no necesita la base (forma y tiempo, en el orden de las RN), luego lo que necesita leer la sala, y al final lo que depende de la transacción con lock (cierres y choque), para no abrir transacciones con peticiones ya inválidas. Al cancelar, "ya cancelada" es más informativo que "ya empezó".
- **Costo/riesgo:** Fija un contrato: cambiar el orden después cambia qué error ve el usuario y obliga a tocar pruebas.
- **Afecta a:** spec §8 (Orden de validación), `docs/02-backlog.md` (T05: CA16 y notas)

## D-27 · DoR definida por mí (el enunciado no la define) y DoD
- **Duda:** ¿Qué conjunto de criterios debe tener una historia de usuario o elemento del backlog antes de comenzar a trabajar?
- **Opciones:** A) Cumple MVP, Funcionalidad, Seguridad y logica de aplicacion B) Solo MVP.
- **Decisión:** A) "Debe cumplir con el MVP, cada funcionalidad con cobertura de preubas unitarias, validacion de seguridad cubriendo las principas fallas de seguridad OWASP Top 10 y debe cumplir con cada RN."
- **Por qué:** Metodologia de trabajo propia.
- **Costo/riesgo:** Se pueden empezar y finalizar tareas incompletas, con fallas o riesgos de seguridad
- **Afecta a:** spec §4 (alcance del MVP), §5 (reglas de negocio RN), §11 (requisitos no funcionales: seguridad), §12 (estrategia de pruebas), §14 (trazabilidad regla → prueba); `docs/02-backlog.md` (DoR y DoD)