# Mega-informe: qué le falta a ElenaOS para estar al 100% con clientes reales

> Auditoría de código real (jul 2026): servidor completo (`server.ts`, 1738 líneas),
> frontend completo (`src/`), y 5 flujos trazados end-to-end cliente↔servidor.
> **Excluye pagos/Stripe** por petición. Cada hallazgo tiene referencia `archivo:línea`
> y fue verificado en el código, no en la demo.

---

## Resumen ejecutivo

El producto tiene el **esqueleto completo y sano**: registro → onboarding → panel funciona
sin cortes, las reservas públicas online funcionan de verdad (transacción, anti-solapamiento,
tiempo real en la agenda), la seguridad es sólida y los estados vacíos están cuidados.

Lo que falla es **el corazón de la promesa comercial**: el envío real de WhatsApp tiene un
stub que finge éxito, las respuestas de clientas no llegan a la interfaz sin recargar, no
existe ningún proceso automático (ni scan periódico ni recordatorios), y **una empleada no
puede unirse al salón de su jefa** — el multi-usuario no existe.

**11 bloqueantes, 9 importantes, 8 menores.** Estimación total honesta: **3–4 semanas** de
trabajo enfocado para el "100%".

---

## 🔴 BLOQUEANTES — sin esto, una clienta real se siente engañada o atascada

### B1 · El envío de WhatsApp finge éxito sin enviar nada
`server.ts:926-931` — sin `META_WA_TOKEN`/`META_PHONE_NUMBER_ID`, `sendWhatsAppMessage` hace
`console.log('[WA STUB]')` y **devuelve `true`**. Las campañas se marcan `enviado` con
`sentAt` (`server.ts:1114, 1157, 1202, 1294`) sin que salga ningún mensaje. La dueña cree
que Elena trabajó; nadie recibió nada. **Es el fallo más grave del producto.**
**Fix:** el stub debe devolver `false`/error visible. *½ día.*

### B2 · Aprobar una campaña ignora la conexión Baileys del tenant
`server.ts:1156` — `/approve` (y autoSend en `:1113`) solo llama a Meta/stub. En cambio
`/reply` (`:1193-1198`) y `/broadcast` (`:1287-1290`) prueban Baileys primero. Resultado:
el flujo estrella de la UI (conectar por QR → aprobar campaña) **no envía nada** aunque
WhatsApp esté conectado. Verificado.
**Fix:** replicar el patrón Baileys-primero de `/reply` en `/approve` y autoSend. *½ día.*

### B3 · Multi-usuario inexistente: una empleada no puede entrar al salón
`useAuth.ts:86-139` — todo registro crea SIEMPRE un tenant nuevo `tenant-<uid>`. No hay
invitación, ni código, ni lookup por email. Si la empleada se registra, acaba como
"Propietaria" de un salón vacío propio. Las reglas de Firestore ya lo contemplan
(`firestore.rules:272-297`) pero no hay UI ni backend que cree el `users` doc con el
tenantId correcto.
**Fix mínimo:** códigos de invitación (doc `invites/{code}` con tenantId+rol; el signup lo
consume). *2-3 días.*

### B4 · No se puede añadir personal después del onboarding
`StaffTenantView.tsx` — los modales "Nueva Sucursal" e "Inscribir Profesional" existen pero
**ningún código los abre**: solo hay `setIsAddStaffOpen(false)`, jamás `(true)` (verificado
con grep). Es la única UI de gestión de equipo.
**Fix:** añadir los botones que abren los modales. *2h.*

### B5 · Las respuestas de clientas no llegan a la pantalla
`AgentView.tsx:176-183` — las respuestas SÍ se guardan en Firestore (webhook Meta
`server.ts:1396` y Baileys `:1531` funcionan), pero la vista carga campañas con un fetch
único al montar. Sin `onSnapshot`, la dueña no ve la respuesta hasta recargar. La app usa
onSnapshot en todo lo demás.
**Fix:** listener en tiempo real sobre `agent_campaigns`. *½ día.*

### B6 · Sesiones de WhatsApp se pierden en cada deploy
`server.ts:454, 1485-1488` — credenciales Baileys en `.wa-auth/` bajo `process.cwd()`.
En Render/containers el filesystem es efímero: **cada redeploy desconecta el WhatsApp de
todos los salones** y obliga a re-escanear QR.
**Fix:** disco persistente de Render (1 línea en render.yaml) o credenciales en Firestore.
*½–1 día.*

