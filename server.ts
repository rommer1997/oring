import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { body, validationResult } from "express-validator";
import Stripe from "stripe";

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

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "ElenaOS AI Backend Service is healthy." });
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
        model: "gemini-3.5-flash",
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

  // Vite middleware for development
  if (!isProduction) {
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
