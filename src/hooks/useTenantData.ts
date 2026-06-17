import type { Dispatch, SetStateAction } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Tenant,
  StaffMember,
  Service,
  Appointment,
  ClientProfile,
  WhatsAppMessage,
  MessageDraft,
  AuditLog,
  AppConfig,
  User,
  InventoryItem,
} from '../types';

/**
 * All CRUD operations against Firestore (or local state for demo mode).
 * These are pure functions that receive state setters as arguments — no React hooks needed.
 */

// ─── Avatar helper ───────────────────────────────────────────────────────────
/** Generates a deterministic avatar URL from a name using initials + color. */
export function generateAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const colors = ['4A2C40', '7B3F5E', '9E5A78', 'BF8EA0', '6D3050', '5C2A45'];
  const colorIndex = name.charCodeAt(0) % colors.length;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${colors[colorIndex]}&color=fff&size=200&bold=true&font-size=0.4`;
}

// ─── Services ────────────────────────────────────────────────────────────────
export function handleAddService(
  newService: Service,
  { firebaseUser, isDemoMode, selectedTenantId, setServices }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setServices: Dispatch<SetStateAction<Service[]>>;
  }
) {
  const serviceRecord = { ...newService, tenantId: selectedTenantId };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'services', serviceRecord.id), serviceRecord)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/services/${newService.id}`));
  } else {
    setServices((prev) => [...prev, serviceRecord]);
  }
}

export function handleEditService(
  updated: Service,
  { firebaseUser, isDemoMode, selectedTenantId, setServices }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setServices: Dispatch<SetStateAction<Service[]>>;
  }
) {
  const serviceRecord = { ...updated, tenantId: selectedTenantId };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'services', serviceRecord.id), serviceRecord)
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/services/${updated.id}`));
  } else {
    setServices((prev) => prev.map((s) => (s.id === updated.id ? serviceRecord : s)));
  }
}

export function handleDeleteService(
  id: string,
  { firebaseUser, isDemoMode, selectedTenantId, setServices }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setServices: Dispatch<SetStateAction<Service[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    deleteDoc(doc(db, 'tenants', selectedTenantId, 'services', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `tenants/${selectedTenantId}/services/${id}`));
  } else {
    setServices((prev) => prev.filter((s) => s.id !== id));
  }
}

// ─── Tenants ─────────────────────────────────────────────────────────────────
export function handleAddTenant(
  newTenant: Tenant,
  { firebaseUser, isDemoMode, setTenants }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    setTenants: Dispatch<SetStateAction<Tenant[]>>;
  }
) {
  const now = new Date().toISOString();
  const tenantRecord = {
    ...newTenant,
    email: newTenant.email || '',
    onboardingCompleted: true,
    createdAt: newTenant.createdAt || now,
    updatedAt: now,
  };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', tenantRecord.id), tenantRecord)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${newTenant.id}`));
  } else {
    setTenants((prev) => [...prev, tenantRecord]);
  }
}

// ─── Staff ───────────────────────────────────────────────────────────────────
export function handleAddStaff(
  newStaff: StaffMember,
  { firebaseUser, isDemoMode, selectedTenantId, setStaff }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setStaff: Dispatch<SetStateAction<StaffMember[]>>;
  }
) {
  const staffRecord = { ...newStaff, tenantId: newStaff.tenantId || selectedTenantId };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'staff_members', staffRecord.id), staffRecord)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/staff_members/${newStaff.id}`));
  } else {
    setStaff((prev) => [...prev, staffRecord]);
  }
}

export function handleUpdateStaff(
  staffId: string,
  updatedFields: Partial<StaffMember>,
  { firebaseUser, isDemoMode, selectedTenantId, staff, setStaff }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    staff: StaffMember[];
    setStaff: Dispatch<SetStateAction<StaffMember[]>>;
  }
) {
  const orig = staff.find((s) => s.id === staffId);
  if (!orig) return;
  const merged = { ...orig, ...updatedFields };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'staff_members', staffId), merged)
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/staff_members/${staffId}`));
  } else {
    setStaff((prev) => prev.map((s) => (s.id === staffId ? merged : s)));
  }
}

