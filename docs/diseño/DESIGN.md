---
name: SalaLibre
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004f35'
  on-tertiary: '#ffffff'
  tertiary-container: '#006a48'
  on-tertiary-container: '#60eeb1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-xs:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.02em
  code-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-dense: 0.5rem
  margin: 1.5rem
  margin-compact: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Cómo usar este documento

**Esto es una referencia visual, no un requisito.** SalaLibre toma de aquí los colores, la tipografía, las formas y los componentes base para verse coherente. Este documento no define funcionalidad (D-28).

- **Qué manda:** `docs/01-spec.md` (reglas, roles, alcance, API, pantallas y estados) y `docs/00-decisiones.md`. Si este documento o los prototipos contradicen al spec, gana el spec. Lo que el diseño muestre y el spec no contemple, no se implementa.
- **Qué puedes tomar:** tokens de color, tipografía, radios, espaciado, patrones de componentes (tarjetas, insignias, tablas, modales, línea de tiempo) y la composición general de las pantallas.
- **Qué no debes hacer:** implementar una función solo porque aparece en un prototipo, copiar el HTML tal cual, ni inventar datos o endpoints para llenar una pantalla.
- **Ante la duda sobre funcionalidad:** no la implementes. Registra la duda en la bitácora y pregunta, según `CLAUDE.md`.

## Prototipos de referencia (Stitch)

Ubicación: `docs/diseño/stitch/<carpeta>/`, con un `screen.png` y un `code.html` por pantalla (la carpeta `login` solo trae la imagen). Usa la imagen como referencia principal y `code.html`, cuando existe, solo para consultar clases, estructura y estados. Son prototipos estáticos generados, no código de producción.

Rutas y roles de las pantallas: spec §9. Los textos de la interfaz van en español.

| Carpeta | Pantalla en el spec (§9) | Qué tomar | Qué ignorar |
|---|---|---|---|
| `agenda_general_de_salas_timeline_en_tiempo_real` | Agenda `/agenda` | Columnas por sala con encabezado fijo (nombre y capacidad), eje de horas, tarjetas de reserva posicionadas por hora, línea de hora actual, celdas libres clicables, barra de fecha, leyenda de estados y la barra de filtros (capacidad mínima y equipamiento, D-25) | Vista Semana, chips de métricas, estados de check-in y mantenimiento, "Reserva rápida", búsqueda, sincronización con Meet/Teams, arrastrar para seleccionar rango |
| `nueva_reserva_prevenci_n_activa_de_choques` | Formulario de reserva (modal sobre `/agenda`) | Composición del formulario, selector de sala, estilo del banner verde/rojo para mostrar el resultado del servidor (por ejemplo el 409) y toast de confirmación | Pasos, fotos de salas, departamento, invitación a calendarios, soporte técnico, aviso de check-in, comparador de franjas, sugerencia de sala alternativa, duraciones fijas de 45 min |
| `mis_reservas_check_in_con_liberaci_n_autom_tica` | Mis reservas `/my-bookings` | Tarjetas de reserva (fecha, hora, sala, título, estado) y la acción Cancelar con su diálogo de confirmación | Banner de check-in, puntualidad, reglas de convivencia, modificar horario (D-12), enlaces Meet, historial y exportación CSV, botón flotante |
| `consola_de_administraci_n_y_reglas_de_rrhh` | Salas `/admin/rooms` | Encabezado de página, tarjetas o filas por sala (nombre, capacidad, ubicación, equipamiento, estado) e interruptor de activa/inactiva | KPIs, bloqueos por horario con reubicación automática, alertas de no-show, desglose por equipos, pestañas |
| `gesti_n_y_creaci_n_de_usuarios_rrhh` | Usuarios `/admin/users` | Tabla (iniciales, nombre, correo, rol, estado, acciones), insignias de estado Activo/Inactivo y el formulario de alta (como modal, igual que Salas) | Carga masiva CSV, departamentos, cupos de horas, puntualidad, penalizaciones, KPIs, filtros por departamento, paginación (el spec no pagina usuarios), historial, roles "Líder de Área" y "Colaborador Estándar" |
| `registro_de_auditor_a_y_trazabilidad` | Auditoría `/admin/audit` | Tabla de eventos (fecha, actor, acción, entidad, requestId), filtros de fecha y acción, pie con "Anterior", "Siguiente" y total, píldora por tipo de acción | Cadena hash y sellos criptográficos, KPIs, exportar CSV/PDF, filtros por sala y actor, IP y dispositivo, JSON de detalle, auto-liberaciones por no-show, indicador "En vivo" |
| `login` | Login `/login` | Composición de dos columnas, logo y marca, titular, formulario, ilustración de cuatro personajes. Detalle en la sección «Login» | Casilla "Recordarme", "Acceso con Google", "Crea una cuenta" y la nota "Demo interactiva"; ver «Login frente al spec» |

