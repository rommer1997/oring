# Auditoría de Viabilidad de Producción — Elena OS

**Fecha:** 2026-06-22
**Repositorio:** rommer1997/oring · **App en vivo:** https://elena-os.web.app
**Objetivo de la auditoría:** determinar si Elena OS está listo para venderse a clientes de pago reales, alojado en un dominio propio de producción (p. ej. `elena.com.es`).
**Equipo auditor (8 disciplinas en paralelo):** Arquitectura · Frontend · Backend/Datos · Seguridad · DevOps/SRE · QA/Testing · UX/UI · Producto/Legal.

> **Metodología real ejecutada:** `npm install` (OK), `tsc --noEmit` (**exit 0, sin errores**), `vite build` (**exit 0**, con avisos), `npm audit` (15 vulnerabilidades), inspección línea a línea de `firestore.rules`, `server.ts`, `App.tsx`, `firebase.ts`, `render.yaml`, workflows de CI y componentes React. Cada hallazgo lleva evidencia `archivo:línea`. Las severidades de los especialistas se han **recalibrado por el líder de auditoría** al contexto real (MVP para salones pequeños, instancia única en Render, presupuesto bajo): varias marcas "Bloqueante/Crítico" de deuda de mantenibilidad se han bajado a "Mayor", y se ha **corregido un falso positivo** (ver SEG-FP).

---

## 1. RESUMEN EJECUTIVO Y VEREDICTO

Elena OS es un MVP **técnicamente funcional de extremo a extremo**: compila sin errores de tipos, construye, y el flujo central (detección de clientas en riesgo → generación de mensaje con IA → aprobación → envío por WhatsApp → reserva) opera. La base de seguridad es **mejor de lo esperado**: `firestore.rules` está bien diseñado (deny-all global, aislamiento por tenant, campos de facturación inmutables desde el cliente, logs append-only), no hay secretos de servidor en el código ni en el bundle, y el backend ya tiene verificación de token, firma de Stripe y rate limiting.

Sin embargo, **no es vendible hoy en un dominio de pago** por una combinación de bloqueantes **legales (RGPD/LOPDGDD)** y **dos fallos de seguridad concretos** en el webhook de WhatsApp. Ninguno es un rediseño: la mayoría son de esfuerzo S/M.

### VEREDICTO: **NO — Vendible CON RESERVAS tras ~1 sprint de correcciones**

| Escenario | ¿Listo? | Preparación |
|---|---|---|
| **Demo / piloto controlado** (1–3 salones partner, contrato simple firmado a mano) | SÍ, ya | ~80% |
| **Venta de pago en dominio propio** (`elena.com.es`, autoservicio) | NO todavía | **~70%** |

**Lo que separa el 70% del 100% (todo Fase 1, ~1 sprint):** cumplimiento RGPD (banner de cookies, DPA, derecho al olvido), firma del webhook de WhatsApp, vulnerabilidades npm, y mover los backups con PII fuera de git. El motor de producto ya está; lo que falta es **envoltura legal y endurecimiento**, no funcionalidad.

---

## 2. TABLA DE HALLAZGOS POR DISCIPLINA

Severidad: **Bloqueante** (impide vender) · **Crítico** (riesgo grave, corto plazo) · **Mayor** · **Menor** · **Mejora**. Esfuerzo: **S** (<½ día) · **M** (½–2 días) · **L** (>2 días).

