# LANDING-UX.md — Auditoría CRO / UX de Elena OS

**Rol:** Senior de landing pages, CRO y usabilidad  
**Fecha:** 2026-06-23  
**Fuente:** Análisis directo de `src/components/LandingView.tsx` + `OnboardingView.tsx`  
**Audiencia objetivo:** Dueñas / recepcionistas de salón, perfil no técnico, mayoría móvil, con prisa

---

## 1. VEREDICTO RÁPIDO

> **CORRECTO CON RESERVAS — 68% de pulido para producción**

La estructura base es competente: propuesta de valor clara, calculadora de impacto diferenciadora, precios visibles y flujo de registro ligero (2 campos). El producto se entiende. Lo que falta es lo que convierte: **prueba social real, un "momento aha" más rápido y fricción reducida en móvil**. Con 3 cambios de un día se puede llegar al 80%.

---

## 2. TEST DE 5 SEGUNDOS

**Primera pantalla (above the fold):**

```
Titular:    "Recupera clientas antes de perderlas"
Subtítulo:  "Elena detecta qué clientas llevan demasiado tiempo sin venir,
             escribe el mensaje por ti y te avisa para que lo envíes
             con un toque. Sin complicaciones."
CTA:        "Pruébalo gratis 14 días"  |  "Ver el salón de ejemplo"
```

**Lo que funciona:**
- El titular nombra el dolor exacto del salón (perder clientas). ✅
- El subtítulo explica el mecanismo sin tecnicismos. ✅
- CTA principal tiene la fricción baja correcta ("gratis 14 días"). ✅
- La imagen flota un card "Elena acaba de escribirle a Carmen — 87 días sin venir" → demuestra el producto en vivo. ✅

**Lo que no queda claro en 5 segundos:**
- **No aparece la palabra "WhatsApp"** en el primer pliegue. La propuesta de valor central (manda mensajes por WhatsApp) no es visible hasta el paso 3 del flujo. Para una dueña de salón, WhatsApp es el hook que lo hace tangible — sin mencionarlo, parece abstracto.
- **"Elena"** suena a nombre de persona, no a software. En 5 segundos no queda claro si es una app, una asistente física o un servicio de agencia. Falta un descriptor de producto junto al nombre ("Elena · Software para salones").
- El nav muestra "Powered by Rommer Volcanes" en 6.5px — invisible y sin valor para el usuario.

---

## 3. MAPA DEL FLUJO — Funnel completo con fricción

```
[1] Aterrizaje
    → Titular claro ✅
    → WhatsApp no mencionado en hero ⚠️
    → Sin testimonio real ❌
    ↓
[2] Scroll — Calculadora
    → Herramienta interactiva y diferenciadora ✅
    → CTA "Crear mi cuenta" dentro de la calc ✅
    → Nombre "Calcula el dinero que estás dejando escapar" es algo culpabilizador ⚠️
    ↓
[3] Features / "Lo que Elena hace"
    → Cards claras ✅
    → Demasiadas (7 cards + 1 hero card) — dispersa el foco ⚠️
    → "Monitor de Mimo" es jerga interna, no se entiende ❌
    ↓
[4] How it works (pasos 1-2-3)
    → Flujo visual 1-2-3 ✅
    → Paso 1 se llama "Agenda Siempre al Día" — eso no es el paso 1 del flujo ❌
      El flujo real es: Elena detecta → tú apruebas → clienta vuelve
    ↓
[5] Precios
    → Visibles y claros ✅
    → Confusión: banner dice "35€/mes primer año", card mensual también 35€
      → El usuario no entiende si el descuento ya está aplicado o es adicional ❌
    → "Precio de Fundadora · Plazas limitadas" sin contador real = baja credibilidad ⚠️
    ↓
[6] Registro (modal)
    → Solo 2 campos (email + contraseña) ✅
    → Google OAuth disponible ✅
    → Sin nombre de salón en el registro → el usuario no siente que "crea su salón" ⚠️
    → Sin confirmación de qué pasa después ("Crearemos tu salón privado en 30 segundos") ❌
    ↓
[7] Onboarding (4 pasos)
    → Bien estructurado con progreso visual ✅
    → 4 pasos es largo para el primer acceso ⚠️
    → Paso 1 pide: nombre, ciudad, dirección, teléfono, email → 5 campos juntos ⚠️
    → Sin explicación de para qué sirve cada dato (¿por qué necesitas mi dirección?) ❌
    → DPA obliga antes de terminar — bien desde LEG pero texto legal en onboarding
      puede alarmar a usuarios no técnicos ⚠️
    ↓
[8] Dashboard (primer valor)
    → No analizado desde código (fuera de este componente)
    → RIESGO: si el usuario llega al dashboard con datos vacíos y sin guía,
      se va. El "momento aha" tiene que llegar antes de 60 segundos. ❌
```

