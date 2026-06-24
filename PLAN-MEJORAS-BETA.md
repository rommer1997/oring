# PLAN-MEJORAS-BETA.md — Plan unificado tras 3 auditorías externas

Tres auditorías sobre **producción real** (`elena-os.web.app`):
- Manus Beta Testing — 5 bugs con reproducción paso a paso
- Manus Análisis UX de botones — evaluación de arquitectura de información
- Evaluación UX + Psicología del Diseño (iPhone 14 + 1440×900) — 18 quick wins + veredicto 55/100

**Estado actual:** nuestra rama `claude/kind-goldberg-ym1zm7` tiene B-01 y 11 mejoras CRO
resueltas, pero **producción (`main`) sigue sin el merge**. El primer paso no es código nuevo: es desplegar.

---

## 🚨 PASO 0 — Merge a `main` + deploy (máximo impacto, esfuerzo mínimo)

Sin esto, ningún usuario nuevo puede completar el alta. Todo lo que está en la rama pero no
en producción:

| Ya hecho en rama | Resuelve |
|---|---|
| Fix onboarding paso 4 (inline errors + DPA clickable) | B-01 / QW-1 |
| Unificar CTAs a "Probar Elena 14 días gratis" | Cambio 4 / QW-17 |
| 11 mejoras CRO (jargon, seguridad, demo links, FAQ, tabla comparativa) | GLM B1-B3 |
| RGPD: consentimiento informado, DPA, borrado en 1 clic | LEG-02/04 |
| Backups cifrados AES-256 | SEC-04 |
| 24 tests automáticos | QA-01 |

- ⏱️ **S** · 🎯 **CRÍTICO — hacer antes que cualquier fix nuevo**

---

## 🔴 BLOQUE A — Bugs reales pendientes `[todos S]`

### A-1 · Botones destructivos pegados a constructivos en la Agenda `[S]`
- 🔴 COBRAR / CANCELAR / edit / delete en la misma fila horizontal en móvil: un desliz de 5mm
  cancela o borra una cita en vez de cobrarla. Es el hallazgo de mayor riesgo emocional del PDF.
- 🧩 `AgendaView.tsx` — fila de acciones sin separación ni confirmación.
- 🔧 Dejar COBRAR como botón primario visible. Mover CANCELAR y ELIMINAR a un menú `...`
  con diálogo de confirmación ("¿Cancelar la cita de María?"). EDITAR queda como icono
  secundario con `aria-label`.
- 🎯 **Alta**

### A-2 · Validar teléfono numérico `[S]` (B-03)
- 🔴 "ABCDEFGH" pasa como teléfono → mensaje de WhatsApp que nunca llega.
- 🧩 `App.tsx:389` — solo `.trim()`, sin regex. Backend valida longitud pero no formato.
- 🔧 Regex laxo `^\+?\d[\d\s\-]{5,}$` en front + `.matches()` en endpoint.
- 🎯 **Alta**

### A-3 · Confirmación antes de borrar preferencias en ficha de clienta `[S]` (QW-6 / Cambio 5)
- 🔴 Un toque en el icono `delete` junto a "le gusta el café con avena" borra para siempre
  información que costó semanas de relación con la clienta. Sin confirmación.
- 🔧 Sustituir icono `delete` por menú `...` con Editar/Eliminar + `confirm()` antes de borrar.
- 🎯 **Alta**

### A-4 · Buzón de Feedback inaccesible en tablets/móvil sin cliente de correo `[S]` (B-04)
- 🔴 `Sidebar.tsx:178` — `window.open('mailto:...')`. En dispositivos sin cliente de correo
  configurado no ocurre nada visible.
- 🔧 Mínimo viable: modal in-app que muestra el email con botón "Copiar dirección" + enlace
  `mailto:` como opción secundaria.
- 🎯 **Media**

### A-5 · Feedback inline en "Añadir servicio" vacío `[S]` (QW-2 / Cambio 3)
- 🔴 Si pulsas "Añadir servicio" sin rellenar el nombre, el botón no reacciona en absoluto.
  La usuaria piensa que la app está rota.
- 🧩 `OnboardingView.tsx:addServiceDraft` — llama a `onToastMessage` (toast lejano) pero
  no feedback visual inmediato en el botón ni en el campo.
- 🔧 Mensaje rojo inline bajo el campo + cambiar placeholder de "Corte y peinado" a
  "Ej: Corte y peinado" para que quede claro que es ejemplo, no valor.
- 🎯 **Alta** (es la 2ª causa de abandono en onboarding)

### A-6 · Inyección de fórmulas CSV al exportar `[S]` (B-02 real)
- ⚠️ El XSS de navegador reportado es falso positivo (React escapa por defecto, sin
  `dangerouslySetInnerHTML`). Pero sí hay vector real: `FacturacionView.tsx:115` une columnas
  con `.join(',')` sin comillas → nombres con coma rompen columnas; nombres como `=1+1`
  se ejecutan como fórmulas al abrir en Excel (CSV injection).