### B7 · No existe ningún proceso automático (el "asistente autónomo" no es autónomo)
Verificado con grep: cero cron/scheduler en todo el repo. `scanIntervalHours` se guarda en
config (`server.ts:1331`) pero **nadie lo consume** — es decorativo. El scan de riesgo es
100% manual (botón "Escanear ahora"). Tampoco existen recordatorios de citas próximas.
La landing promete "Elena revisa sola quién lleva demasiado tiempo sin venir".
**Fix:** node-cron en el server: (a) scan según `scanIntervalHours`, (b) recordatorio de
citas de mañana vía Baileys/Meta. *1-2 días.*

### B8 · Escrituras a Firestore fallan en silencio
`useTenantData.ts` — todo el CRUD (clientas, citas, servicios…) es fire-and-forget: si
`setDoc` falla (offline, reglas), no hay toast ni rollback; la usuaria cree que guardó.
**Fix:** `.catch(() => toast('No se pudo guardar…'))` en los write helpers. *½ día.*

### B9 · Backend sin desplegar / envs de producción
`server.ts` necesita como imprescindibles: `FIREBASE_SERVICE_ACCOUNT_JSON` (o equivalente),
`GEMINI_API_KEY`, `NODE_ENV=production`. Sin la primera, todo el backend degrada a 503 con
el server "arrancado". `WHATSAPP_WEBHOOK_SECRET` hoy es opcional y **si falta se salta la
verificación de firma** (`server.ts:1398`) — debe ser obligatorio en producción.
**Fix:** deploy (Render ya tiene render.yaml) + checklist de envs + hacer fatal la ausencia
del webhook secret. *½–1 día.*

### B10 · Historial del chat público legible por cualquiera
`server.ts:1702-1711` — `/api/chat/:slug/history` no verifica propiedad del `sessionId`:
quien adivine/enumere un sessionId lee la conversación de otra persona (PII). El stream SSE
(`:1653`) tampoco tiene rate limit.
**Fix:** sessionId no adivinable (UUID) + rate limit en stream. *½ día.*

### B11 · Email transaccional inexistente
Sin proveedor de email no hay: verificación de cuenta, aviso de fin de trial
(`App.tsx:602`, aplazado), ni feedback real (`Sidebar.tsx:40` — el buzón dice "¡Recibido!"
aunque el mailto se cancele). Para operar con clientas reales hace falta al menos fin de
trial + feedback.
**Fix:** Resend (gratis a este volumen) + 2 endpoints. *1 día.*

---

## 🟠 IMPORTANTES — no bloquean el día 1, pero se notan la semana 1

| # | Qué | Dónde | Esfuerzo |
|---|---|---|---|
| I1 | El agente promete reservar pero no crea citas: intent `booking` marca `reservado` con `availableSlots: []` hardcodeado | `server.ts:1440, 1449, 1556` | 1-2 días |
| I2 | Intent `human` ("quiero hablar con una persona") no notifica a nadie | `server.ts` webhook | ½ día (con B11) |
| I3 | Staff nuevo recibe la foto Unsplash de una modelo desconocida | `StaffTenantView.tsx:77` | 1h (usar `generateAvatarUrl`) |
| I4 | Métricas de respuesta/conversión del Dashboard siempre a 0 en modo real: las respuestas WhatsApp no se ingestan al `whatsappLog` de la clienta | `DashboardView.tsx:89-99` + server | 1 día |
| I5 | "Enviar" en MessageEditor = abrir wa.me y marcar enviado aunque la dueña cancele | `MessageEditorView.tsx:240-272` | ½ día (estado "abierto en WhatsApp" honesto, o enviar vía Baileys) |
| I6 | Handlers de eventos Baileys async sin catch → un throw tira el proceso; reconexión cada 5s sin backoff | `server.ts:1503-1574, 1525` | ½ día |
| I7 | Carrera en reserva pública: los slots se leen fuera de `transaction.get`, dos reservas simultáneas pueden colarse al mismo hueco | `server.ts:63` | ½ día |
| I8 | `PUT /api/agent/config` escribe `req.body` sin validar esquema | `server.ts:1342` | 2h |
| I9 | AdminView escribe `subscriptionStatus`/`trialEndsAt` desde el cliente — contradice la regla de billing inmutable; verificar que firestore.rules realmente lo permite solo a globalAdmin o mover a endpoint Admin SDK | `AdminView.tsx:40-60` | ½ día |