### 2.1 Seguridad

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| SEC-01 | **Webhook WhatsApp sin verificación de firma.** El comentario dice "Verificar firma de Meta" pero no hay ninguna comprobación: responde `200` y procesa cualquier payload. Cualquiera puede inyectar mensajes entrantes falsos que disparan respuestas IA y envíos reales. **Corroborado de forma independiente por 2 especialistas (Seguridad y Arquitectura).** | Crítico | `server.ts:1351-1353` | Validar `X-Hub-Signature-256` con HMAC-SHA256 sobre el body crudo usando `META_WA_APP_SECRET` antes de procesar. | S |
| SEC-02 | **Fuga cross-tenant en el webhook.** Busca campañas con `collectionGroup('agent_campaigns').where('clientPhone','>=', from.slice(-9)).limit(1)` — un rango lexicográfico **sin scoping de tenant**. Puede emparejar el mensaje de un cliente con la campaña de **otro salón** (y responder con datos de ese salón). Además el match por prefijo de 9 dígitos es incorrecto si el teléfono está formateado con espacios. | Crítico | `server.ts:1368-1372` | Resolver el `tenantId` desde el payload firmado de Meta y consultar `tenants/{tenantId}/agent_campaigns` con igualdad exacta de teléfono normalizado. | M |
| SEC-03 | **15 vulnerabilidades npm (1 crítica, 2 altas, 12 moderadas).** Todas transitivas vía `firebase-admin → @google-cloud/firestore → google-gax → uuid/retry-request/teeny-request`. Solo afectan al backend (no al bundle cliente). El fix requiere `firebase-admin@14` (breaking). | Crítico | `package.json:25`; salida `npm audit` | `npm install firebase-admin@14`, validar el SDK Admin (cambios menores de API), re-test. | M |
| SEC-04 | **Backups con PII en el repositorio git.** El workflow de backup (introducido recientemente) hace `git push` de exportaciones que incluyen teléfonos y nombres de clientas a la historia de git. Problema RGPD: la historia de git es difícil de purgar (choca con el derecho al olvido) y expande el repo. *(Hallazgo sobre trabajo propio reciente — se asume.)* | Mayor | `.github/workflows/firestore-backup.yml`; `scripts/firestore-backup.mjs` | Exportar a Google Cloud Storage (bucket privado, ciclo de vida 30 días) en vez de a git; o como mínimo cifrar el JSON con una clave en GH Secrets. | M |
| SEC-05 | **Prompt injection en `/api/generate-whatsapp`.** Campos de usuario (`clientName`, `lastService`, `preferences`) se interpolan directos en el prompt de Gemini. `express-validator` valida tamaño/tipo, no contenido. Un nombre malicioso puede inyectar instrucciones al modelo. | Mayor | `server.ts:~708-763, 797-858` | Pasar datos de usuario como `contents` separados del `systemInstruction`; whitelist de caracteres para nombres. | M |
| SEC-06 | **CSP permite `'unsafe-inline'` en `styleSrc`.** Debilita la protección anti-inyección de estilos. | Mayor | `server.ts:196` | Restringir a `'self'` + nonce para estilos dinámicos puntuales (Tailwind genera CSS en build). | S |
| SEC-07 | **Token JWT en query param para SSE** (`/api/agent/wa-status`). Los query params se registran en logs/referer → exposición de token. | Menor | `server.ts:~1540` | Usar cookie segura `httpOnly` o un `sessionId` de un solo uso para el stream. | M |
| **SEC-FP** | **FALSO POSITIVO corregido:** un especialista marcó "`.env` commiteado". **Verificado en primera persona: `.env` NO está trackeado** — `git ls-files` solo devuelve `.env.example`; `.gitignore` ignora `.env*` salvo el ejemplo. La `apiKey` de Firebase sí aparece en el bundle, lo cual es **correcto y esperado** (la apiKey web es pública por diseño, protegida por las rules + Auth). Sin acción. | — | `.gitignore:7-8`; `git ls-files` | — | — |