**Pantallas sin prototipo.** Mi cuenta `/account`, Cierres `/admin/closures`, el banner de día cerrado y los estados cargando, vacío, error y sin permiso no tienen prototipo. Constrúyelas con los mismos tokens y componentes base (formulario, tabla, modal, insignia, diálogo de confirmación). No inventes un estilo nuevo.

**Estructura global.** (No aplica al Login, que va sin barra superior.) Toma la barra superior con la navegación según rol: Agenda y Mis reservas para todos; Salas, Usuarios, Cierres y Auditoría solo para `ADMIN` (RN-21); Mi cuenta y Cerrar sesión en el menú del usuario. Ignora la lista lateral de salas, el botón "Nueva Reserva", la búsqueda global, las notificaciones, "Bloquear Sala", Mantenimiento y Ajustes Espacios.

## Ajustes al llevar los prototipos a SalaLibre

| En los prototipos | En SalaLibre |
|---|---|
| Nombre "MeetHub / Workspace" y logos alojados por Stitch | Nombre **SalaLibre** y logo local (`web-assets/logo.svg`; `logo-icon.svg` para el favicon). Nunca imágenes desde URLs externas |
| Zona horaria "GMT-3 Santiago / Buenos Aires" | `America/Tegucigalpa`, el valor de `BUSINESS_TZ` (D-21). Todas las horas se muestran en esa zona |
| Horario visible 08:00–15:00 o 08:00–20:00 | 07:00–20:00, lunes a viernes (RN-04). El selector de día va de hoy a hoy + 30 y solo ofrece días de lunes a viernes (RN-06, §9) |
| Franjas de 15 min y 72 px por hora | Las franjas de 15 min coinciden con RN-02. Usa 64 px por hora (16 px por franja), como indica "Diseño y espaciado". La duración es de 15 min a 4 h (RN-03); 45 min es solo un ejemplo |
| Roles "Administrador RRHH", "Líder de Área" y "Colaborador Estándar" | Solo `EMPLOYEE` (se muestra "Empleado") y `ADMIN` (se muestra "Administrador RRHH") |
| Títulos visibles en todas las reservas | D-20 y RN-17: un `EMPLOYEE` ve "Ocupado" y el nombre del dueño en reservas ajenas (el API no envía el título). Reserva propia: con título. `ADMIN`: título y nombre |
| Estados Activo, Penalizado, Bloqueado, Licencia | Usuarios: solo Activo e Inactivo (`isActive`). Reservas: Confirmada y Cancelada (`status`). Cierres y salas inactivas usan el tono de Mantenimiento/Bloqueada |
| Fechas de octubre de 2024, nombres, correos `@empresa.com`, cifras y KPIs | Es relleno: los datos reales salen del API y del seed. Fechas siempre reales |
| Salas Innovación (16), Estrategia (12), Focus A (8), Focus B (8) y Ágora (36) | Son datos de muestra. Las salas reales son las del seed (S-07): Sala Copán (8), Sala Roatán (4), Sala Lempira (12), Sala Morazán (6) y Sala Pico Bonito (20) |
| Fotos de personas desde URLs externas | Círculo con iniciales |
| Emojis como iconos, `alert()` y `confirm()` del navegador | Iconos del sistema, toasts y diálogos propios (F-03 exige un diálogo de la app) |
| Tailwind, fuentes e iconos cargados desde CDN | La app corre en Docker local: compila Tailwind en el build y empaqueta Inter e iconos como dependencias locales |
| `rounded-lg` = 4 px y `rounded-xl` = 8 px en la configuración de Stitch (`rounded-full` = 12 px) | Sigue "Formas": 4 px en microcomponentes, 8 px en contenedores, círculo completo (9999 px) en avatares y píldoras |
| Drawer lateral de 740 px para reservar | El spec dice modal (§9): usa el de 480 px de "Diseño y espaciado" |
| Un solo menú "Admin RRHH" | Cuatro pantallas separadas: `/admin/rooms`, `/admin/users`, `/admin/closures`, `/admin/audit` |
| Auditoría con eventos de no-show, bloqueos y permisos | Solo las acciones de `AuditAction` (§7): reservas, salas, usuarios, contraseñas y cierres |