- 🔧 Envolver cada celda en comillas + escapar `"` → `""`. Neutralizar celdas que empiecen
  por `= + - @` prefijando `'`. Dos líneas.
- 🎯 **Media-alta**

---

## 🟡 BLOQUE B — Quick wins de UX/psicología `[todos S]`

Extraídos del PDF (18 quick wins oficiales). Agrupados por tema.

### Feedback del sistema
| QW | Qué | Impacto |
|---|---|---|
| QW-3 | "Guardado ✓" 2s tras perder foco en nota técnica de ficha de clienta (autoguarda sin aviso) | +conf. |
| QW-4 | Microcopy bajo toggles de Ajustes: "Los cambios se guardan al pulsar Guardar al final" | -confusión |

### Jerarquía y acciones
| QW | Qué | Impacto |
|---|---|---|
| QW-7 | "PROGRAMAR CITA" en agenda con más peso visual que los toggles Vista Diaria / Lista | +CTA |
| QW-8 | Mover "Activar todas las herramientas ✨" a sección colapsada al final del dashboard | -saturación |

### Copy y etiquetas
| QW | Qué | Impacto |
|---|---|---|
| QW-9 | "MODO AUTOMÁTICO" WhatsApp → "Elena está redactando — toca para revisar" | -miedo IA |
| QW-10 | Placeholders confundibles → añadir "Ej:" delante (Dirección, servicios, contraseña fuera del input) | -confusión |
| QW-11 | Añadir icono ✓ / ⏱ a estados de cita (no solo color: accesibilidad) | +accesibilidad |
| QW-12 | Bajar mayúsculas innecesarias: "ATENCIÓN URGENTE" → "Atención urgente" | -agresividad |

### Accesibilidad objetiva
| QW | Qué | Norma |
|---|---|---|
| QW-13 | Textos cuerpo en móvil: subir de 12-13px a 15-16px en agenda/clientes/ajustes | WCAG 1.4.4 |
| QW-14 | Oscurecer placeholders a ≥4.5:1 contraste | WCAG 1.4.3 |
| QW-15 | Focus visible con color de marca en navegación por teclado | WCAG 2.4.7 |
| QW-16 | `aria-label` en iconos-only (edit, delete, settings, notifications, mail) | WCAG 4.1.2 |

### Reducción de carga cognitiva
| QW | Qué | Impacto |
|---|---|---|
| QW-18 | Filtros de Clientes: ocultar avanzados tras botón "Filtros", mostrar solo búsqueda + lista por urgencia | -saturación |

---

## 🟢 BLOQUE C — Mejoras de esfuerzo medio `[M]`

### C-1 · FAB "Programar Cita" en móvil (UX-03)
- Botón flotante abajo-derecha en viewport <768px que abre el mismo modal. Ergonomía con
  una mano.
- ⏱️ **M** · 🎯 Media

### C-2 · Colapsar filtros avanzados de Clientes (QW-18 extendido)
- Reestructurar la cabecera de Clientes: solo búsqueda visible por defecto, filtros tras "Filtros ▾".
- ⏱️ **M** · 🎯 Media

---

## Orden de ejecución recomendado

| Sprint | Qué | Esfuerzo total | Impacto |
|:---:|---|:---:|:---:|
| **Esta semana** | Merge + deploy (`main`) | S | 🚨 Crítico |
| **Sprint 1** | A-1 (agenda destructiva), A-2 (teléfono), A-3 (borrar prefs), A-5 (servicio vacío), A-6 (CSV) | ~1 día | Alto |
| **Sprint 2** | QW-3,4,7,8,9,10,11,12 (copy + jerarquía) | ~1 día | Medio-alto |
| **Sprint 3** | QW-13,14,15,16 (accesibilidad) + A-4 (feedback in-app) | ~1 día | Medio |
| **Sprint 4** | C-1 FAB móvil, C-2 filtros colapsados | ~1 día | Medio |

**Si se ejecutan todos los Bloques A + B, el veredicto del PDF subiría del 55% actual a
~80-85% de adopción percibida.** Los Bloques A resuelven los callejones sin salida; los
Bloques B convierten "funciona" en "me cuida".

---

## Nota: qué NO hacer
- ❌ **No "arreglar el XSS de navegador"**: no existe. React escapa todo. Perseguirlo sería
  tiempo perdido. El vector CSV (A-6) sí vale la pena.
- ❌ **No reescribir la agenda desde cero**: el problema de los botones destructivos se
  resuelve con un menú `...` y un `confirm()`, no con una refactorización.
- ❌ **No meter tooltips custom con librerías**: `title=""` nativo cubre QW-16 en desktop,
  `aria-label=""` cubre lectores de pantalla. Una línea por icono.
