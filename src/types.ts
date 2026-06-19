export type AppView = 
  | 'landing' 
  | 'onboarding'
  | 'dashboard' 
  | 'retention' 
  | 'message-editor' 
  | 'client-profile' 
  | 'agenda' 
  | 'servicios'
  | 'inventario'
  | 'facturacion'
  | 'admin'
  | 'staff-tenant' 
  | 'settings';

export interface Tenant {
  id: string;
  name: string;
  address: string;
  phone: string;
  city: string;
  email?: string;
  onboardingCompleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  subscriptionStatus?: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid';
  trialEndsAt?: string;
  subscriptionEndsAt?: string;
  publicBookingEnabled?: boolean;
  slug?: string;
  bookingNoticeHours?: number;
  bookingSlotMinutes?: number;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  email: string;
  phone: string;
  specialty: string;
  tenantId: string;
  visibleToClient?: boolean;
  acceptsOnlineBookings?: boolean;
  schedule?: {
    [day: string]: {
      start: string; // HH:MM
      end: string;   // HH:MM
      isWorking: boolean;
      splitShift?: boolean;
      secondStart?: string;
      secondEnd?: string;
    };
  };
}

export interface Service {
  id: string;
  name: string;
  category: 'Cabello' | 'Uñas' | 'Facial' | 'Masaje';
  price: number;
  durationMinutes: number;
  tenantId?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  category: 'Coloración' | 'Tratamiento' | 'Uñas' | 'Facial' | 'Limpieza' | 'Herramientas' | 'Otro';
  unit: string; // ej: 'ml', 'unidades', 'kg'
  currentStock: number;
  minStock: number;  // nivel de reposición
  costPrice: number; // precio de coste (€)
  supplier?: string;
  notes?: string;
  tenantId: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientId: string;
  serviceName: string;
  serviceId: string;
  staffName: string;
  staffId: string;
  time: string; // HH:MM
  date: string; // YYYY-MM-DD
  price: number;
  status: 'Pagado' | 'Reservado' | 'Cancelado';
  durationMinutes?: number;
  tenantId: string;
  source?: 'manual' | 'online';
  clientEmail?: string;
  clientPhone?: string;
}

export interface ClientProfile {
  id: string;
  name: string;
  avatar: string;
  phoneNumber: string;
  email: string;
  birthdate: string;
  age: number;
  isVip: boolean;
  riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  riskDays: number;
  lastVisitDate: string;
  lastVisitService: string;
  spendingLtv: number;
  totalVisits: number;
  averageFrequencyDays: number;
  favoriteServices: FavoriteService[];
  appointmentHistory: AppointmentHistoryItem[];
  preferences: string[];
  technicalNotes: string;
  aiReason: string;
  suggestedOfferTitle: string;
  suggestedOfferDesc: string;
  whatsappLog: WhatsAppMessage[];
  tenantId: string;
  contactConsent?: boolean;
  contactConsentAt?: string;
  marketingOptOut?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FavoriteService {
  name: string;
  count: number;
  pricePerVisit: number;
  icon: string;
}

export interface AppointmentHistoryItem {
  id: string;
  date: string;
  year: string;
  serviceName: string;
  attendedBy: string;
  price: number;
  status: 'Pagado' | 'Reservado' | 'Cancelado';
}

export interface WhatsAppMessage {
  id: string;
  sender: 'client' | 'ai_auto' | 'user';
  text: string;
  timestamp: string;
  dateLabel: string;
  status?: 'borrador' | 'enviado';
}

export interface AgendaItem {
  id: string;
  time: string;
  clientName: string;
  serviceName: string;
  statusColorClass: string;
}

export interface AppConfig {
  highRiskThresholdDays: number;
  midRiskThresholdDays: number;
  isAiAutoTriggerEnabled: boolean;
  activeStaffRole: 'Propietaria' | 'Estilista Principal' | 'Recepcionista';
  activeStaffId: string;
  isErrorLoggingEnabled?: boolean;
  isRotatingScheduleEnabled?: boolean;
  isBeginnerMode?: boolean;
}

export interface User {
  id: string; // Auth UID
  email: string;
  name: string;
  role: 'Administrador' | 'Estilista de autor' | 'Recepcionista' | 'Especialista Facial' | 'Propietaria';
  staffMemberId?: string; // Links back to staff_members if applicable
  tenantId: string; // Current default tenant
  status: 'Activo' | 'Inactivo';
  emailVerified: boolean;
  createdAt: string; // ISO DateTime string
  onboardingCompleted?: boolean;
  globalAdmin?: boolean;
  photoURL?: string;
  lastLoginAt?: string;
}

export interface RetentionScore {
  id: string;
  clientId: string;
  tenantId: string;
  score: number; // 0 to 100
  riskLevel: 'Bajo' | 'Medio' | 'Alto' | 'Crítico';
  riskDays: number;
  calculatedAt: string;
  reasons: string[];
}

export interface MessageDraft {
  id: string;
  clientId: string;
  tenantId: string;
  content: string;
  versions?: {
    id: string;
    tag: string;
    message: string;
    recommendation: string;
  }[];
  tone: 'Cercano' | 'Profesional' | 'Elegante';
  suggestedOfferTitle: string;
  status: 'pendiente' | 'aprobado' | 'enviado' | 'descartado';
  createdBy: string; // System/AI or Staff Id
  createdAt: string;
}

export interface MessageEvent {
  id: string;
  clientId: string;
  tenantId: string;
  sender: 'client' | 'ai_auto' | 'user';
  text: string;
  timestamp: string; // HH:MM or ISO
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channel: 'whatsapp' | 'email' | 'system';
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  action: string; // e.g., 'CREATE_APPOINTMENT', 'UPDATE_RETENTION_THRESHOLD', etc.
  entityType: 'appointments' | 'clients' | 'services' | 'staff_members' | 'tenants' | 'settings' | 'users';
  entityId: string;
  details: string;
  timestamp: string; // ISO DateTime string
}