**Accesibilidad:** no comuniques un estado solo con el color (añade texto o icono), mantén el contraste de "Colores", conserva el foco visible, permite navegar la agenda con teclado (spec §11) y no uses texto menor a 11 px más que en metadatos.

## Login (`/login`)

Referencia: `docs/diseño/stitch/login/` (solo la imagen, sin `code.html`). En esta pantalla la imagen es la autoridad visual: manda en proporciones, composición y textos. Los tokens de este documento dan el estilo base. El comportamiento (validación, autenticación, animación de los personajes) no se define aquí: está en la tarea T07c de `docs/02-backlog.md`, y el spec manda.

### Composición en escritorio
- **Página:** fondo `#F8FAFC`. Una tarjeta centrada de unos 1080 px de ancho, con borde `1px #E2E8F0`, radio de 8 px y sombra suave. Dos columnas casi iguales (≈ 51 % y 49 %) separadas por una línea fina.
- **Columna izquierda** (fondo `#F1F5F9`, relleno de unos 40 px):
  - Arriba, el logo: icono de 44 px con esquinas redondeadas, "SalaLibre" en semibold (≈ 18 px) y debajo "RESERVA DE SALAS" en `label-xs` con espaciado y gris.
  - Debajo, el texto: "EL ESPACIO PARA TU EQUIPO" (`label-xs`, mayúsculas, gris pizarra); el titular "Tu próxima reunión, / en el lugar ideal." (semibold ≈ 28 px, `#0F172A`, con el punto final en azul `#1D4ED8`); y el párrafo "Encuentra una sala, coordina con tu equipo y reserva sin complicaciones." en dos líneas (`body-md`, gris).
  - En la mitad inferior, la ilustración de los cuatro personajes (ver abajo).
  - Al pie, un punto verde `#10B981` con "Menos fricción. Más espacio para colaborar." (`body-sm`).
- **Columna derecha** (blanco): bloque del formulario de unos 350 px, centrado en vertical.
  - "ACCESO A SALALIBRE" con un punto azul delante (`label-xs`, azul), "Bienvenido de nuevo" (`headline-lg`) y "Inicia sesión para gestionar tus reservas de salas." (`body-md`, gris).
  - Etiquetas "Correo electrónico" y "Contraseña" (`label-md`, semibold). Campos de 46 px de alto, borde `#C4C5D7`, radio de 4 px, placeholders "tu@ejemplo.com" y "Escribe tu contraseña". El campo de contraseña lleva un icono de ojo a la derecha.
  - Una fila con el enlace "¿Olvidaste tu contraseña?" a la derecha (azul, `body-sm`).
  - Botón primario de ancho completo y 46 px, `#1D4ED8`, texto blanco semibold "Iniciar sesión" con un icono de flecha diagonal.
  - Pie de la columna, separado por una línea fina: "Reserva de salas" a la izquierda y "© AAAA SalaLibre" a la derecha (`body-sm`, gris), con el año actual.