### 2.2 DevOps / SRE

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| OPS-01 | **CORS y env apuntan solo al dominio viejo.** `ALLOWED_ORIGINS` está fijado a `https://elena-os.web.app`. Al migrar a `elena.com.es`, el frontend será bloqueado por CORS → caída total post-migración. | Mayor (bloqueante de migración) | `render.yaml`; `.env.example` | Actualizar `ALLOWED_ORIGINS` a `https://elena.com.es,https://www.elena.com.es` y `VITE_API_URL` a la URL de API del nuevo dominio. | S |
| OPS-02 | **`render.yaml` sin `healthCheckPath` ni secretos de Stripe.** Existe `/api/health` pero Render no lo usa para detectar caídas. Además `.env.example` declara `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` pero `render.yaml` no los lista como `envVars` → o se configuran a mano en el panel o Stripe está roto en prod (config drift). | Mayor | `render.yaml` | Añadir `healthCheckPath: /api/health` y declarar los secretos de Stripe (`sync: false`). | S |
| OPS-03 | **Sesión de WhatsApp en disco efímero.** Baileys persiste credenciales en `.wa-auth/{tenantId}` en el filesystem. En Render free/sin disco persistente, cada reinicio o redeploy **borra todas las sesiones** → los salones deben re-escanear el QR. *(Mitigado en parte por el fallback de envío manual ya implementado, pero la UX sigue siendo mala.)* | Mayor | `server.ts:454, 1431` | Añadir disco persistente en Render ($7/mes) o mover credenciales a Firestore/Redis. | M |
| OPS-04 | **CI despliega directo a producción, sin staging.** `deploy.yml` despliega a Firebase Hosting en cada push a `main`. Un error ya causó un deploy roto en sesiones previas. No hay canary ni aprobación. | Mayor | `.github/workflows/deploy.yml` | Crear proyecto/canal de staging; gate de aprobación; health check post-deploy. El paso de tests ya se añadió recientemente. | M |
| OPS-05 | **CI solo despliega el frontend.** El backend (`server.ts`) se despliega aparte (auto-deploy de Render). Frontend y backend pueden quedar desincronizados sin que nadie lo note. | Menor | `deploy.yml` (no toca Render) | Documentar el acoplamiento de versiones; o disparar deploy de Render desde el mismo workflow. | S |
| OPS-06 | **Sin monitorización de errores ni uptime.** No hay Sentry ni alertas. Los `500` se loguean a stdout y se pierden. Combinado con el cold-start de Render free. | Mayor | ausencia en `server.ts` | UptimeRobot (gratis) sobre `/api/health` para uptime + evitar cold start; Sentry free tier para errores. | S |
| OPS-07 | **Backup Firestore solo semanal.** Cron `0 3 * * 0`. Un fallo el jueves pierde 6 días. | Menor | `firestore-backup.yml:4` | Pasar a diario (`0 3 * * *`). | S |

### 2.3 Producto / Legal (RGPD / LOPDGDD) — **el bloque que más pesa para vender en España**

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| LEG-01 | **Sin banner de consentimiento de cookies.** La política de cookies existe como texto, pero no hay banner que pida consentimiento previo. RGPD Art. 7 / guía AEPD → exposición a sanción. | Crítico | `LandingView.tsx` (sin banner en render) | Banner modal on-load con aceptar/rechazar; flag en `localStorage`; bloquear analítica no esencial hasta consentir. | S |
| LEG-02 | **Sin DPA (contrato de encargo de tratamiento).** Elena es Encargado del Tratamiento; el salón es Responsable. RGPD Art. 28 exige contrato. La landing promete "cumple RGPD" sin documento vinculante. | Bloqueante | `LandingView.tsx` (promesa sin contrato) | Plantilla DPA (1–2 págs) + aceptación obligatoria en onboarding antes de continuar. | M |
| LEG-03 | **Derecho al olvido (Art. 17) sin hard-delete.** Las rules solo permiten soft-delete. No hay endpoint que borre por completo los datos de una clienta con traza de auditoría. LOPDGDD obliga a supresión efectiva. | Crítico | `firestore.rules:340-341`; sin endpoint en `server.ts` | `POST /api/client/:id/hard-delete` (solo admin): registra auditoría → borra doc + subcolecciones → anula referencias. | M |
| LEG-04 | **Consentimiento de contacto no visible en la reserva online.** El campo `contactConsent` existe en el modelo y el backend lo exige, pero el checkbox no se muestra de forma clara en el formulario público. | Mayor | `PublicBookingView.tsx`; `server.ts` (booking) | Checkbox explícito con texto legal: "Autorizo recibir recordatorios y ofertas por WhatsApp". | S |
| LEG-05 | **Sin factura PDF (requisito fiscal España).** Solo hay export CSV de citas pagadas. Falta factura con número secuencial, datos fiscales, base/IVA. | Mayor | `FacturacionView.tsx` | Exponer las invoices de Stripe, o generar PDF simple con jsPDF. | M |
| LEG-06 | **Política de cancelación/reembolso poco clara.** Hay una frase enterrada en el modal legal; no hay UI clara para cancelar ni términos visibles (LSSI-CE Art. 10). | Mayor | `LandingView.tsx`; `PaywallView.tsx` | Sección "Facturación y cancelación" en ajustes con cancel 1-click (portal Stripe ya existe) + términos. | S |
| LEG-07 | **Email de soporte no accesible.** Se menciona `soporte@elenaos.app` pero el link "Contacto" hace scroll, no abre email. | Menor | `LandingView.tsx` (footer) | `mailto:` en footer + contacto en ajustes. | S |
| ✓ | **Lo que SÍ cumple:** Política de Privacidad y Aviso Legal redactados; derecho de portabilidad (export CSV); rectificación (edición de fichas); oposición (`marketingOptOut`); transferencias internacionales declaradas (Firebase EU); mención a reclamación AEPD. | — | `LandingView.tsx` (modales legales) | Mantener | — |

