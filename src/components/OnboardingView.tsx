import React, { useMemo, useState } from 'react';
import { Service, StaffMember, Tenant, User } from '../types';

interface OnboardingPayload {
  tenant: Tenant;
  services: Service[];
  staff: StaffMember;
}

interface OnboardingViewProps {
  user: User | null;
  tenant: Tenant | null;
  onComplete: (payload: OnboardingPayload) => Promise<void>;
  onSignOut: () => Promise<void>;
  onToastMessage: (msg: string) => void;
}

interface ScheduleDay {
  start: string;
  end: string;
  isWorking: boolean;
  splitShift?: boolean;
  secondStart?: string;
  secondEnd?: string;
}
type ScheduleMap = Record<string, ScheduleDay>;

const defaultSchedule: ScheduleMap = {
  Lunes: { start: '09:00', end: '18:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Martes: { start: '09:00', end: '18:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Miércoles: { start: '09:00', end: '18:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Jueves: { start: '09:00', end: '18:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Viernes: { start: '09:00', end: '18:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Sábado: { start: '10:00', end: '14:00', isWorking: true, splitShift: false, secondStart: '16:00', secondEnd: '20:00' },
  Domingo: { start: '10:00', end: '14:00', isWorking: false, splitShift: false, secondStart: '16:00', secondEnd: '20:00' }
};

const roleSuggestions = ['Propietaria', 'Estilista', 'Especialista Facial', 'Manicurista', 'Masajista', 'Recepcionista', 'Personalizado'];

function buildSlug(value: string, fallback: string) {
  const source = value.trim() || fallback;
  const normalized = source
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return normalized || fallback.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function OnboardingView({
  user,
  tenant,
  onComplete,
  onSignOut,
  onToastMessage
}: OnboardingViewProps) {
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [dpaAccepted, setDpaAccepted] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const [salonName, setSalonName] = useState(tenant?.name || '');
  const [salonCity, setSalonCity] = useState(tenant?.city || '');
  const [salonAddress, setSalonAddress] = useState(tenant?.address || '');
  const [salonPhone, setSalonPhone] = useState(tenant?.phone || '');
  const [salonEmail, setSalonEmail] = useState(tenant?.email || user?.email || '');

  const [serviceName, setServiceName] = useState('');
  const [serviceCategory, setServiceCategory] = useState<Service['category']>('Cabello');
  const [servicePrice, setServicePrice] = useState(50);
  const [serviceDuration, setServiceDuration] = useState(60);
  const [servicesDraft, setServicesDraft] = useState<Service[]>([]);

  const [staffName, setStaffName] = useState(user?.name || '');
  const [staffRole, setStaffRole] = useState('Propietaria');
  const [selectedRole, setSelectedRole] = useState('Propietaria');
  const [customRole, setCustomRole] = useState('');
  const [staffEmail, setStaffEmail] = useState(user?.email || '');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffSpecialty, setStaffSpecialty] = useState('Dirección del centro');
  const [ownerTakesBookings, setOwnerTakesBookings] = useState(true);
  const [schedule, setSchedule] = useState<ScheduleMap>(defaultSchedule);

  const tenantId = tenant?.id || user?.tenantId || '';
  const steps = ['Salón', 'Servicios', 'Equipo', 'Horarios'];

  const canContinue = useMemo(() => {
    if (step === 1) return Boolean(salonName.trim() && salonCity.trim() && salonEmail.trim());
    if (step === 2) return servicesDraft.length > 0; // ponytail: exige pulsar "Añadir" para evitar servicios a medio rellenar
    if (step === 3) return Boolean(staffName.trim() && staffEmail.trim() && staffSpecialty.trim());
    return (Object.values(schedule) as ScheduleDay[]).some((day) => day.isWorking);
  }, [step, salonName, salonCity, salonEmail, serviceName, servicePrice, serviceDuration, servicesDraft.length, staffName, staffEmail, staffSpecialty, schedule]);

  const addServiceDraft = () => {
    if (!serviceName.trim() || servicePrice < 0 || serviceDuration <= 0) {
      onToastMessage('Completa nombre, precio y duración del servicio.');
      return;
    }
    const service: Service = {
      id: `serv-${Date.now()}-${servicesDraft.length}`,
      name: serviceName.trim(),
      category: serviceCategory,
      price: servicePrice,
      durationMinutes: serviceDuration,
      tenantId
    };
    setServicesDraft((current) => [...current, service]);
    setServiceName('');
    setServicePrice(50);
    setServiceDuration(60);
  };

  const updateSchedule = (day: string, patch: Partial<ScheduleDay>) => {
    setSchedule((current) => ({
      ...current,
      [day]: {
        ...current[day as keyof typeof current],
        ...patch
      }
    }));
  };

  const getStepError = (): string | null => {
    if (step === 1) {
      if (!salonName.trim()) return 'Escribe el nombre comercial de tu salón.';
      if (!salonCity.trim()) return 'Indica la ciudad del salón.';
      if (!salonEmail.trim()) return 'Añade un email de contacto del salón.';
    }
    if (step === 2) {
      if (servicesDraft.length === 0 && !serviceName.trim()) return 'Añade al menos un servicio antes de continuar.';
    }
    if (step === 3) {
      if (!staffName.trim()) return 'Escribe tu nombre.';
      if (!staffEmail.trim()) return 'Añade un email para este profesional.';
      if (!staffSpecialty.trim()) return 'Indica la especialidad del profesional.';
    }
    if (step === 4) {
      const hasWorkingDay = (Object.values(schedule) as ScheduleDay[]).some((d) => d.isWorking);
      if (!hasWorkingDay) return 'Marca al menos un día de trabajo en los horarios.';
      if (!dpaAccepted) return 'Acepta el Acuerdo de Tratamiento de Datos (DPA) para entrar al panel.';
    }
    return null;
  };

  const handleNext = () => {
    // H02: en paso 2, si el usuario rellenó el servicio pero no pulsó "Añadir",
    // lo añadimos automáticamente en vez de bloquear el botón en silencio.
    if (step === 2 && servicesDraft.length === 0 && serviceName.trim() && servicePrice >= 0 && serviceDuration > 0) {
      addServiceDraft();
      setStepError(null);
      setStep(3);
      return;
    }
    const err = getStepError();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);
    setStep((current) => Math.min(4, current + 1));
  };

  const handleComplete = async () => {
    if (!tenantId || !user) {
      setStepError('No se pudo identificar tu cuenta. Vuelve a iniciar sesión.');
      return;
    }
    const err = getStepError();
    if (err) {
      setStepError(err);
      return;
    }
    setStepError(null);

    const now = new Date().toISOString();
    const finalServices = servicesDraft.length > 0 ? servicesDraft : [{
      id: `serv-${Date.now()}`,
      name: serviceName.trim(),
      category: serviceCategory,
      price: servicePrice,
      durationMinutes: serviceDuration,
      tenantId
    }];

    const finalRole = selectedRole === 'Personalizado' ? customRole.trim() : selectedRole;
    const payload: OnboardingPayload = {
      tenant: {
        id: tenantId,
        name: salonName.trim(),
        city: salonCity.trim(),
        address: salonAddress.trim(),
        phone: salonPhone.trim(),
        email: salonEmail.trim(),
        onboardingCompleted: true,
        createdAt: tenant?.createdAt || now,
        updatedAt: now,
        stripeCustomerId: tenant?.stripeCustomerId,
        stripeSubscriptionId: tenant?.stripeSubscriptionId,
        subscriptionStatus: tenant?.subscriptionStatus,
        trialEndsAt: tenant?.trialEndsAt,
        subscriptionEndsAt: tenant?.subscriptionEndsAt,
        publicBookingEnabled: tenant?.publicBookingEnabled ?? true,
        slug: tenant?.slug && !tenant.slug.startsWith('tenant-') ? tenant.slug : buildSlug(salonName, tenantId),
        bookingNoticeHours: tenant?.bookingNoticeHours ?? 2,
        bookingSlotMinutes: tenant?.bookingSlotMinutes ?? 30
      },
      services: finalServices,
      staff: {
        id: user.staffMemberId || `staff-${Date.now()}`,
        name: staffName.trim(),
        role: finalRole || staffRole,
        avatar: user.photoURL || '',
        email: staffEmail.trim(),
        phone: staffPhone.trim(),
        specialty: staffSpecialty.trim(),
        tenantId,
        visibleToClient: ownerTakesBookings,
        acceptsOnlineBookings: ownerTakesBookings,
        schedule
      }
    };

    try {
      setIsSaving(true);
      await onComplete(payload);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'No se pudo guardar la configuración. Inténtalo de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-primary flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-4xl bg-white border border-outline-variant/20 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-outline-variant/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[#8c6d7a] mb-1">Configuración inicial</p>
            <h1 className="font-serif text-3xl font-bold text-primary">Prepara tu salón</h1>
            <p className="text-sm text-on-surface-variant mt-1">Estos datos crean tu espacio privado antes de entrar al panel.</p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="text-xs font-bold text-on-surface-variant hover:text-primary"
          >
            Cambiar cuenta
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 min-h-[520px]">
          <aside className="md:col-span-4 bg-[#faf8f4] p-6 border-r border-outline-variant/20">
            <div className="space-y-3">
              {steps.map((label, index) => {
                const number = index + 1;
                const active = step === number;
                const done = step > number;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setStep(number); setStepError(null); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      active ? 'bg-primary text-white' : done ? 'bg-emerald-50 text-emerald-800' : 'text-on-surface-variant'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? 'bg-white text-primary' : 'bg-white'}`}>
                      {done ? '✓' : number}
                    </span>
                    <span className="text-sm font-bold">{label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="md:col-span-8 p-6 md:p-8">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl font-bold">Datos del salón</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre comercial *" value={salonName} onChange={setSalonName} placeholder="Mi salón" />
                  <Field label="Ciudad *" value={salonCity} onChange={setSalonCity} placeholder="Madrid" />
                  <Field label="Email comercial *" type="email" value={salonEmail} onChange={setSalonEmail} placeholder="hola@misalon.com" />
                  <Field label="Teléfono" value={salonPhone} onChange={setSalonPhone} placeholder="+34 600 000 000" />
                  <div className="md:col-span-2">
                    <Field label="Dirección" value={salonAddress} onChange={setSalonAddress} placeholder="Calle y número" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl font-bold">Servicios iniciales</h2>
                <p className="text-sm text-on-surface-variant">Añade todos los servicios que quieras mostrar desde el primer día. Necesitas al menos uno.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre del servicio *" value={serviceName} onChange={setServiceName} placeholder="Corte y peinado" />
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Categoría *</label>
                    <select value={serviceCategory} onChange={(e) => setServiceCategory(e.target.value as Service['category'])} className="w-full h-11 px-3 bg-white border border-outline-variant/30 rounded-xl text-sm font-semibold outline-none">
                      <option value="Cabello">Cabello</option>
                      <option value="Uñas">Uñas</option>
                      <option value="Facial">Facial</option>
                      <option value="Masaje">Masaje</option>
                    </select>
                  </div>
                  <Field label="Precio (€) *" type="number" value={String(servicePrice)} onChange={(value) => setServicePrice(Number(value) || 0)} />
                  <Field label="Duración (min) *" type="number" value={String(serviceDuration)} onChange={(value) => setServiceDuration(Number(value) || 0)} />
                </div>
                <button type="button" onClick={addServiceDraft} className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold">
                  Añadir servicio
                </button>
                {servicesDraft.length > 0 && (
                  <div className="space-y-2">
                    {servicesDraft.map((service) => (
                      <div key={service.id} className="flex items-center justify-between gap-3 rounded-xl border border-outline-variant/25 bg-[#faf8f4] p-3 text-sm">
                        <div>
                          <strong>{service.name}</strong>
                          <p className="text-xs text-on-surface-variant">{service.category} · {service.durationMinutes} min · {service.price}€</p>
                        </div>
                        <button type="button" onClick={() => setServicesDraft((current) => current.filter((item) => item.id !== service.id))} className="text-xs font-bold text-primary">
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl font-bold">Primer profesional</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Nombre *" value={staffName} onChange={setStaffName} placeholder="Tu nombre" />
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Rol *</label>
                    <select
                      value={selectedRole}
                      onChange={(e) => {
                        setSelectedRole(e.target.value);
                        if (e.target.value !== 'Personalizado') setStaffRole(e.target.value);
                      }}
                      className="w-full h-11 px-3 bg-white border border-outline-variant/30 rounded-xl text-sm font-semibold outline-none"
                    >
                      {roleSuggestions.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                    {selectedRole === 'Personalizado' && (
                      <input
                        value={customRole}
                        onChange={(e) => {
                          setCustomRole(e.target.value);
                          setStaffRole(e.target.value);
                        }}
                        placeholder="Ej: Colorista senior"
                        className="mt-2 w-full h-11 px-3 bg-white border border-outline-variant/30 rounded-xl text-sm font-semibold outline-none focus:border-primary"
                      />
                    )}
                  </div>
                  <Field label="Email *" type="email" value={staffEmail} onChange={setStaffEmail} />
                  <Field label="Teléfono" value={staffPhone} onChange={setStaffPhone} />
                  <div className="md:col-span-2">
                    <Field label="Especialidad *" value={staffSpecialty} onChange={setStaffSpecialty} />
                  </div>
                </div>
                <label className="flex items-center gap-3 p-4 border border-outline-variant/25 rounded-xl text-sm font-semibold">
                  <input type="checkbox" checked={ownerTakesBookings} onChange={(e) => setOwnerTakesBookings(e.target.checked)} className="accent-primary" />
                  Este profesional puede recibir reservas.
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl font-bold">Horarios básicos</h2>
                <p className="text-sm text-on-surface-variant">Pulsa "Usar horario habitual" y listo, o ajusta los días que necesites. Estos horarios se aplicarán al profesional inicial (puedes afinarlos luego en Ajustes).</p>
                <button
                  type="button"
                  onClick={() => setSchedule(defaultSchedule)}
                  className="w-full px-4 py-3 rounded-xl border border-primary text-primary text-xs font-bold hover:bg-primary/5 transition-colors"
                >
                  Usar horario habitual (L-V 9-18 · S 10-14 · D cerrado)
                </button>
                <div className="space-y-3">
                  {(Object.entries(schedule) as [string, ScheduleDay][]).map(([day, daySchedule]) => (
                    <div key={day} className="p-4 rounded-xl border border-outline-variant/20 bg-[#faf8f4] space-y-3 text-sm">
                      <label className="flex items-center justify-between gap-3">
                        <strong>{day}</strong>
                        <span className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                          <input type="checkbox" checked={daySchedule.isWorking} onChange={(e) => updateSchedule(day, { isWorking: e.target.checked })} className="accent-primary" />
                          Abierto
                        </span>
                      </label>
                      {daySchedule.isWorking && (
                        <>
                          {/* ponytail: horario partido se configura luego en Ajustes; aquí solo entrada/salida para reducir fricción en el alta */}
                          <div className="grid grid-cols-2 gap-3">
                            <TimeField label="Entrada" value={daySchedule.start} onChange={(value) => updateSchedule(day, { start: value })} />
                            <TimeField label="Salida" value={daySchedule.end} onChange={(value) => updateSchedule(day, { end: value })} />
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* LEG-02: DPA mandatory acceptance before completing onboarding */}
            {step === 4 && (
              <label className="flex items-start gap-3 mt-6 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dpaAccepted}
                  onChange={e => setDpaAccepted(e.target.checked)}
                  className="mt-0.5 flex-shrink-0 accent-primary"
                />
                <span className="text-xs text-on-surface-variant leading-relaxed">
                  He leído y acepto el{' '}
                  <a href="https://elena-os.web.app/dpa" target="_blank" rel="noopener noreferrer" className="underline text-primary">Acuerdo de Tratamiento de Datos (DPA)</a>
                  {' '}y la{' '}
                  <a href="https://elena-os.web.app/privacy" target="_blank" rel="noopener noreferrer" className="underline text-primary">Política de Privacidad</a>.
                  Como responsable del salón, me comprometo a tratar los datos de mis clientas conforme al RGPD y la LOPDGDD.
                </span>
              </label>
            )}

            {stepError && (
              <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
                <span className="material-symbols-outlined text-red-500 text-base mt-0.5 shrink-0">error</span>
                {stepError}
              </div>
            )}

            <div className="flex justify-between pt-6 mt-4 border-t border-outline-variant/20">
              <button
                type="button"
                onClick={() => { setStep((current) => Math.max(1, current - 1)); setStepError(null); }}
                disabled={step === 1}
                className="px-4 py-2 text-xs font-bold text-on-surface-variant disabled:opacity-30"
              >
                Atrás
              </button>
              {step < 4 ? (
                <button type="button" onClick={handleNext} className="px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold">
                  Continuar
                </button>
              ) : (
                <button type="button" onClick={handleComplete} disabled={isSaving} className="px-5 py-3 bg-primary text-white rounded-xl text-xs font-bold disabled:opacity-60">
                  {isSaving ? 'Guardando...' : 'Entrar al panel'}
                </button>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text'
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 bg-white border border-outline-variant/30 rounded-xl text-sm font-semibold outline-none focus:border-primary"
      />
    </div>
  );
}

function TimeField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">{label}</span>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 bg-white border border-outline-variant/30 rounded-xl text-sm font-semibold outline-none focus:border-primary"
      />
    </label>
  );
}