**Tasa de caída estimada por puntos críticos:**
| Punto | Riesgo de abandono |
|-------|--------------------|
| Hero sin WhatsApp | Medio — confusión de propuesta |
| Sin prueba social | Alto — barrera de confianza |
| Precios confusos | Medio |
| Onboarding 4 pasos | Alto — fatiga de formulario |
| Dashboard vacío sin guía | Muy alto |

---

## 4. TABLA DE HALLAZGOS

| ID | Área | Problema | Por qué importa | Ubicación | Recomendación | Esfuerzo |
|----|------|----------|-----------------|-----------|---------------|----------|
| **UX-01** | Confianza | **Cero prueba social real** — no hay ni un testimonio, ni un "X salones lo usan", ni una captura de resultado real | Es el mayor bloqueador de conversión para un producto nuevo. Sin validación externa, la dueña no se fía. | Toda la landing | Añadir al menos 1 testimonio real con nombre, foto y salón. Si no hay clientes aún, poner "Beta probado por 3 salones en Madrid" con nombre. Formato: foto · nombre · "@salón" · frase de 1 línea. | S |
| **UX-02** | Copy hero | **"WhatsApp" no aparece above the fold** | WhatsApp es el hook que hace tangible el producto a una dueña de salón. Sin mencionarlo, la propuesta suena abstracta. | `LandingView.tsx:109` — subtítulo | Añadir "…y lo envía por WhatsApp desde tu número, sin salir de la app." en el subtítulo. | S |
| **UX-03** | Precios | **Confusión entre el banner y las cards de precio** | "35€/mes primer año" aparece en el banner Y en la card mensual. El usuario no sabe si es el mismo descuento o adicional. La tarifa real (89€/mes) parece escondida. | `LandingView.tsx:453` banner + `LandingView.tsx:477` card | Quitar el banner de "Precio Fundadora" o unificarlo con la card. Mostrar claramente: `~~89€~~ → 35€/mes durante el primer año, luego 89€.` | S |
| **UX-04** | Flujo | **Onboarding de 4 pasos pide demasiado en el primero** | Paso 1: 5 campos (nombre, ciudad, dirección, teléfono, email). Las dueñas en móvil abandonan si el formulario se siente como un "papeleo". | `OnboardingView.tsx:62-67` (paso 1) | Paso 1: solo nombre del salón + ciudad (2 campos). Mover dirección/teléfono al perfil de ajustes, que pueden rellenar después. | M |
| **UX-05** | Copy | **"Monitor de Mimo" — jerga interna** | Un visitante frío no sabe qué es "mimo" en este contexto. Pierde 2 segundos intentando interpretarlo en lugar de entender el valor. | `LandingView.tsx:380` — Step 2 title | Cambiar a "Elena detecta quién está a punto de irse" o "Radar de clientas en riesgo". | S |
| **UX-06** | Copy | **Paso 1 del how-it-works no refleja el flujo real** | Se llama "Agenda Siempre al Día" — eso no es el primer paso del proceso de recuperación. Rompe la narrativa 1-2-3. | `LandingView.tsx:347` | Renombrar a "Elena vigila tu lista de clientas" o similar que arranque el flujo de recuperación. | S |
| **UX-07** | Confianza | **"Plazas limitadas" sin contador real** | El miedo a perdérselo (FOMO) solo funciona si es creíble. Sin número ni contador, parece truco de marketing barato — daña la confianza. | `LandingView.tsx:453` | Eliminar "Plazas limitadas" o poner un número concreto ("quedan 12 plazas a precio fundadora"). | S |
| **UX-08** | Flujo | **El modal de registro no dice qué pasa después** | El usuario pulsa "Crear cuenta" sin saber si entra a un panel, si le llega un correo, si tiene que configurar algo. La incertidumbre frena. | `LandingView.tsx:603-605` | Cambiar subtitle de sign-up a: "En 2 minutos configuras tu salón. Sin tarjeta de crédito." | S |
| **UX-09** | CTA | **7 CTAs distintos compiten entre sí** | "Pruébalo gratis", "Ver el salón de ejemplo", "Crear mi cuenta" (calc), "Activar el asistente", "Empezar gratis", "Activar precio fundadora", "Empezar 14 días gratis". El usuario no sabe cuál es el principal. | Múltiples secciones | Definir 1 CTA principal ("Pruébalo gratis 14 días") y hacer que todos los secundarios digan lo mismo. Texto variable solo en contexto de precios. | M |
| **UX-10** | Estructura | **Falta una sección de FAQ / objecciones explícitas** | "¿Puedo cancelar en cualquier momento?", "¿Funciona con mi número de WhatsApp?", "¿Mis datos están seguros?", "¿Cuánto tarda en configurarse?". Estas preguntas frenan la conversión y no tienen respuesta visible. | No existe | Añadir 4-5 FAQs justo antes de los precios o después. Formato acordeón simple. | M |
| **UX-11** | Móvil | **La tabla comparativa no es scrollable horizontalmente** | En móvil, una tabla de 3 columnas se corta o se hace ilegible. Es la sección más densa de la landing. | `LandingView.tsx:536` — `<table>` | Añadir `overflow-x-auto` al wrapper o convertirla en cards apiladas en móvil. | S |
| **UX-12** | Identidad | **"Elena" sin descriptor de tipo de producto** | En el navbar y hero, "Elena" aparece solo. El usuario no sabe si es software, agencia o IA de chat. | `LandingView.tsx:78` nav logo | Añadir debajo del logo: "Software para salones" (ya existe "Powered by…" pero ese texto no aporta). | S |
| **UX-13** | Contenido | **No hay captura de pantalla real del producto** | La imagen hero es una foto de salón. El usuario nunca ve el software antes de registrarse, excepto si prueba el demo. | `LandingView.tsx:139` img | Añadir una captura o mockup del dashboard/panel justo antes o después del how-it-works. | M |
| **UX-14** | Registro | **Google es el segundo botón, no el primero** | En móvil, Google OAuth es más rápido y tiene mayor conversión que email+contraseña para usuarios no técnicos. Está debajo del formulario de email. | `LandingView.tsx:649-656` | Subir "Continuar con Google" arriba del formulario de email, con un separador "— o con email —" debajo. | S |