- **Móvil:** el bloque visual pasa a una cabecera compacta (logo y la ilustración reducida) y el formulario va debajo, sin desplazamiento horizontal ni superposiciones.

### Ilustración: cuatro personajes geométricos
Se dibujan en SVG propio, sin archivos gráficos externos. Los colores son orientativos; la imagen manda.

| Personaje | Forma y posición | Color orientativo |
|---|---|---|
| Grande | Rectángulo alto de esquinas redondeadas, con el borde superior derecho inclinado. Detrás, algo a la izquierda del centro | Azul con degradado, de `#4A74F0` arriba a la izquierda a `#0A3AB0` abajo a la derecha |
| Mediano | Forma alta de punta redondeada, ligeramente más ancha abajo. Delante del grande y superpuesta a su lado derecho | Azul lavanda, de `#8FA8E8` a `#6B7FCB` |
| Pequeño | Cápsula o arco. A la derecha del todo | Verde menta, de `#4DE8B4` a `#0BAF7C` |
| Semicírculo | Media circunferencia apoyada en la base, delante a la izquierda, solapando el pie del grande | Azul claro, de `#A9BFF7` a `#6F8DDD` |

- Cada personaje tiene dos ojos (círculo blanco con pupila `#0F172A` y un pequeño brillo) y una sonrisa corta en trazo oscuro. Cuerpo, cara, ojos, pupilas y boca son grupos SVG separados, para poder animarlos.
- Debajo, una sombra elíptica difusa gris azulada sobre la base. Dos destellos de cuatro puntas en azul claro, de distinto tamaño, flotan a los lados.
- La ilustración es decorativa: `aria-hidden` y sin capturar el puntero.

### Login frente al spec
Dónde la imagen o el texto de la tarea se separan del spec, gana el spec (D-28).

| En la imagen o en la petición | En SalaLibre |
|---|---|
| Casilla "Recordarme" | No se implementa: la sesión dura 8 h fijas y no se renueva (RN-19, D-19). Quita la casilla y deja el enlace "¿Olvidaste tu contraseña?" alineado a la derecha |
| "¿Olvidaste tu contraseña?" | Se conserva, pero no hay recuperación por correo (D-19). Al pulsarlo muestra el aviso "La recuperación por correo no está disponible. Pide a RR. HH. que restablezca tu contraseña." (RR. HH. lo hace desde `/admin/users`, F-06) |
| "Acceso con Google" y "Crea una cuenta" | No existen en el spec (D-08: sin autorregistro; no hay acceso con terceros). No aparecen en la imagen ni se implementan |
| Nota "Demo interactiva · Sin conexión a un servidor" | Se elimina: el login usa la autenticación real del API (F-01). No hay simulación |
| Botón "Iniciar sesión" frente a "Entrar" en el spec §9 y F-01 | Se usa el texto de la imagen, "Iniciar sesión" |
| Año "2026" en el pie | El año actual |

## Marca y estilo

SalaLibre es el nombre de la aplicación, y este sistema de diseño está pensado para ella. Está concebido para entornos corporativos medianos donde la eficiencia administrativa, la reserva de salas sin fricción y la visibilidad del espacio de trabajo son prioritarias. Orientado a flujos de trabajo en escritorio, administrados por Recursos Humanos y usados por todos los empleados, combina la utilidad precisa del software de productividad moderno (como Linear y Notion) con la fiabilidad empresarial de Google Workspace.

