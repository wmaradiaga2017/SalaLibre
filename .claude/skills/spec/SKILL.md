---
name: spec
description: Diseña el spec del producto (docs/01-spec.md) preguntando antes de escribir y registra cada respuesta del humano como decisión en docs/00-decisiones.md. Úsalo antes de planificar el backlog o al revisar una sección del spec.
disable-model-invocation: true
argument-hint: 'descripción corta del producto, o "revisar <sección>"'
allowed-tools: Read, Glob, Grep, Write, Edit, AskUserQuestion, Bash(ls:*), Bash(cat:*), Bash(date:*), Bash(TZ=America/Tegucigalpa date:*)
---

# /spec — Diseñador guiado del spec

## Contexto de la sesión

Fecha y hora actuales (úsalas para el encabezado del spec y la bitácora; nunca las inventes):
!`TZ=America/Tegucigalpa date '+%Y-%m-%d %H:%M'`

Archivos de /docs que ya existen:
!`ls docs/ 2>/dev/null || echo "La carpeta docs/ no existe todavía"`

---

Esta skill produce **/docs/01-spec.md** y mantiene **/docs/00-decisiones.md**, dos de los documentos que evalúa la prueba. **No escribes código aquí.** Tu trabajo es detectar ambigüedades, preguntar, y dejar por escrito lo que el humano decide.

## Principio

Las decisiones son del humano; tú redactas. Un spec vago hace que el agente que construya después improvise, así que la fase de definición es deliberadamente lenta y la de escritura es rápida. Lee `template.md` (en la misma carpeta que esta skill): es la forma que debe respetar el spec.

Responde en el mismo idioma del prompt inicial (normalmente español).

## Flujo

Sigue las fases en orden. **Nunca te saltes la Fase 2.**

### Fase 1 — Entender el contexto

1. Lee el archivo de memoria del proyecto: `CLAUDE.md`, si no existe `AGENTS.md`, si no `README.md`.
2. Si existen, lee `docs/00-decisiones.md` y `docs/01-spec.md` completos: son la fuente de verdad. Respeta los IDs existentes (`D-xx`, `RN-xx`) y el idioma.
3. Modo de trabajo:
   - **Crear:** `docs/01-spec.md` no existe → flujo completo.
   - **Revisar:** ya existe → no lo sobrescribas. Pregunta qué sección cambiar (o toma `$ARGUMENTS`), propón el cambio, y edítalo solo tras confirmación.
4. Si `$ARGUMENTS` viene vacío en modo Crear, pide una descripción del producto **en una sola frase**. Si no cabe en una frase, el alcance es demasiado grande: propón recortarlo antes de seguir.

### Fase 2 — Aclarar con preguntas

Esta es la fase más importante. **Detecta ambigüedades y pregunta; no asumas.** El enunciado de la prueba no admite preguntas al cliente: cada duda la resuelve el humano contigo.

Haz bloques de 3 a 5 preguntas y espera respuesta antes del siguiente bloque.

**Categorías a considerar siempre:**
- **Alcance:** qué entra, qué NO entra, qué se difiere.
- **Roles y permisos:** quién puede qué, y qué NO puede.
- **Reglas de negocio:** límites, horarios, plazos, topes; cada una debe poder verificarse con sí/no.
- **Datos:** entidades, campos, tipos, restricciones, borrado (lógico/físico), zonas horarias.
- **Concurrencia e integridad:** qué pasa si dos personas hacen lo mismo a la vez; qué lo garantiza.
- **API y pantallas:** rutas, errores, estados vacío/cargando/error.
- **Arquitectura y entorno:** stack, base de datos, un solo `docker compose up`, datos de ejemplo.
- **Riesgos y supuestos:** qué puede fallar y qué se acepta.
- **Decisiones cerradas:** lo que el humano ya decidió y no quiere reabrir.

**Cómo formular:**
- Preguntas concretas, no abiertas. ❌ "¿Cómo ves la cancelación?" → ✅ "¿El dueño puede cancelar hasta que empiece la reserva o también durante?"
- Ofrece 2–4 opciones, marca tu recomendación primera y di por qué.
- Si el agente tiene una herramienta de opción múltiple (`AskUserQuestion` en Claude Code), úsala; si no, lista numerada.
- Si una respuesta abre otra caja (p. ej. "y también recurrencias"), señala que merece otra versión y pregunta si queda fuera del MVP.

**Registrar las respuestas como decisiones (obligatorio):**
Después de cada bloque respondido, agrega a `docs/00-decisiones.md` una entrada por cada decisión **con las palabras del humano**; no añadas justificaciones que él no dio. Si el archivo no existe, créalo con el encabezado y el índice. Plantilla:

```markdown
## D-xx · Título corto
- **Duda:** ...
- **Opciones:** A) ... B) ... C) ...
- **Decisión:** ...
- **Por qué:** ... (lo que dijo el humano)
- **Costo/riesgo:** ...
- **Revisar si:** ... (opcional)
- **Afecta a:** spec §x, RN-xx
```
Reglas: usa el siguiente ID libre (consecutivo), añade la fila al índice del inicio, nunca borres decisiones (si una cambia, márcala `Reemplazada por D-yy`). Si el humano no da el porqué, pregúntalo.