### 2.4 Backend / Datos

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| BE-01 | **`PUT /api/agent/config` sin validación.** Hace `.set(req.body, {merge:true})` directo a Firestore. Acepta cualquier tipo/valor (`maxActivePerDay: "abc"`, `cooldownDays: -100`). | Mayor | `server.ts:~1319` | Añadir `express-validator` (bool/int con rangos) como en el resto de endpoints. | S |
| BE-02 | **Envío a WhatsApp sin cola ni dedup.** Si `sock.sendMessage` falla en silencio pero el update de Firestore tiene éxito, el log marca "enviado" un mensaje que nunca salió. | Mayor | `server.ts:~1177-1207` | Verificar el resultado del envío antes de marcar `enviado`; reintento con backoff. (Una cola Bull/Redis es overkill para el volumen actual — YAGNI.) | M |
| BE-03 | **Stub permanente de WhatsApp se silencia.** `sendWhatsAppMessage` devuelve `true` si faltan tokens Meta → en prod sin token, los envíos "tienen éxito" sin enviar nada. | Mayor | `server.ts:~926-931` | Si falta config, marcar `campaign.status='error_config'` y avisar al admin en vez de devolver `true`. | S |
| BE-04 | **Cuota Gemini in-memory** (`Map`) — funciona en instancia única (caso actual de Render free), pero se multiplica por N si algún día hay autoscaling. *(Limitación conocida y marcada con comentario `ponytail:` en el código.)* | Menor | `server.ts:~440` | Suficiente hoy. Mover a Firestore/Redis solo si se escala a multi-instancia. | M |
| BE-05 | **Idempotencia del webhook Stripe.** Un reintento de Stripe reprocesa el mismo `event.id`. La operación actual es idempotente (`set`, no incremento), así que el riesgo es bajo hoy, pero frágil si se añaden contadores. | Menor | `server.ts:~266-305` | Guardar `event.id` procesados (TTL) y saltar duplicados. | S |
| BE-06 | **Sync Firestore sin paginación.** `onSnapshot` carga colecciones completas sin `limit()`. Con miles de clientas/citas degrada (descarga total en cada cambio). | Mayor (a escala) | `src/hooks/useFirestoreSync.ts` | `limit(100)` + `orderBy`; cargar `whatsappLog` completo solo en la vista de detalle. | M |

### 2.5 Frontend / UX / Accesibilidad

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| FE-01 | **Archivos HTML legacy muertos en el repo.** `login.html`, `dashboard.html`, `agenda.html`, `clientes.html` están **trackeados en git pero no forman parte de la build** (la app real es un SPA React con un único `index.html`). **Esto explica la premisa errónea de "frontend multipágina" del encargo.** Generan confusión y muestran una estructura/diseño viejo. | Mayor | `git ls-files *.html`; no referenciados en `src/` ni `vite.config.ts` | Borrarlos (o mover a `legacy/` fuera del deploy). | S |
| FE-02 | **Calendario semanal roto en móvil.** `grid grid-cols-7` sin breakpoint; en <480px las celdas (~51px) son ilegibles. | Mayor | `AgendaView.tsx:~427` | `grid-cols-2 sm:grid-cols-4 lg:grid-cols-7`. | S |
| FE-03 | **Tablas sin scroll horizontal en móvil** (AdminView, fichas). Filas anchas se cortan. | Mayor | `AdminView.tsx:~176` | Envolver en `overflow-x-auto`. | S |
| FE-04 | **Accesibilidad muy pobre.** Solo 2 `aria-label` en todo el código; iconos Material Symbols sin nombre accesible; faltan focus states en muchos botones; estados por color sin etiqueta (daltónicos). | Mayor | `grep aria-label src/` = 2 | Añadir `aria-label` a botones de icono, `aria-live` a toasts, `focus:ring` global, texto junto a los puntos de color. | M |
| FE-05 | **Bundle único de ~1MB sin code-splitting.** FCP lento en 3G. | Mayor | `dist/assets/index-*.js` (1.05MB); sin `React.lazy` | `React.lazy` + `Suspense` por vista; `manualChunks` en Vite. | M |
| FE-06 | **Modo demo poco evidente.** Solo un texto pequeño "Demo aislada" en el header; el usuario puede creer que es su salón real. | Mayor | `App.tsx:~580` | Banner persistente "⚠ MODO DEMO: los cambios no se guardan". | S |
| FE-07 | **Bug CSS de fuentes.** `@import` de Google Fonts colocado después de otras reglas (aviso de build "@import must precede all rules") → puede ignorarse. Además hay **triple desajuste de tipografía**: el sistema de diseño documenta EB Garamond + Work Sans, `index.html` carga DM Sans + Playfair, y el CSS importa Inter + Playfair. | Menor | aviso de `vite build`; `index.html:10` vs `CLAUDE.md` | Unificar la familia tipográfica real y mover `@import` al inicio (o a `<link>`). | S |
| FE-08 | **Deriva del sistema de diseño.** `CLAUDE.md` exige `border-radius:0`, sin sombras ni gradientes, botones solo contorno. El código real usa **516 clases `rounded-*`** y **147 `shadow-/gradient-`**. La doc de diseño está obsoleta respecto a un dashboard moderno y redondeado. No bloquea venta, pero la doc miente. | Menor | `grep` en `src/` (516 / 147) | Decidir: actualizar `CLAUDE.md`/`elena-style-reference.md` a la realidad, **o** revertir el estilo. Recomendado: actualizar la doc. | M |