### Personalidad y valores
- **Precisión operativa:** densidad de información sin caos visual. Las franjas horarias, los recursos de las salas y los datos de quienes las ocupan se leen de inmediato y de un vistazo.
- **Autoridad serena:** una arquitectura neutra y limpia que reduce la ansiedad al reservar, los errores de doble reserva y la fricción administrativa.
- **Claridad accesible:** indicadores de estado inequívocos y altos contrastes en horarios, líneas de tiempo y formularios.

### Dirección de diseño
- **Minimalismo SaaS sistemático:** espacio en blanco generoso equilibrado con vistas de datos compactas, microbordes sutiles, codificación funcional por color y una jerarquía estructural nítida.
- **Elevación de superficies:** lienzo plano y estructurado, anclado por divisores de línea fina y bordes de bajo contraste en lugar de sombras pesadas.

## Colores

El sistema de color prioriza la conciencia de la situación y el escaneo rápido en vistas de horarios densas.

### Arquitectura base
- **Primario (`#1D4ED8` / `#2563EB`):** controles interactivos, estados activos, llamadas a la acción clave y franjas horarias seleccionadas.
- **Secundario (`#0F172A`):** titulares críticos, etiquetas de navegación activas y lecturas de datos principales.
- **Base neutra:** blanco puro (`#FFFFFF`) para tarjetas elevadas y ventanas emergentes; gris pizarra suave (`#F8FAFC`) para el fondo del espacio de trabajo; bruma fría (`#F1F5F9`) para los fondos de columnas secundarias y las cuadrículas de la línea de tiempo; gris de borde (`#E2E8F0`) para las divisiones estructurales.

### Paleta de estados operativos
Cada color operativo se combina con un contenedor de tinte claro para asegurar una legibilidad AAA:
- **Disponible (`#10B981` / superficie `#ECFDF5`):** franjas libres, registros de entrada completados, equipamiento de sala plenamente funcional.
- **Ocupada / En sesión (`#EF4444` / superficie `#FEF2F2`):** reuniones en curso, bloques no disponibles.
- **Registro de entrada pendiente (`#F59E0B` / superficie `#FFFBEB`):** reservas inminentes dentro del periodo de gracia de 10 minutos para registrar la entrada.
- **Mantenimiento / Bloqueada (`#64748B` / superficie `#F1F5F9`):** bloqueada por RR. HH., fuera de servicio o reservada para eventos ejecutivos.

## Tipografía

Inter es la base tipográfica en todos los niveles de la jerarquía. Su trazo neutro y su altura de x elevada garantizan un escaneo sin esfuerzo en líneas de tiempo de varias columnas y listas de recursos densas.

- **Cifras tabulares:** aplica siempre `font-feature-settings: "tnum" 1` en líneas de tiempo, visualización de horas (`09:00 - 10:30`), contadores de métricas e indicadores de capacidad para evitar desplazamientos del diseño.
- **Titulares:** disciplinados y contenidos; `headline-xl` se reserva para los paneles de informes de RR. HH. de alto nivel, mientras que `headline-sm` titula los modales y las columnas del horario.
- **Etiquetas:** `label-xs` usa espaciado en mayúsculas para las etiquetas de metadatos (como la capacidad de la sala o los códigos de departamento).

## Diseño y espaciado

El diseño está concebido específicamente para pantallas de escritorio (ventanas de 1280px a 1920px o más), con un sistema de cuadrícula integrado para sincronizar la línea de tiempo.

### Arquitectura de la línea de tiempo
- **Eje del encabezado horario:** barra lateral izquierda fija de 64px que muestra incrementos horarios de 07:00 a 20:00.
- **Cuadrícula de columnas por sala:** cuadrícula fluida que reparte por igual el ancho horizontal disponible entre las salas activas que pasan los filtros (5 en el seed). El ancho mínimo de columna es 180px; se desplaza horizontalmente si se activan más salas o subzonas.
- **Altura estándar por hora:** un incremento estándar de 1 hora equivale a 64px de altura vertical, lo que permite ajustar franjas de 15 minutos en incrementos exactos de 16px.

