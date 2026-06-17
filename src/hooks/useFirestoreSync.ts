import { useState, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { onSnapshot, collection, doc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  Tenant,
  StaffMember,
  Service,
  Appointment,
  ClientProfile,
  MessageDraft,
  InventoryItem,
} from '../types';

interface UseFirestoreSyncReturn {
  tenants: Tenant[];
  setTenants: Dispatch<SetStateAction<Tenant[]>>;
  staff: StaffMember[];
  setStaff: Dispatch<SetStateAction<StaffMember[]>>;
  services: Service[];
  setServices: Dispatch<SetStateAction<Service[]>>;
  appointments: Appointment[];
  setAppointments: Dispatch<SetStateAction<Appointment[]>>;
  clients: ClientProfile[];
  setClients: Dispatch<SetStateAction<ClientProfile[]>>;
  messageDrafts: MessageDraft[];
  setMessageDrafts: Dispatch<SetStateAction<MessageDraft[]>>;
  inventory: InventoryItem[];
  setInventory: Dispatch<SetStateAction<InventoryItem[]>>;
  isDataLoading: boolean;
}

export function useFirestoreSync(
  firebaseUser: FirebaseUser | null,
  selectedTenantId: string,
  isDemoMode: boolean
): UseFirestoreSyncReturn {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [messageDrafts, setMessageDrafts] = useState<MessageDraft[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(false);

  // Clear all data when user logs out
  useEffect(() => {
    if (!firebaseUser && !isDemoMode) {
      setTenants([]);
      setStaff([]);
      setServices([]);
      setAppointments([]);
      setClients([]);
      setMessageDrafts([]);
      setInventory([]);
    }
  }, [firebaseUser, isDemoMode]);

  // Real-time Firestore sync listeners
  useEffect(() => {
    if (!firebaseUser || !selectedTenantId || isDemoMode) return;

    setIsDataLoading(true);
    let loadedCount = 0;
    const totalCollections = 7;
    const markLoaded = () => {
      loadedCount++;
      if (loadedCount >= totalCollections) setIsDataLoading(false);
    };

    const tenantsUnsub = onSnapshot(
      doc(db, 'tenants', selectedTenantId),
      (snapshot) => {
        if (snapshot.exists()) {
          setTenants([snapshot.data() as Tenant]);
        }
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}`);
        markLoaded();
      }
    );

    const staffUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'staff_members'),
      (snapshot) => {
        const items: StaffMember[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as StaffMember));
        setStaff(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/staff_members`);
        markLoaded();
      }
    );

    const servicesUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'services'),
      (snapshot) => {
        const items: Service[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as Service));
        setServices(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/services`);
        markLoaded();
      }
    );

    const clientsUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'clients'),
      (snapshot) => {
        const items: ClientProfile[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          items.push({ ...data, whatsappLog: data.whatsappLog || [] } as ClientProfile);
        });
        setClients(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/clients`);
        markLoaded();
      }
    );

    const appointmentsUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'appointments'),
      (snapshot) => {
        const items: Appointment[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as Appointment));
        setAppointments(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/appointments`);
        markLoaded();
      }
    );

    const draftsUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'message_drafts'),
      (snapshot) => {
        const items: MessageDraft[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as MessageDraft));
        setMessageDrafts(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/message_drafts`);
        markLoaded();
      }
    );

    const inventoryUnsub = onSnapshot(
      collection(db, 'tenants', selectedTenantId, 'inventario'),
      (snapshot) => {
        const items: InventoryItem[] = [];
        snapshot.forEach((docSnap) => items.push(docSnap.data() as InventoryItem));
        setInventory(items);
        markLoaded();
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `tenants/${selectedTenantId}/inventario`);
        markLoaded();
      }
    );

    return () => {
      tenantsUnsub();
      staffUnsub();
      servicesUnsub();
      clientsUnsub();
      appointmentsUnsub();
      draftsUnsub();
      inventoryUnsub();
    };
  }, [firebaseUser, selectedTenantId, isDemoMode]);

  return {
    tenants,
    setTenants,
    staff,
    setStaff,
    services,
    setServices,
    appointments,
    setAppointments,
    clients,
    setClients,
    messageDrafts,
    setMessageDrafts,
    inventory,
    setInventory,
    isDataLoading,
  };
}
