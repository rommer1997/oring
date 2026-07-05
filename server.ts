import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import Stripe from "stripe";
import fs from "fs";
import QRCode from "qrcode";

dotenv.config();

type FirebaseAdminRuntime = {
  admin: any;
  app: any;
};

const spanishDayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const hours = Math.floor(minutes / 60).toString().padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");
  return `${hours}:${mins}`;
}

function rangesOverlap(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && startB < endA;
}

function getWorkingRanges(staffMember: any, date: string) {
  const dayName = spanishDayNames[new Date(`${date}T12:00:00`).getDay()];
  const daySchedule = staffMember.schedule?.[dayName];
  if (!daySchedule?.isWorking) return [];
  const ranges = [{ start: daySchedule.start, end: daySchedule.end }];
  if (daySchedule.splitShift && daySchedule.secondStart && daySchedule.secondEnd) {
    ranges.push({ start: daySchedule.secondStart, end: daySchedule.secondEnd });
  }
  return ranges.filter((range) => range.start && range.end && toMinutes(range.end) > toMinutes(range.start));
}

async function getTenantBySlug(db: any, slug: string) {
  const tenantSnap = await db.collection("tenants")
    .where("slug", "==", slug)
    .where("publicBookingEnabled", "==", true)
    .limit(1)
    .get();
  if (tenantSnap.empty) return null;
  const docSnap = tenantSnap.docs[0];
  return { id: docSnap.id, data: docSnap.data() };
}

async function calculateAvailableSlots(db: any, tenantId: string, service: any, staffMember: any, date: string, slotMinutes: number, noticeHours: number) {
  const duration = Number(service.durationMinutes || 30);
  const ranges = getWorkingRanges(staffMember, date);
  if (ranges.length === 0) return [];

  const apptsSnap = await db.collection(`tenants/${tenantId}/appointments`)
    .where("staffId", "==", staffMember.id)
    .where("date", "==", date)
    .get();
  const appointments = apptsSnap.docs
    .map((docSnap: any) => docSnap.data())
    .filter((appt: any) => appt.status !== "Cancelado");

  const minStart = new Date(Date.now() + noticeHours * 60 * 60 * 1000);
  const slots: string[] = [];
  for (const range of ranges) {
    const rangeStart = toMinutes(range.start);
    const rangeEnd = toMinutes(range.end);
    for (let start = rangeStart; start + duration <= rangeEnd; start += slotMinutes) {
      const time = toTime(start);
      const slotDate = new Date(`${date}T${time}:00`);
      if (slotDate < minStart) continue;
      const end = start + duration;
      const busy = appointments.some((appt: any) => {
        const apptStart = toMinutes(appt.time);
        const apptEnd = apptStart + Number(appt.durationMinutes || service.durationMinutes || duration);
        return rangesOverlap(start, end, apptStart, apptEnd);
      });
      if (!busy) slots.push(time);
    }
  }
  return slots;
}