### Cuadrícula y densidad
- **Margen del lienzo principal:** `margin` (24px) en el perímetro, que se reduce a `margin-compact` (16px) en portátiles compactos.
- **Barra de filtros:** barra superior fija de 48px de alto, con `space-sm` (8px) entre elementos para los filtros rápidos.
- **Modales:** ancho fijo de 480px para el formulario de reserva y los diálogos de confirmación; 640px para los formularios de administración (sala, usuario, cierre) si necesitan más espacio. No existen reservas recurrentes ni de varias salas (D-22).

## Elevación y profundidad

La jerarquía visual usa capas de superficie sutiles y límites nítidos en lugar de sombras físicas dramáticas, en línea con las herramientas modernas de ingeniería de producto.

### Niveles de superficie
1. **Capa base (`#F8FAFC`):** fondo de la aplicación, márgenes del lienzo de la línea de tiempo y guías de pista de solo lectura.
2. **Capa de superficie (`#FFFFFF`):** columnas del calendario, paneles laterales, tablas de datos y encabezados de la barra de herramientas.
3. **Elementos elevados (`#FFFFFF` + sombra de línea fina):** tarjetas de reserva flotantes en el horario, tarjetas de resumen de métricas, menús desplegables y ventanas emergentes.
   - Contorno: `1px solid rgba(15, 23, 42, 0.08)`
   - Sombra ambiental: `0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)`
4. **Nivel de modal / superposición:** diálogos centrados sobre un velo atenuado (`rgba(15, 23, 42, 0.4)` con desenfoque de fondo de `4px`).
   - Sombra: `0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1)`

### Superposiciones interactivas
- Al pasar el cursor sobre una franja libre aparece un contorno azul activo (`#2563EB`) con un tinte de vista previa claro (`rgba(37, 99, 235, 0.06)`).
- Al arrastrar para seleccionar un rango de reserva se muestra un borde discontinuo marcado (`2px dashed #1D4ED8`).

> *Fuera del MVP: el spec abre el formulario con un clic en un hueco libre (F-02). El arrastre es solo referencia visual.*

## Formas

La interfaz adopta una filosofía de curvatura "suave" y disciplinada (radio base de 0.25rem / 4px) para alinearse con la estética SaaS técnica.

- **Microcomponentes (4px / `rounded-base`):** controles de formulario, campos de entrada, insignias, bloques de selección de franja horaria, etiquetas de reuniones en la línea de tiempo y botones.
- **Elementos contenedores (8px / `rounded-lg`):** encabezados de columnas de sala, diálogos modales, contenedores de filtros desplegables y tarjetas de resumen de métricas.
- **Avatares:** círculo estricto (`rounded-full`) para los avatares de los organizadores de reuniones, que introduce un contraste orgánico frente a los horarios rígidos y lineales.

## Componentes

### 1. Línea de tiempo interactiva y tarjetas de reunión
- **Encabezado de columna:** muestra el nombre de la sala, una insignia de capacidad (p. ej., `8 pax`) y un punto de estado en vivo (`#10B981` si está libre, `#EF4444` si está ocupada).
- **Bloque de reunión:** tarjeta posicionada de forma absoluta sobre el eje Y según la hora de inicio y fin.
  - Estructura: franja de borde izquierdo (3px sólido) coloreada según el estado de la reserva, título de la reunión (`label-sm`, peso medio), rango horario (`label-xs`, tabular) y avatar del anfitrión (círculo de 18px con iniciales).
  - Privacidad (D-20): en reservas ajenas, un `EMPLOYEE` ve "Ocupado" y el nombre del dueño en lugar del título.
  - Sin insignia de departamento (no existe en el spec).
  - Tarjetas compactas (<30 min): diseño en línea con el título y la duración lado a lado.

