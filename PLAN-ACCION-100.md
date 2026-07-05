# Plan de Acción → Producto al 100%

> Ejecuta `INFORME-PRODUCTO-100.md` paso a paso. Un paso = un commit verificable.
> Regla: no se pasa al siguiente paso sin cumplir su "✓ Verificación".
> Los pasos marcados 🔑 requieren una acción externa TUYA (cuentas, claves, deploy).

---

## ETAPA 1 — El corazón dice la verdad (WhatsApp honesto)

### Paso 1 · B1: matar el stub mentiroso
- `sendWhatsAppMessage` sin Meta configurado → devuelve `false` (no `true`).
- Todos los llamadores (`approve`, autoSend, `reply`, `broadcast`, webhook) ya manejan
  `sent=false` → la campaña queda `pendiente`, no `enviado`.
- El endpoint devuelve al front un motivo: `{ sent: false, reason: 'no_channel' }`.
- ✓ Verificación: aprobar campaña sin canal → status sigue `pendiente` + la UI avisa.

### Paso 2 · B2: approve y autoSend usan Baileys primero
- Extraer helper `sendViaTenantChannel(tenantId, phone, text)`: Baileys si conectado →
  Meta si configurado → `{sent:false, reason}` si nada.
- Reemplazar en `/approve` (server.ts:1156), autoSend del scan (:1113), `/reply`, `/broadcast`.
- ✓ Verificación: con Baileys conectado, aprobar → mensaje llega a un móvil real.

### Paso 3 · UI honesta sobre el canal
- AgentView: si `wa-status` ≠ connected y no hay Meta → banner "Conecta WhatsApp para
  enviar" + botones de aprobar deshabilitados con explicación (no toast genérico).
- Mostrar `reason` cuando un envío falla.
- ✓ Verificación: sin canal, la UI jamás dice "enviado".

### Paso 4 🔑 · B6: sesiones Baileys sobreviven al deploy
- Persistir credenciales en Firestore (colección `wa_sessions/{tenantId}`) con
  serialización de `useMultiFileAuthState` → alternativa sin disco persistente de pago.
- Restaurar al boot antes de `startBaileys`.
- ✓ Verificación: redeploy → WhatsApp sigue conectado sin re-escanear QR.

### Paso 5 · B8: escrituras Firestore con error visible
- `useTenantData.ts`: `.catch()` con toast "No se pudo guardar. Revisa tu conexión."
  en todos los write helpers (add/update/delete de clientas, citas, servicios, staff,
  inventario, settings).
- ✓ Verificación: con red cortada, editar una clienta → toast de error, no silencio.

---

## ETAPA 2 — Se puede operar el salón

### Paso 6 · B4: añadir staff y sucursales post-onboarding (2h)
- StaffTenantView: botones "+ Inscribir profesional" y "+ Nueva sucursal" que hacen
  `setIsAddStaffOpen(true)` / `setIsAddTenantOpen(true)`.
- De paso I3: avatar de staff nuevo con `generateAvatarUrl`, no la foto Unsplash.
- ✓ Verificación: añadir una profesional desde Equipo y verla en la agenda.

### Paso 7 · B5: respuestas de clientas en tiempo real
- AgentView: sustituir el fetch único por `onSnapshot` sobre `agent_campaigns`
  (patrón ya existente en `useFirestoreSync`).
- ✓ Verificación: responder desde un móvil → la respuesta aparece sin recargar.

### Paso 8 · B7: Elena se vuelve autónoma (cron)
- `node-cron` en server.ts:
  a) cada hora: tenants con `scanIntervalHours` vencido → ejecutar scan (mismo código
     del endpoint, factorizado).
  b) cada mañana (08:00 Europe/Madrid): citas de mañana → recordatorio vía
     `sendViaTenantChannel`. Config opt-out por tenant.
- Registrar cada ejecución en un doc `cron_runs` (observabilidad mínima).
- ✓ Verificación: cita creada para mañana → recordatorio llega solo; scan corre sin tocar nada.