async function resolveAuthenticatedTenant(req: any, adminRuntime: FirebaseAdminRuntime | null) {
  if (!adminRuntime) {
    const error = new Error("Base de datos no conectada.");
    (error as any).statusCode = 500;
    throw error;
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : "";
  if (!token) {
    const error = new Error("Sesión no autenticada.");
    (error as any).statusCode = 401;
    throw error;
  }

  const decodedToken = await adminRuntime.admin.auth().verifyIdToken(token);
  const db = adminRuntime.admin.firestore();
  const userDoc = await db.doc(`users/${decodedToken.uid}`).get();
  if (!userDoc.exists) {
    const error = new Error("Perfil de usuario no encontrado.");
    (error as any).statusCode = 403;
    throw error;
  }

  const userData = userDoc.data();
  if (!userData?.tenantId || userData.status !== "Activo") {
    const error = new Error("Usuario sin salón activo.");
    (error as any).statusCode = 403;
    throw error;
  }

  return {
    uid: decodedToken.uid,
    email: decodedToken.email || userData.email || "",
    tenantId: userData.tenantId as string,
    db,
    adminRuntime,
  };
}

async function initializeFirebaseAdmin(): Promise<FirebaseAdminRuntime | null> {
  let admin: any;
  try {
    const dynamicImport = new Function("specifier", "return import(specifier)");
    admin = (await dynamicImport("firebase-admin")).default;
  } catch {
    return null;
  }

  if (admin.apps.length > 0) return { admin, app: admin.app() };

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    return {
      admin,
      app: admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountJson)),
      })
    };
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_PROJECT_ID) {
    return {
      admin,
      app: admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID,
      })
    };
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === "production";
  const adminRuntime = await initializeFirebaseAdmin();

  // CORS — allow Firebase Hosting origin + localhost in dev
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://elena-os.web.app,http://localhost:5173,http://localhost:3000').split(',').map(s => s.trim());
  app.use((req, res, next) => {
    const origin = req.headers.origin || '';
    if (allowedOrigins.includes(origin) || !isProduction) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.set("trust proxy", 1);

  app.use(helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", "https:", "wss:"],
            imgSrc: ["'self'", "https:", "data:"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            fontSrc: ["'self'", "https:", "data:"],
            frameSrc: ["'self'", "https:"],
          },
        }
      : false,
  }));

  // Apply rate limiting to all API routes
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs (general API)
    message: { error: "Demasiadas peticiones desde esta IP, por favor intenta más tarde." },
    standardHeaders: true,
    legacyHeaders: false,
    // Stripe webhooks arrive from a small set of Stripe IPs and must never be 429'd (lost events).
    skip: (req) => req.originalUrl.startsWith("/api/stripe-webhook"),
  });
  app.use("/api/", apiLimiter);

  // Stricter limiter for UNAUTHENTICATED public booking endpoints (slug enumeration / scraping / DoS).
  const publicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: { error: "Demasiadas peticiones. Inténtalo de nuevo en unos minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Stricter rate limit specifically for the AI generation endpoint (has API cost)
  const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // max 15 AI message generations per 15 min per IP
    message: { error: "Has alcanzado el límite de generaciones con IA. Inténtalo de nuevo en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
  });  // Stripe Webhook Endpoint (expects raw request body)
  app.post(
    "/api/stripe-webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"] as string;
      const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

      if (!stripeSecret) {
        console.error("Stripe Secret Key not found in env variables.");
        return res.status(500).json({ error: "Stripe configuration missing." });
      }

      const stripe = new Stripe(stripeSecret);
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`[STRIPE WEBHOOK] Verified event: ${event.type}`);

      if (!adminRuntime) {
        console.error("Firebase Admin not connected.");
        return res.status(500).json({ error: "Database offline." });
      }

      const db = adminRuntime.admin.firestore();

      try {
        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenantId;
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (tenantId) {
            const now = new Date();
            const subscriptionEndsAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000).toISOString(); // Default yearly or handled by invoice

            await db.doc(`tenants/${tenantId}`).update({
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              subscriptionStatus: "active",
              subscriptionEndsAt,
              updatedAt: now.toISOString()
            });

            console.log(`[STRIPE SUCCESS] Subscription activated for tenant: ${tenantId}`);
          }
        } else if (event.type === "customer.subscription.deleted" || event.type === "customer.subscription.updated") {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const tenantsSnap = await db.collection("tenants")
            .where("stripeCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!tenantsSnap.empty) {
            const tenantDoc = tenantsSnap.docs[0];
            const newStatus = subscription.status === "active" ? "active" : "canceled";
            await tenantDoc.ref.update({
              subscriptionStatus: newStatus,
              updatedAt: new Date().toISOString()
            });
            console.log(`[STRIPE UPDATE] Updated subscription status for tenant: ${tenantDoc.id} to ${newStatus}`);
          }
        }
      } catch (dbErr) {
        console.error("Error handling Stripe event database operations:", dbErr);
      }

      res.json({ received: true });
    }
  );

  // Normal body parser for subsequent routes
  app.use(express.json({ limit: "50kb" }));

  // Create Checkout Session Endpoint
  app.post("/api/create-checkout-session", async (req, res) => {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: "Falta el plan de pago." });
    }

    try {
      const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
      if (!stripeSecret) {
        return res.status(500).json({ error: "Clave secreta de Stripe no configurada." });
      }

      const stripe = new Stripe(stripeSecret);

      const { tenantId, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
      if (!tenantSnap.exists) {
        return res.status(404).json({ error: "Salón no encontrado." });
      }

      const tenantData = tenantSnap.data() as any;
      let customerId = tenantData.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: tenantData.email || "",
          name: tenantData.name || "Propietaria ElenaOS",
          metadata: { tenantId },
        });
        customerId = customer.id;
        await db.doc(`tenants/${tenantId}`).update({ stripeCustomerId: customerId });
      }

      const realPriceId = priceId === "price_monthly_premium"
        ? (process.env.STRIPE_PRICE_MONTHLY || "price_monthly_mock")
        : (process.env.STRIPE_PRICE_YEARLY || "price_yearly_mock");

      const sessionParams: Stripe.Checkout.SessionCreateParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        customer: customerId,
        line_items: [
          {
            price: realPriceId,
            quantity: 1,
          },
        ],
        metadata: { tenantId },
        success_url: `${req.headers.origin}/settings`,
        cancel_url: `${req.headers.origin}/settings`,
      };

      if (priceId === "price_monthly_premium" && process.env.STRIPE_COUPON_FOUNDER) {
        sessionParams.discounts = [
          { coupon: process.env.STRIPE_COUPON_FOUNDER }
        ];
      }

      const session = await stripe.checkout.sessions.create(sessionParams);
      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Stripe Session Creation failed:", err);
      res.status(err.statusCode || 500).json({ error: "No se pudo crear la sesión de pago.", details: err.message });
    }
  });

  // Create Portal Session Endpoint
  app.post("/api/create-portal-session", async (req, res) => {
    try {
      const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
      if (!stripeSecret) {
        return res.status(500).json({ error: "Clave secreta de Stripe no configurada." });
      }

      const stripe = new Stripe(stripeSecret);

      const { tenantId, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const tenantSnap = await db.doc(`tenants/${tenantId}`).get();
      if (!tenantSnap.exists) {
        return res.status(404).json({ error: "Salón no encontrado." });
      }

      const tenantData = tenantSnap.data() as any;
      const customerId = tenantData.stripeCustomerId;

      if (!customerId) {
        return res.status(400).json({ error: "No existe un cliente de facturación de Stripe registrado para este salón." });
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${req.headers.origin}/settings`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("Stripe Portal Creation failed:", err);
      res.status(err.statusCode || 500).json({ error: "No se pudo abrir el portal de facturación.", details: err.message });
    }
  });

  // Initialize Gemini client lazily/safely
  let ai: GoogleGenAI | null = null;
  const getGeminiClient = (): GoogleGenAI => {
    if (!ai) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is missing. Please add it to Settings > Secrets.");
      }
      ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return ai;
  };

  // ponytail: circuit breaker por usuario para Gemini — evita que un tenant agote la cuota global
  const geminiUserCalls = new Map<string, { count: number; resetAt: number }>();
  function checkGeminiQuota(uid: string): boolean {
    const now = Date.now();
    const entry = geminiUserCalls.get(uid);
    if (!entry || now >= entry.resetAt) {
      geminiUserCalls.set(uid, { count: 1, resetAt: now + 3600000 });
      return true;
    }
    if (entry.count >= 60) return false;
    entry.count++;
    return true;
  }

  // ─── WhatsApp per-tenant state (defined early so health endpoint can read it) ──
  type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';
  const WA_AUTH_DIR = path.join(process.cwd(), '.wa-auth');
  const waStatusMap = new Map<string, WAStatus>();
  const waQRMap = new Map<string, string | null>();
  const waSockMap = new Map<string, any>();
  const waPhoneMap = new Map<string, string | null>();
  const waClientsMap = new Map<string, Set<express.Response>>();

  // ─── Persistencia de sesiones Baileys en Firestore ──────────────────────────
  // El filesystem es efímero en Render/containers: sin esto, cada redeploy
  // desconecta el WhatsApp de todos los salones y obliga a re-escanear el QR.
  // Espejo: .wa-auth/<tenantId>/* ↔ wa_sessions/{tenantId}/files/{encodedName}
  const waSyncTimers = new Map<string, NodeJS.Timeout>();

  async function syncWASessionToFirestore(tenantId: string) {
    if (!adminRuntime) return;
    const authDir = path.join(WA_AUTH_DIR, tenantId);
    if (!fs.existsSync(authDir)) return;
    try {
      const db_ = adminRuntime.admin.firestore();
      const files = fs.readdirSync(authDir).filter(f => f.endsWith('.json'));
      await db_.doc(`wa_sessions/${tenantId}`).set({ updatedAt: new Date().toISOString(), fileCount: files.length });
      // ponytail: chunks de 400 por el límite de 500 writes por batch
      for (let i = 0; i < files.length; i += 400) {
        const batch = db_.batch();
        for (const f of files.slice(i, i + 400)) {
          const content = fs.readFileSync(path.join(authDir, f), 'utf8');
          batch.set(db_.doc(`wa_sessions/${tenantId}/files/${encodeURIComponent(f)}`), { content });
        }
        await batch.commit();
      }
    } catch (err) {
      console.error(`[WA] Error sincronizando sesión de ${tenantId} a Firestore:`, err);
    }
  }

  function scheduleWASessionSync(tenantId: string) {
    clearTimeout(waSyncTimers.get(tenantId));
    waSyncTimers.set(tenantId, setTimeout(() => syncWASessionToFirestore(tenantId), 3000));
  }

  async function restoreWASessionFromFirestore(tenantId: string): Promise<boolean> {
    if (!adminRuntime) return false;
    const authDir = path.join(WA_AUTH_DIR, tenantId);
    if (fs.existsSync(path.join(authDir, 'creds.json'))) return true; // ya hay sesión local
    try {
      const db_ = adminRuntime.admin.firestore();
      const snap = await db_.collection(`wa_sessions/${tenantId}/files`).get();
      if (snap.empty) return false;
      fs.mkdirSync(authDir, { recursive: true });
      for (const doc of snap.docs) {
        fs.writeFileSync(path.join(authDir, decodeURIComponent(doc.id)), doc.data().content, 'utf8');
      }
      console.log(`[WA] Sesión de ${tenantId} restaurada desde Firestore (${snap.size} archivos).`);
      return true;
    } catch (err) {
      console.error(`[WA] Error restaurando sesión de ${tenantId}:`, err);
      return false;
    }
  }

  async function deleteWASessionEverywhere(tenantId: string) {
    clearTimeout(waSyncTimers.get(tenantId));
    fs.rmSync(path.join(WA_AUTH_DIR, tenantId), { recursive: true, force: true });
    if (!adminRuntime) return;
    try {
      const db_ = adminRuntime.admin.firestore();
      const snap = await db_.collection(`wa_sessions/${tenantId}/files`).get();
      const batch = db_.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(db_.doc(`wa_sessions/${tenantId}`));
      await batch.commit();
    } catch (err) {
      console.error(`[WA] Error borrando sesión remota de ${tenantId}:`, err);
    }
  }

  function getWAClients(tenantId: string): Set<express.Response> {
    if (!waClientsMap.has(tenantId)) waClientsMap.set(tenantId, new Set());
    return waClientsMap.get(tenantId)!;
  }

  function broadcastWAStatus(tenantId: string) {
    const status = waStatusMap.get(tenantId) ?? 'disconnected';
    const phone = waPhoneMap.get(tenantId) ?? null;
    const qr = status === 'qr' ? (waQRMap.get(tenantId) ?? null) : null;
    const payload = JSON.stringify({ status, phone, qr });
    getWAClients(tenantId).forEach(res => res.write(`data: ${payload}\n\n`));
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      ok: true,
      version: "1.0.0",
      geminiConfigured: !!process.env.GEMINI_API_KEY,
      firebaseConfigured: !!adminRuntime,
      waSessionsActive: Array.from(waStatusMap.values()).filter(s => s === 'connected').length,
      uptime: Math.floor(process.uptime()),
    });
  });

  app.get("/api/public-booking/:slug", publicLimiter, async (req, res) => {
    try {
      if (!adminRuntime) {
        return res.status(503).json({ error: "Reservas online no configuradas." });
      }
      const slug = String(req.params.slug || "").trim().toLowerCase();
      if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
        return res.status(400).json({ error: "Enlace de salón inválido." });
      }

      const db = adminRuntime.admin.firestore();
      const tenant = await getTenantBySlug(db, slug);
      if (!tenant) {
        return res.status(404).json({ error: "Salón no encontrado o reservas desactivadas." });
      }

      const [servicesSnap, staffSnap] = await Promise.all([
        db.collection(`tenants/${tenant.id}/services`).get(),
        db.collection(`tenants/${tenant.id}/staff_members`).get(),
      ]);
      const services = servicesSnap.docs.map((docSnap: any) => docSnap.data());
      const staff = staffSnap.docs
        .map((docSnap: any) => docSnap.data())
        .filter((member: any) => member.visibleToClient !== false && member.acceptsOnlineBookings !== false)
        // Only expose what the booking page needs — never staff email/phone (PII) to anonymous visitors.
        .map((member: any) => ({
          id: member.id,
          name: member.name,
          role: member.role,
          avatar: member.avatar,
          specialty: member.specialty,
        }));

      res.json({
        tenant: {
          id: tenant.id,
          name: tenant.data.name,
          city: tenant.data.city,
          address: tenant.data.address,
          phone: tenant.data.phone,
          email: tenant.data.email,
          slug: tenant.data.slug,
          bookingNoticeHours: tenant.data.bookingNoticeHours ?? 2,
          bookingSlotMinutes: tenant.data.bookingSlotMinutes ?? 30,
        },
        services,
        staff,
      });
    } catch (err: any) {
      console.error("Public booking profile failed:", err);
      res.status(500).json({ error: "No se pudo cargar la página de reservas." });
    }
  });

  app.get("/api/public-booking/:slug/availability", publicLimiter, async (req, res) => {
    try {
      if (!adminRuntime) return res.status(503).json({ error: "Reservas online no configuradas." });
      const slug = String(req.params.slug || "").trim().toLowerCase();
      const serviceId = String(req.query.serviceId || "");
      const staffId = String(req.query.staffId || "");
      const date = String(req.query.date || "");
      if (!slug || !serviceId || !staffId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Datos de disponibilidad incompletos." });
      }

      const db = adminRuntime.admin.firestore();
      const tenant = await getTenantBySlug(db, slug);
      if (!tenant) return res.status(404).json({ error: "Salón no encontrado." });

      const [serviceSnap, staffSnap] = await Promise.all([
        db.doc(`tenants/${tenant.id}/services/${serviceId}`).get(),
        db.doc(`tenants/${tenant.id}/staff_members/${staffId}`).get(),
      ]);
      if (!serviceSnap.exists || !staffSnap.exists) {
        return res.status(404).json({ error: "Servicio o profesional no encontrado." });
      }

      const staffMember = staffSnap.data();
      if (staffMember?.visibleToClient === false || staffMember?.acceptsOnlineBookings === false) {
        return res.status(403).json({ error: "Este profesional no acepta reservas online." });
      }

      const slots = await calculateAvailableSlots(
        db,
        tenant.id,
        serviceSnap.data(),
        staffMember,
        date,
        tenant.data.bookingSlotMinutes ?? 30,
        tenant.data.bookingNoticeHours ?? 2
      );
      res.json({ slots });
    } catch (err: any) {
      console.error("Public booking availability failed:", err);
      res.status(500).json({ error: "No se pudo calcular la disponibilidad." });
    }
  });

  app.post(
    "/api/public-booking",
    publicLimiter,
    [
      body("slug").trim().isLength({ min: 1, max: 128 }).matches(/^[a-z0-9-]+$/),
      body("serviceId").trim().isLength({ min: 1, max: 128 }),
      body("staffId").trim().isLength({ min: 1, max: 128 }),
      body("date").trim().matches(/^\d{4}-\d{2}-\d{2}$/),
      body("time").trim().matches(/^\d{2}:\d{2}$/),
      body("clientName").trim().isLength({ min: 2, max: 256 }),
      body("clientPhone").trim().isLength({ min: 6, max: 64 }),
      body("clientEmail").optional().trim().isLength({ max: 256 }),
      body("contactConsent").isBoolean(),
    ],
    async (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Datos de reserva inválidos.", details: errors.array() });
      }
      try {
        if (!adminRuntime) return res.status(503).json({ error: "Reservas online no configuradas." });

        const { slug, serviceId, staffId, date, time, clientName, clientPhone, clientEmail, contactConsent } = req.body;
        if (!contactConsent) {
          return res.status(400).json({ error: "Necesitamos consentimiento de contacto para confirmar la reserva." });
        }

        const db = adminRuntime.admin.firestore();
        const tenant = await getTenantBySlug(db, slug);
        if (!tenant) return res.status(404).json({ error: "Salón no encontrado o reservas desactivadas." });

        const result = await db.runTransaction(async (transaction: any) => {
          const serviceRef = db.doc(`tenants/${tenant.id}/services/${serviceId}`);
          const staffRef = db.doc(`tenants/${tenant.id}/staff_members/${staffId}`);
          const [serviceSnap, staffSnap] = await Promise.all([transaction.get(serviceRef), transaction.get(staffRef)]);
          if (!serviceSnap.exists || !staffSnap.exists) throw new Error("Servicio o profesional no encontrado.");

          const service = serviceSnap.data();
          const staffMember = staffSnap.data();
          const slots = await calculateAvailableSlots(
            db,
            tenant.id,
            service,
            staffMember,
            date,
            tenant.data.bookingSlotMinutes ?? 30,
            tenant.data.bookingNoticeHours ?? 2
          );
          if (!slots.includes(time)) throw new Error("Ese horario ya no está disponible.");

          const cleanPhone = String(clientPhone).replace(/[^\d+]/g, "");
          const clientId = `online-${cleanPhone.replace(/[^a-zA-Z0-9_-]/g, "").slice(-12) || Date.now()}`;
          const appointmentId = `online-${Date.now()}`;
          const now = new Date().toISOString();
          const clientRef = db.doc(`tenants/${tenant.id}/clients/${clientId}`);
          const apptRef = db.doc(`tenants/${tenant.id}/appointments/${appointmentId}`);

          transaction.set(clientRef, {
            id: clientId,
            name: clientName,
            avatar: "",
            phoneNumber: cleanPhone,
            email: clientEmail || "",
            birthdate: "",
            age: 0,
            isVip: false,
            riskLevel: "Bajo",
            riskDays: 0,
            lastVisitDate: date,
            lastVisitService: service.name,
            spendingLtv: 0,
            totalVisits: 0,
            averageFrequencyDays: 0,
            favoriteServices: [],
            appointmentHistory: [],
            preferences: [],
            technicalNotes: "",
            aiReason: "",
            suggestedOfferTitle: "",
            suggestedOfferDesc: "",
            whatsappLog: [],
            tenantId: tenant.id,
            contactConsent: true,
            contactConsentAt: now,
            marketingOptOut: false,
            createdAt: now,
            updatedAt: now,
          }, { merge: true });

          const appointment = {
            id: appointmentId,
            clientName,
            clientId,
            serviceName: service.name,
            serviceId: service.id,
            staffName: staffMember.name,
            staffId: staffMember.id,
            time,
            date,
            price: service.price,
            status: "Reservado",
            tenantId: tenant.id,
            source: "online",
            clientEmail: clientEmail || "",
            clientPhone: cleanPhone,
          };
          transaction.set(apptRef, appointment);
          return appointment;
        });

        res.json({ appointment: result });
      } catch (err: any) {
        console.error("Public booking creation failed:", err);
        res.status(409).json({ error: err.message || "No se pudo crear la reserva." });
      }
    }
  );

  // API Route for real-time natural WhatsApp recovery message generation
  app.post(
    "/api/generate-whatsapp",
    aiLimiter,
    [
      // ponytail: sin .escape() en campos de texto libre — van al prompt de IA, escape() convierte ' en &#x27;
      body("clientId").optional().trim(),
      body("clientName").trim().isLength({ min: 1, max: 256 }),
      body("lastService").trim().isLength({ min: 1, max: 256 }),
      body("riskDays").optional().isInt({ min: 0 }),
      body("riskLevel").optional().trim().isIn(["Alta", "Media", "Baja", "Crítico", "Alto", "Medio", "Bajo"]),
      body("isVip").optional().isBoolean(),
      body("suggestedOffer").optional().trim().isLength({ max: 256 }),
      body("preferences").optional().isArray(),
      body("preferences.*").optional().trim(),
      body("tone").optional().trim().isIn(["Cercano", "Profesional", "Elegante"]),
      body("tenantId").optional().trim().isLength({ min: 1, max: 128 })
    ],
    async (req: any, res: any) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: "Datos de entrada inválidos o maliciosos.", details: errors.array() });
      }

      const timestamp = new Date().toISOString();
      try {
        if (!adminRuntime) {
          return res.status(503).json({
            error: "El servicio de autenticación del servidor no está configurado."
          });
        }

        const authHeader = req.headers.authorization || "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) {
          return res.status(401).json({ error: "Sesión requerida para generar mensajes." });
        }

        const decodedToken = await adminRuntime.admin.auth().verifyIdToken(token);
        if (!checkGeminiQuota(decodedToken.uid)) {
          return res.status(429).json({ error: "Límite de generaciones IA alcanzado. Inténtalo en una hora." });
        }
        const userDoc = await adminRuntime.admin.firestore().doc(`users/${decodedToken.uid}`).get();
        if (!userDoc.exists || userDoc.data()?.status !== "Activo") {
          return res.status(403).json({ error: "Usuario sin acceso activo." });
        }
        const resolvedTenantIdFromUser = userDoc.data()?.tenantId;
        if (!resolvedTenantIdFromUser) {
          return res.status(403).json({ error: "Usuario sin salón asignado." });
        }

        const { 
          clientId,
          clientName, 
          lastService, 
          riskDays, 
          riskLevel, 
          isVip, 
          suggestedOffer, 
          preferences, 
          tone
        } = req.body;

        const resolvedTenantId = resolvedTenantIdFromUser;
        const resolvedClientId = clientId;
        if (!resolvedClientId) {
          return res.status(400).json({ error: "clientId es obligatorio." });
        }
 
      // ----------------------------------------------------
      // MANDATE: Audit log creation for IA actions
      // ----------------------------------------------------
      const PROMPT_VERSION = "v1.3.0"; // 7.3 Checklist: Prompt versionado
      const aiActionLog = {
        id: `audit-ai-${Date.now()}`,
        tenantId: resolvedTenantId,
        userId: "system-ai",
        userEmail: "gemini@elenaos.internal",
        action: "GENERATE_AI_MESSAGE_PROPOSAL",
        entityType: "clients",
        entityId: resolvedClientId,
        details: JSON.stringify({
          clientName,
          riskLevel,
          promptVersion: PROMPT_VERSION,
          requestedTone: tone || "Cercano",
          suggestedOffer
        }),
        timestamp
      };
      
      console.log(`[AUDIT LOG] Action: GENERATE_AI_MESSAGE_PROPOSAL (${PROMPT_VERSION})`, JSON.stringify(aiActionLog, null, 2));
  
      const client = getGeminiClient();
  
      const prompt = `
        VERSIÓN_PROMPT: ${PROMPT_VERSION}
        Actúa como especialista premium en comunicación por WhatsApp para centros de estética e institutos de belleza de autor en España (Castellano de España).
        Tu objetivo es redactar TRES (3) versiones distintas y refinadas basadas en el tono seleccionado ("${tone || "Cercano"}") para recuperar a una clienta habitual que lleva tiempo sin volver al salón. No repitas el mismo estilo; haz que cada versión aborde un ángulo comunicativo único:
        - Versión 1: Súper cercana y empática (un saludo cariñoso enfocado en la relación, extrañar sus charlas, etc.).
        - Versión 2: Profesional y de tendencia (centrada en el autocuidado, tendencias de salud capilar o estética de temporada, mimos y el beneficio).
        - Versión 3: Exclusiva y sugerente (enfocada en una experiencia VIP premium, relax completo de autor y alta costura del cuidado).

        El mensaje debe sonar 100% humano, escrito a mano por un estilista o el equipo del centro, jamás robótico ni comercial directo o agresivo. El tono debe ser refinado pero muy cercano.
        Debe usar expresiones naturales de España (ej: "sacar un hueco", "pasarte por el salón", "espero que estés genial", "darle un mimo al pelo", "consentirte", "te mando un abrazo fuerte").

        ⚠️ REGLA CRÍTICA DE COMUNICACIÓN (ANTISISTEMA):
        - El cliente final/usuario final no tiene por qué saber qué es "ELENA" o "ElenaOS" (ese es el nombre de nuestro software de gestión interno y jamás debe aparecer citado directamente al cliente final).
        - Por lo tanto, queda ABSOLUTAMENTE PROHIBIDO que los mensajes redactados digan frases como "vimos en Elena que...", "notamos en Elena...", "según el sistema Elena...", "un saludo de Elena" o similares que rompen el velo tecnológico.
        - En su lugar, refiérete al origen como: "Nuestra Agenda", "Nuestro Sistema", "Nuestro Centro", "El Salón", "Nuestros Registros de citas" o en primera persona (ej: "Revisando mi agenda de reservas...", "He estado echando un ojo al calendario...", "Todo el equipo te echa de menos...", "En el salón nos encantaría volver a verte..."). El trato debe ser 100% cálido, natural y humano.
        - Incluso si el salón se llama "Elena de Autor", evita mencionar "Elena" como un ente tecnológico o automatización inteligente del estilo "Elena detectó que lleva tiempo sin visitarnos". Habla siempre como un estilista de carne y hueso o el equipo de estilismo de autor.

        MÁS HUMANO Y EMPÁTICO:
        - Haz que el mensaje se sienta redactado a mano directamente por una persona real del equipo de estilistas del salón de autor (puedes sugerir sutilmente que lo firma "Laura", "Sofía", "Mateo" de forma natural o en plural como "el equipo del salón").
        - Adapta profundamente el mensaje al último servicio realizado ("${lastService}"). No utilices fórmulas mecánicas ("como tu último servicio fue..."), sino referencias integradas en la conversación (ej: "desde que te hicimos aquel tratamiento de hidratación profunda", "desde tu última sesión de manicura spa", "desde que pasaste a darle color a tu melena").
        - No uses campos técnicos ni hables de "riesgo de pérdida" ni "días ausente" en el texto de los mensajes. Trata a la clienta con aprecio genuino.

        DATOS ESPECÍFICOS DE LA CLIENTA:
        - Nombre: ${clientName}
        - Último servicio realizado: ${lastService}
        - Días ausente: ${riskDays} días
        - Nivel de riesgo de pérdida: ${riskLevel}
        - Es clienta VIP: ${isVip ? "Sí" : "No"}
        - Beneficio o regalo sugerido para obsequiarle con su reserva: ${suggestedOffer || "Ninguno"}
        - Preferencias y detalles de autor: ${(preferences || []).join(", ")}

        REQUISITOS DE FORMATO Y REDACCIÓN:
        1. Sé breve (máximo 4 párrafos muy cortos por versión). El chat de WhatsApp es un medio íntimo. Debe leerse muy fácil y fluido.
        2. Usa negritas tácticas con formato de WhatsApp (ej: *Tratamiento de Hidratación Profunda de autor*) de forma muy dosificada (máximo 1 o 2 términos en negrita).
        3. NO uses saludos robóticos tipo "Estimado/a cliente" ni cierres fríos del tipo "Atentamente".
        4. Haz referencia suave a su último servicio (${lastService}) y ofrécele de forma natural el obsequio (${suggestedOffer || "un detalle exclusivo"}) como un mimo de autor por su regreso.
        5. Termina con una pregunta abierta muy suave que no presione a responder (ej. "¿Cómo te viene la próxima semana para darte un mimo?" o "¿Te apetece que te reservemos un huequecito con Laura?").

        Devuelve UNICAMENTE un objeto JSON que siga exactamente este esquema o estructura:
        {
          "versions": [
            {
              "id": "v1",
              "tag": "Cercana / Empática",
              "message": "[Texto de la versión 1 de WhatsApp listo para copiar]",
              "recommendation": "[Día y hora sugeridos de envío en España de acuerdo con el estilo de vida relax]"
            },
            {
              "id": "v2",
              "tag": "Profesional / Tendencia",
              "message": "[Texto de la versión 2 de WhatsApp listo para copiar]",
              "recommendation": "[Día y hora sugeridos de envío en España de acuerdo con el estilo de vida relax]"
            },
            {
              "id": "v3",
              "tag": "Exclusiva / VIP Experience",
              "message": "[Texto de la versión 3 de WhatsApp listo para copiar]",
              "recommendation": "[Día y hora sugeridos de envío en España de acuerdo con el estilo de vida relax]"
            }
          ]
        }
      `;
 
      const response = await client.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
 
      const responseText = response.text || "";
      // responseMimeType=application/json returns clean JSON; parse directly and only fall
      // back to brace-extraction if the model ever wraps it in prose.
      let result: any;
      try {
        result = JSON.parse(responseText.trim());
      } catch {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        result = JSON.parse((jsonMatch ? jsonMatch[0] : responseText).trim());
      }
 
      // 7.3 Checklist: Cost estimate via prompt/response character length.
      const estimatedInputTokens = prompt.length / 4;
      const estimatedOutputTokens = responseText.length / 4;
      const estimatedCost = (estimatedInputTokens * 0.0001 / 1000) + (estimatedOutputTokens * 0.0002 / 1000);
      console.log(`[IA BILLING] Estimated Token Usage: IN=${estimatedInputTokens.toFixed(0)}, OUT=${estimatedOutputTokens.toFixed(0)} | Cost: $${estimatedCost.toFixed(6)}`);

      if (!result.versions || !Array.isArray(result.versions) || result.versions.length === 0) {
        throw new Error("Formato de respuesta Gemini incorrecto / ausente de versiones.");
      }

      // Mark the selected draft as pending approval (take the first version as default)
      const draftRecord = {
        id: `draft-${Date.now()}`,
        clientId: resolvedClientId,
        tenantId: resolvedTenantId,
        content: result.versions[0].message,
        versions: result.versions,
        tone: tone || "Cercano",
        suggestedOfferTitle: suggestedOffer || "",
        status: "pendiente", // ALWAYS initialized as pending approval
        createdBy: "AI_GEMINI",
        createdAt: timestamp
      };
 
      console.log("[DRAFT CREATED] AI draft ready for human approval:", JSON.stringify(draftRecord, null, 2));

      await adminRuntime.admin.firestore().doc(`tenants/${resolvedTenantId}/message_drafts/${draftRecord.id}`).set(draftRecord);
      await adminRuntime.admin.firestore().doc(`tenants/${resolvedTenantId}/audit_logs/${aiActionLog.id}`).set(aiActionLog);
 
      // Return both the versions, default saved draft and audit info
      res.json({
        versions: result.versions,
        savedDraft: draftRecord,
        auditLogId: aiActionLog.id
      });

    } catch (error: any) {
      console.error("Error en generate-whatsapp:", error);
      res.status(500).json({ 
        error: "Ocurrió un error generando el mensaje con IA.", 
        details: error?.message || "Error desconocido" 
      });
    }
  });

  // ─── WhatsApp Adapter ────────────────────────────────────────────────────────
  // Sin META_WA_TOKEN + META_PHONE_NUMBER_ID no hay canal Meta: devolvemos false para
  // que la campaña quede 'pendiente'. Nunca fingir un envío que no ocurrió.
  async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
    const token = process.env.META_WA_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      console.warn(`[WA] Sin canal Meta configurado; no se envía a ${to}.`);
      return false;
    }
    try {
      const res = await fetch(
        `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body: text },
          }),
        }
      );
      return res.ok;
    } catch (err) {
      console.error('[WA] Error enviando mensaje:', err);
      return false;
    }
  }

  function normalizePhoneES(raw: string): string {
    let phone = raw.replace(/\D/g, '');
    if (phone.startsWith('0034')) phone = phone.slice(4);
    else if (phone.startsWith('34') && phone.length === 11) phone = phone.slice(2);
    if (phone.length === 9) phone = '34' + phone;
    return phone;
  }

  // Canal único de salida por tenant: Baileys (sesión QR del salón) primero,
  // Meta Cloud API como fallback. Nunca informa éxito sin envío real.
  async function sendViaTenantChannel(
    tenantId: string,
    rawPhone: string,
    text: string
  ): Promise<{ sent: boolean; channel: 'baileys' | 'meta' | null; reason?: string }> {
    const phone = normalizePhoneES(rawPhone);
    const sock = waSockMap.get(tenantId);
    if (sock && waStatusMap.get(tenantId) === 'connected') {
      try {
        await sock.sendMessage(`${phone}@s.whatsapp.net`, { text });
        return { sent: true, channel: 'baileys' };
      } catch (err) {
        console.error('[WA Baileys] Error enviando, probando Meta:', err);
      }
    }
    if (await sendWhatsAppMessage(phone, text)) return { sent: true, channel: 'meta' };
    return { sent: false, channel: null, reason: 'no_channel' };
  }

  // ─── Agente: Generar mensaje personalizado con Gemini ────────────────────────
  async function generateAgentOutreach(client: any, tenantName: string, genAI: GoogleGenAI | null): Promise<string> {
    const fallback = `Hola ${client.clientName || client.name}! 👋 Te echamos de menos en ${tenantName}. Han pasado ${client.riskDays} días desde tu última visita. ¿Te apetece reservar un hueco esta semana? Escríbenos y te buscamos el mejor momento. 💇`;
    if (!genAI) return fallback;
    try {
      const model = genAI.models;
      const result = await model.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `Eres el asistente de ${tenantName}, un salón de belleza. Redacta un WhatsApp breve y cálido (máx 3 frases) para reconectar con una clienta.
Clienta: ${client.clientName || client.name}
Días sin visita: ${client.riskDays}
Último servicio: ${client.lastVisitService || 'desconocido'}
Oferta sugerida: ${client.suggestedOfferTitle || 'ninguna especial'}
Tono: cercano, personal, sin presión. NO uses emojis en exceso. Termina con una pregunta abierta para agendar.`
          }]
        }]
      });
      return result.text?.trim() || fallback;
    } catch {
      return fallback;
    }
  }

  // ─── Agente: Clasificar motivo de ausencia ───────────────────────────────────
  async function classifyAbsenceReason(clientText: string, genAI: GoogleGenAI | null): Promise<string | null> {
    if (!genAI) return null;
    try {
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Clasifica el siguiente mensaje de una clienta de salón de belleza en UNO de estos motivos de ausencia. Responde SOLO con la clave exacta o "null" si no aplica ninguno:
- economia (menciona dinero, precio, caro, justa, presupuesto)
- competencia (menciona otro salón, cerca de casa, probando otro)
- autoservicio (menciona hacérselo ella misma, tinte en casa, tutorial)
- tiempo (menciona que no tiene tiempo, ocupada, trabajo, agenda)
- personal (menciona situación personal, familia, salud, estrés)

Mensaje: "${clientText.replace(/"/g, "'")}"