### 2. Insignias y píldoras de estado

> *En el MVP: Disponible y Ocupada en la agenda; Confirmada y Cancelada en Mis reservas; Activo e Inactivo en salas y usuarios. "Registro de entrada pendiente" queda fuera. El tono de "Mantenimiento" se reutiliza para días cerrados y salas inactivas.*

- **Disponible:** fondo `#ECFDF5`, texto `#065F46`, borde `#A7F3D0`.
- **Ocupada:** fondo `#FEF2F2`, texto `#991B1B`, borde `#FECACA`.
- **Registro de entrada pendiente:** fondo `#FFFBEB`, texto `#92400E`, borde `#FDE68A`, acompañado de un indicador de advertencia pulsante.
- **Mantenimiento:** fondo `#F1F5F9`, texto `#475569`, borde `#CBD5E1`.

### 3. Barra rápida de filtros

> *Dentro del MVP (D-25, spec §9): filtro por capacidad mínima y por equipamiento. Los equipos son solo `PROJECTOR`, `VIDEOCONF`, `WHITEBOARD` y `TV`. Los rangos `1-4`, `5-8`, `9-16` y `16+` del prototipo son solo estilo: el filtro del spec es una capacidad mínima. Se filtra en el cliente.*

- Interruptores en forma de píldora alineados horizontalmente, con combinaciones claras de icono y texto para el equipamiento: proyector, videoconferencia, pizarra y TV, más el selector de capacidad mínima.
- Los filtros activos usan un fondo sólido `#1D4ED8` con tipografía blanca nítida.

### 4. Modal de reserva y resolución de conflictos

> *Campos del spec: sala, inicio y fin (selectores de 15 min), título y asistentes, con la capacidad de la sala visible. Los errores del servidor (409 `BOOKING_CONFLICT`, 422) se muestran con el estilo del banner y el `requestId`. Mientras hay una petición en curso, el botón de envío se deshabilita. Sugerir franja o sala alternativa y la etiqueta de departamento quedan fuera.*

- **Selección de horario:** selector de rango doble con validación continua de colisiones. Si se detecta un choque, el botón de acción principal se deshabilita al instante y sugiere la franja libre más cercana o una sala alternativa con el mismo equipamiento.
- **Etiqueta de departamento:** lista desplegable rellenada previamente según el perfil del empleado (p. ej., Marketing, Ventas, Ingeniería, Ejecutivo).

### 5. Tarjetas de métricas administrativas de RR. HH.

> *Fuera del MVP. Solo referencia visual de tarjeta; no hay pantalla de métricas en el spec.*

- Cuadrícula compacta de 4 columnas de métricas: tasa de utilización diaria de salas (%), alternador del mapa de calor de horas pico, reservas no reclamadas (liberadas automáticamente tras 10 min) e interrupciones por mantenimiento.

### 6. Tablas administrativas

- Aplican a Salas, Usuarios y Auditoría: capa de superficie blanca, encabezado de columna en `label-xs` con espaciado en mayúsculas, filas separadas por el gris de borde y acciones alineadas a la derecha.
- Estado en píldora (Activo/Inactivo) con texto además del color. Las fechas y horas usan cifras tabulares y `America/Tegucigalpa`.
- Acciones de crear y editar en modal. Las acciones destructivas o irreversibles (cancelar, desactivar, crear un cierre que cancela reservas) pasan por un diálogo de confirmación propio con el texto de la consecuencia.

### 7. Banner de día cerrado y estados de pantalla

- **Día cerrado:** banner con el motivo sobre la agenda, tono de Mantenimiento/Bloqueada, y huecos sin acción de clic (spec §9).
- **Cargando:** esqueleto o spinner en el área de datos. **Vacío:** texto específico, con icono neutro. **Error:** mensaje con el `requestId` y botón "Reintentar". **Sin permiso:** mensaje "No tienes permiso para ver esta página".