### Paso 9 🔑 · B9: deploy de producción + envs
- Deploy del server (Render, ya hay render.yaml) con: `FIREBASE_SERVICE_ACCOUNT_JSON`,
  `GEMINI_API_KEY`, `NODE_ENV=production`, `ALLOWED_ORIGINS`, `META_WA_VERIFY_TOKEN`,
  `WHATSAPP_WEBHOOK_SECRET` (hacerlo OBLIGATORIO: sin él, webhook responde 503).
- `VITE_API_URL` en CI apuntando al server.
- TÚ: crear cuenta Render (o similar) y pasar las claves. YO: código + config + checklist.
- ✓ Verificación: `/api/health` en producción devuelve `geminiConfigured: true`.

### Paso 10 · B10: chat público seguro
- `sessionId` UUID generado en servidor (no adivinable) + validar formato en history.
- Rate limit en `/api/chat/:slug/stream`.
- ✓ Verificación: history con sessionId ajeno inventado → 403/404.

---

## ETAPA 3 — Multi-usuario y confianza

### Paso 11 🔑 · B11: email transaccional (Resend)
- TÚ: cuenta Resend + dominio verificado + API key.
- YO: `RESEND_API_KEY` en server + 3 usos: aviso fin de trial (cron diario),
  buzón de feedback real (endpoint que envía, adiós mailto), notificación intent
  `human` al dueño (cierra I2).
- ✓ Verificación: feedback desde la app → email en tu bandeja.

### Paso 12 · B3: invitaciones de empleadas
- Modelo: `invites/{code}` = `{tenantId, role, staffMemberId?, email?, expiresAt, usedBy?}`.
- UI: en Equipo, botón "Invitar" por profesional → genera código/link de 8 chars.
- Signup: campo opcional "¿Tienes código de invitación?" → si válido, el user doc se
  crea con el tenantId/rol del invite (y reglas Firestore para permitirlo con invite válido).
- ✓ Verificación: segunda cuenta entra con código → ve el salón de la jefa con su rol.

### Paso 13 · I1: el agente reserva de verdad
- Intent `booking`: usar `calculateAvailableSlots` real (ya existe, server.ts:36-90) para
  ofrecer 3 huecos; al confirmar la clienta, crear la cita (reutilizar la lógica
  transaccional de `/api/public-booking`).
- ✓ Verificación: conversación WhatsApp termina con cita real en la agenda.

### Paso 14 · I4+I5: métricas y envío manual honestos
- Ingestar respuestas WhatsApp al `whatsappLog` de la clienta (las métricas del Dashboard
  dejan de estar a 0).
- MessageEditor: estado "Abierto en WhatsApp" (no "enviado") para el flujo wa.me, o enviar
  vía `sendViaTenantChannel` si hay canal conectado.
- ✓ Verificación: tasa de respuesta del Dashboard > 0 tras una respuesta real.

---

## ETAPA 4 — Robustez y cierre

### Paso 15 · I6+I7+I8: robustez del servidor
- try/catch en handlers Baileys + backoff exponencial de reconexión + handler global
  `unhandledRejection`.
- Slots dentro de `transaction.get` (carrera de reserva doble).
- Validación de esquema en `PUT /api/agent/config`.
- ✓ Verificación: tests + `tsc` verdes; matar Firestore a mitad de un upsert no tira el proceso.

### Paso 16 · I9 + menores selectos
- AdminView: mover escrituras de billing a endpoint server con Admin SDK (o verificar
  excepción globalAdmin en rules).
- Persistir aceptación DPA con timestamp. Slug editable en Settings. Quitar
  `'carmen-ruiz'` como selectedClientId inicial. Sanear `err.message` crudos.
- ✓ Verificación: revisión de la lista de menores — al menos 5 de 9 cerrados.

### Paso 17 🔑 · Piloto real (la verificación final)
- UNA semana de uso real con 1 salón (aunque sea el de una conocida).
- Checklist de los 10 criterios del informe, todos verdes.
- ✓ Verificación: 7 días sin que te pidan ayuda → listo para vender.

---

## Dependencias externas (lo único que YO no puedo hacer)

| Paso | Necesito de ti |
|---|---|
| 4, 9 | Cuenta de hosting del server (Render) + pegar las env keys |
| 11 | Cuenta Resend + dominio verificado |
| 17 | Un salón piloto y tu móvil para probar WhatsApp real |

Todo lo demás es código y lo ejecuto yo, paso a paso, un commit por paso.
