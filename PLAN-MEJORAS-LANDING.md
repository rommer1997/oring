# PLAN-MEJORAS-LANDING.md — Guía para tontos

Plan paso a paso para resolver los 11 hallazgos pendientes del audit de GLM 5.2.
Ordenado de **más fácil y útil** a **más laborioso**. Cada punto explica:
🔴 **Qué pasaba** · 🔧 **Cómo se arregla** · ✅ **Cómo queda**

Esfuerzo: **S** = menos de 1 día · **M** = 1-3 días
"Contenido tuyo" = necesito que tú me des texto/fotos/datos reales

---

## 🥇 BLOQUE 1 — Arreglos rápidos (todos juntos en 1-2 horas)

Son cambios de texto o una línea de código. Mucho impacto, casi cero riesgo.

### Paso 1 · H15 — El modal no se cierra al tocar fuera `[S]`
- 🔴 **Qué pasaba:** cuando abres "Iniciar sesión" en el móvil y tocas fuera de la
  ventanita para cerrarla, no se cierra. Todo el mundo espera que "tocar fuera =
  cerrar". Pequeño, pero molesta cada vez.
- 🔧 **Cómo se arregla:** el fondo oscuro ya tiene el código para cerrar, pero le
  falta indicar que es "pulsable". Cambio el cursor y me aseguro de que el toque
  cierra de verdad. 1 línea.
- ✅ **Cómo queda:** tocas fuera del recuadro y se cierra, como en cualquier app.

### Paso 2 · H09 — Jerga que nadie entiende `[S]`
- 🔴 **Qué pasaba:** la web usa nombres inventados que solo entiende quien hizo el
  producto: "Monitor de Mimo", "Funcionalidad de Autor", "Agenda Siempre al Día".
  Una peluquera de barrio no sabe qué es eso y siente que "no es para ella".
- 🔧 **Cómo se arregla:** cambio los nombres por lo que de verdad hacen:
  - "Monitor de Mimo" → **"Clientas en riesgo"**
  - "Agenda Siempre al Día" → **"Elena vigila tu lista de clientas"**
  - "Funcionalidad de Autor" → **"Lo que hace Elena"**
- ✅ **Cómo queda:** se lee y se entiende a la primera, sin descifrar nada.

### Paso 3 · H10 — Dos botones compiten en la portada `[S]`
- 🔴 **Qué pasaba:** arriba del todo hay dos botones del mismo tamaño: "Pruébalo
  gratis" y "Ver el salón de ejemplo". El visitante no sabe cuál es el importante
  y duda. Cuando hay dos cosas igual de llamativas, no se pulsa ninguna.
- 🔧 **Cómo se arregla:** dejo "Pruébalo gratis" como botón grande (la acción
  principal) y convierto "Ver el salón de ejemplo" en un enlace de texto pequeño
  debajo.
- ✅ **Cómo queda:** la mirada va directa a "Pruébalo gratis". Quien quiera curiosear
  primero, ve el enlace del demo sin que estorbe.

### Paso 4 · H06 — 8 botones distintos para lo mismo `[S]`
- 🔴 **Qué pasaba:** a lo largo de la web hay 8 botones con textos diferentes
  ("Empezar gratis", "Activar el asistente", "Crear mi cuenta"...) que TODOS llevan
  al mismo sitio (registrarte). El usuario piensa que hacen cosas distintas y duda
  antes de pulsar.
- 🔧 **Cómo se arregla:** unifico todos al mismo texto: **"Probar Elena 14 días
  gratis"**. Los de la zona de precios mantienen su texto propio (ahí tiene sentido).
- ✅ **Cómo queda:** el usuario aprende que ese botón = empezar, y lo pulsa sin
  pensárselo dos veces estés donde estés en la página.

### Paso 5 · H12 — La seguridad solo se menciona de pasada `[S]`
- 🔴 **Qué pasaba:** la web dice "cumple RGPD" pero no responde la pregunta real de
  una dueña de salón: *"¿dónde están los datos de mis clientas y son seguros?"*.
- 🔧 **Cómo se arregla:** añado 3 frases concretas junto al icono de protección:
  "Datos alojados en la Unión Europea · Cifrados · Borra todo de un salón en 1 clic".
- ✅ **Cómo queda:** la objeción de seguridad queda respondida sin que tenga que
  preguntar ni leerse la política de privacidad.