### 2.6 Registro / Auth (auditoría reservada de la sesión anterior, integrada)

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| AUTH-01 | **`forgotSent` no se resetea.** Tras "✓ Correo enviado", si el usuario cierra y reabre el modal sigue bloqueado hasta recargar. | Mayor | `LandingView.tsx:~628` | Resetear el estado al cerrar/abrir el modal. | S |
| AUTH-02 | **Errores de auth solo en toast** (3.2s) y no dentro del modal. El usuario no sabe por qué falló. | Mayor | `LandingView.tsx:~641` | Mostrar el error inline en el modal. | S |
| AUTH-03 | **Sin verificación de email.** El usuario entra al dashboard con cualquier email, incluso erróneo (riesgo RGPD + recuperación de cuenta). | Mayor | `useAuth.ts:~117` | Exigir verificación o, mínimo, banner persistente "verifica tu email". | M |
| AUTH-04 | **Sin pantalla de gestión de cuenta:** no se puede cambiar contraseña/email ni borrar la cuenta tras el registro. | Mayor | (ausencia) | Pantalla de cuenta con cambio de contraseña (Firebase) como mínimo. | M |
| AUTH-05 | **Onboarding obligatorio de 4 pasos sin "completar después".** Fricción alta de entrada (5–8 min). | Mayor | `OnboardingView.tsx` | Permitir mínimo (nombre + 1 servicio) y diferir el resto. | M |
| AUTH-06 | **Sin proveedor de email** (`App.tsx:601` "aplazado: necesita proveedor"). Bloquea bienvenida, verificación y avisos de fin de trial. | Mayor | `App.tsx:~601` | Resend.com (gratis hasta 3.000/mes). | M |

### 2.7 QA / Testing

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| QA-01 | **Cobertura de test <1%.** Un único archivo (`importClientsCsv.test.ts`, 4 tests) + `scripts/test-risk.mjs`. Cero tests de auth, booking, Stripe, IA, WhatsApp, hard-delete. | Crítico | `npm test` (1 suite, 4 tests) | Suite mínima de ~16 tests (ver §6). Vitest ya está configurado. | L |
| QA-02 | **Bug de zona horaria en el motor de riesgo.** `getTodayISO()` usa fecha local; en servidor UTC vs salón España (UTC+1/+2) el `riskDays` puede salir ±1 día → `riskLevel` incorrecto. | Mayor | `riskEngine.ts:7-10` | Fijar UTC o pasar la fecha del cliente como parámetro. | S |
| QA-03 | **Posible bypass de paywall si `isDemoMode` queda `true`** y los endpoints `/api/*` no revalidan `subscriptionStatus` en servidor. | Mayor | `App.tsx:~216`; `server.ts` | Validar suscripción/trial en servidor en endpoints críticos. | M |
| QA-04 | **Estados vacíos sin manejar** (cliente con 0 citas, filtros sin resultados) → riesgo de UI rota / "undefined". | Menor | `ClientProfileView.tsx`, `RetentionView.tsx` | `?? []` defensivo + componentes de empty state. | S |
| QA-05 | **Import CSV sin feedback de filas omitidas** (filas sin teléfono se descartan en silencio). | Menor | `SettingsView.tsx:~42` | Toast "Importadas N, X omitidas (sin teléfono)". | S |