// ─── Clients ─────────────────────────────────────────────────────────────────
export function handleAddClient(
  newClient: ClientProfile,
  { firebaseUser, isDemoMode, selectedTenantId, setClients }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  }
) {
  const now = new Date().toISOString();
  const clientRecord = {
    ...newClient,
    // Always use generated avatar (no Unsplash random images)
    avatar: newClient.avatar?.startsWith('https://images.unsplash')
      ? generateAvatarUrl(newClient.name)
      : newClient.avatar || generateAvatarUrl(newClient.name),
    tenantId: selectedTenantId,
    contactConsent: newClient.contactConsent ?? false,
    marketingOptOut: newClient.marketingOptOut ?? false,
    createdAt: newClient.createdAt || now,
    updatedAt: now,
  };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'clients', clientRecord.id), clientRecord)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/clients/${newClient.id}`));
  } else {
    setClients((prev) => [...prev, clientRecord]);
  }
}

export function handleUpdateClient(
  clientId: string,
  updatedFields: Partial<ClientProfile>,
  { firebaseUser, isDemoMode, selectedTenantId, clients, setClients }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    clients: ClientProfile[];
    setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  }
) {
  const orig = clients.find((c) => c.id === clientId);
  if (!orig) return;
  const merged = { ...orig, ...updatedFields, updatedAt: new Date().toISOString() };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'clients', clientId), merged)
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/clients/${clientId}`));
  } else {
    setClients((prev) => prev.map((c) => (c.id === clientId ? merged : c)));
  }
}

export function handleUpdateClientLog(
  clientId: string,
  newMessage: WhatsAppMessage,
  { firebaseUser, isDemoMode, selectedTenantId, clients, setClients }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    clients: ClientProfile[];
    setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  }
) {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;
  const updatedLog = [...client.whatsappLog, newMessage];
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'clients', clientId), { ...client, whatsappLog: updatedLog })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/clients/${clientId}`));
  } else {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, whatsappLog: updatedLog } : c)));
  }
}

export function handleUpdateTechnicalNotes(
  clientId: string,
  newNotes: string,
  { firebaseUser, isDemoMode, selectedTenantId, clients, setClients }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    clients: ClientProfile[];
    setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  }
) {
  const client = clients.find((c) => c.id === clientId);
  if (!client) return;
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'clients', clientId), { ...client, technicalNotes: newNotes })
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/clients/${clientId}`));
  } else {
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, technicalNotes: newNotes } : c)));
  }
}

// ─── Risk Thresholds ─────────────────────────────────────────────────────────
export async function handleRecalculateThresholds(
  high: number,
  mid: number,
  { firebaseUser, isDemoMode, selectedTenantId, clients, setClients }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    clients: ClientProfile[];
    setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  }
) {
  const updatedClients = clients.map((client) => {
    let level: 'Alto' | 'Medio' | 'Bajo' = 'Bajo';
    if (client.riskDays >= high) level = 'Alto';
    else if (client.riskDays >= mid) level = 'Medio';

    let calculatedReason = client.aiReason;
    if (level === 'Alto') {
      calculatedReason = `"Clienta inactiva por ${client.riskDays} días, excediendo el umbral comercial de ${high} días. Alto peligro de pérdida."`;
    } else if (level === 'Medio') {
      calculatedReason = `"Desviación leve. ${client.riskDays} días inactiva superando el umbral preventivo de ${mid} días. Conviene agendar retoque."`;
    } else {
      calculatedReason = `"Frecuencia saludable. Menos de ${mid} días desde la última visita estéticamente programada."`;
    }

    const updatedObj = { ...client, riskLevel: level, aiReason: calculatedReason };
    if (firebaseUser && !isDemoMode) {
      setDoc(doc(db, 'tenants', selectedTenantId, 'clients', client.id), updatedObj)
        .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/clients/${client.id}`));
    }
    return updatedObj;
  });

  if (!firebaseUser || isDemoMode) {
    setClients(updatedClients);
  }
}

// ─── Appointments ────────────────────────────────────────────────────────────
export function handleAddAppointment(
  appt: Appointment,
  { firebaseUser, isDemoMode, selectedTenantId, setAppointments }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'appointments', appt.id), appt)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/appointments/${appt.id}`));
  } else {
    setAppointments((prev) => [...prev, appt]);
  }
}

