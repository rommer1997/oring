import React, { useState, useMemo, useEffect } from 'react';
import { analyzeChurnRisk, getTodayISO } from './utils/riskEngine';
import {
  AppView,
  ClientProfile,
  WhatsAppMessage,
  Tenant,
  StaffMember,
  Service,
  Appointment,
  AppConfig,
  MessageDraft,
  InventoryItem,
} from './types';
import {
  INITIAL_CLIENTS,
  INITIAL_TENANTS,
  INITIAL_STAFF,
  INITIAL_SERVICES,
  INITIAL_APPOINTMENTS,
  INITIAL_INVENTORY,
} from './data';

// ─── Views ───────────────────────────────────────────────────────────────────
import LandingView from './components/LandingView';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import RetentionView from './components/RetentionView';
import MessageEditorView from './components/MessageEditorView';
import ClientProfileView from './components/ClientProfileView';
import AgendaView from './components/AgendaView';
import ServiciosView from './components/ServiciosView';
import InventarioView from './components/InventarioView';
import FacturacionView from './components/FacturacionView';
import PaywallView from './components/PaywallView';
import StaffTenantView from './components/StaffTenantView';
import SettingsView from './components/SettingsView';
import OnboardingView from './components/OnboardingView';
import AdminView from './components/AdminView';
import { AppLoadingScreen, DashboardSkeleton } from './components/LoadingStates';
import PublicBookingView from './components/PublicBookingView';

// ─── Hooks ───────────────────────────────────────────────────────────────────
import { useAuth } from './hooks/useAuth';
import { useFirestoreSync } from './hooks/useFirestoreSync';
import {
  generateAvatarUrl,
  handleAddService,
  handleEditService,
  handleDeleteService,
  handleAddTenant,
  handleAddStaff,
  handleUpdateStaff,
  handleAddClient,
  handleUpdateClient,
  handleUpdateClientLog,
  handleUpdateTechnicalNotes,
  handleRecalculateThresholds,
  handleAddAppointment,
  handleUpdateAppointment,
  handleUpdateAppointmentStatus,
  handleDeleteAppointment,
  handleSaveMessageDraft,
  handleAddInventoryItem,
  handleUpdateInventoryItem,
  handleDeleteInventoryItem,
} from './hooks/useTenantData';

// ─── Firebase ─────────────────────────────────────────────────────────────────
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

interface ActiveToast {
  id: string;
  message: string;
}