### 2.8 Arquitectura

| ID | Descripción | Sev. | Evidencia | Solución | Esf. |
|----|-------------|------|-----------|----------|------|
| ARQ-01 | **`App.tsx` god-component** (~880 líneas, ~20 `useState`, handlers de negocio inline). Imposible de testear sin montar todo el árbol. | Mayor | `App.tsx` | Extraer `useAppointmentModal`, `useClients`, etc.; mover validación a módulos puros (ver §3). | L |
| ARQ-02 | **`server.ts` monolito** (~1.680 líneas, ~30 endpoints, Baileys+Gemini+Stripe+booking+SSE mezclados). | Mayor | `server.ts` | Dividir en `routes/` + `services/` (ver §3). | L |
| ARQ-03 | **Lógica de auth duplicada.** `/api/generate-whatsapp` reimplementa `verifyIdToken` + lookup de usuario inline en vez de reutilizar `resolveAuthenticatedTenant`. | Menor | `server.ts:~719-747` vs `:92-129` | Reusar el helper (ver §3, caso 3). | S |

**Conteo:** 1 Bloqueante · 5 Críticos · 24 Mayores · 11 Menores · (varias Mejoras). 1 falso positivo corregido.

---

## 3. DEUDA TÉCNICA Y "CÓDIGO ESPAGUETI" — 3 peores casos (antes → después)

### Caso 1 — `handleQuickAppointmentSubmit`: 87 líneas de negocio inline (ARQ-01)
**Ubicación:** `src/App.tsx` (~385-471). Mezcla búsqueda de cliente, 5 validaciones anidadas, cálculo de horario, solape y creación de cita.

**Antes:**
```typescript
const handleQuickAppointmentSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!modalIsPhoneVerified) { /* 15 líneas de lookup de teléfono */ return; }
  const matchedService = services.find(s => s.id === modalServiceId);
  const matchedStaff = staff.find(s => s.id === modalStaffId);
  if (!matchedService || !matchedStaff) { triggerToast('...'); return; }
  if (config.isRotatingScheduleEnabled) { /* 12 líneas: dayName, isWorking, rango horario */ }
  /* 8 líneas de cálculo de solape inline */
  if (hasOverlap) { triggerToast('...'); return; }
  if (modalIsPhoneNewClient) { /* crea cliente + cita */ return; }
  /* crea cita para cliente existente */
};
```

**Después:** (módulo puro testeable, `src/utils/appointmentValidation.ts`)
```typescript
export function validateStaffSchedule(time, date, staff, rotatingEnabled): string | null { /* ... */ }
export function checkAppointmentOverlap(time, date, staffId, dur, appts, name): string | null { /* ... */ }
export function verifyClientPhone(query, clients): { found: ClientProfile|null; isNew: boolean } { /* ... */ }

// App.tsx — el handler queda declarativo:
const sched = validateStaffSchedule(modalTime, modalDate, matched.staff, config.isRotatingScheduleEnabled);
if (sched) return triggerToast(sched);
const overlap = checkAppointmentOverlap(modalTime, modalDate, modalStaffId, matched.service.durationMinutes, appointments, matched.staff.name);
if (overlap) return triggerToast(overlap);
```
**Ganancia:** las reglas de negocio (horario, solape) se testean sin React. Es exactamente la lógica que un bug rompería en silencio.

### Caso 2 — `server.ts` monolito de ~1.680 líneas (ARQ-02)
**Antes:** un solo archivo con utilidades, auth, rate limiting, booking público, IA, adaptador WhatsApp, Baileys, agente, Stripe, SSE y middleware de Vite.

**Después:**
```
server.ts            (~150 líneas: setup + montaje de routers)
routes/public-booking.ts   routes/agent.ts   routes/stripe.ts   routes/ai.ts   routes/chat.ts
services/whatsapp.ts (Baileys + envío)   services/gemini.ts (IA + cuota)   services/booking.ts (slots)
middleware/auth.ts (resolveAuthenticatedTenant)   middleware/security.ts (helmet/cors/rate-limit)
```
```typescript
// server.ts
app.use("/api/public-booking", publicBookingRouter(admin));
app.use("/api/agent", agentRouter(admin));
app.use("/api/stripe", stripeRouter(admin));
```
**Ganancia:** cada router se testea aislado; el envío WhatsApp deja de estar acoplado a la generación IA. *(Refactor incremental, no big-bang: empezar extrayendo `services/whatsapp.ts` y `services/gemini.ts`.)*

