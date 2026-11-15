---
description: Registra en la bitácora una entrada dictada por la persona, con la hora real del sistema
argument-hint: <TIPO> <qué pasó> [| resultado] [| ref]   ej. REVISIÓN T03 revisada, falta test de 429 | pido corrección | T03
---

Agrega una entrada a `docs/03-bitacora.md` a partir de: **$ARGUMENTS**

1. **Hora real:** ejecuta `date "+%Y-%m-%d %H:%M"` (o `Get-Date -Format "yyyy-MM-dd HH:mm"` en PowerShell). Nunca estimes la hora.
2. **ID:** lee la última fila de la tabla principal y usa el siguiente `B-xx`.
3. **Campos:**
   - **Tipo:** la primera palabra de los argumentos. Debe ser uno de DECISIÓN, PLAN, AGENTE, REVISIÓN, ERROR,
     CORRECCIÓN, MANUAL, SESIÓN o HITO. Si no coincide con ninguno, pregunta cuál es antes de escribir.
   - **Actor:** `Yo`, salvo que el texto diga explícitamente otro (por ejemplo, Stitch).
   - **Fase:** dedúcela del estado de `docs/02-backlog.md`:
     - ninguna tarea iniciada → `1-Entender` o `2-Planificar` (según el texto);
     - alguna tarea En curso o En revisión, o con tareas pendientes → `3-Ejecutar`;
     - todas Hechas → `4-Cierre`.
   - **Qué pasó / Resultado / Ref.:** separados por `|`. Si falta alguno, deja `—`. No inventes contenido.
4. **Reglas:**
   - **MANUAL:** si el tipo es MANUAL y el texto no incluye el **motivo**, pídelo antes de escribir (es obligatorio por las reglas de la prueba).
   - **DECISIÓN:** si el tipo es DECISIÓN y no hay referencia a una D-xx, recuerda que hay que registrarla en `docs/00-decisiones.md` (no la crees salvo que te lo pidan).
5. **Escritura:** agrega la fila **al final** de la tabla principal. No modifiques ninguna otra fila ni otro archivo.
6. Muestra la fila agregada en una línea y termina. No hagas commit; la bitácora se incluye en el siguiente commit de la tarea.
