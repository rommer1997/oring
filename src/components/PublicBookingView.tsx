import React, { useEffect, useMemo, useState } from 'react';
import { Service, StaffMember, Tenant } from '../types';

interface PublicBookingViewProps {
  slug: string;
}

interface PublicBookingData {
  tenant: Tenant;
  services: Service[];
  staff: StaffMember[];
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

export default function PublicBookingView({ slug }: PublicBookingViewProps) {
  const [data, setData] = useState<PublicBookingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [contactConsent, setContactConsent] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    fetch(`/api/public-booking/${slug}`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => {
        if (!isMounted) return;
        setData(payload);
        setServiceId(payload.services[0]?.id || '');
        setStaffId(payload.staff[0]?.id || '');
      })
      .catch(() => {
        if (isMounted) setError('No hemos podido cargar esta página de reservas.');
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!serviceId || !staffId || !date) return;
    setSelectedTime('');
    setSlots([]);
    fetch(`/api/public-booking/${slug}/availability?serviceId=${encodeURIComponent(serviceId)}&staffId=${encodeURIComponent(staffId)}&date=${encodeURIComponent(date)}`)
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => setSlots(payload.slots || []))
      .catch(() => setSlots([]));
  }, [slug, serviceId, staffId, date]);

  const selectedService = useMemo(() => data?.services.find((service) => service.id === serviceId) || null, [data, serviceId]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedTime) {
      setError('Elige una hora disponible para reservar.');
      return;
    }
    if (!contactConsent) {
      setError('Acepta el contacto para poder confirmar la reserva.');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/public-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          serviceId,
          staffId,
          date,
          time: selectedTime,
          clientName,
          clientPhone,
          clientEmail,
          contactConsent,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'No se pudo crear la reserva.');
      setSuccess(`Reserva confirmada para el ${date} a las ${selectedTime}.`);
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setContactConsent(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la reserva.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center text-primary font-bold">Cargando reservas...</div>;
  }

  if (error && !data) {
    return <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center text-primary font-bold px-6 text-center">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-[#fbf9f5] text-primary">
      <header className="px-5 md:px-10 py-6 border-b border-primary/10 bg-white/80 backdrop-blur">
        <p className="text-[10px] uppercase tracking-widest font-bold text-primary/60">Reserva online</p>
        <h1 className="font-serif text-3xl md:text-4xl font-bold">{data?.tenant.name || 'Salón'}</h1>
        <p className="text-sm text-on-surface-variant mt-1">{[data?.tenant.address, data?.tenant.city].filter(Boolean).join(', ')}</p>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 bg-white border border-primary/10 rounded-2xl p-5 md:p-7 shadow-sm">
          <h2 className="font-serif text-2xl font-bold mb-5">Elige tu cita</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Servicio</span>
              <select value={serviceId} onChange={(event) => setServiceId(event.target.value)} required className="mt-1 w-full h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white">
                {data?.services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name} - {service.price}€ ({service.durationMinutes} min)</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Profesional</span>
              <select value={staffId} onChange={(event) => setStaffId(event.target.value)} required className="mt-1 w-full h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white">
                {data?.staff.map((member) => (
                  <option key={member.id} value={member.id}>{member.name} - {member.role}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Fecha</span>
              <input type="date" value={date} min={getTodayISO()} onChange={(event) => setDate(event.target.value)} required className="mt-1 w-full h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white" />
            </label>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-primary/70">Horas disponibles</span>
              <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.length === 0 ? (
                  <p className="col-span-full text-sm text-on-surface-variant">No hay huecos disponibles para esta selección.</p>
                ) : slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={`h-10 rounded-xl border text-sm font-bold ${selectedTime === slot ? 'bg-primary text-white border-primary' : 'bg-white text-primary border-primary/20'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-primary/10">
              <input value={clientName} onChange={(event) => setClientName(event.target.value)} required placeholder="Nombre completo" className="h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white" />
              <input value={clientPhone} onChange={(event) => setClientPhone(event.target.value)} required placeholder="Teléfono" className="h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white" />
              <input value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} type="email" placeholder="Email opcional" className="md:col-span-2 h-12 rounded-xl border border-primary/20 px-3 text-sm font-semibold bg-white" />
            </div>

            <label className="flex items-start gap-3 text-xs text-on-surface-variant font-semibold">
              <input type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-0.5 accent-primary" />
              Acepto que el salón me contacte para confirmar esta reserva.
            </label>

            {error && <p className="text-sm font-bold text-red-700 bg-red-50 border border-red-100 rounded-xl p-3">{error}</p>}
            {success && <p className="text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{success}</p>}

            <button disabled={isSaving || !selectedTime} type="submit" className="w-full h-12 rounded-full bg-primary text-white text-sm font-bold disabled:opacity-50">
              {isSaving ? 'Reservando...' : 'Confirmar reserva'}
            </button>
          </form>
        </section>

        <aside className="lg:col-span-2 bg-primary text-white rounded-2xl p-6 h-fit shadow-lg">
          <p className="text-xs uppercase tracking-widest font-bold text-white/70 mb-2">Resumen</p>
          <h3 className="font-serif text-2xl font-bold">{selectedService?.name || 'Servicio'}</h3>
          <p className="text-sm text-white/75 mt-2">{selectedService ? `${selectedService.durationMinutes} min · ${selectedService.price}€` : 'Elige un servicio'}</p>
          <div className="mt-6 pt-6 border-t border-white/15 text-sm space-y-2">
            <p><strong>Fecha:</strong> {date}</p>
            <p><strong>Hora:</strong> {selectedTime || 'Pendiente'}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