### Caso 3 — Auth duplicada en `/api/generate-whatsapp` (ARQ-03)
**Antes:** (`server.ts:~719-747`) reimplementa lo que ya hace `resolveAuthenticatedTenant`:
```typescript
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
if (!token) return res.status(401).json({ error: "Sesión requerida..." });
const decodedToken = await adminRuntime.admin.auth().verifyIdToken(token);
const userDoc = await adminRuntime.admin.firestore().doc(`users/${decodedToken.uid}`).get();
if (!userDoc.exists || userDoc.data()?.status !== "Activo") return res.status(403)...
const resolvedTenantIdFromUser = userDoc.data()?.tenantId;  // ...
```
**Después:**
```typescript
const { uid, tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
if (!checkGeminiQuota(uid)) return res.status(429).json({ error: "Límite IA alcanzado." });
```
**Ganancia:** una sola ruta de autorización que mantener; menos superficie para que diverja la seguridad.

---

## 4. SEGURIDAD Y CUMPLIMIENTO LEGAL — checklist

### Seguridad técnica
| Punto | Estado |
|---|---|
| `firestore.rules` deny-all + aislamiento por tenant | ✅ OK (sólido) |
| Campos de facturación inmutables desde cliente | ✅ OK |
| Logs de auditoría/mensajes append-only | ✅ OK |
| Verificación de token Firebase en endpoints privados | ✅ OK |
| Firma de webhook Stripe (`constructEvent`) | ✅ OK |
| Rate limiting (IP) + cuota IA (por usuario) | ✅ OK |
| Sin secretos de servidor en código/bundle | ✅ OK |
| `.env` fuera de git | ✅ OK (corrige falso positivo) |
| **Firma del webhook de WhatsApp** | ❌ FALTA (SEC-01) |
| **Scoping de tenant en webhook WhatsApp** | ❌ FALTA (SEC-02) |
| **Vulnerabilidades npm (1 crítica/2 altas)** | ❌ FALTA (SEC-03) |
| **PII fuera de git (backups)** | ❌ FALTA (SEC-04) |
| Sanitización anti prompt-injection | ⚠️ PARCIAL (SEC-05) |
| CSP sin `unsafe-inline` | ⚠️ PARCIAL (SEC-06) |
| Monitorización/Sentry | ❌ FALTA (OPS-06) |

### RGPD / LOPDGDD (venta en España)
| Punto | Estado |
|---|---|
| Política de Privacidad | ✅ OK |
| Aviso Legal / Términos | ✅ OK |
| Derecho de portabilidad (export) | ✅ OK |
| Derecho de rectificación | ✅ OK |
| Derecho de oposición (`marketingOptOut`) | ✅ OK |
| Transferencias internacionales declaradas | ✅ OK |
| Mención reclamación AEPD | ✅ OK |
| **Banner de consentimiento de cookies** | ❌ FALTA (LEG-01) |
| **DPA / contrato de encargo** | ❌ FALTA (LEG-02) |
| **Derecho al olvido (hard-delete)** | ❌ FALTA (LEG-03) |
| Consentimiento de contacto visible en booking | ⚠️ PARCIAL (LEG-04) |
| Factura PDF (fiscal) | ❌ FALTA (LEG-05) |
| Política de cancelación/reembolso clara | ⚠️ PARCIAL (LEG-06) |

---

## 5. PASO A PRODUCCIÓN CON DOMINIO PROPIO (`elena.com.es`)

**Arquitectura objetivo:** frontend SPA en **Firebase Hosting** (`elena.com.es`) + backend en **Render** (`api.elena.com.es`). No es necesario migrar de plataforma; sí configurar dominios y CORS.

**Pasos concretos:**
1. **Comprar dominio** y acceso al panel DNS.
2. **Firebase Hosting → Add custom domain** `elena.com.es` (y `www`). Firebase emite registros A/TXT y el certificado SSL gestionado automáticamente.
3. **Render → Custom Domain** `api.elena.com.es`. Render da un `CNAME → *.onrender.com` y SSL Let's Encrypt automático.
4. **DNS en el registrador:**
   - `elena.com.es` → registros **A** de Firebase
   - `www` → CNAME a Firebase
   - `api` → CNAME a Render
   - registro **TXT** de verificación de Firebase