Responde solo la clave o null:`,
      });
      const raw = result.text?.trim().toLowerCase() || 'null';
      const valid = ['economia', 'competencia', 'autoservicio', 'tiempo', 'personal'];
      return valid.includes(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  // ─── Agente: Continuar conversación ──────────────────────────────────────────
  async function generateAgentReply(
    clientReply: string,
    conversationLog: any[],
    tenantName: string,
    availableSlots: string[],
    genAI: GoogleGenAI | null
  ): Promise<{ text: string; intent: 'booking' | 'info' | 'continue' | 'human' }> {
    if (!genAI) return { text: `Perfecto, te paso con el equipo de ${tenantName} para confirmar tu cita. 😊`, intent: 'human' };
    try {
      const history = conversationLog.map(m => `${m.role === 'agent' ? 'Salón' : 'Clienta'}: ${m.text}`).join('\n');
      const slotsText = availableSlots.length > 0 ? `Huecos disponibles: ${availableSlots.slice(0, 4).join(', ')}` : 'Sin disponibilidad inmediata.';
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{
          role: 'user',
          parts: [{
            text: `Eres el asistente de ${tenantName}. Responde al mensaje de la clienta de forma breve y natural.
Conversación previa:
${history}
Clienta ahora dice: "${clientReply}"
${slotsText}
Responde en JSON: {"text":"...respuesta...","intent":"booking"|"info"|"continue"|"human"}
- booking: la clienta confirma querer cita
- info: pregunta información (precio, servicio)
- continue: continúa conversando sin confirmar
- human: situación compleja, escalar al gerente`
          }]
        }]
      });
      const raw = result.text?.trim() || '';
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      return { text: raw, intent: 'continue' };
    } catch {
      return { text: `Gracias por escribir. Ahora mismo te atendemos personalmente. 😊`, intent: 'human' };
    }
  }

  // ─── POST /api/agent/scan ─────────────────────────────────────────────────────
  // Escanea clientes en riesgo y genera campañas pendientes
  app.post('/api/agent/scan', apiLimiter, async (req, res) => {
    try {
      const { tenantId, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();

      // Leer config del agente
      const configDoc = await db_.doc(`tenants/${tenantId}/settings/agent`).get();
      const agentConfig = configDoc.exists ? configDoc.data() : { enabled: true, autoSend: false, cooldownDays: 7, maxActivePerDay: 10, minRiskLevel: 'Alto' };

      if (!agentConfig?.enabled) return res.json({ scanned: 0, queued: 0, message: 'Agente desactivado.' });

      // Clientes en riesgo
      const clientsSnap = await db_.collection(`tenants/${tenantId}/clients`)
        .where('riskLevel', 'in', agentConfig.minRiskLevel === 'Crítico' ? ['Crítico'] : ['Alto', 'Crítico'])
        .get();

      // Campañas recientes (para cooldown)
      const cooldownDate = new Date();
      cooldownDate.setDate(cooldownDate.getDate() - (agentConfig.cooldownDays || 7));
      const recentSnap = await db_.collection(`tenants/${tenantId}/agent_campaigns`)
        .where('createdAt', '>=', cooldownDate.toISOString())
        .get();
      const recentClientIds = new Set(recentSnap.docs.map((d: any) => d.data().clientId));

      // Campañas activas hoy (para maxActivePerDay)
      const todayStr = new Date().toISOString().split('T')[0];
      const todaySnap = await db_.collection(`tenants/${tenantId}/agent_campaigns`)
        .where('createdAt', '>=', `${todayStr}T00:00:00.000Z`)
        .get();

      const tenantDoc = await db_.doc(`tenants/${tenantId}`).get();
      const tenantName = tenantDoc.data()?.name || 'el salón';

      let queued = 0;
      const maxToday = (agentConfig.maxActivePerDay || 10) - todaySnap.size;

      for (const doc of clientsSnap.docs) {
        if (queued >= maxToday) break;
        const client = { id: doc.id, ...doc.data() } as any;
        if (recentClientIds.has(client.id)) continue;
        if (!client.phoneNumber || !client.contactConsent) continue;

        const message = await generateAgentOutreach({ ...client, clientName: client.name }, tenantName, ai);

        const campaign = {
          tenantId,
          clientId: client.id,
          clientName: client.name,
          clientPhone: client.phoneNumber,
          riskLevel: client.riskLevel,
          riskDays: client.riskDays || 0,
          suggestedService: client.lastVisitService || '',
          message,
          status: 'pendiente', // solo pasa a 'enviado' si el envío real tiene éxito
          autoSend: agentConfig.autoSend || false,
          createdAt: new Date().toISOString(),
          conversationLog: [{ role: 'agent', text: message, timestamp: new Date().toISOString() }],
        };

        const ref = db_.collection(`tenants/${tenantId}/agent_campaigns`).doc();
        await ref.set(campaign);

        if (agentConfig.autoSend) {
          const result = await sendViaTenantChannel(tenantId, client.phoneNumber, message);
          if (result.sent) await ref.update({ status: 'enviado', sentAt: new Date().toISOString() });
        }

        queued++;
      }

      res.json({ scanned: clientsSnap.size, queued, autoSend: agentConfig.autoSend });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── GET /api/agent/campaigns ─────────────────────────────────────────────────
  app.get('/api/agent/campaigns', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      const snap = await db_.collection(`tenants/${tenantId}/agent_campaigns`)
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      res.json(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })));
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/campaigns/:id/approve ────────────────────────────────────
  app.post('/api/agent/campaigns/:id/approve', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      const ref = db_.doc(`tenants/${tenantId}/agent_campaigns/${req.params.id}`);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Campaña no encontrada.' });
      const campaign = snap.data() as any;

      const result = await sendViaTenantChannel(tenantId, campaign.clientPhone, campaign.message);
      await ref.update({ status: result.sent ? 'enviado' : 'pendiente', sentAt: result.sent ? new Date().toISOString() : null });
      res.json({ ok: true, sent: result.sent, channel: result.channel, reason: result.reason });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/campaigns/:id/reject ────────────────────────────────────
  app.post('/api/agent/campaigns/:id/reject', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      await db_.doc(`tenants/${tenantId}/agent_campaigns/${req.params.id}`).update({ status: 'rechazado' });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/campaigns/:id/reply ─────────────────────────────────────
  app.post('/api/agent/campaigns/:id/reply', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text requerido.' });
      const db_ = adminRuntime!.admin.firestore();
      const ref = db_.doc(`tenants/${tenantId}/agent_campaigns/${req.params.id}`);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Campaña no encontrada.' });
      const campaign = snap.data() as any;

      const result = await sendViaTenantChannel(tenantId, campaign.clientPhone, text);
      if (!result.sent) {
        return res.status(502).json({ error: 'No hay canal de WhatsApp conectado. Conecta WhatsApp en el panel del agente.', reason: result.reason });
      }

      const newEntry = { role: 'agent', text, timestamp: new Date().toISOString() };
      const log = [...(campaign.conversationLog || []), newEntry];
      await ref.update({ conversationLog: log, status: 'enviado', sentAt: new Date().toISOString() });
      res.json({ ok: true, sent: true, channel: result.channel, entry: newEntry });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/campaigns/:id/absence-action ────────────────────────────
  // Genera y encola un mensaje adaptado al motivo de ausencia detectado
  app.post('/api/agent/campaigns/:id/absence-action', aiLimiter, async (req, res) => {
    try {
      const { tenantId, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      const ref = db_.doc(`tenants/${tenantId}/agent_campaigns/${req.params.id}`);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: 'Campaña no encontrada.' });
      const campaign = snap.data() as any;
      const absenceReason = campaign.absenceReason || req.body.absenceReason;
      if (!absenceReason) return res.status(400).json({ error: 'Sin motivo de ausencia.' });

      const actionMap: Record<string, string> = {
        economia:     'oferta especial de reconexión con descuento exclusivo',
        competencia:  'propuesta de valor diferencial del salón',
        autoservicio: 'ventajas del cuidado profesional frente al autoservicio',
        tiempo:       'recordatorio amable en 2 semanas sin presión',
        personal:     'mensaje empático de apoyo dando espacio',
      };

      const tenantDoc = await db_.doc(`tenants/${tenantId}`).get();
      const tenantName = tenantDoc.data()?.name || 'el salón';
      const action = actionMap[absenceReason] || 'mensaje de reconexión';

      const message = await generateAgentOutreach(
        { ...campaign, clientName: campaign.clientName, suggestedOfferTitle: action },
        tenantName, ai
      );

      const newCampaign = {
        ...campaign,
        id: undefined,
        message,
        status: 'pendiente',
        autoSend: false,
        createdAt: new Date().toISOString(),
        sentAt: null,
        repliedAt: null,
        lastReply: null,
        conversationLog: [{ role: 'agent', text: message, timestamp: new Date().toISOString() }],
      };
      delete newCampaign.id;

      const newRef = db_.collection(`tenants/${tenantId}/agent_campaigns`).doc();
      await newRef.set(newCampaign);
      await ref.update({ absenceActionTaken: true });

      res.json({ ok: true, campaignId: newRef.id, message });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/broadcast ───────────────────────────────────────────────
  // Envía un mensaje personalizado a todos los clientes con campañas pendientes
  app.post('/api/agent/broadcast', aiLimiter, async (req, res) => {
    try {
      const { tenantId, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const { message } = req.body;
      if (!message?.trim()) return res.status(400).json({ error: 'message requerido.' });

      const db_ = adminRuntime!.admin.firestore();
      const snap = await db_.collection(`tenants/${tenantId}/agent_campaigns`)
        .where('status', '==', 'pendiente').get();

      let sent = 0;

      for (const doc of snap.docs) {
        const campaign = doc.data() as any;
        const result = await sendViaTenantChannel(tenantId, campaign.clientPhone, message);
        if (!result.sent) continue; // sin canal: la campaña sigue pendiente, no se miente

        const entry = { role: 'agent', text: message, timestamp: new Date().toISOString() };
        await doc.ref.update({
          status: 'enviado',
          sentAt: new Date().toISOString(),
          conversationLog: [...(campaign.conversationLog || []), entry],
        });
        sent++;
      }

      res.json({ ok: true, total: snap.size, sent });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/refine ───────────────────────────────────────────────────
  app.post('/api/agent/refine', aiLimiter, async (req, res) => {
    try {
      const { uid } = await resolveAuthenticatedTenant(req, adminRuntime);
      if (!checkGeminiQuota(uid)) return res.status(429).json({ error: 'Límite de generaciones IA alcanzado. Inténtalo en una hora.' });
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ error: 'text requerido.' });
      const genAI = getGeminiClient();
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Eres un experto en comunicación para salones de belleza en España. Mejora este mensaje de campaña de WhatsApp para que suene más cálido, personal y menos comercial. Máximo 3 frases. Devuelve solo el texto mejorado, sin explicaciones:\n\n${text}`,
      });
      res.json({ refined: result.text?.trim() || text });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── GET /api/agent/config ────────────────────────────────────────────────────
  app.get('/api/agent/config', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      const doc = await db_.doc(`tenants/${tenantId}/settings/agent`).get();
      res.json(doc.exists ? doc.data() : { enabled: false, autoSend: false, scanIntervalHours: 24, minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10 });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── PUT /api/agent/config ────────────────────────────────────────────────────
  app.put('/api/agent/config', apiLimiter, express.json(), async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const db_ = adminRuntime!.admin.firestore();
      await db_.doc(`tenants/${tenantId}/settings/agent`).set(req.body, { merge: true });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/client/:id/hard-delete ────────────────────────────────────────
  // LEG-03: RGPD right-to-erasure — deletes all client PII and leaves audit trail
  app.post('/api/client/:id/hard-delete', express.json(), async (req, res) => {
    try {
      const { tenantId, uid, db } = await resolveAuthenticatedTenant(req, adminRuntime);
      const clientId = req.params.id;
      const clientRef = db.doc(`tenants/${tenantId}/clients/${clientId}`);
      const clientSnap = await clientRef.get();
      if (!clientSnap.exists) { res.status(404).json({ error: 'Client not found' }); return; }

      const db_ = adminRuntime!.admin.firestore();
      const batch = db_.batch();

      // Delete all appointments referencing this client
      const apptSnap = await db.collection(`tenants/${tenantId}/appointments`)
        .where('clientId', '==', clientId).get();
      apptSnap.docs.forEach(d => batch.delete(d.ref));

      // Delete agent campaigns
      const campSnap = await db.collection(`tenants/${tenantId}/agent_campaigns`)
        .where('clientId', '==', clientId).get();
      campSnap.docs.forEach(d => batch.delete(d.ref));

      // Replace client doc with erasure tombstone (no PII)
      batch.set(clientRef, {
        __erased: true,
        erasedAt: new Date().toISOString(),
        erasedBy: uid,
      });

      await batch.commit();

      // Append-only audit log
      await db.collection(`tenants/${tenantId}/audit_log`).add({
        action: 'client.hard_delete',
        clientId,
        performedBy: uid,
        at: new Date().toISOString(),
      });

      res.json({ ok: true, deletedAppointments: apptSnap.size, deletedCampaigns: campSnap.size });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /webhook/whatsapp ───────────────────────────────────────────────────
  app.post('/webhook/whatsapp', express.json(), async (req, res) => {
    // SEC-01: HMAC-SHA256 signature verification
    const webhookSecret = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (webhookSecret) {
      const sig = req.headers['x-hub-signature-256'] as string | undefined;
      if (!sig) { res.sendStatus(401); return; }
      const { createHmac } = await import('node:crypto');
      const expected = 'sha256=' + createHmac('sha256', webhookSecret).update(JSON.stringify(req.body)).digest('hex');
      if (sig !== expected) { res.sendStatus(403); return; }
    }
    res.sendStatus(200); // Responder rápido para que Meta no reintente

    try {
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const message = change?.value?.messages?.[0];
      if (!message || message.type !== 'text') return;

      const from = message.from; // número del cliente
      const clientText = message.text?.body || '';

      if (!adminRuntime) return;
      const db_ = adminRuntime.admin.firestore();

      // SEC-02: scope query to exact phone match, iterate tenants to avoid cross-tenant leak
      const normalizedPhone = from.slice(-9);
      const tenantsSnap = await db_.collectionGroup('agent_campaigns')
        .where('clientPhone', '==', normalizedPhone)
        .where('status', 'in', ['enviado', 'respondido'])
        .limit(1)
        .get();

      if (tenantsSnap.empty) return;

      const campaignDoc = tenantsSnap.docs[0];
      const campaign = campaignDoc.data() as any;
      const tenantId = campaign.tenantId;

      const tenantDoc = await db_.doc(`tenants/${tenantId}`).get();
      const tenantName = tenantDoc.data()?.name || 'el salón';

      // Huecos disponibles (simplificado — primer servicio del tenant)
      const servicesSnap = await db_.collection(`tenants/${tenantId}/services`).limit(1).get();
      const firstService = servicesSnap.docs[0]?.data();
      const availableSlots: string[] = []; // ponytail: slot calculation omitida aquí, se delega al booking endpoint

      const newLog = [...(campaign.conversationLog || []), { role: 'client', text: clientText, timestamp: new Date().toISOString() }];
      const { text: reply, intent } = await generateAgentReply(clientText, newLog, tenantName, availableSlots, ai);

      newLog.push({ role: 'agent', text: reply, timestamp: new Date().toISOString() });
      const absenceReason = await classifyAbsenceReason(clientText, ai);

      const update: any = {
        status: intent === 'booking' ? 'reservado' : 'respondido',
        repliedAt: new Date().toISOString(),
        lastReply: clientText,
        conversationLog: newLog,
        ...(absenceReason && {
          absenceReason,
          absenceDetectedText: `IA: Detectado motivo ${absenceReason} → acción sugerida disponible`,
        }),
      };

      await campaignDoc.ref.update(update);
      await sendWhatsAppMessage(from, reply);
    } catch (err) {
      console.error('[Webhook WA] Error:', err);
    }
  });

  // Meta verifica el webhook con GET
  app.get('/webhook/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === process.env.META_WA_VERIFY_TOKEN) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  });

  // ─── Baileys WhatsApp Session ────────────────────────────────────────────────
  async function startBaileys(tenantId: string) {
    try {
      // Dynamic import — baileys es ESM puro
      const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } =
        await (new Function('s', 'return import(s)'))('@whiskeysockets/baileys');

      const authDir = path.join(WA_AUTH_DIR, tenantId);
      fs.mkdirSync(authDir, { recursive: true });
      await restoreWASessionFromFirestore(tenantId);

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Elena Salon', 'Chrome', '120.0'],
        getMessage: async () => undefined,
      });

      waSockMap.set(tenantId, sock);
      waStatusMap.set(tenantId, 'connecting');
      broadcastWAStatus(tenantId);

      sock.ev.on('creds.update', async () => {
        await saveCreds();
        scheduleWASessionSync(tenantId);
      });

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
          waStatusMap.set(tenantId, 'qr');
          waQRMap.set(tenantId, await QRCode.toDataURL(qr));
          broadcastWAStatus(tenantId);
        }
        if (connection === 'open') {
          waStatusMap.set(tenantId, 'connected');
          waQRMap.set(tenantId, null);
          waPhoneMap.set(tenantId, sock.user?.id?.split(':')[0] || null);
          broadcastWAStatus(tenantId);
          console.log(`[WA Baileys] Conectado: ${waPhoneMap.get(tenantId)}`);
        }
        if (connection === 'close') {
          const code = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          waStatusMap.set(tenantId, shouldReconnect ? 'connecting' : 'disconnected');
          waPhoneMap.set(tenantId, null);
          broadcastWAStatus(tenantId);
          if (shouldReconnect) setTimeout(() => startBaileys(tenantId), 5000);
          else { waSockMap.delete(tenantId); await deleteWASessionEverywhere(tenantId); }
        }
      });

      // Mensajes entrantes de WhatsApp → agente Gemini
      sock.ev.on('messages.upsert', async ({ messages }: any) => {
        for (const msg of messages) {
          if (msg.key.fromMe || !msg.message) continue;
          const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
          const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
          if (!text || !from || !adminRuntime) continue;

          const db_ = adminRuntime.admin.firestore();

          // Buscar campaña activa para este número
          const campSnap = await db_.collection(`tenants/${tenantId}/agent_campaigns`)
            .where('status', 'in', ['enviado', 'respondido'])
            .get();
          const campaignDoc = campSnap.docs.find((d: any) => {
            const phone = d.data().clientPhone?.replace(/\D/g, '').slice(-9);
            return from.slice(-9) === phone;
          });

          if (!campaignDoc) continue;
          const campaign = campaignDoc.data() as any;
          const tenantDoc = await db_.doc(`tenants/${tenantId}`).get();
          const tenantName = tenantDoc.data()?.name || 'el salón';

          const newLog = [...(campaign.conversationLog || []),
            { role: 'client', text, timestamp: new Date().toISOString() }];
          const { text: reply, intent } = await generateAgentReply(text, newLog, tenantName, [], ai);
          newLog.push({ role: 'agent', text: reply, timestamp: new Date().toISOString() });
          const absenceReason = await classifyAbsenceReason(text, ai);

          await campaignDoc.ref.update({
            status: intent === 'booking' ? 'reservado' : 'respondido',
            repliedAt: new Date().toISOString(),
            lastReply: text,
            conversationLog: newLog,
            ...(absenceReason && {
              absenceReason,
              absenceDetectedText: `IA: Detectado motivo ${absenceReason} → acción sugerida disponible`,
            }),
          });

          // Responder por WhatsApp
          await sock.sendMessage(`${from}@s.whatsapp.net`, { text: reply });
        }
      });
    } catch (err) {
      console.error('[WA Baileys] Error iniciando:', err);
      waStatusMap.set(tenantId, 'disconnected');
      broadcastWAStatus(tenantId);
    }
  }

  // Reconectar sesiones guardadas al arrancar: disco local + Firestore
  // (tras un redeploy el disco está vacío; Firestore es la fuente durable)
  if (adminRuntime) {
    (async () => {
      const local = fs.existsSync(WA_AUTH_DIR) ? fs.readdirSync(WA_AUTH_DIR) : [];
      let remote: string[] = [];
      try {
        const snap = await adminRuntime!.admin.firestore().collection('wa_sessions').get();
        remote = snap.docs.map(d => d.id);
      } catch (err) {
        console.error('[WA] Error listando sesiones remotas:', err);
      }
      for (const tid of new Set([...local, ...remote])) {
        console.log(`[WA Baileys] Reconectando sesión: ${tid}`);
        startBaileys(tid);
      }
    })();
  }

  // ─── GET /api/agent/wa-status (SSE) ──────────────────────────────────────────
  // ponytail: EventSource no soporta headers custom → aceptar token por query param
  app.get('/api/agent/wa-status', async (req, res) => {
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    let tenantId: string;
    try {
      ({ tenantId } = await resolveAuthenticatedTenant(req, adminRuntime));
    } catch {
      return res.sendStatus(401);
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const status = waStatusMap.get(tenantId) ?? 'disconnected';
    const phone = waPhoneMap.get(tenantId) ?? null;
    const qr = status === 'qr' ? (waQRMap.get(tenantId) ?? null) : null;
    res.write(`data: ${JSON.stringify({ status, phone, qr })}\n\n`);

    const clients = getWAClients(tenantId);
    clients.add(res);
    req.on('close', () => clients.delete(res));
  });

  // ─── POST /api/agent/wa-connect ───────────────────────────────────────────────
  app.post('/api/agent/wa-connect', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const currentStatus = waStatusMap.get(tenantId) ?? 'disconnected';
      if (currentStatus !== 'disconnected') return res.json({ ok: true, status: currentStatus });
      startBaileys(tenantId);
      res.json({ ok: true, status: 'connecting' });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── POST /api/agent/wa-disconnect ───────────────────────────────────────────
  app.post('/api/agent/wa-disconnect', apiLimiter, async (req, res) => {
    try {
      const { tenantId } = await resolveAuthenticatedTenant(req, adminRuntime);
      const sock = waSockMap.get(tenantId);
      if (sock) { await sock.logout(); waSockMap.delete(tenantId); }
      waStatusMap.set(tenantId, 'disconnected');
      waPhoneMap.set(tenantId, null);
      waQRMap.set(tenantId, null);
      await deleteWASessionEverywhere(tenantId);
      broadcastWAStatus(tenantId);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(err.statusCode || 500).json({ error: err.message });
    }
  });

  // ─── Chat Web público (/salon/:slug/chat) ────────────────────────────────────
  // SSE clients por sesión de chat {sessionId → res}
  const chatSSEClients = new Map<string, express.Response>();

  // GET /api/chat/:slug/stream?sessionId=xxx  — SSE para el cliente web
  app.get('/api/chat/:slug/stream', (req, res) => {
    const { sessionId } = req.query as { sessionId: string };
    if (!sessionId) return res.sendStatus(400);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    chatSSEClients.set(sessionId, res);
    req.on('close', () => chatSSEClients.delete(sessionId));
  });

  // POST /api/chat/:slug/message  — cliente envía mensaje
  app.post('/api/chat/:slug/message', publicLimiter, express.json(), async (req, res) => {
    const { slug } = req.params;
    const { sessionId, clientName, text } = req.body as { sessionId: string; clientName: string; text: string };
    if (!sessionId || !text?.trim()) return res.status(400).json({ error: 'sessionId y text requeridos.' });
    if (!adminRuntime) return res.status(503).json({ error: 'Base de datos no disponible.' });

    res.json({ ok: true }); // responder rápido, procesar async

    try {
      const db_ = adminRuntime.admin.firestore();
      const tenant = await getTenantBySlug(db_, slug);
      if (!tenant) return;
      const tenantId = tenant.id;
      const tenantName = tenant.data.name || 'el salón';

      const sessionRef = db_.doc(`tenants/${tenantId}/chat_sessions/${sessionId}`);
      const sessionSnap = await sessionRef.get();
      const session = sessionSnap.exists ? sessionSnap.data() : { clientName, log: [] };
      const log = session?.log || [];

      log.push({ role: 'client', text, timestamp: new Date().toISOString() });

      // Gemini responde
      const { text: reply } = await generateAgentReply(text, log, tenantName, [], ai);
      log.push({ role: 'agent', text: reply, timestamp: new Date().toISOString() });

      await sessionRef.set({ clientName, log, tenantId, updatedAt: new Date().toISOString() }, { merge: true });

      // Push por SSE al cliente web
      const sseRes = chatSSEClients.get(sessionId);
      if (sseRes) sseRes.write(`data: ${JSON.stringify({ role: 'agent', text: reply, timestamp: new Date().toISOString() })}\n\n`);
    } catch (err) {
      console.error('[Chat Web] Error:', err);
    }
  });

  // GET /api/chat/:slug/history?sessionId=xxx
  app.get('/api/chat/:slug/history', publicLimiter, async (req, res) => {
    const { slug } = req.params;
    const { sessionId } = req.query as { sessionId: string };
    if (!sessionId || !adminRuntime) return res.json({ log: [] });
    try {
      const db_ = adminRuntime.admin.firestore();
      const tenant = await getTenantBySlug(db_, slug);
      if (!tenant) return res.json({ log: [] });
      const doc = await db_.doc(`tenants/${tenant.id}/chat_sessions/${sessionId}`).get();
      res.json({ log: doc.exists ? doc.data()?.log || [] : [] });
    } catch {
      res.json({ log: [] });
    }
  });

  // Vite middleware for development
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`ElenaOS Server running on http://localhost:${PORT}`);
  });
}

startServer();