export function handleUpdateAppointment(
  appt: Appointment,
  { firebaseUser, isDemoMode, selectedTenantId, setAppointments }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'appointments', appt.id), appt)
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/appointments/${appt.id}`));
  } else {
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? appt : a)));
  }
}

export function handleUpdateAppointmentStatus(
  id: string,
  status: 'Pagado' | 'Reservado' | 'Cancelado',
  { firebaseUser, isDemoMode, selectedTenantId, appointments, setAppointments, triggerToast }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    appointments: Appointment[];
    setAppointments: Dispatch<SetStateAction<Appointment[]>>;
    triggerToast: (msg: string) => void;
  }
) {
  if (firebaseUser && !isDemoMode) {
    const appt = appointments.find((a) => a.id === id);
    if (appt) {
      setDoc(doc(db, 'tenants', selectedTenantId, 'appointments', id), { ...appt, status })
        .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/appointments/${id}`));
    }
  } else {
    setAppointments((prev) => prev.map((appt) => (appt.id === id ? { ...appt, status } : appt)));
  }
  triggerToast(`Estado de la reserva actualizado a: ${status}.`);
}

export function handleDeleteAppointment(
  id: string,
  { firebaseUser, isDemoMode, selectedTenantId, setAppointments }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    deleteDoc(doc(db, 'tenants', selectedTenantId, 'appointments', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `tenants/${selectedTenantId}/appointments/${id}`));
  } else {
    setAppointments((prev) => prev.filter((appt) => appt.id !== id));
  }
}

// ─── Message Drafts ───────────────────────────────────────────────────────────
export function handleSaveMessageDraft(
  draft: MessageDraft,
  { firebaseUser, isDemoMode, selectedTenantId, setMessageDrafts }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setMessageDrafts: Dispatch<SetStateAction<MessageDraft[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'message_drafts', draft.id), draft)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/message_drafts/${draft.id}`));
    // Audit log for AI-generated drafts (server-side audit is handled in /api/generate-whatsapp)
    // Client-side audit only for manually approved/sent drafts
    if (draft.status === 'aprobado' || draft.status === 'enviado') {
      const auditLog: AuditLog = {
        id: `audit-${Date.now()}`,
        tenantId: selectedTenantId,
        userId: firebaseUser.uid,
        userEmail: firebaseUser.email || '',
        action: draft.status === 'enviado' ? 'SEND_MESSAGE_DRAFT' : 'APPROVE_MESSAGE_DRAFT',
        entityType: 'clients',
        entityId: draft.clientId,
        details: JSON.stringify({ draftId: draft.id, tone: draft.tone, status: draft.status }),
        timestamp: new Date().toISOString(),
      };
      setDoc(doc(db, 'tenants', selectedTenantId, 'audit_logs', auditLog.id), auditLog)
        .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/audit_logs/${auditLog.id}`));
    }
  } else {
    setMessageDrafts((prev) => [...prev, draft]);
  }
}

// ─── Inventory ───────────────────────────────────────────────────────────────
export function handleAddInventoryItem(
  newItem: InventoryItem,
  { firebaseUser, isDemoMode, selectedTenantId, setInventory }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  }
) {
  const itemRecord = { ...newItem, tenantId: selectedTenantId };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'inventario', itemRecord.id), itemRecord)
      .catch((err) => handleFirestoreError(err, OperationType.CREATE, `tenants/${selectedTenantId}/inventario/${newItem.id}`));
  } else {
    setInventory((prev) => [...prev, itemRecord]);
  }
}

export function handleUpdateInventoryItem(
  itemId: string,
  updatedFields: Partial<InventoryItem>,
  { firebaseUser, isDemoMode, selectedTenantId, inventory, setInventory }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    inventory: InventoryItem[];
    setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  }
) {
  const orig = inventory.find((i) => i.id === itemId);
  if (!orig) return;
  const merged = { ...orig, ...updatedFields, updatedAt: new Date().toISOString() };
  if (firebaseUser && !isDemoMode) {
    setDoc(doc(db, 'tenants', selectedTenantId, 'inventario', itemId), merged)
      .catch((err) => handleFirestoreError(err, OperationType.UPDATE, `tenants/${selectedTenantId}/inventario/${itemId}`));
  } else {
    setInventory((prev) => prev.map((i) => (i.id === itemId ? merged : i)));
  }
}

export function handleDeleteInventoryItem(
  id: string,
  { firebaseUser, isDemoMode, selectedTenantId, setInventory }: {
    firebaseUser: FirebaseUser | null;
    isDemoMode: boolean;
    selectedTenantId: string;
    setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  }
) {
  if (firebaseUser && !isDemoMode) {
    deleteDoc(doc(db, 'tenants', selectedTenantId, 'inventario', id))
      .catch((err) => handleFirestoreError(err, OperationType.DELETE, `tenants/${selectedTenantId}/inventario/${id}`));
  } else {
    setInventory((prev) => prev.filter((i) => i.id !== id));
  }
}