5. **Actualizar configuración (OPS-01):**
   - Render `ALLOWED_ORIGINS = https://elena.com.es,https://www.elena.com.es`
   - GH Secret `VITE_API_URL = https://api.elena.com.es`
   - `render.yaml`: `healthCheckPath: /api/health` + secretos Stripe (OPS-02)
6. **Stripe:** registrar el endpoint de webhook del nuevo dominio y su signing secret.
7. **WhatsApp/Meta:** si se usa la Cloud API, actualizar la URL del webhook y el verify token.
8. **Backups (SEC-04):** mover a bucket GCS privado antes de exponer el dominio.
9. **Monitorización (OPS-06):** UptimeRobot sobre `https://api.elena.com.es/api/health` + Sentry.
10. **Staging (OPS-04):** canal de preview de Firebase + servicio Render de staging antes del cutover.
11. **Cutover:** mantener `elena-os.web.app` activo 30 días redirigiendo a `elena.com.es`.
12. **Verificar:** `curl -I https://elena.com.es` → 200; probar CORS real frontend↔API; flujo completo de pago en modo test.

---

## 6. PLAN DE ACCIÓN PRIORIZADO

### FASE 1 — ANTES DE VENDER (imprescindible) · ~1 sprint
**Legal (bloqueante en España):**
- LEG-01 Banner de cookies (S)
- LEG-02 DPA + aceptación en onboarding (M)
- LEG-03 Endpoint hard-delete RGPD (M)
- LEG-04 Consentimiento visible en booking (S)

**Seguridad:**
- SEC-01 Firma del webhook WhatsApp (S)
- SEC-02 Scoping de tenant en el webhook (M)
- SEC-03 `firebase-admin@14` + re-test (M)
- SEC-04 Backups con PII fuera de git → GCS (M)

**Calidad mínima:**
- QA-01 Suite mínima (~16 tests): auth, Stripe webhook, motor de riesgo, booking, hard-delete (L)
- QA-02 Fix zona horaria del motor de riesgo (S)
- OPS-01/02 CORS + health check + secretos Stripe para el nuevo dominio (S)

### FASE 2 — PRIMERAS SEMANAS (recomendable)
- OPS-03 Disco persistente para sesiones WhatsApp (M)
- OPS-06 UptimeRobot + Sentry (S)
- OPS-04 Staging + gate de aprobación (M)
- AUTH-01/02/03 Fixes del modal de registro + verificación de email (S/M)
- AUTH-06 Proveedor de email (Resend) → bienvenida + avisos de trial (M)
- LEG-05/06 Factura PDF + política de cancelación (M/S)
- BE-01/02/03 Validación de config + envío fiable + fin del stub silencioso (S/M)
- FE-01 Borrar HTML legacy (S) · FE-02/03 Fixes responsive móvil (S)

### FASE 3 — MÁS ADELANTE (deseable)
- ARQ-01/02 Refactor incremental de `App.tsx` y `server.ts`
- FE-04 Pasada de accesibilidad (aria, focus, contraste)
- FE-05 Code-splitting (lazy load por vista)
- BE-06 Paginación de Firestore
- FE-08 Resolver la deriva del sistema de diseño (actualizar la doc)
- AUTH-04/05 Gestión de cuenta + onboarding diferible

---

## 7. VEREDICTO FINAL DEL PM

> **No lo lanzaría a un cliente de pago en `elena.com.es` tal cual hoy** — no por el producto, que funciona y tiene una propuesta de valor clara y demostrable, sino porque **vender tratamiento de datos de terceros en España sin banner de cookies, sin DPA y sin derecho al olvido es un riesgo legal inaceptable**, y porque el webhook de WhatsApp tiene dos agujeros explotables. La buena noticia: **nada de esto es un rediseño**. Es ~1 sprint de envoltura legal y endurecimiento sobre una base sorprendentemente sólida (rules excelentes, build y tipos limpios, core funcional). **Cerrada la Fase 1, lo vendería con confianza a los primeros salones de pago en dominio propio.**

*Preparación estimada: ~70% para venta de pago · ~80% para piloto controlado. Distancia al 100%: Fase 1.*