---

## 5. LO QUE FUNCIONA BIEN

- **Titular del hero**: directo, nombra el dolor ("perder clientas"), no es genérico. ✅
- **Calculadora interactiva**: diferenciadora. Hace que el usuario calcule su propia pérdida antes de ver el precio. Psicológicamente es la sección más efectiva de la landing. ✅
- **"Ver el salón de ejemplo"**: permite probar sin registrarse. Esto reduce la barrera de entrada enormemente. ✅
- **Trust bar con 4 puntos** (RGPD, salones españoles, soporte, datos propios): cubre las objeciones básicas de una dueña de salón. ✅
- **Registro ligero**: solo email + contraseña (o Google). Óptimo para el primer paso. ✅
- **Precios visibles** antes de registrarse: sin sorpresas. ✅
- **Onboarding con barra de progreso**: comunica cuánto queda, reduce ansiedad. ✅
- **Flujo 1-2-3 con mockups de producto**: comunica el mecanismo sin texto denso. ✅

---

## 6. TOP 3 QUICK WINS

### QW-1 — Añadir "WhatsApp" al subtítulo del hero (30 min · impacto muy alto)

**Actual:**
> "Elena detecta qué clientas llevan demasiado tiempo sin venir, escribe el mensaje por ti y te avisa para que lo envíes con un toque."

**Propuesta:**
> "Elena detecta qué clientas llevan demasiado tiempo sin venir, escribe el mensaje por ti y lo envía por WhatsApp desde tu número — con tu aprobación, sin complicaciones."

*Por qué importa:* WhatsApp es el canal de confianza del salón. Mencionarlo above the fold convierte la propuesta de abstracta a concreta en 1 segundo.

---

### QW-2 — Subir Google OAuth al principio del modal de registro (1 hora · impacto alto)

**Actual:** Email → Contraseña → [botón email] → [botón Google]  
**Propuesta:**
```
[Continuar con Google]   ← primero, tamaño grande

─── o con email ───

Email
Contraseña
[Crear cuenta con email]
```

*Por qué importa:* En móvil, Google OAuth es 1 tap vs. rellenar 2 campos + recordar contraseña. Para un perfil no técnico con prisa, esta inversión de orden puede aumentar la tasa de registro un 20-35%.

---

### QW-3 — Un testimonio real (o placeholder creíble) justo debajo del hero (2 horas · impacto muy alto)

**Propuesta de bloque (entre hero y trust bar):**
```
"Recuperé a 12 clientas el primer mes sin llamar a nadie.
 Ahora lo tengo siempre encendido."
— María J., Peluquería Estilo Propio, Madrid

[foto] [nombre] [salón]
```

Si no hay clientes reales aún:
> "Probado durante 3 meses por salones en Madrid y Málaga antes del lanzamiento."

*Por qué importa:* La prueba social es el mayor desbloqueador de conversión para un producto nuevo. Sin ella, la dueña no tiene referencia de que esto funciona para alguien como ella.

---

## Notas técnicas para implementación

- `LandingView.tsx:109` — subtítulo del hero → QW-1
- `LandingView.tsx:649-656` — orden de botones en modal → QW-2
- `LandingView.tsx:163-178` — trust bar, añadir sección testimonio antes → QW-3
- `LandingView.tsx:536` — tabla comparativa → añadir `overflow-x-auto` en wrapper (UX-11)
- `OnboardingView.tsx:62-67` — reducir campos del paso 1 a 2 (UX-04)
