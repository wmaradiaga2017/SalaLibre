# Plantilla del spec (docs/01-spec.md)

Esta es la referencia que consulta la skill `/spec`. Cada sección indica su propósito. **No se copia al pie de la letra**: es la forma que debe respetar el spec.

---

## Encabezado

```markdown
# Spec: <Nombre del producto>

> **Estado:** Borrador
> **Fecha:** AAAA-MM-DD
> **Objetivo:** Una sola frase. Si necesitas dos, el producto es demasiado grande.

Cada decisión citada como `D-xx` está en `00-decisiones.md`.
```

**Estados válidos:** `Borrador`, `En revisión`, `Aprobado`, `Implementado`, `Obsoleto`. Elige un solo juego de palabras y mantenlo.

---

## 1. Contexto y problema
Cita textual del cliente y el problema en una frase. Sin soluciones.

## 2. Objetivos y no-objetivos
- Objetivos numerados (O1, O2…), cada uno medible.
- No-objetivos con referencia a su decisión (`D-xx`). **Ambos bloques son obligatorios**: lo que queda fuera evita que se cuele "ya que estamos".

## 3. Usuarios y roles
Tabla: rol | puede | no puede. Lo que *no* puede importa tanto como lo que puede.

## 4. Alcance del MVP
- **Dentro:** lista concreta.
- **Fuera (v2):** lista con el motivo de cada exclusión.

## 5. Reglas de negocio
Tabla con ID `RN-xx` | regla | decisión (`D-xx`).
Cada regla debe poder verificarse con sí/no.
- ✅ "Duración máxima 3 h."
- ❌ "Duración razonable."
Incluye los parámetros configurables (nombre de variable y valor por defecto).

## 6. Flujos principales
Pasos cortos numerados por flujo, incluyendo el caso de error principal.

## 7. Modelo de datos
Por tabla: campo, tipo, restricciones. Usa SQL real para las restricciones clave (por ejemplo la anti-choque). Declara convenciones: zona horaria, borrado, mayúsculas/minúsculas.
Si algo no introduce datos nuevos, dilo explícitamente.

## 8. Contrato de la API
- Formato de error único (ejemplo JSON) y tabla HTTP → códigos.
- Tabla de endpoints: método y ruta | rol | descripción.
- Ejemplo JSON de cada objeto.
Nombres exactos de campos y rutas; son los que usarán el backend y el frontend.

## 9. Pantallas
Tabla: pantalla | ruta | contenido. Declara estados vacío, cargando y error, y qué ve quien no tiene permiso.

## 10. Arquitectura
Diagrama simple (texto), tabla de servicios de `docker-compose` (imagen, puerto, healthcheck, dependencias), estructura de carpetas, migraciones y datos de ejemplo. Debe garantizar un solo `docker compose up` sin pasos manuales.

## 11. Requisitos no funcionales
Concurrencia, seguridad básica, rendimiento esperado, accesibilidad mínima, observabilidad. Solo lo relevante.

## 12. Estrategia de pruebas
Comando exacto y casos obligatorios, numerados. El riesgo central del producto recibe la mayor parte del esfuerzo.

## 13. Riesgos y supuestos
Tabla: riesgo o supuesto | mitigación. Si no hay riesgos relevantes, omite la sección.

## 14. Trazabilidad
Tabla: regla | endpoint | pantalla | tarea | prueba. Permite comprobar que nada quedó sin cubrir ni sin probar. Las tareas se completan cuando exista el backlog.

---

## Reglas globales del documento
- **Una idea por oración.** Si una oración tiene dos comas y un punto y coma, divídela.
- **Nombres concretos.** Si dices "el módulo de reservas", di `api/src/services/bookings.js`. Si dices "una variable", da el nombre exacto.
- **Sin TODOs.** Un TODO significa que no se tomó la decisión: tómala o regístrala como supuesto con su motivo.
- **Sin código largo.** El spec describe; el código se escribe después. Fragmentos cortos (SQL de restricciones, JSON de ejemplo) sí; funciones completas no.
- **Markdown estándar.** Debe verse bien en GitHub.
- **Coherencia.** Los mismos nombres en modelo, API y pantallas.

---

## Formato de `00-decisiones.md`

```markdown
# 00 · Decisiones

<Contexto en 2 líneas y principio rector>

## Índice
| ID | Tema |
|----|------|
| D-01 | ... |

---

## D-01 · Título corto
- **Duda:** ...
- **Opciones:** A) ... B) ... C) ...
- **Decisión:** ...
- **Por qué:** ...
- **Costo/riesgo:** ...
- **Revisar si:** ... (opcional)
- **Afecta a:** spec §x, RN-xx
```
Si una decisión cambia, no se borra: se marca `Reemplazada por D-yy`.
