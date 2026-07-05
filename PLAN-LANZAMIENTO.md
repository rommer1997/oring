# Plan de Lanzamiento — De hoy a vender

> Fuente: informe estratégico Manus (jul 2026) cruzado con el estado REAL del código.
> Regla: nada de construir lo que ya existe. El informe auditó solo demo + landing;
> el producto está más completo de lo que describe.

## Lo que el informe pide y YA ESTÁ HECHO (no tocar)

| Petición del informe | Dónde vive |
|---|---|
| Onboarding guiado paso a paso | `OnboardingView` — 4 pasos, preset horarios, errores inline |
| Gestión de inventario | `InventarioView` + esquema en `firestore.rules` |
| Facturación básica (cobros, informes) | `FacturacionView` — trimestral, YoY, export CSV |
| Import CSV de clientas | `SettingsView` — detecta delimitador Excel ES |
| Reservas online 24/7 | `PublicBookingView` + API pública rate-limited |
| Vista simple / avanzada | `isBeginnerMode` + herramientas colapsadas |
| Trial 14 días sin tarjeta con datos reales | Registro real + Stripe |
| Landing: features, comparativa, FAQ, calculadora, precios fundadora | `LandingView` |
| RGPD (borrado, export, consentimiento) | hard-delete + tombstone + DPA en onboarding |

## FASE 0 — Bloqueantes de venta (sin esto no se puede cobrar)
*Objetivo: que una desconocida pueda pagar y usar el producto sin hablar contigo.*

- [ ] **P0-1 · Stripe en producción.** Verificar precios reales (`STRIPE_PRICE_MONTHLY/YEARLY`),
  webhook apuntando al dominio de producción, y un pago de prueba end-to-end
  (checkout → webhook → `subscriptionStatus: active` → acceso). *Esfuerzo: ½ día.*
- [ ] **P0-2 · Backend desplegado y estable.** El server Express (IA + Stripe + WhatsApp)
  necesita hosting con `process.env` (Railway/Render/Cloud Run). Firebase Hosting solo
  sirve el front. Verificar `VITE_API_URL` en CI apunta ahí. *Esfuerzo: ½–1 día.*
- [ ] **P0-3 · Email transaccional mínimo.** Un proveedor (Resend, ~gratis a este volumen)
  para: verificación de cuenta, aviso fin de trial, recibo. Cierra también la deuda
  `ponytail` de `Sidebar.tsx:40` y `App.tsx:602`. *Esfuerzo: 1 día.*
- [ ] **P0-4 · Dominio y correo propios.** `elena-os.web.app` no transmite confianza de pago.
  Dominio propio + `hola@` para soporte. *Esfuerzo: 2h + DNS.*

## FASE 1 — Conversión de la landing (el grueso útil del informe)
*Objetivo: que quien llega, entienda y pruebe. Todo esto es `LandingView.tsx`.*

- [ ] **L-1 · Sección "Cómo funciona" en 3 pasos** (Detecta → Escribe → Recuperas),
  entre el hero y las features. Copy del informe §2.3 casi listo para usar.
  *Esfuerzo: ½ día. El cambio de mayor impacto en conversión.*
- [ ] **L-2 · Capturas reales de la app** en hero y "Cómo funciona" (Dashboard, AgentView,
  Agenda). Nada de stock. Sacarlas de la demo con datos bonitos. *Esfuerzo: ½ día.*
- [ ] **L-3 · Bloque problema/solución** con la analogía cuadernito: "¿Tu agenda de papel
  no te avisa de quién se ha ido?". Copy del informe §2.3. *Esfuerzo: 2h.*
- [ ] **L-4 · CTA final** antes del footer: "¿Lista para que tu salón no pierda ni una
  clienta más?" + botón trial. *Esfuerzo: 1h.*
- [ ] **L-5 · GIF/video corto del asistente en acción** en el hero (grabación de pantalla
  de la demo, 30–60s). *Esfuerzo: ½ día. Hacer después de L-2.*

⚠️ **No usar los testimonios del informe** ("María de Estética Floral"): son ficticios.
Mantener la franja honesta (H03) hasta tener 1–2 salones beta citables con permiso.

## FASE 2 — Primeras clientas de pago (activación)
*Objetivo: que la que entra al trial llegue al momento "wow" sin ayuda.*

- [ ] **A-1 · Plantilla CSV descargable** (columnas ejemplo + 3 filas demo) junto al import.
  La "usuaria del cuadernito" no sabe qué es un CSV. *Esfuerzo: 2h.*
- [ ] **A-2 · Guía de primeros pasos in-app**: checklist post-onboarding (añade tus clientas
  → mira quién está en riesgo → envía tu primer mensaje). Nativo, sin librerías de tours.
  *Esfuerzo: 1 día.*
- [ ] **A-3 · Video tutorial de 90s** (Loom vale) enlazado desde el checklist y la web.
  *Esfuerzo: ½ día, no requiere código.*
- [ ] **A-4 · Oferta de migración manual**: "¿Te ayudamos a pasar tu cuadernito? Mándanos
  una foto". Es servicio, no software — a este volumen escala de sobra y convierte
  exactamente al perfil novato. *Esfuerzo: 0 código.*

## FASE 3 — Post-primeras ventas (NO antes)
- Facturas legales con IVA / pasarela TPV — cuando una clienta de pago lo pida.
- Integraciones (contabilidad, TPV) — ídem.
- Email marketing, SMS, fidelización, multi-sede — Fase 3 del informe. Ignorar por ahora.
- Testimonios reales en landing — en cuanto existan.

## Orden de ejecución sugerido
```
Semana 1: P0-1, P0-2, P0-4  → se puede cobrar
Semana 2: P0-3, L-1, L-2, L-3, L-4 → la landing convierte
Semana 3: A-1, A-2, L-5, A-3 → el trial activa solo
→ LANZAR. A-4 como servicio continuo. Fase 3 según demanda real.
```

## Criterio de "listo para vender" (checklist final)
1. Un pago real de prueba completa el ciclo checkout → acceso premium.
2. Una persona ajena completa registro + onboarding + primer mensaje IA sin ayuda.
3. La landing muestra el producto real (capturas propias, 3 pasos).
4. Fin de trial notifica por email y el paywall funciona.
5. `check-secrets` y CI en verde en el deploy de producción.
