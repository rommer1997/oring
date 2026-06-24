# PLAN-MEJORAS-BETA.md — Plan óptimo tras auditoría Manus (producción)

Las auditorías de Manus (beta testing + UX) se hicieron con recorridos **reales sobre
producción** (`elena-os.web.app` = rama `main`). Por tanto reflejan el estado **desplegado**,
no el de nuestra rama `claude/kind-goldberg-ym1zm7`, que tiene B-01 ya corregido y todas las
mejoras CRO **sin desplegar todavía**.

Cada punto: 🔴 problema · 🧩 causa en el código · 🔧 solución · ⏱️ esfuerzo · 🎯 prioridad

---

## 🚨 P0 — Desplegar lo que ya está hecho (máximo impacto, mínimo esfuerzo)

El fix de **B-01 (bloqueo en onboarding)** ya existe en nuestra rama (commit `434ae55`),
pero **producción sigue rota**: ningún usuario nuevo puede entrar al panel. Cada día sin
desplegar = registros perdidos.

- 🔧 **Solución:** mergear `claude/kind-goldberg-ym1zm7` → `main` y desplegar a Firebase
  Hosting. Con esto, de golpe, llega a producción: el fix de onboarding + los 11 fixes CRO
  + RGPD + cifrado de backups + 24 tests.
- ⏱️ **S** (un PR + deploy) · 🎯 **CRÍTICA — hacer primero**

---

## 🔴 P1 — Bugs reales nuevos (no cubiertos por la rama)

### B-03 · Teléfono inválido aceptado `[S]`
- 🔴 Escribes "ABCDEFGH" en el teléfono de una cita y lo acepta como clienta nueva.
- 🧩 `App.tsx:389` (`handleQuickAppointmentSubmit`) solo hace `.trim()`, sin validar formato.
  El backend (`server.ts:594`) valida longitud (6-64) pero **no** que sean dígitos.
- 🔧 Validar formato de teléfono (regex E.164 laxo: `^\+?\d[\d\s]{6,}$`) en el front antes de
  aceptar, y reforzar con `.matches()` en el endpoint. Mensaje claro si falla.
- ⏱️ **S** · 🎯 **Alta** (afecta a WhatsApp: un teléfono basura = mensaje que nunca llega)

### B-02 · "XSS" → en realidad es **inyección CSV** `[S]`
- ⚠️ **El XSS de navegador es FALSO POSITIVO:** no hay `dangerouslySetInnerHTML` en el código;
  React escapa todo al renderizar, así que `<script>` se muestra como texto, no se ejecuta.
  Manus vio el payload *guardado* y lo interpretó como ejecutado.
- 🔴 **Pero hay un vector real adyacente:** la exportación CSV. `FacturacionView.tsx:115` hace
  `r.join(',')` **sin comillas** → un nombre con coma rompe columnas, y un nombre tipo
  `=HYPERLINK(...)` o `=1+1` **se ejecuta como fórmula al abrir en Excel** (CSV injection).
  `SettingsView.tsx:580` sí pone comillas, pero tampoco neutraliza fórmulas.
- 🔧 (a) Anteponer `'` a celdas que empiecen por `= + - @` en ambos exports.
  (b) Citar correctamente en `FacturacionView` (comillas + escape de `"`).
- ⏱️ **S** · 🎯 **Media-alta** (seguridad real, pero solo al exportar; el XSS reportado no existe)

### B-04 · Buzón de Feedback "inaccesible" `[S-M]`
- 🔴 Pulsas "Buzón de Feedback" y no pasa nada.
- 🧩 `Sidebar.tsx:178` hace `window.open('mailto:...')`. En un dispositivo sin cliente de
  correo configurado (el caso de Manus, y de muchas peluqueras en tablet), el `mailto:` no
  abre nada → parece roto.
- 🔧 Sustituir por un **modal de feedback in-app** (textarea + envío a un endpoint o a
  Firestore `feedback/`), con `mailto:` como fallback secundario y la dirección visible para
  copiar. Mínimo viable: modal que muestre el email y un botón "Copiar".
- ⏱️ **M** (modal nuevo) / **S** si solo mostramos email copiable · 🎯 **Media**

---

## 🟡 P2 — Pulido UI/UX (de los dos informes)

### B-05 · Nombres largos desbordan `[S]`
- 🔴 Un nombre muy largo rompe el toast, la lista de clientas y el panel lateral.
- 🔧 `truncate` / `break-words` + `max-w` en los 3 puntos (toast, tarjeta de clienta, aside).
- ⏱️ **S** · 🎯 **Baja**

### UX-01 · Tooltips en iconos de cabecera `[S]`
- 🔴 Iconos de notificaciones/correo no explican su función hasta pulsarlos.
- 🔧 Añadir `title=` (o tooltip) a los iconos del header. Una línea cada uno.
- ⏱️ **S** · 🎯 **Baja**

### UX-02 · Área de clic de iconos editar/eliminar `[S]`
- 🔴 En tablet (manos ocupadas/guantes) los iconos `edit`/`delete` son difíciles de acertar.
- 🔧 Subir el área tocable a ≥40px (`p-2` + `min-w/min-h`). Sin cambiar el diseño.
- ⏱️ **S** · 🎯 **Baja-media**

### UX-03 · FAB "Programar Cita" en móvil `[M]`
- 🔴 En móvil/tablet el CTA principal está arriba en el lateral; incómodo con una mano.
- 🔧 Botón flotante (FAB) abajo a la derecha en viewport pequeño que abre el mismo modal.
- ⏱️ **M** · 🎯 **Baja** (mejora ergonómica, no bloqueante)

---

## Orden recomendado

| Orden | ID | Qué | Esfuerzo | Prioridad |
|:---:|:---|:---|:---:|:---:|
| 1 | P0 | Merge a `main` + deploy (lleva B-01 y todo lo demás a producción) | S | 🚨 Crítica |
| 2 | B-03 | Validar teléfono numérico | S | Alta |
| 3 | B-02 | Neutralizar inyección CSV en exports | S | Media-alta |
| 4 | B-04 | Feedback in-app (o email copiable) | S-M | Media |
| 5 | B-05 | Truncar nombres largos | S | Baja |
| 6 | UX-01/02/03 | Tooltips, click targets, FAB móvil | S-M | Baja |

**Recomendación:** P0 ya mismo (es el de más impacto y desbloquea producción), luego B-03 +
B-02 + B-05 juntos en una tanda (todos `[S]`), y dejar B-04 y el bloque UX para una segunda
ronda. No invertir nada en "arreglar el XSS de navegador": no existe.