**Cuándo dejar de preguntar:** cuando puedas responder estas tres sin asumir nada:
1. ¿Cada regla de negocio es verificable con sí/no?
2. ¿El modelo de datos y el contrato de la API tienen nombres exactos de campos, rutas y errores?
3. ¿Cómo se verifica que el producto está terminado (empezando por `docker compose up` desde un clon limpio)?

Si alguna no se puede responder, sigue preguntando.

### Fase 3 — Escribir el spec

**Si ya tienes toda la información** (las tres preguntas respondidas sin asumir), escribe el spec completo y pasa a la Fase 4. No pidas confirmación sección por sección ni muestres un borrador previo; el humano revisa el archivo guardado.

**Solo si falta información** (respuesta vaga, Fase 2 recortada), desarrolla las secciones una por una, muéstralas y espera confirmación antes de seguir.

El contenido sigue el orden de `template.md`:
1. Contexto y problema
2. Objetivos y no-objetivos
3. Usuarios y roles
4. Alcance del MVP (dentro / fuera, con motivo)
5. Reglas de negocio (`RN-xx`, cada una con su `D-xx`)
6. Flujos principales
7. Modelo de datos
8. Contrato de la API
9. Pantallas
10. Arquitectura
11. Requisitos no funcionales
12. Estrategia de pruebas
13. Riesgos y supuestos
14. Trazabilidad (regla → endpoint → pantalla → tarea → prueba)

**Errores a evitar:**
- Reglas no verificables ("que funcione bien", "duración razonable").
- Mencionar en la arquitectura o la trazabilidad algo que no está en el alcance.
- Inventar nombres de archivos, campos o rutas que el humano no confirmó.
- Contradecir una decisión de `00-decisiones.md`.
- Dejar TODOs: o se decide, o se registra como supuesto con su motivo.

### Fase 4 — Guardar

1. Escribe `docs/01-spec.md` directamente; **no pidas permiso ni confirmes el nombre**. Solo pregunta si vas a sobrescribir un archivo existente (modo Revisar: edita secciones, no reemplaces el archivo).
2. Encabezado con la fecha leída del contexto de la sesión (nunca una fecha que no leíste ahí) y estado `Borrador`. **Nunca lo marques `Aprobado`**: lo hace el humano tras releerlo.
3. Comprueba que cada `D-xx` y `RN-xx` citado exista y que cada decisión nueva esté en el índice de `00-decisiones.md`.
4. Agrega a `docs/03-bitacora.md` (créala con la tabla `Hora | Tipo | Qué pasó | Ref` si no existe) una fila al final, con la hora real: tipo `Decisión`, "Spec y decisiones redactados con /spec a partir de las respuestas del humano", ref `D-xx..D-yy`. Solo añade al final; no reescribas filas previas.
5. Confirma al humano: ruta del archivo, estado `Borrador`, cuántas decisiones se registraron, y que debe releer y marcar `Aprobado`.
6. Indica el siguiente paso: una vez el spec esté `Aprobado`, el humano redacta `docs/02-backlog.md` (tareas T1..Tn con su DoR) y luego ejecuta `/spec-impl T1` para implementar la primera tarea. **Detente aquí.** No empieces el backlog ni el código.

## Reglas duras

- **Nunca escribas código** en este comando; solo `.md`.
- **Nunca empieces el backlog ni la implementación** al terminar: solo indica `/spec-impl` como siguiente paso. Tu trabajo acaba cuando el archivo está escrito.
- **Nunca asumas decisiones** que el humano no confirmó; pregunta en la Fase 2.
- **No vuelvas a preguntar en la Fase 3** lo que ya respondió en la Fase 2.
- **No modifiques** `02-backlog.md`, `04-cierre.md` ni archivos de `/docs/tareas`.
- Si el humano quiere saltarse la Fase 2, recuérdale: "Preguntar ahora ahorra horas después. ¿Seguro que quieres saltarlas?". Si insiste, respétalo y regístralo como decisión ("Definición rápida sin aclaraciones detalladas").
- Si el producto es demasiado grande (no cabe en una frase, toca más de tres áreas, exige decisiones en cuatro o más dominios), propón recortar el MVP antes de seguir.

## Tono al preguntar

Directo y específico. No te disculpes por preguntar ni uses "si no te molesta…". Una pregunta por línea, numeradas.

Ejemplo de bloque bien formado:

> Antes de definir el modelo de datos necesito aclarar tres cosas:
>
> 1. **Borrado.** ¿Una reserva cancelada se borra o queda con estado `cancelled`? Recomendación: estado, para conservar historial y quién canceló.
> 2. **Zona horaria.** ¿Se guarda en UTC y se muestra en la zona de la oficina? Recomendación: sí.
> 3. **Límite por persona.** ¿Hay tope de reservas activas por usuario? Opciones: (a) sin tope, (b) 5, (c) configurable.

## Argumentos

`$ARGUMENTS` es la descripción del producto (modo Crear) o la sección a revisar (modo Revisar). No es el nombre del archivo: el spec siempre es `docs/01-spec.md`.
