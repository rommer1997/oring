# Última Línea — Despliegue a producción (Render)

> Reservado del PLAN-ACCION-100 (era el Paso 9). Se ejecuta AL FINAL, cuando todo
> el código esté listo. Requiere acciones externas del propietario (🔑).

## Objetivo
Backend Express (IA + WhatsApp + webhooks) corriendo en Render con sus secretos,
y el frontend de Firebase Hosting apuntándole.

## Checklist

### 🔑 Tú (una vez)
- [ ] Crear cuenta en Render y conectar el repo `rommer1997/oring` (ya hay `render.yaml`).
- [ ] Pegar las env vars en el dashboard de Render:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` — JSON completo del service account (Firebase Console → Configuración → Cuentas de servicio → Generar clave)
  - `GEMINI_API_KEY`
  - `NODE_ENV=production`
  - `ALLOWED_ORIGINS=https://elena-os.web.app` (+ dominio propio cuando exista)
  - `WHATSAPP_WEBHOOK_SECRET` — string aleatorio largo (`openssl rand -hex 32`)
  - `META_WA_VERIFY_TOKEN` — solo si se usa Meta Cloud API
  - `STRIPE_*` — cuando se active el cobro (fuera de este plan)
- [ ] Añadir el secret `VITE_API_URL` en GitHub (Settings → Secrets → Actions) con la URL de Render.

### Yo (cuando lo de arriba exista)
- [ ] Verificar `render.yaml` (build, start, health check `/api/health`).
- [ ] Hacer obligatorio `WHATSAPP_WEBHOOK_SECRET` en producción (webhook responde 503 sin él).
- [ ] Desplegar `firestore.rules` (`npm run deploy:rules`) — pendiente desde Pasos 7-8.
- [ ] Redeploy del front vía CI para que tome `VITE_API_URL`.
- [ ] Smoke test: `/api/health` → `geminiConfigured: true`; conectar un WhatsApp por QR;
      redeploy manual → la sesión sobrevive (verifica Paso 4).

## Nota
Las sesiones Baileys ya se persisten en Firestore (Paso 4), así que el plan gratuito
de Render (filesystem efímero + spin-down) funciona para arrancar. Si el spin-down
molesta (Elena tarda ~30s en despertar), subir al plan Starter.