### Paso 6 · H16 — El demo está escondido `[S]`
- 🔴 **Qué pasaba:** poder ver el producto SIN registrarte ("Ver el salón de
  ejemplo") es de lo mejor que tienes para convencer a los desconfiados, pero solo
  aparece arriba del todo y no se vuelve a mencionar.
- 🔧 **Cómo se arregla:** añado un enlace discreto "¿Prefieres verlo antes? Ver demo"
  en 2 sitios más: junto a las funciones y junto a los precios.
- ✅ **Cómo queda:** el que duda en el momento de decidir tiene siempre a mano la
  opción de mirar sin compromiso, justo cuando la necesita.

---

## 🥈 BLOQUE 2 — Necesitan algo de contenido tuyo (medio día cada uno)

### Paso 7 · H07 — Falta una sección de preguntas frecuentes (FAQ) `[M]`
- 🔴 **Qué pasaba:** dudas típicas que frenan la compra ("¿mis clientas tienen que
  instalar una app?", "¿puedo cancelar?", "¿cómo funciona lo de WhatsApp?") no
  tienen respuesta en ningún sitio. Cada duda sin responder = una venta perdida.
- 🔧 **Cómo se arregla:** añado una sección plegable con 6 preguntas y respuestas
  cortas antes del pie de página. Yo redacto un borrador; tú revisas que las
  respuestas sean ciertas (sobre todo precios y lo de WhatsApp).
- ✅ **Cómo queda:** las objeciones se responden solas antes de que el usuario se
  vaya a buscar la respuesta (y no vuelva).
- ⚠️ **Necesito de ti:** confirmar 3 datos: ¿las clientas necesitan app? (no),
  ¿cómo se cobran los WhatsApp?, ¿política de cancelación exacta?

### Paso 8 · H14 — La tabla comparativa es poco creíble `[M]`
- 🔴 **Qué pasaba:** comparas Elena contra "CRM Tradicional", que es algo abstracto
  que nadie reconoce. Una dueña de salón conoce Booksy o Treatwell, o sigue con la
  agenda de papel.
- 🔧 **Cómo se arregla:** cambio las columnas a lo que la gente sí conoce: "Agenda de
  papel / Google Calendar" vs "Booksy / Treatwell" vs "Elena".
- ✅ **Cómo queda:** el usuario se reconoce en su situación actual y ve la diferencia
  de un vistazo. Mucho más convincente.
- ⚠️ **Decisión tuya:** ¿te parece bien nombrar competidores reales (Booksy,
  Treatwell)? Es legal y habitual, pero quiero tu OK.

### Paso 9 · H03 — No hay prueba social (lo más importante que falta) `[M]`
- 🔴 **Qué pasaba:** no hay ni un testimonio, ni "X salones lo usan", ni una foto de
  una clienta real. Una dueña de salón necesita ver a otra como ella usándolo antes
  de fiarse. **Es el mayor freno a la conversión de toda la web.**
- 🔧 **Cómo se arregla:** añado una sección "Salones que ya recuperan clientas con
  Elena" con 1-3 testimonios (foto, nombre, salón, ciudad, una frase) y una cifra.
- ✅ **Cómo queda:** el visitante frío ve gente real como él teniendo resultados, y
  la confianza sube muchísimo.
- ⚠️ **Necesito de ti (imprescindible):** al menos 1 testimonio real. Si aún no
  tienes clientes, sirve un beta-tester con su permiso, o ponemos "Probado por
  salones en Madrid antes del lanzamiento". Sin datos reales, esto no se puede
  inventar (sería engañoso e ilegal).

---

## 🥉 BLOQUE 3 — Más laboriosos (dejar para el final)

### Paso 10 · H13 — Una sección repite lo mismo y alarga el scroll `[M]`
- 🔴 **Qué pasaba:** el bloque "Recuperar clientas, en un clic" (los 3 pasos) cuenta
  otra vez lo que ya dijo la portada, sin aportar nada nuevo. En móvil son 3
  pantallas más de scroll antes de llegar al precio, y la gente se cansa.
- 🔧 **Cómo se arregla:** dos opciones —  (a) compactarlo a una sola pantalla con un
  vídeo corto de 10s del flujo real, o (b) quitarlo y dejar que el demo haga ese
  trabajo. Recomiendo (b): más simple y el demo ya lo enseña mejor.
- ✅ **Cómo queda:** menos scroll, el usuario llega antes al precio y a la decisión.
- ⚠️ **Decisión tuya:** ¿quitar la sección o convertirla en vídeo? (el vídeo
  necesita que grabes/me pases un clip).

### Paso 11 · H04 — La pantalla de horarios es agotadora en el móvil `[M]`
- 🔴 **Qué pasaba:** el último paso del registro pide configurar 7 días con muchos
  controles (≈35 toques) en una pantalla pequeña. Es lo más pesado de todo el alta
  y mucha gente abandona justo aquí.
- 🔧 **Cómo se arregla:** añado un botón **"Usar horario habitual"** (L-V 9-18, S
  10-14, D cerrado) que rellena todo de un toque. Quien quiera ajustar, lo hace;
  quien no, avanza en 1 segundo. Y quito el "horario partido" de aquí (se configura
  luego en Ajustes).
- ✅ **Cómo queda:** el 90% pulsa un botón y termina. Solo toca el detalle quien lo
  necesita. Mucho menos abandono en el último paso.
- 📝 **Nota:** es el que más programación lleva, por eso va al final, pero su utilidad
  es alta. Si el abandono en el alta te preocupa, podemos subirlo de prioridad.

---

## Resumen de orden recomendado

| Orden | ID | Qué es | Esfuerzo | ¿Necesito algo de ti? |
|:---:|:---:|---|:---:|:---:|
| 1 | H15 | Cerrar modal al tocar fuera | S | No |
| 2 | H09 | Quitar jerga | S | No |
| 3 | H10 | Un solo botón en portada | S | No |
| 4 | H06 | Unificar textos de botones | S | No |
| 5 | H12 | Frases de seguridad concretas | S | No |
| 6 | H16 | Demo más visible | S | No |
| 7 | H07 | Sección FAQ | M | 3 datos |
| 8 | H14 | Comparativa con competidores reales | M | Tu OK |
| 9 | H03 | Prueba social / testimonios | M | 1 testimonio real |
| 10 | H13 | Quitar sección repetida | M | Decisión |
| 11 | H04 | Botón "horario habitual" | M | No |

**Mi recomendación:** hago el **Bloque 1 entero del tirón** (pasos 1-6, todo sin
depender de ti, 1-2 horas) y lo subo. Luego me pasas los datos del Bloque 2 cuando
puedas y seguimos.
