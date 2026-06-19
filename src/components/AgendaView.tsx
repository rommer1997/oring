import React, { useState } from 'react';
import { Appointment, ClientProfile, Service, StaffMember, AppConfig } from '../types';
import { getTodayISO, buildNewClient } from '../utils/riskEngine';

interface AgendaViewProps {
  appointments: Appointment[];
  clients: ClientProfile[];
  services: Service[];
  staff: StaffMember[];
  selectedTenantId: string;
  onAddAppointment: (appt: Appointment) => void;
  onUpdateAppointment?: (appt: Appointment) => void;
  onUpdateStatus: (id: string, status: 'Pagado' | 'Reservado' | 'Cancelado') => void;
  onDeleteAppointment: (id: string) => void;
  onToastMessage: (msg: string) => void;
  onAddClient?: (client: ClientProfile) => void;
  config?: AppConfig;
  tenantSlug?: string;
}

export default function AgendaView({
  appointments,
  clients,
  services,
  staff,
  selectedTenantId,
  onAddAppointment,
  onUpdateAppointment,
  onUpdateStatus,
  onDeleteAppointment,
  onToastMessage,
  onAddClient,
  config,
  tenantSlug,
}: AgendaViewProps) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayISO());
  const [filterStaffId, setFilterStaffId] = useState<string>('all');
  const [activeViewLayout, setActiveViewLayout] = useState<'day' | 'list'>('day');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Modal controllers
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Form fields
  const [formClientId, setFormClientId] = useState<string>('');
  const [formServiceId, setFormServiceId] = useState<string>('');
  const [formStaffId, setFormStaffId] = useState<string>('');
  const [formTime, setFormTime] = useState<string>('12:00');
  const [formDate, setFormDate] = useState<string>(getTodayISO());
  const [formPrice, setFormPrice] = useState<number>(50);
  const [formStatus, setFormStatus] = useState<'Pagado' | 'Reservado' | 'Cancelado'>('Reservado');

  // Phone lookup and smart registration states
  const [phoneSearch, setPhoneSearch] = useState<string>('');
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [isPhoneNewClient, setIsPhoneNewClient] = useState<boolean>(false);
  const [foundClient, setFoundClient] = useState<ClientProfile | null>(null);
  const [newClientName, setNewClientName] = useState<string>('');

  const handleVerifyPhone = () => {
    const cleanS = phoneSearch.trim();
    if (!cleanS) {
      onToastMessage('⚠️ Por favor, introduce un número de teléfono.');
      return;
    }

    // Standard spanish and global cleanup logic
    const cleanedSearch = cleanS.replace(/[\s\-().+]/g, '');
    const matched = clients.find(c => {
      const cleanedC = (c.phoneNumber || '').replace(/[\s\-().+]/g, '');
      if (!cleanedC || !cleanedSearch) return false;
      return cleanedC.slice(-9) === cleanedSearch.slice(-9) || cleanedC === cleanedSearch;
    });

    if (matched) {
      setFoundClient(matched);
      setFormClientId(matched.id);
      setIsPhoneVerified(true);
      setIsPhoneNewClient(false);
      onToastMessage(`🟢 Clienta registrada encontrada: ${matched.name}. Datos importados automáticamente.`);
    } else {
      setFoundClient(null);
      setFormClientId('');
      setIsPhoneVerified(true);
      setIsPhoneNewClient(true);
      onToastMessage(`✨ Teléfono no registrado. Ingresa el nombre para completar el alta express.`);
    }
  };

  // Trigger modal for creation
  const openCreateModal = () => {
    if (services.length === 0 || staff.length === 0) {
      onToastMessage('Añade al menos un servicio y un profesional antes de programar citas.');
      return;
    }
    setEditingAppointment(null);
    setFormClientId(''); 
    setFormServiceId(services[0]?.id || '');
    setFormStaffId(staff[0]?.id || '');
    setFormTime('12:00');
    setFormDate(selectedDate);
    setFormPrice(services[0]?.price || 50);
    setFormStatus('Reservado');

    // Reset phone search state machine
    setPhoneSearch('');
    setIsPhoneVerified(false);
    setIsPhoneNewClient(false);
    setFoundClient(null);
    setNewClientName('');
    setIsAddOpen(true);
  };

  // Trigger modal for editing
  const openEditModal = (appt: Appointment) => {
    setEditingAppointment(appt);
    setFormClientId(appt.clientId);
    setFormServiceId(appt.serviceId);
    setFormStaffId(appt.staffId);
    setFormTime(appt.time);
    setFormDate(appt.date);
    setFormPrice(appt.price);
    setFormStatus(appt.status);

    // Load and auto-verify for existing booking
    const currentClient = clients.find(c => c.id === appt.clientId);
    if (currentClient) {
      setPhoneSearch(currentClient.phoneNumber);
      setFoundClient(currentClient);
      setIsPhoneVerified(true);
      setIsPhoneNewClient(false);
    } else {
      setPhoneSearch('');
      setFoundClient(null);
      setIsPhoneVerified(true);
      setIsPhoneNewClient(false);
    }

    setNewClientName('');
    setIsAddOpen(true);
  };

  // Sync service price in appointment creator/updater
  const handleServiceChange = (serviceId: string) => {
    setFormServiceId(serviceId);
    const matched = services.find(s => s.id === serviceId);
    if (matched) {
      setFormPrice(matched.price);
    }
  };

  // Filter list by selected day/list, staff and search query
  const filteredAppointments = appointments.filter(appt => {
    const tenantMatch = appt.tenantId === selectedTenantId;
    const staffMatch = filterStaffId === 'all' || appt.staffId === filterStaffId;
    
    const searchMatch = searchQuery.trim() === '' || 
      appt.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appt.staffName.toLowerCase().includes(searchQuery.toLowerCase());

    if (activeViewLayout === 'day') {
      const dateMatch = appt.date === selectedDate;
      return dateMatch && tenantMatch && staffMatch && searchMatch;
    } else {
      return tenantMatch && staffMatch && searchMatch;
    }
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. If we are verifying phone, we shouldn't submit the whole form if they haven't verified.
    if (!isPhoneVerified) {
      handleVerifyPhone();
      return;
    }

    // 2. Validate required client details
    if (isPhoneNewClient) {
      if (!newClientName.trim()) {
        onToastMessage('⚠️ Error: El nombre de la clienta es obligatorio para el registro express.');
        return;
      }
    } else {
      if (!formClientId.trim()) {
        onToastMessage('⚠️ Error: Debe verificar un teléfono de cliente válido.');
        return;
      }
    }

    if (!formServiceId.trim()) {
      onToastMessage('⚠️ Error: Seleccione un tratamiento o servicio.');
      return;
    }
    if (!formStaffId.trim()) {
      onToastMessage('⚠️ Error: Debe asignar un estilista o especialista.');
      return;
    }
    if (!formDate || formDate.trim() === '') {
      onToastMessage('⚠️ Error: La fecha de la cita no puede estar vacía.');
      return;
    }
    if (!formTime || formTime.trim() === '') {
      onToastMessage('⚠️ Error: La hora de la cita es obligatoria.');
      return;
    }

    const matchedService = services.find(s => s.id === formServiceId);
    const matchedStaff = staff.find(s => s.id === formStaffId);

    if (!matchedService) {
      onToastMessage('⚠️ Error: El servicio seleccionado no es válido.');
      return;
    }
    if (!matchedStaff) {
      onToastMessage('⚠️ Error: El estilista seleccionado no es válido.');
      return;
    }

    // Validate employee availability if Rotating Schedule is active
    if (config?.isRotatingScheduleEnabled) {
      const dateForWeekday = new Date(formDate + 'T12:00:00');
      const weekdaysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const dayName = weekdaysEs[dateForWeekday.getDay()];
      
      const daySchedule = matchedStaff.schedule?.[dayName] || {
        start: '09:00',
        end: '18:00',
        isWorking: dayName !== 'Domingo'
      };

      if (!daySchedule.isWorking) {
        onToastMessage(`⚠️ Error de agenda: ${matchedStaff.name} no trabaja los días ${dayName}.`);
        return;
      }

      // Check if formTime is within daySchedule start and end
      const [apptHr, apptMin] = formTime.split(':').map(Number);
      const [startHr, startMin] = daySchedule.start.split(':').map(Number);
      const [endHr, endMin] = daySchedule.end.split(':').map(Number);

      const apptVal = (apptHr || 0) * 60 + (apptMin || 0);
      const startVal = (startHr || 0) * 60 + (startMin || 0);
      const endVal = (endHr || 0) * 60 + (endMin || 0);

      if (apptVal < startVal || apptVal > endVal) {
        onToastMessage(`⚠️ Fuera de Horario: ${matchedStaff.name} está asignada de ${daySchedule.start} a ${daySchedule.end} el ${dayName}.`);
        return;
      }
    }

    // Validate date is realistic (can't be blank or unformatted)
    const dateObj = new Date(formDate);
    if (isNaN(dateObj.getTime())) {
      onToastMessage('⚠️ Error: Formato de fecha inválido.');
      return;
    }

    // Overlap check: reject if this staff already has a booking that overlaps
    const [newHr, newMin] = formTime.split(':').map(Number);
    const newStart = (newHr || 0) * 60 + (newMin || 0);
    const newEnd = newStart + (matchedService.durationMinutes || 30);
    const hasOverlap = appointments.some(a => {
      if (a.staffId !== formStaffId || a.date !== formDate) return false;
      if (editingAppointment && a.id === editingAppointment.id) return false;
      if (a.status === 'Cancelado') return false;
      const [aHr, aMin] = a.time.split(':').map(Number);
      const aStart = (aHr || 0) * 60 + (aMin || 0);
      const aEnd = aStart + (a.durationMinutes || 30);
      return newStart < aEnd && newEnd > aStart;
    });
    if (hasOverlap) {
      onToastMessage(`⚠️ Conflicto de agenda: ${matchedStaff.name} ya tiene una cita en ese horario.`);
      return;
    }

    // Handle Client Registration on-the-fly if it was a new client
    if (!editingAppointment && isPhoneNewClient) {
      const cleanClient = buildNewClient({
        id: `cli-${Date.now()}`,
        name: newClientName.trim(),
        phoneNumber: phoneSearch.trim(),
        tenantId: selectedTenantId,
        lastVisitService: matchedService.name,
        favoriteServices: [{ name: matchedService.name, count: 1, pricePerVisit: matchedService.price, icon: 'spa' }],
        aiReason: 'Ficha creada desde agenda.',
      });

      if (onAddClient) {
        onAddClient(cleanClient);
      }

      const newAppt: Appointment = {
        id: `appt-${Date.now()}`,
        clientName: cleanClient.name,
        clientId: cleanClient.id,
        serviceName: matchedService.name,
        serviceId: matchedService.id,
        staffName: matchedStaff.name,
        staffId: matchedStaff.id,
        time: formTime,
        date: formDate,
        price: formPrice,
        status: formStatus,
        durationMinutes: matchedService.durationMinutes,
        tenantId: selectedTenantId
      };

      onAddAppointment(newAppt);
      onToastMessage(`✨ Clienta ${cleanClient.name} registrada con éxito y cita programada el ${formDate} a las ${formTime}.`);
      setIsAddOpen(false);
      return;
    }

    // Client already exists
    const matchedClient = clients.find(c => c.id === formClientId);
    if (!matchedClient) {
      onToastMessage('⚠️ Error: La clienta seleccionada no es válida.');
      return;
    }

    if (editingAppointment) {
      const updatedAppt: Appointment = {
        ...editingAppointment,
        clientName: matchedClient.name,
        clientId: matchedClient.id,
        serviceName: matchedService.name,
        serviceId: matchedService.id,
        staffName: matchedStaff.name,
        staffId: matchedStaff.id,
        time: formTime,
        date: formDate,
        price: formPrice,
        status: formStatus
      };

      if (onUpdateAppointment) {
        onUpdateAppointment(updatedAppt);
      }
      onToastMessage(`✨ Cita de ${matchedClient.name} actualizada con éxito (Duración: ${matchedService.durationMinutes} min).`);
    } else {
      const newAppt: Appointment = {
        id: `appt-${Date.now()}`,
        clientName: matchedClient.name,
        clientId: matchedClient.id,
        serviceName: matchedService.name,
        serviceId: matchedService.id,
        staffName: matchedStaff.name,
        staffId: matchedStaff.id,
        time: formTime,
        date: formDate,
        price: formPrice,
        status: formStatus,
        durationMinutes: matchedService.durationMinutes,
        tenantId: selectedTenantId
      };

      onAddAppointment(newAppt);
      onToastMessage(`✨ Cita programada para ${matchedClient.name} el ${formDate} a las ${formTime} (${matchedService.durationMinutes} min de duración).`);
    }

    setIsAddOpen(false);
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Upper header summary */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-primary">Agenda & Citas</h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Tu agenda del día: quién viene, quién la atiende y qué cobras.
          </p>
        </div>
        
        <div className="flex gap-2 flex-wrap justify-end">
          {tenantSlug && (
            <button
              onClick={() => {
                const url = `${window.location.origin}/salon/${tenantSlug}`;
                navigator.clipboard?.writeText(url).then(() => onToastMessage('✓ Enlace copiado. Compártelo con tus clientas para que reserven solas.'));
              }}
              className="border border-primary text-primary font-bold text-xs uppercase tracking-wider px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-sm">share</span>
              <span>Compartir agenda</span>
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="bg-primary text-on-primary font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-[#4a2c40]/90 transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">add_circle</span>
            <span>Programar Cita</span>
          </button>
        </div>
      </div>

      {/* Day / List view tabs */}
      <div className="flex bg-surface-container-low p-1 rounded-2xl mb-6 max-w-sm border border-outline-variant/10 font-sans">
        <button 
          onClick={() => setActiveViewLayout('day')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeViewLayout === 'day' ? 'bg-primary text-white shadow-sm font-bold' : 'text-on-surface-variant hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-base">calendar_view_day</span>
          <span>Vista Diaria</span>
        </button>
        <button 
          onClick={() => setActiveViewLayout('list')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${activeViewLayout === 'list' ? 'bg-primary text-white shadow-sm font-bold' : 'text-on-surface-variant hover:text-primary'}`}
        >
          <span className="material-symbols-outlined text-base">format_list_bulleted</span>
          <span>Lista Completa</span>
        </button>
      </div>

      {/* Perspectiva Global de Próximos Días */}
      <div className="mb-6 bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10 text-primary">
        <h4 className="text-[11px] uppercase font-bold tracking-wider text-[#bfa982] mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm font-bold">calendar_month</span>
          Citas de esta semana
        </h4>
        
        <div className="grid grid-cols-7 gap-2">
          {(() => {
            const list = [];
            const baseDate = new Date(`${getTodayISO()}T12:00:00`);
            const weekdaysMin = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
            
            for (let i = 0; i < 7; i++) {
              const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              const dateStr = `${year}-${month}-${day}`;
              list.push({
                dateStr,
                dayNum: d.getDate(),
                dayName: weekdaysMin[d.getDay()],
                count: appointments.filter(a => a.date === dateStr && a.status !== 'Cancelado').length
              });
            }

            return list.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              return (
                <button
                  key={item.dateStr}
                  onClick={() => {
                    setSelectedDate(item.dateStr);
                    setActiveViewLayout('day');
                  }}
                  className={`p-3 rounded-xl flex flex-col items-center justify-between gap-1.5 transition-all text-center select-none cursor-pointer border ${
                    isSelected 
                      ? 'bg-primary text-white border-primary shadow-sm scale-102 font-bold' 
                      : 'bg-white hover:bg-surface border-outline-variant/15 text-primary'
                  }`}
                >
                  <span className={`text-[10px] font-sans font-bold uppercase ${isSelected ? 'text-[#f9f5f0]/90' : 'text-on-surface-variant'}`}>
                    {item.dayName}
                  </span>
                  
                  <span className={`text-sm font-serif font-extrabold leading-none ${isSelected ? 'text-white' : 'text-primary'}`}>
                    {item.dayNum}
                  </span>
                  
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-sans font-bold leading-none shrink-0 ${
                    item.count > 0 
                      ? (isSelected ? 'bg-white/20 text-white' : 'bg-[#eec0cc]/30 text-rose-800') 
                      : (isSelected ? 'bg-white/15 text-[#f5ebd7]' : 'bg-surface-container-low text-neutral-400')
                  }`}>
                    {item.count > 0 ? `${item.count} C` : 'libre'}
                  </span>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Scheduler board wrappers with controls */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row justify-between gap-4 items-center mb-6 border-b border-outline-variant/15 pb-6">
          
          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto">
            {/* Date Picker container (Only shown on select Date mode) */}
            {activeViewLayout === 'day' && (
              <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-2 rounded-xl">
                <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-primary outline-none"
                />
              </div>
            )}

            {/* Staff Filter dropdown */}
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-2 rounded-xl">
              <span className="material-symbols-outlined text-sm text-primary">person</span>
              <select 
                value={filterStaffId}
                onChange={(e) => setFilterStaffId(e.target.value)}
                className="bg-transparent border-none text-xs font-bold text-primary outline-none cursor-pointer"
              >
                <option value="all">Estilista (Todos)</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role.split(' ')[0]}) {s.visibleToClient === false ? '🔒' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input Box */}
            <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/30 px-3 py-2 rounded-xl text-xs font-semibold w-full sm:w-56">
              <span className="material-symbols-outlined text-sm text-primary">search</span>
              <input 
                type="text"
                placeholder="Buscar por clienta, servicio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs font-semibold text-primary outline-none placeholder-primary/50 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="p-0.5 text-outline-variant hover:text-primary">
                  <span className="material-symbols-outlined text-[10px] font-bold">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="text-[10px] lg:text-xs text-outline font-bold flex gap-4 shrink-0 uppercase tracking-wider">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span> Reservadas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block"></span> Pagadas</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span> Canceladas</span>
          </div>
        </div>

        {/* Calendar visual layout lists */}
        {filteredAppointments.length === 0 ? (
          <div className="p-16 text-center border-2 border-dashed border-outline-variant/20 rounded-2xl bg-[#faf8f4]/50">
            <span className="material-symbols-outlined text-4xl text-outline mb-3">calendar_today</span>
            <p className="text-sm font-bold text-primary mb-1">No se encontraron citas</p>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
              No hay citas programadas para coincidir con los criterios de búsqueda o filtros configurados.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.sort((a,b) => {
              // Sort by date first (relevant for list view), then by time
              const dateCompare = a.date.localeCompare(b.date);
              if (dateCompare !== 0) return dateCompare;
              return a.time.localeCompare(b.time);
            }).map((appt) => {
              const statusColorMap = {
                Reservado: 'border-amber-400 bg-amber-50/50 text-amber-900',
                Pagado: 'border-emerald-500 bg-emerald-50/50 text-emerald-900',
                Cancelado: 'border-rose-400 bg-rose-50/50 text-rose-900'
              };

              return (
                <div 
                  key={appt.id}
                  className="p-5 bg-white border border-outline-variant/30 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start md:items-center gap-4 flex-1">
                    {/* Time or Date + Time pill */}
                    {activeViewLayout === 'day' ? (
                      <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2.5 text-center min-w-[70px]">
                        <span className="text-[10px] uppercase font-bold text-outline block leading-none mb-1">HORA</span>
                        <span className="font-serif text-lg font-bold text-primary leading-none">{appt.time}</span>
                      </div>
                    ) : (
                      <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2 text-center min-w-[100px] shrink-0">
                        <span className="text-[9px] uppercase font-bold text-outline block leading-none mb-1 text-center truncate">{appt.date}</span>
                        <span className="font-serif text-sm font-bold text-primary leading-none">{appt.time}</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="font-serif text-base font-bold text-primary truncate leading-tight">{appt.clientName}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColorMap[appt.status]}`}>
                          {appt.status}
                        </span>
                      </div>

                      <p className="text-xs text-on-surface-variant font-medium flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">spa</span> {appt.serviceName}
                        </span>
                        <span className="text-outline">•</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-primary/70">face</span> Con: <strong className="text-primary">{appt.staffName}</strong>
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions & pricing segment */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-outline-variant/20">
                    <span className="font-serif text-xl font-bold text-primary">{appt.price}€</span>

                    <div className="flex items-center gap-1.5">
                      {appt.status === 'Reservado' && (
                        <button
                          onClick={() => onUpdateStatus(appt.id, 'Pagado')}
                          className="p-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold tracking-wider cursor-pointer transition-colors"
                          title="Marcar como cobrado/pagado"
                        >
                          COBRAR
                        </button>
                      )}
                      {appt.status !== 'Cancelado' && (
                        <button
                          onClick={() => onUpdateStatus(appt.id, 'Cancelado')}
                          className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold tracking-wider cursor-pointer"
                          title="Cancelar reserva"
                        >
                          CANCELAR
                        </button>
                      )}
                      
                      {/* Edit appointment */}
                      <button
                        onClick={() => openEditModal(appt)}
                        className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-lg cursor-pointer transition-all"
                        title="Editar detalles de cita"
                      >
                        <span className="material-symbols-outlined text-sm font-semibold">edit</span>
                      </button>

                      {/* Delete appointment */}
                      <button
                        onClick={() => onDeleteAppointment(appt.id)}
                        className="p-1.5 text-outline hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all"
                        title="Eliminar cita"
                      >
                        <span className="material-symbols-outlined text-sm font-semibold">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add/Edit Appointment view slider/modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm shadow-md" onClick={() => setIsAddOpen(false)}></div>
          <form 
            onSubmit={handleFormSubmit}
            className="bg-surface max-w-md w-full rounded-2xl p-6 relative z-10 border border-surface-container-high shadow-xl animate-scale-up text-left font-sans"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-serif text-xl font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined">calendar_today</span>
                <span>{editingAppointment ? 'Editar Detalles de Cita' : 'Programar Nueva Cita'}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddOpen(false)}
                className="text-outline hover:text-primary cursor-pointer p-0.5"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Step 1: Phone search/verification */}
              {!isPhoneVerified ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">Teléfono Móvil de la Clienta</label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="Ej: 600123456"
                        value={phoneSearch}
                        onChange={(e) => setPhoneSearch(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyPhone();
                          }
                        }}
                        className="flex-1 px-4 py-3 bg-surface-container-low border border-[#bfa982]/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-semibold"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={handleVerifyPhone}
                        className="px-4 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary/95 transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-xs">done</span>
                        <span>Verificar</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-medium mt-2 leading-tight">
                      Presiona Enter o clica en verificar. Si ya está registrada, importará sus datos automáticamente; si no, podrás registrarla al vuelo.
                    </p>
                  </div>
                </div>
              ) : (
                /* Step 2: Client Profile information + booking details */
                <div className="space-y-4">
                  {isPhoneNewClient ? (
                    <div className="bg-[#ebdcc9]/10 p-4 rounded-xl border border-[#bfa982]/20 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5 uppercase tracking-wider">
                          <span className="material-symbols-outlined text-sm">person_add</span>
                          ¡Nueva Clienta Detectada!
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPhoneVerified(false);
                            setIsPhoneNewClient(false);
                          }}
                          className="text-[10px] font-bold text-primary underline cursor-pointer"
                        >
                          Corregir teléfono
                        </button>
                      </div>
                      <div>
                        <label className="text-[9.5px] uppercase font-bold tracking-wider text-outline block mb-1">Nombre Completo de la Clienta</label>
                        <input
                          type="text"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          placeholder="Ej: María Pérez"
                          required
                          className="w-full px-4 py-3 bg-white border border-[#bfa982]/20 rounded-xl text-xs sm:text-sm outline-none focus:border-primary text-foreground font-semibold"
                        />
                      </div>
                      <p className="text-[9px] text-on-surface-variant font-medium">
                        Se registrará automáticamente con el teléfono: <strong>{phoneSearch}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={foundClient?.avatar} 
                          alt={foundClient?.name} 
                          className="w-10 h-10 rounded-full object-cover border border-[#bfa982]/20 shadow-xs"
                        />
                        <div>
                          <h4 className="font-serif text-sm font-bold text-primary flex items-center gap-1">
                            {foundClient?.name}
                            {foundClient?.isVip && (
                              <span className="bg-amber-100 text-amber-800 text-[8px] px-1 py-0.5 rounded font-extrabold uppercase shrink-0">VIP</span>
                            )}
                          </h4>
                          <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                            {foundClient?.phoneNumber} • Gasto Acumulado: <span className="text-primary font-bold">{foundClient?.spendingLtv || 0}€</span>
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhoneVerified(false);
                          setFoundClient(null);
                          setFormClientId('');
                        }}
                        className="text-[10px] font-bold text-primary underline cursor-pointer"
                      >
                        Cambiar
                      </button>
                    </div>
                  )}

                  {/* Select Service */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Servicio</label>
                    <select
                      value={formServiceId}
                      onChange={(e) => handleServiceChange(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                    >
                      <option value="" disabled>Seleccione servicio...</option>
                      {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name} - {s.price}€ ({s.durationMinutes}m)</option>
                      ))}
                    </select>
                  </div>

                  {/* Select Stylist */}
                  <div>
                    <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Profesional</label>
                    <select
                      value={formStaffId}
                      onChange={(e) => setFormStaffId(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-semibold cursor-pointer"
                    >
                      <option value="" disabled>Seleccione staff...</option>
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} - {s.role} {s.visibleToClient === false ? '🔒 (Privado / Oculto)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date & Time Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Fecha</label>
                      <input 
                        type="date" 
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-semibold text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Hora (HH:MM)</label>
                      <input 
                        type="time" 
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs outline-none focus:border-primary transition-all font-semibold text-primary"
                      />
                    </div>
                  </div>

                  {/* Price override & Status Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Precio Cobro (€)</label>
                      <input 
                        type="number" 
                        value={formPrice}
                        onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-bold text-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold tracking-wider text-outline block mb-1">Estado</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs sm:text-sm outline-none focus:border-primary transition-all font-bold text-primary cursor-pointer"
                      >
                        <option value="Reservado">🟡 Reservado</option>
                        <option value="Pagado">🟢 Pagado</option>
                        <option value="Cancelado">🔴 Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-outline-variant/20 mt-6">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-outline-variant hover:text-primary cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-sm hover:opacity-95 transition-all cursor-pointer"
              >
                {editingAppointment ? 'Guardar Cambios' : 'Confirmar Reserva'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