export default function App() {
  const publicBookingMatch = window.location.pathname.match(/^\/salon\/([a-z0-9-]+)$/);

  // ─── Navigation & UI States ──────────────────────────────────────────────
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [globalSearchTerm, setGlobalSearchTerm] = useState<string>('');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [selectedClientId, setSelectedClientId] = useState<string>('carmen-ruiz');
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState<boolean>(false);

  // ─── Config ──────────────────────────────────────────────────────────────
  const [config, setConfig] = useState<AppConfig>({
    highRiskThresholdDays: 90,
    midRiskThresholdDays: 30,
    isAiAutoTriggerEnabled: true,
    activeStaffRole: 'Propietaria',
    activeStaffId: 'staff-elena',
    isRotatingScheduleEnabled: false,
    isBeginnerMode: true,
  });

  // ─── Quick Appointment Modal State ───────────────────────────────────────
  const [modalServiceId, setModalServiceId] = useState<string>(INITIAL_SERVICES[0]?.id || '');
  const [modalStaffId, setModalStaffId] = useState<string>(INITIAL_STAFF[0]?.id || '');
  const [modalTime, setModalTime] = useState<string>('15:30');
  const [modalDate, setModalDate] = useState<string>(getTodayISO());
  const [modalPhoneSearch, setModalPhoneSearch] = useState<string>('');
  const [modalIsPhoneVerified, setModalIsPhoneVerified] = useState<boolean>(false);
  const [modalIsPhoneNewClient, setModalIsPhoneNewClient] = useState<boolean>(false);
  const [modalFoundClient, setModalFoundClient] = useState<ClientProfile | null>(null);
  const [modalNewClientName, setModalNewClientName] = useState<string>('');

  // ─── Toast helper ────────────────────────────────────────────────────────
  const triggerToast = (message: string) => {
    const id = Math.random().toString();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // ─── Auth Hook ───────────────────────────────────────────────────────────
  const {
    firebaseUser,
    appUser,
    setAppUser,
    isAuthLoading,
    selectedTenantId,
    setSelectedTenantId,
    handleSignInWithGoogle,
    handleSignInWithEmail,
    handleCreateAccountWithEmail,
    handleSignOut: _handleSignOut,
    handleForgotPassword,
    getAuthToken,
  } = useAuth(triggerToast);

  // ─── Auto-navigate on auth state changes ──────────────────────────────────
  useEffect(() => {
    if (isDemoMode) return;
    if (firebaseUser && appUser) {
      if (currentView === 'landing') {
        if (appUser.onboardingCompleted) {
          setCurrentView('dashboard');
        } else {
          setCurrentView('onboarding');
        }
      }
    }
  }, [firebaseUser, appUser, currentView, isDemoMode]);

  // ─── Firestore Sync Hook ──────────────────────────────────────────────────
  const {
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
  } = useFirestoreSync(firebaseUser, selectedTenantId, isDemoMode);

  // ─── Enriched clients (risk engine) ─────────────────────────────────────
  const enrichedClients = useMemo(() => {
    const today = getTodayISO();
    return clients.map((client) => {
      const analysis = analyzeChurnRisk(client, appointments, today, config);
      return {
        ...client,
        riskDays: analysis.riskDays,
        averageFrequencyDays: analysis.averageFrequency,
        riskLevel: analysis.riskLevel,
        aiReason: analysis.reason,
        suggestedOfferTitle: analysis.recommendation.title,
        suggestedOfferDesc: analysis.recommendation.description,
      };
    });
  }, [clients, appointments, config]);

  const activeTenant = useMemo(() => {
    return tenants.find((t) => t.id === selectedTenantId) || null;
  }, [tenants, selectedTenantId]);

  const trialDaysLeft = useMemo(() => {
    if (!activeTenant || !activeTenant.trialEndsAt) return 0;
    const ends = new Date(activeTenant.trialEndsAt);
    const now = new Date();
    const diff = ends.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  }, [activeTenant]);

  const isSubscriptionActive = activeTenant?.subscriptionStatus === 'active';
  const isTrialExpired = activeTenant?.trialEndsAt ? new Date() > new Date(activeTenant.trialEndsAt) : false;
  const isPaywallBlocked = Boolean(!isDemoMode && firebaseUser && appUser && appUser.onboardingCompleted && !isSubscriptionActive && isTrialExpired);

  // ─── CRUD wrappers (bind common args) ────────────────────────────────────
  const ctx = { firebaseUser, isDemoMode, selectedTenantId };

  const onAddService = (s: Service) => handleAddService(s, { ...ctx, setServices });
  const onEditService = (s: Service) => handleEditService(s, { ...ctx, setServices });
  const onDeleteService = (id: string) => handleDeleteService(id, { ...ctx, setServices });

  const onAddTenant = (t: Tenant) => handleAddTenant(t, { ...ctx, setTenants });

  const onAddStaff = (s: StaffMember) => handleAddStaff(s, { ...ctx, setStaff });
  const onUpdateStaff = (id: string, fields: Partial<StaffMember>) =>
    handleUpdateStaff(id, fields, { ...ctx, staff, setStaff });

  const onAddClient = (c: ClientProfile) => handleAddClient(c, { ...ctx, setClients });
  const onUpdateClient = (id: string, fields: Partial<ClientProfile>) =>
    handleUpdateClient(id, fields, { ...ctx, clients, setClients });
  const onUpdateClientLog = (id: string, msg: WhatsAppMessage) =>
    handleUpdateClientLog(id, msg, { ...ctx, clients, setClients });
  const onUpdateTechnicalNotes = (id: string, notes: string) =>
    handleUpdateTechnicalNotes(id, notes, { ...ctx, clients, setClients });
  const onRecalculateThresholds = (high: number, mid: number) =>
    handleRecalculateThresholds(high, mid, { ...ctx, clients, setClients });

  const onAddAppointment = (a: Appointment) => handleAddAppointment(a, { ...ctx, setAppointments });
  const onUpdateAppointment = (a: Appointment) => handleUpdateAppointment(a, { ...ctx, setAppointments });
  const onUpdateAppointmentStatus = (id: string, status: 'Pagado' | 'Reservado' | 'Cancelado') =>
    handleUpdateAppointmentStatus(id, status, { ...ctx, appointments, setAppointments, triggerToast });
  const onDeleteAppointment = (id: string) => handleDeleteAppointment(id, { ...ctx, setAppointments });

  const onSaveMessageDraft = (draft: MessageDraft) =>
    handleSaveMessageDraft(draft, { ...ctx, setMessageDrafts });

  const onAddInventoryItem = (item: InventoryItem) => handleAddInventoryItem(item, { ...ctx, setInventory });
  const onUpdateInventoryItem = (id: string, fields: Partial<InventoryItem>) =>
    handleUpdateInventoryItem(id, fields, { ...ctx, inventory, setInventory });
  const onDeleteInventoryItem = (id: string) => handleDeleteInventoryItem(id, { ...ctx, setInventory });

  const onUpdateConfig = (updated: Partial<AppConfig>) =>
    setConfig((prev) => ({ ...prev, ...updated }));

  // ─── Sign out wrapper ─────────────────────────────────────────────────────
  const handleSignOutWrapper = async () => {
    await _handleSignOut({
      isDemoMode,
      onDemoSignOut: () => {
        setIsDemoMode(false);
        // Restaurar tenant real si hay sesión activa, si no volver a landing
        setSelectedTenantId(appUser?.tenantId || '');
        setTenants([]);
        setStaff([]);
        setServices([]);
        setAppointments([]);
        setClients([]);
        setMessageDrafts([]);
        setInventory([]);
        setCurrentView(appUser ? 'dashboard' : 'landing');
        if (window.location.pathname === '/demo') window.history.pushState({}, '', '/');
      },
    });
    if (!isDemoMode) setCurrentView('landing');
  };

  // ─── Demo mode ───────────────────────────────────────────────────────────
  const handleStartDemo = () => {
    setIsDemoMode(true);
    setSelectedTenantId('demo-salon');
    setTenants(
      INITIAL_TENANTS.map((tenant, index) => ({
        ...tenant,
        id: index === 0 ? 'demo-salon' : `demo-${tenant.id}`,
        onboardingCompleted: true,
      }))
    );
    setStaff(INITIAL_STAFF.map((m) => ({ ...m, tenantId: 'demo-salon' })));
    setServices(INITIAL_SERVICES.map((s) => ({ ...s, tenantId: 'demo-salon' })));
    setAppointments(INITIAL_APPOINTMENTS.map((a) => ({ ...a, tenantId: 'demo-salon' })));
    setClients(
      INITIAL_CLIENTS.map((c) => ({
        ...c,
        tenantId: 'demo-salon',
        contactConsent: true,
        contactConsentAt: c.contactConsentAt || new Date().toISOString(),
        marketingOptOut: false,
      }))
    );
    setMessageDrafts([]);
    setInventory(
      INITIAL_INVENTORY.map((item) => ({
        ...item,
        tenantId: 'demo-salon',
        updatedAt: new Date().toISOString(),
      }))
    );
    setCurrentView('dashboard');
    if (window.location.pathname !== '/demo') window.history.pushState({}, '', '/demo');
    triggerToast('Estás viendo una demo aislada. Tus datos reales no se modificarán.');
  };

  // ponytail: /demo arranca la demo al cargar la URL. window.history evita recargas.
  useEffect(() => {
    if (window.location.pathname === '/demo' && !isDemoMode) handleStartDemo();
  }, []);

  // ─── Onboarding complete ──────────────────────────────────────────────────
  const handleCompleteOnboarding = async (payload: {
    tenant: Tenant;
    services: Service[];
    staff: StaffMember;
  }) => {
    if (!firebaseUser || !appUser) {
      triggerToast('Inicia sesión para terminar la configuración.');
      return;
    }
    const now = new Date().toISOString();
    const completedUser = { ...appUser, onboardingCompleted: true, staffMemberId: payload.staff.id, lastLoginAt: now };

    try {
      await setDoc(doc(db, 'tenants', payload.tenant.id), payload.tenant, { merge: true });
      await Promise.all(
        payload.services.map((service) =>
          setDoc(doc(db, 'tenants', payload.tenant.id, 'services', service.id), service)
        )
      );
      await setDoc(doc(db, 'tenants', payload.tenant.id, 'staff_members', payload.staff.id), payload.staff);
      await setDoc(doc(db, 'tenants', payload.tenant.id, 'settings', 'profile'), {
        tenantId: payload.tenant.id,
        onboardingCompleted: true,
        completedAt: now,
        updatedAt: now,
      });
      await setDoc(doc(db, 'users', firebaseUser.uid), completedUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `onboarding/${payload.tenant.id}`);
      triggerToast('Error al guardar la configuración. Comprueba tu conexión y vuelve a intentarlo.');
      return;
    }

    setAppUser(completedUser);
    setTenants([payload.tenant]);
    setServices(payload.services);
    setStaff([payload.staff]);
    setCurrentView('dashboard');
    triggerToast('Tu salón está listo.');
  };

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleNavigate = (view: AppView) => {
    if (!isDemoMode && !firebaseUser && view !== 'landing') {
      setCurrentView('landing');
      triggerToast('Crea una cuenta o inicia sesión para entrar al producto.');
      return;
    }
    if (!isDemoMode && firebaseUser && appUser && !appUser.onboardingCompleted && view !== 'onboarding' && view !== 'landing') {
      setCurrentView('onboarding');
      triggerToast('Completa la configuración inicial para continuar.');
      return;
    }
    if (view !== 'retention') {
      setGlobalSearchTerm('');
    }
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchNavigate = (term: string) => {
    setGlobalSearchTerm(term);
    setCurrentView('retention');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── Quick Appointment Modal ──────────────────────────────────────────────
  const handleQuickAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!modalIsPhoneVerified) {
      const query = modalPhoneSearch.trim();
      if (!query) { triggerToast('⚠️ Por favor, introduce un teléfono.'); return; }
      const found = clients.find((c) => c.phoneNumber.includes(query) || query.includes(c.phoneNumber));
      if (found) {
        setModalFoundClient(found);
        setModalIsPhoneVerified(true);
        setModalIsPhoneNewClient(false);
        triggerToast(`✨ Clienta encontrada: ${found.name}`);
      } else {
        setModalFoundClient(null);
        setModalIsPhoneVerified(true);
        setModalIsPhoneNewClient(true);
        setModalNewClientName('');
        triggerToast('✨ Teléfono nuevo detectado, regístralo al vuelo.');
      }
      return;
    }

    const matchedService = services.find((s) => s.id === modalServiceId);
    const matchedStaff = staff.find((s) => s.id === modalStaffId);
    if (!matchedService || !matchedStaff) {
      triggerToast('⚠️ Información de servicio o estilista inválida.');
      return;
    }

    if (config.isRotatingScheduleEnabled) {
      const dateForWeekday = new Date(modalDate + 'T12:00:00');
      const weekdaysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = weekdaysEs[dateForWeekday.getDay()];
      const daySchedule = matchedStaff.schedule?.[dayName] || { start: '09:00', end: '18:00', isWorking: dayName !== 'Domingo' };
      if (!daySchedule.isWorking) {
        triggerToast(`⚠️ ${matchedStaff.name} no trabaja los ${dayName}.`);
        return;
      }
      const [aH, aM] = modalTime.split(':').map(Number);
      const [sH, sM] = daySchedule.start.split(':').map(Number);
      const [eH, eM] = daySchedule.end.split(':').map(Number);
      if ((aH * 60 + aM) < (sH * 60 + sM) || (aH * 60 + aM) > (eH * 60 + eM)) {
        triggerToast(`⚠️ Fuera de horario: ${matchedStaff.name} trabaja de ${daySchedule.start} a ${daySchedule.end}.`);
        return;
      }
    }

    // Validar solapamiento antes de crear (mismo staff, mismo día, no canceladas)
    const [newH, newM] = modalTime.split(':').map(Number);
    const newStart = (newH || 0) * 60 + (newM || 0);
    const newEnd = newStart + (matchedService.durationMinutes || 30);
    const hasOverlap = appointments.some(a => {
      if (a.staffId !== matchedStaff.id || a.date !== modalDate || a.status === 'Cancelado') return false;
      const [aH, aM] = a.time.split(':').map(Number);
      const aStart = (aH || 0) * 60 + (aM || 0);
      const aEnd = aStart + (a.durationMinutes || 30);
      return newStart < aEnd && newEnd > aStart;
    });
    if (hasOverlap) {
      triggerToast(`⚠️ ${matchedStaff.name} ya tiene una cita en ese horario.`);
      return;
    }

    if (modalIsPhoneNewClient) {
      if (!modalNewClientName.trim()) { triggerToast('⚠️ Introduce el nombre de la nueva clienta.'); return; }
      const newId = `cli-${Date.now()}`;
      const newClient: ClientProfile = {
        id: newId,
        name: modalNewClientName.trim(),
        avatar: generateAvatarUrl(modalNewClientName.trim()),
        phoneNumber: modalPhoneSearch.trim(),
        email: '', birthdate: '', age: 0, isVip: false,
        riskLevel: 'Bajo', riskDays: 0,
        lastVisitDate: getTodayISO(),
        lastVisitService: matchedService.name,
        spendingLtv: 0, totalVisits: 1, averageFrequencyDays: 30,
        favoriteServices: [{ name: matchedService.name, count: 1, pricePerVisit: matchedService.price, icon: 'spa' }],
        appointmentHistory: [], preferences: [], technicalNotes: '',
        aiReason: 'Ficha creada desde agenda.', suggestedOfferTitle: '', suggestedOfferDesc: '',
        whatsappLog: [], tenantId: selectedTenantId, contactConsent: false, marketingOptOut: false,
      };
      onAddClient(newClient);
      onAddAppointment({ id: `appt-quick-${Date.now()}`, clientName: newClient.name, clientId: newClient.id, serviceName: matchedService.name, serviceId: matchedService.id, staffName: matchedStaff.name, staffId: matchedStaff.id, time: modalTime, date: modalDate, price: matchedService.price, status: 'Reservado', durationMinutes: matchedService.durationMinutes, tenantId: selectedTenantId });
      setIsAppointmentModalOpen(false);
      triggerToast(`✨ ${newClient.name} registrada y cita agendada para el ${modalDate} a las ${modalTime}.`);
      return;
    }

    const matchedClient = clients.find((c) => c.id === (modalFoundClient?.id || ''));
    if (!matchedClient) { triggerToast('⚠️ Selecciona una clienta válida.'); return; }
    onAddAppointment({ id: `appt-quick-${Date.now()}`, clientName: matchedClient.name, clientId: matchedClient.id, serviceName: matchedService.name, serviceId: matchedService.id, staffName: matchedStaff.name, staffId: matchedStaff.id, time: modalTime, date: modalDate, price: matchedService.price, status: 'Reservado', durationMinutes: matchedService.durationMinutes, tenantId: selectedTenantId });
    setIsAppointmentModalOpen(false);
    triggerToast(`✨ Cita para ${matchedClient.name} agendada el ${modalDate} a las ${modalTime}.`);
  };

  // ─── Toast renderer ───────────────────────────────────────────────────────
  const renderToasts = () => (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-primary text-white px-5 py-3.5 rounded-xl shadow-lg border border-primary-container text-xs font-bold tracking-wide flex items-center gap-3 animate-fade-in transition-all duration-300"
        >
          <span className="material-symbols-outlined text-sm font-bold text-tertiary-fixed">info</span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );

  if (publicBookingMatch) {
    return <PublicBookingView slug={publicBookingMatch[1]} />;
  }

  // ─── Auth loading screen ──────────────────────────────────────────────────
  if (isAuthLoading) return <AppLoadingScreen />;

  // ─── Landing ──────────────────────────────────────────────────────────────
  if (currentView === 'landing') {
    return (
      <>
        <LandingView
          onNavigate={handleNavigate}
          onSignInWithGoogle={handleSignInWithGoogle}
          onSignInWithEmail={handleSignInWithEmail}
          onCreateAccountWithEmail={handleCreateAccountWithEmail}
          onForgotPassword={handleForgotPassword}
          onStartDemo={handleStartDemo}
          currentUser={firebaseUser}
        />
        {renderToasts()}
      </>
    );
  }

  // ─── Onboarding ───────────────────────────────────────────────────────────
  if (currentView === 'onboarding' || (!isDemoMode && firebaseUser && appUser && !appUser.onboardingCompleted)) {
    return (
      <OnboardingView
        user={appUser}
        tenant={tenants.find((t) => t.id === selectedTenantId) || null}
        onComplete={handleCompleteOnboarding}
        onSignOut={handleSignOutWrapper}
        onToastMessage={triggerToast}
      />
    );
  }

  // ─── Paywall (bloqueado al expirar, o voluntario desde el aviso de trial) ──
  if (isPaywallBlocked || showPaywall) {
    return (
      <>
        <PaywallView
          tenant={activeTenant}
          appUser={appUser}
          onSignOut={handleSignOutWrapper}
          onToastMessage={triggerToast}
          getAuthToken={getAuthToken}
          onClose={isPaywallBlocked ? undefined : () => setShowPaywall(false)}
        />
        {renderToasts()}
      </>
    );
  }

  // ─── Main App ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fbf9f5] flex text-on-background selection:bg-[#ebdcc9] selection:text-primary">
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        onNewAppointmentClick={() => {
          if (services.length === 0 || staff.length === 0) {
            triggerToast('Añade al menos un servicio y un profesional antes de programar citas.');
            return;
          }
          setModalPhoneSearch(''); setModalIsPhoneVerified(false); setModalIsPhoneNewClient(false);
          setModalFoundClient(null); setModalNewClientName('');
          setModalServiceId(services[0]?.id || ''); setModalStaffId(staff[0]?.id || '');
          setModalDate(new Date().toISOString().split('T')[0]); setModalTime('12:00');
          setIsAppointmentModalOpen(true);
        }}
        onToastMessage={triggerToast}
        onSignOut={handleSignOutWrapper}
        isDemoMode={isDemoMode}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        trialDaysLeft={trialDaysLeft}
        subscriptionStatus={activeTenant?.subscriptionStatus}
        userRole={appUser?.role}
        isBeginnerMode={config.isBeginnerMode}
        onUpdateConfig={onUpdateConfig}
      />

      <div className={`flex-1 transition-all duration-300 min-h-screen flex flex-col pb-20 md:pb-0 ${isSidebarCollapsed ? 'pl-0 md:pl-20' : 'pl-0 md:pl-64'}`}>
        <header className="h-14 border-b border-primary/5 bg-[#faf8f4] px-10 flex items-center justify-between text-xs text-outline font-sans">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 block animate-pulse" />
            <span>
              {isDemoMode ? 'Demo aislada' : 'Salón'}:{' '}
              <strong className="text-primary">
                {tenants.find((t) => t.id === selectedTenantId)?.name || 'Mi salón'}
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-sm text-[#bfa982]">shield</span>
            <span className="uppercase text-[10px] tracking-wider text-primary">
              {isDemoMode ? 'No modifica datos reales' : 'Cuenta privada conectada'}
            </span>
          </div>
        </header>

        {/* ponytail: aviso de fin de trial solo in-app. Email automático aplazado: necesita proveedor
            (SendGrid/Resend). Añadir cuando exista, disparado desde server.ts por cron sobre trialEndsAt. */}
        {!isDemoMode && activeTenant?.subscriptionStatus === 'trialing' && trialDaysLeft <= 3 && (
          <div className="bg-primary text-white px-6 md:px-10 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm font-sans">
            <span className="font-semibold">
              {trialDaysLeft <= 0 ? 'Tu prueba termina hoy.' : `Te ${trialDaysLeft === 1 ? 'queda 1 día' : `quedan ${trialDaysLeft} días`} de prueba.`} Activa tu plan para no perder el acceso.
            </span>
            <button onClick={() => setShowPaywall(true)} className="underline font-bold hover:no-underline cursor-pointer">
              Activar mi plan
            </button>
          </div>
        )}

        <div className="max-w-[1140px] mx-auto w-full px-6 md:px-10 py-8 flex flex-col flex-1">
          {isDataLoading ? (
            <DashboardSkeleton />
          ) : (
            <>
              {currentView === 'dashboard' && (
                <DashboardView
                  clients={enrichedClients}
                  appointments={appointments}
                  onNavigate={handleNavigate}
                  onSelectClient={setSelectedClientId}
                  onToastMessage={triggerToast}
                  onSearchNavigate={handleSearchNavigate}
                  isBeginnerMode={config.isBeginnerMode}
                  onUpdateConfig={onUpdateConfig}
                />
              )}
              {currentView === 'retention' && (
                <RetentionView
                  clients={enrichedClients}
                  onNavigate={handleNavigate}
                  selectedClientId={selectedClientId}
                  selectedTenantId={selectedTenantId}
                  onSelectClient={setSelectedClientId}
                  onToastMessage={triggerToast}
                  onAddClient={onAddClient}
                  onUpdateClient={onUpdateClient}
                  initialSearchTerm={globalSearchTerm}
                />
              )}
              {currentView === 'message-editor' && (
                <MessageEditorView
                  clients={enrichedClients}
                  selectedClientId={selectedClientId}
                  onNavigate={handleNavigate}
                  onUpdateClientLog={onUpdateClientLog}
                  onSaveMessageDraft={onSaveMessageDraft}
                  getAuthToken={getAuthToken}
                  onToastMessage={triggerToast}
                />
              )}
              {currentView === 'client-profile' && (
                <ClientProfileView
                  clients={enrichedClients}
                  appointments={appointments}
                  selectedClientId={selectedClientId}
                  onNavigate={handleNavigate}
                  onUpdateClientLog={onUpdateClientLog}
                  onUpdateTechnicalNotes={onUpdateTechnicalNotes}
                  onUpdateClient={onUpdateClient}
                  onToastMessage={triggerToast}
                  isDemoMode={isDemoMode}
                />
              )}
              {currentView === 'agenda' && (
                <AgendaView
                  appointments={appointments}
                  clients={enrichedClients}
                  services={services}
                  staff={staff}
                  selectedTenantId={selectedTenantId}
                  onAddAppointment={onAddAppointment}
                  onUpdateAppointment={onUpdateAppointment}
                  onUpdateStatus={onUpdateAppointmentStatus}
                  onDeleteAppointment={onDeleteAppointment}
                  onToastMessage={triggerToast}
                  onAddClient={onAddClient}
                  config={config}
                />
              )}
              {currentView === 'servicios' && (
                <ServiciosView
                  services={services}
                  onAddService={onAddService}
                  onEditService={onEditService}
                  onDeleteService={onDeleteService}
                  onToastMessage={triggerToast}
                />
              )}
              {currentView === 'inventario' && (
                <InventarioView
                  items={inventory}
                  onAdd={onAddInventoryItem}
                  onUpdate={onUpdateInventoryItem}
                  onDelete={onDeleteInventoryItem}
                  onToastMessage={triggerToast}
                />
              )}
              {currentView === 'facturacion' && (
                <FacturacionView
                  appointments={appointments}
                  clients={enrichedClients}
                  onToastMessage={triggerToast}
                />
              )}
              {currentView === 'staff-tenant' && (
                <StaffTenantView
                  tenants={tenants}
                  staff={staff}
                  selectedTenantId={selectedTenantId}
                  config={config}
                  onAddTenant={onAddTenant}
                  onAddStaff={onAddStaff}
                  onUpdateStaff={onUpdateStaff}
                  onSelectTenant={setSelectedTenantId}
                  onUpdateConfig={onUpdateConfig}
                  onToastMessage={triggerToast}
                />
              )}
              {currentView === 'settings' && (
                <SettingsView
                  config={config}
                  onUpdateConfig={onUpdateConfig}
                  onRecalculateThresholds={onRecalculateThresholds}
                  onToastMessage={triggerToast}
                  currentUser={firebaseUser}
                  appUser={appUser}
                  activeTenant={tenants.find((t) => t.id === selectedTenantId) || null}
                  onSignInWithGoogle={handleSignInWithGoogle}
                  onSignOut={handleSignOutWrapper}
                  getAuthToken={getAuthToken}
                  firebaseProjectId={import.meta.env.VITE_FIREBASE_PROJECT_ID}
                  staff={staff}
                  onUpdateStaff={onUpdateStaff}
                  clients={enrichedClients}
                  onUpdateClient={onUpdateClient}
                  onAddClient={onAddClient}
                />
              )}
              {currentView === 'admin' && (
                <AdminView onToastMessage={triggerToast} />
              )}
            </>
          )}
        </div>
      </div>

      {renderToasts()}

      {/* Quick Appointment Modal */}
      {isAppointmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsAppointmentModalOpen(false)}
          />
          <form
            onSubmit={handleQuickAppointmentSubmit}
            className="bg-surface max-w-md w-full rounded-2xl p-6 relative z-10 border border-[#bfa982]/25 shadow-xl animate-scale-up text-left"
          >
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined">calendar_month</span>
                <h3 className="font-serif text-xl font-bold">Nueva Cita Express</h3>
              </div>
              <button type="button" className="text-on-surface-variant hover:text-primary cursor-pointer" onClick={() => setIsAppointmentModalOpen(false)}>
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {!modalIsPhoneVerified ? (
                <div className="space-y-3 pb-2 text-primary">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Teléfono Móvil de la Clienta</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="Ej: 600123456"
                        value={modalPhoneSearch}
                        onChange={(e) => setModalPhoneSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur(); handleQuickAppointmentSubmit(e as any); } }}
                        className="flex-1 px-4 py-3 bg-surface-container-low border border-[#bfa982]/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-semibold"
                        autoFocus
                      />
                      <button type="submit" className="px-4 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary/95 transition-all cursor-pointer flex items-center gap-1 shrink-0">
                        <span className="material-symbols-outlined text-xs font-extrabold">done</span>
                        <span>Verificar</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-2">Pulsa <strong>Enter</strong> o Verificar. Si está registrada, importará sus datos.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-primary">
                  {modalIsPhoneNewClient ? (
                    <div className="bg-[#ebdcc9]/15 p-4 rounded-xl border border-[#bfa982]/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-sm">person_add</span>
                          NUEVA CLIENTA
                        </span>
                        <button type="button" onClick={() => { setModalIsPhoneVerified(false); setModalIsPhoneNewClient(false); }} className="text-[10px] font-bold text-[#bfa982] hover:text-primary underline cursor-pointer">
                          Corregir teléfono
                        </button>
                      </div>
                      <div>
                        <label className="text-[9.5px] uppercase font-bold tracking-wider text-outline block mb-1">Nombre Completo</label>
                        <input type="text" value={modalNewClientName} onChange={(e) => setModalNewClientName(e.target.value)} placeholder="Ej: María Pérez" required className="w-full px-4 py-3 bg-white border border-[#bfa982]/25 rounded-xl text-xs sm:text-sm outline-none focus:border-primary text-foreground font-semibold" />
                      </div>
                      <p className="text-[9px] text-on-surface-variant font-medium">Teléfono: <strong>{modalPhoneSearch}</strong></p>
                    </div>
                  ) : (
                    <div className="bg-[#bfa982]/10 p-3.5 rounded-xl border border-[#bfa982]/15 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={modalFoundClient?.avatar} alt={modalFoundClient?.name} className="w-9 h-9 rounded-full object-cover border border-[#bfa982]/20" />
                        <div>
                          <h4 className="font-serif text-sm font-bold text-primary flex items-center gap-1">
                            {modalFoundClient?.name}
                            {modalFoundClient?.isVip && <span className="bg-amber-100 text-amber-800 text-[8px] px-1 py-0.5 rounded font-extrabold uppercase">VIP</span>}
                          </h4>
                          <p className="text-[10px] text-on-surface-variant font-semibold">{modalFoundClient?.phoneNumber} • <span className="text-primary font-bold">{modalFoundClient?.spendingLtv || 0}€ acumulado</span></p>
                        </div>
                      </div>
                      <button type="button" onClick={() => { setModalIsPhoneVerified(false); setModalFoundClient(null); }} className="text-[10px] font-bold text-primary underline cursor-pointer">Cambiar</button>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Tratamiento / Servicio</label>
                    <select value={modalServiceId} onChange={(e) => setModalServiceId(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary font-semibold cursor-pointer">
                      {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.price}€ ({s.durationMinutes}m)</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Estilista / Especialista</label>
                    <select value={modalStaffId} onChange={(e) => setModalStaffId(e.target.value)} className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary font-semibold cursor-pointer">
                      {staff.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.role}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Fecha</label>
                      <input type="date" value={modalDate} onChange={(e) => setModalDate(e.target.value)} required className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary font-semibold text-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Hora</label>
                      <input type="time" value={modalTime} onChange={(e) => setModalTime(e.target.value)} required className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary font-semibold text-primary" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-8 pt-4 border-t border-outline-variant/30">
              <button type="button" className="px-4 py-2 text-xs font-semibold text-outline-variant hover:text-primary transition-colors cursor-pointer" onClick={() => setIsAppointmentModalOpen(false)}>
                Cerrar
              </button>
              <button type="submit" className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:opacity-95 transition-all cursor-pointer shadow-sm">
                {!modalIsPhoneVerified ? 'Verificar Teléfono' : 'Agendar Cita'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
