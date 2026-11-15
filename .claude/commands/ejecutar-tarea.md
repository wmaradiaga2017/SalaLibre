---
description: Ejecuta una tarea del backlog siguiendo el ciclo completo (DoR → construir → verificar → documentar → commit)
argument-hint: <ID de tarea, ej. T05>
---

Ejecuta la tarea **$ARGUMENTS** de `docs/02-backlog.md`.

1. **Comprobar la DoR:** lee la tarea y comprueba que cumple todos los puntos de la DoR y que sus dependencias
   están en estado Hecha. Si no, **detente** y explica qué falta.
2. **Contexto:** lee `CLAUDE.md` y las secciones que referencia la tarea (RN, D, spec, `05-diseno.md` y las imágenes de Stitch si es de UI).
3. **Inicio y plan:** obtén la hora real del sistema (ver "Bitácora" en CLAUDE.md) y agrega una fila
   `AGENTE` "Inicio de $ARGUMENTS" a la bitácora. Después, antes de escribir código, resume en 3 a 6 puntos lo que vas a hacer.
4. **Construir:** implementa solo lo que está dentro del alcance de la tarea.
5. **Verificar:** corre cada comando de verificación de la tarea y `docker compose up -d --build`. Si algo falla, corrígelo y vuelve a verificar.
6. **Documentar:**
   - Crea `docs/tareas/$ARGUMENTS.md` con `docs/tareas/_plantilla-tarea.md`, pegando la salida real (deja vacía la sección 8 "Revisión").
   - Obtén de nuevo la hora real y agrega una fila `AGENTE` "Fin de $ARGUMENTS" al final de `docs/03-bitacora.md`,
     con el resultado y el hash del commit. Si hubo errores relevantes durante la tarea, agrega también filas `ERROR`.
   - Usa esas horas reales de inicio y fin en el campo "Inicio – fin" de `docs/tareas/$ARGUMENTS.md`.
   - Cambia el estado en `docs/02-backlog.md` a "En revisión".
7. **Commit:** `$ARGUMENTS: <título de la tarea>`.
8. **Reportar:** resume en pocas líneas lo hecho, los desvíos y las ambigüedades. Detente y espera la revisión.
