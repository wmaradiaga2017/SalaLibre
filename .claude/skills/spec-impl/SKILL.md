---
name: spec-impl
description: Implementa UNA tarea del backlog (docs/02-backlog.md) solo si el spec está Aprobado, la tarea cumple la DoR y sus dependencias están hechas. Registra bitácora, archivo de tarea y commit.
disable-model-invocation: true
argument-hint: <Tn>
allowed-tools: Read, Glob, Grep, Edit, Write, AskUserQuestion, Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git show:*), Bash(git add:*), Bash(git commit:*), Bash(cat:*), Bash(ls:*), Bash(date:*), Bash(TZ=America/Tegucigalpa date:*), Bash(docker compose:*), Bash(npm:*), Bash(curl:*)
---

# /spec-impl — Implementador de tareas del backlog

## Contexto de la sesión

Fecha y hora actuales (úsalas en bitácora y archivo de tarea; nunca las inventes):
!`TZ=America/Tegucigalpa date '+%Y-%m-%d %H:%M'`

Estado del repositorio:
!`git status --short`

Archivos de /docs:
!`ls docs/ 2>/dev/null || echo "La carpeta docs/ no existe"`

Tareas ya documentadas:
!`ls docs/tareas/ 2>/dev/null || echo "Todavía no hay tareas documentadas"`

Últimos commits:
!`git log --oneline -n 10 2>/dev/null || echo "Sin commits"`

---

## Instrucciones

Sigue las cuatro fases en orden estricto. **No avances si la anterior no terminó bien.** Responde en español. **Una tarea por sesión.**

---

### Fase 1 — Identificar la tarea

El argumento recibido es: `$ARGUMENTS`

- Si está vacío: lista las tareas de `docs/02-backlog.md` (tabla de orden de ejecución), pide cuál ejecutar y detente.
- Si tiene valor: acepta `T3`, `3` o el título. Búscala en `docs/02-backlog.md`. Si no existe el backlog o la tarea, muestra lo disponible y pide corregir. No continúes.

---

### Fase 2 — Validar (todo debe cumplirse)

Lee `docs/01-spec.md` y la entrada de la tarea en `docs/02-backlog.md`.

**1. Estado del spec.** Busca la línea de estado cerca del inicio (`**Estado:**` o `**Status:**`). Solo puedes continuar si significa **Aprobado** (`Aprobado`, `Approved`, o equivalente claro en otro idioma). `Borrador`, `En revisión`, `Obsoleto` o un valor no reconocido → **detente**. Si dudas, no asumas: pide aclaración.

**2. DoR completa.** La tarea debe tener todo esto:
- Objetivo en una frase
- Referencias al spec (§, RN-xx) y decisiones (D-xx)
- Dependencias
- Alcance: qué entra y qué NO entra
- Criterios de aceptación verificables
- Archivos esperados
- Cómo se prueba (comando o pasos exactos)
- DoD de la tarea
- Estimación

Si falta algo → **detente**, lista lo que falta y pide al humano que lo complete en el backlog.

**3. Dependencias hechas.** Cada tarea de la que depende debe tener `docs/tareas/Tx.md` con todos sus criterios en ✅ y un commit `Tx:` en `git log`. Si no → detente y di cuál falta.

**4. Tarea no repetida.** Si `docs/tareas/Tn.md` ya existe con criterios ✅, avisa que parece terminada y pregunta si quiere rehacerla. Si existe incompleta (hay ❌ o está a medias), propón retomar y confirma el punto de partida.

**Mensaje estándar cuando no se cumple una validación:**

```
❌ No puedo implementar esta tarea.

Motivo: [ESTADO DEL SPEC / DoR INCOMPLETA: falta ... / DEPENDENCIA PENDIENTE: Tx]

Qué hacer:
  1. Corrige lo indicado (el humano marca el spec como Aprobado y completa la DoR;
     el agente no lo hace por él).
  2. Si el spec necesita trabajo, usa /spec revisar <sección>.
  3. Vuelve a ejecutar /spec-impl <Tn>.
```

Si el estado es una validación fallida, **no ofrezcas empezar de todos modos** ni crees archivos ni toques código. El bloqueo es intencional.

---

### Fase 3 — Preparar y proponer el plan

1. **Árbol de trabajo.** Si `git status --short` no está vacío, muéstralo y pregunta: (1) lo haces commit/stash tú y relanzas (recomendado), (2) continuar de todos modos. No hagas stash ni commit por el humano salvo que lo pida. Si está limpio, no lo menciones.
2. **Bitácora.** Agrega a `docs/03-bitacora.md` (créala con la tabla `Hora | Tipo | Qué pasó | Ref` si no existe) una fila `Agente`: "Inicio de Tn en /spec-impl", con la hora del contexto. Solo agregas al final.
3. Muestra al humano:

```
✅ Listo para implementar.

Tarea:    Tn · <título>
Spec:     docs/01-spec.md (Aprobado)
Depende:  <tareas hechas>
```
   Seguido de: objetivo, **Entra / No entra**, criterios de aceptación y cómo se prueba (extraídos de la tarea).
4. **Propón un plan corto** (pasos, archivos que vas a crear o tocar) y pregunta: "¿Apruebo y empiezo?". **No escribas código sin una confirmación explícita.**

---

### Fase 4 — Implementar, probar, documentar

Tras la aprobación:

**Regla sobre todas las reglas:** implementa lo que dicen la tarea y el spec. Si algo te parece mejorable, anótalo como observación, pero haz lo acordado. Los cambios al spec van al spec, no al código por sorpresa.

**Ritmo de trabajo**
1. Implementa solo lo de "Entra". No toques archivos fuera de lo que la tarea indica.
2. Ejecuta la prueba de la tarea (comando exacto, p. ej. `docker compose up` o `docker compose run --rm api npm test`) y **muestra la salida real**.
3. Evalúa cada criterio de aceptación: ✅ solo con evidencia; ❌ si falla (no lo maquilles).
4. Muestra un resumen: archivos creados o cambiados, resultado de la prueba y criterios. Di: "Tarea Tn lista para revisión. Revisa el diff y dime si hago commit."
5. **Espera confirmación.** Si el humano pide ajustes, aplícalos y repite 2–4.

**Cuando el humano confirma**
1. Escribe `docs/tareas/Tn.md` con: Sesión (`docs/sesiones/Tn.md`), Inicio/fin (horas reales), Prompt usado, Qué hizo el agente (archivos), Revisión del humano y correcciones, Criterios de aceptación (✅/❌ con evidencia), Problemas y aprendizajes, Commit.
2. Agrega filas a la bitácora: fallos o desvíos relevantes ya ocurridos (`Fallo`, `Cambio de plan`) y una final `Agente`: "Tn terminada; criterios ✅ N/M".
3. **Commit:** agrega solo los archivos de la tarea (`git add -- <archivo> …`); nunca `git add -A` ni `git add .`. Mensaje exacto: `Tn: <título de la tarea>`. Si falla (hook, etc.), detente y muestra el error; nunca uses `--no-verify`. Nunca hagas push. Escribe el hash corto en `Tn.md`. Si añadir el hash obliga a otro commit, amenda el de la tarea (`git commit --amend --no-edit`) solo mientras sea el último.
4. Recuerda al humano: **exportar la sesión con `/export` y guardarla en `docs/sesiones/Tn.md`** (el agente no puede hacerlo).

**Si aparece una ambigüedad que el spec no resuelve:**
1. Detente y descríbela con precisión.
2. Agrega una fila `Duda` a la bitácora.
3. Ofrece 2–3 opciones concretas y espera la decisión del humano.
4. No improvises. Cuando decida, registra su decisión en `docs/00-decisiones.md` con sus palabras (siguiente ID `D-xx`, añadido al índice) y continúa. Si la decisión cambia el spec, dile que lo actualice o use `/spec revisar <sección>`; **tú no editas `01-spec.md`**.

**Si piden algo fuera del alcance de la tarea:** recuerda que está fuera, sugiere anotarlo (para otra tarea o v2) y no lo implementes.

**Si tocas decisiones de reglas, API o modelo de datos por tu cuenta:** no lo hagas; pregunta (son del humano).

**Al terminar:**

```
✅ Tarea Tn terminada y commiteada (<hash>).

Pendiente tuyo:
  1. /export → docs/sesiones/Tn.md
  2. Siguiente: /spec-impl T(n+1)
```
Si era la última tarea: "Backlog completado. Verifica la DoD (docker compose up desde un clon limpio) y completa docs/04-cierre.md."

---

## Comportamiento esperado

```
/spec-impl T3

  Fase 1  →  Encuentra T3 en docs/02-backlog.md
  Fase 2  →  Spec "Aprobado", DoR completa, T1 y T2 hechas (✅ + commit) → continúa
  Fase 3  →  Fila de bitácora, resumen de la tarea, plan; espera aprobación
  Fase 4  →  Implementa → prueba → muestra salida → espera revisión
             → Tn.md + bitácora + commit "T3: ..." → recuerda /export

/spec-impl T5  (spec en Borrador, o DoR incompleta, o T4 sin hacer)

  Fase 2  →  ❌ Mensaje estándar; no crea archivos ni toca código
```

## Reglas duras
- Una tarea por sesión; nunca encadenes la siguiente.
- Nunca edites `00-decisiones.md` por iniciativa propia (solo para registrar decisiones dictadas) ni `01-spec.md`.
- Nunca inventes horas; usa el comando de fecha.
- Nunca marques ✅ un criterio sin evidencia.
- `docker compose up` debe seguir funcionando desde un clon limpio al cerrar cada tarea.