---

## 🟡 MENORES — pulir cuando lo anterior esté hecho

1. Aceptación del DPA no se persiste (solo bloquea UI) — guardar timestamp. `OnboardingView`
2. Ticket medio fallback 85€ inventado en ROI del Dashboard sin datos. `DashboardView.tsx:78`
3. `selectedClientId` inicial `'carmen-ruiz'` (id de demo) en tenants reales — no rompe, pero es sucio. `App.tsx:89`
4. Slug del salón no editable en UI (solo se muestra). `SettingsView.tsx:696-708`
5. Token SSE por query param (puede quedar en logs de proxy). `server.ts:1592`
6. Errores `err.message` crudos al cliente en endpoints agent (fuga menor de internals).
7. Matching de campañas Baileys carga TODAS las campañas en memoria y compara últimos 9 dígitos — funciona, no escala. `server.ts:1541-1547`
8. `handleRecalculateThresholds` hace N escrituras sin batch. `useTenantData.ts:255-291`
9. Import CSV enterrado en Settings; el Dashboard vacío no lo destaca como CTA.

---

## ✅ Lo que YA FUNCIONA de verdad (verificado end-to-end, no tocar)

- **Registro → onboarding → panel**: completo, incluido que el horario del onboarding se usa
  de verdad en agenda y reservas (`server.ts:36-90`, `App.tsx:419`).
- **Reserva pública online**: transacción real, respeta horarios/turno partido/antelación,
  evita solapamientos, y la cita aparece en la agenda **en tiempo real** (`useFirestoreSync.ts:132`).
- **Generación IA de mensajes**: auth + cuota + 3 versiones + draft persistido + audit log.
- **Recepción WhatsApp → Firestore**: ambas vías (Meta webhook y Baileys) clasifican motivo
  de ausencia con Gemini y auto-responden. (Solo falta que la UI lo muestre — B5.)
- **Seguridad**: deny-all + tenant isolation + validación de esquema + rate limiting +
  verifyIdToken server-side + guard anti-secretos en CI. Auditada en detalle previamente.
- **Estados vacíos**: cubiertos con guía en casi todas las vistas.
- **Degradación sin Firebase**: la app cae a landing+demo, no a pantalla en blanco.

---

## Orden de ejecución recomendado (ruta crítica al 100%)

```
Semana 1 — El corazón dice la verdad:
  B1+B2 (envío real, sin mentiras) → B6 (sesiones persistentes) → B9 (deploy+envs)
  → B4 (añadir staff, 2h) → B8 (errores visibles)

Semana 2 — Elena se vuelve autónoma de verdad:
  B7 (cron: scan + recordatorios) → B5 (respuestas en tiempo real)
  → B11 (email Resend) → B10 (chat público seguro)

Semana 3 — Multi-usuario y coherencia:
  B3 (invitaciones de empleadas) → I1 (booking real del agente)
  → I4+I5 (métricas honestas) → I3, I6, I7, I8

Semana 4 — Colchón + menores + prueba real:
  I2, I9, menores selectos + UNA SEMANA DE USO PROPIO con un salón piloto
  antes de cobrar a nadie.
```

## Criterio de "100%" (verificable, no sensación)

1. Aprobar una campaña con Baileys conectado → el mensaje llega a un móvil real.
2. Sin WhatsApp conectado → la UI dice "conecta WhatsApp", jamás "enviado".
3. Redeploy del servidor → WhatsApp sigue conectado sin re-escanear QR.
4. Una clienta responde → la respuesta aparece en AgentView sin recargar.
5. El scan corre solo según `scanIntervalHours`; llega recordatorio de cita de mañana.
6. Una empleada invitada entra al tenant de su jefa con el rol correcto.
7. Se puede añadir una profesional nueva desde Equipo (sin repetir onboarding).
8. Apagar el WiFi y editar una clienta → toast de error, no silencio.
9. Fin de trial → email real en la bandeja.
10. Salón piloto usa el producto 7 días seguidos sin pedirte ayuda.
