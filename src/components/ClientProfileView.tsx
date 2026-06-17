import React, { useState, useEffect, useRef } from 'react';
import { AppView, ClientProfile, WhatsAppMessage, Appointment } from '../types';

interface ClientProfileViewProps {
  clients: ClientProfile[];
  appointments: Appointment[];
  selectedClientId: string;
  onNavigate: (view: AppView) => void;
  onUpdateClientLog: (clientId: string, newMessage: WhatsAppMessage) => void;
  onUpdateTechnicalNotes: (clientId: string, notes: string) => void;
  onUpdateClient?: (clientId: string, fields: Partial<ClientProfile>) => void;
  onToastMessage: (msg: string) => void;
}

export default function ClientProfileView({
  clients,
  appointments,
  selectedClientId,
  onNavigate,
  onUpdateClientLog,
  onUpdateTechnicalNotes,
  onUpdateClient,
  onToastMessage
}: ClientProfileViewProps) {
  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];
  
  // Filter current client active appointments
  const activeClientAppts = (appointments || [])
    .filter(a => a.clientId === currentClient?.id)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));

  const [inputText, setInputText] = useState<string>('');
  const [technicalNotes, setTechnicalNotes] = useState<string>('');
  const [newPrefText, setNewPrefText] = useState<string>('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Sync state notes with active client notes
  useEffect(() => {
    if (currentClient) {
      setTechnicalNotes(currentClient.technicalNotes);
    }
  }, [selectedClientId, currentClient]);

  // Scroll chat window to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentClient?.whatsappLog]);

  const handleNotesBlur = () => {
    if (currentClient) {
      onUpdateTechnicalNotes(currentClient.id, technicalNotes);
      onToastMessage('Fórmula estética de autor guardada correctamente.');
    }
  };

  const handleToggleVipStatus = () => {
    if (currentClient && onUpdateClient) {
      const activeState = !currentClient.isVip;
      onUpdateClient(currentClient.id, { isVip: activeState });
      onToastMessage(activeState ? `🌟 ${currentClient.name} clasificada como VIP` : 'Estatus VIP removido');
    }
  };

  const handleToggleMarketingOptOut = () => {
    if (currentClient && onUpdateClient) {
      const next = !currentClient.marketingOptOut;
      onUpdateClient(currentClient.id, {
        marketingOptOut: next,
        contactConsent: next ? false : currentClient.contactConsent,
        contactConsentAt: next ? undefined : currentClient.contactConsentAt
      });
      onToastMessage(next ? 'Baja de comunicaciones registrada.' : 'La clienta vuelve a estar disponible para comunicaciones si existe consentimiento.');
    }
  };

  const handleAddPreferenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrefText.trim() || !currentClient) return;

    const currentPreferences = currentClient.preferences || [];
    const updated = [...currentPreferences, newPrefText.trim()];
    
    if (onUpdateClient) {
      onUpdateClient(currentClient.id, { preferences: updated });
    }
    setNewPrefText('');
    onToastMessage('Preferencia guardada.');
  };

  const handleRemovePreferenceIdx = (indexToRemove: number) => {
    if (!currentClient || !onUpdateClient) return;
    const currentPreferences = currentClient.preferences || [];
    const updated = currentPreferences.filter((_, idx) => idx !== indexToRemove);
    onUpdateClient(currentClient.id, { preferences: updated });
    onToastMessage('Preferencia removida.');
  };

  if (!currentClient) {
    return (
      <div className="flex-1 pb-16">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary mb-3">person_add</span>
          <h2 className="font-serif text-2xl font-bold text-primary mb-2">Aún no hay clientas en este salón</h2>
          <p className="text-sm text-on-surface-variant mb-5">Crea la primera ficha desde Retención para empezar a construir perfiles individuales.</p>
          <button
            type="button"
            onClick={() => onNavigate('retention')}
            className="px-5 py-3 bg-primary text-on-primary rounded-xl text-xs font-bold"
          >
            Ir a clientas
          </button>
        </div>
      </div>
    );
  }

  const handleSendLiveMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const queryText = inputText;
    setInputText('');

    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Add User Message
    const userMsg: WhatsAppMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: queryText,
      timestamp: time,
      dateLabel: 'Hoy'
    };
    onUpdateClientLog(currentClient.id, userMsg);
    onToastMessage('Mensaje enviado por WhatsApp.');

    // Interactive callback reply after 1.5 seconds
    setTimeout(() => {
      const clientPhrases = [
        "¡Hola! Sí, porfa, resérvame la cita. ¿Te queda libre el jueves a las 11:30?",
        "Hola Elena, muchas gracias por estar pendiente de mí. Me va súper bien ese regalo de hidratación, apúntame para esta semana.",
        "Hola! Me parece genial, gracias por recordármelo. El viernes por la tarde paso por el salón.",
        "Perfecto, nos vemos entonces. Muchas gracias por el detalle de la hidratación, ¡eres un sol!"
      ];
      const randomReply = clientPhrases[Math.floor(Math.random() * clientPhrases.length)];
      
      const clientMsg: WhatsAppMessage = {
        id: Math.random().toString(),
        sender: 'client',
        text: randomReply,
        timestamp: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        dateLabel: 'Hoy'
      };

      onUpdateClientLog(currentClient.id, clientMsg);
      onToastMessage(`${currentClient.name} ha respondido.`);
    }, 1500);
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Header breadcrumb row */}
      <div className="mb-8 flex items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate('retention')}
            className="w-10 h-10 rounded-full border border-primary/15 bg-surface-container-low hover:bg-surface-container-high text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
          </button>
          <div>
            <h2 className="font-serif text-3xl font-semibold text-primary">Ficha de Autor</h2>
            <p className="text-sm text-on-surface-variant font-medium">Historial estético, formulaciones técnicas y canal de mimos para {currentClient.name}.</p>
          </div>
        </div>

        {/* Quick Action message review helper */}
        <button 
          id="btn-fiche-write"
          onClick={() => onNavigate('message-editor')}
          className="bg-primary text-on-primary px-5 py-3 rounded-xl text-xs font-bold hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">mail</span>
          <span>Asistente de Redacción</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2 font-sans">
        
        {/* Left Bento: Demographic card, Tech formulation, and Visit History */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Bento Block 1: Client Card Details */}
          <div className="bg-white p-6 rounded-xl border border-muted flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left shadow-sm">
            <img 
              alt={currentClient.name} 
              className="w-24 h-24 rounded-full object-cover border-2 border-primary/10 shadow-md animate-fadeIn" 
              src={currentClient.avatar}
              referrerPolicy="no-referrer"
            />
            
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <h3 className="font-serif text-2xl font-bold text-primary">{currentClient.name}</h3>
                
                {/* Star toggle Button for VIP status */}
                <button 
                  onClick={handleToggleVipStatus}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    currentClient.isVip 
                      ? 'bg-tertiary text-on-tertiary shadow-sm' 
                      : 'bg-surface-container-low border border-outline-variant text-outline hover:bg-primary/5'
                  }`}
                  title="Haz clic para alternar estatus de clienta distinguida VIP"
                >
                  <span className="material-symbols-outlined text-xs">grade</span>
                  <span>{currentClient.isVip ? 'VIP ACTIVA' : 'MARCAR VIP'}</span>
                </button>
                <button
                  onClick={handleToggleMarketingOptOut}
                  className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ${
                    currentClient.marketingOptOut
                      ? 'bg-rose-50 border border-rose-200 text-rose-700'
                      : currentClient.contactConsent
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-surface-container-low border border-outline-variant text-outline'
                  }`}
                  title="Gestionar consentimiento de comunicaciones"
                >
                  <span className="material-symbols-outlined text-xs">{currentClient.marketingOptOut ? 'block' : 'mark_email_read'}</span>
                  <span>{currentClient.marketingOptOut ? 'BAJA WHATSAPP' : currentClient.contactConsent ? 'CONSENTIMIENTO OK' : 'SIN CONSENTIMIENTO'}</span>
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs font-medium text-on-surface-variant max-w-md text-left">
                <div>
                  <span className="text-outline uppercase text-[10px] font-bold block mb-0.5">Cumpleaños / Edad</span>
                  <span>{currentClient.birthdate || 'No registrado'}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-bold block mb-0.5">Teléfono contacto</span>
                  <span>{currentClient.phoneNumber}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-bold block mb-0.5">Última Visita</span>
                  <span>{currentClient.lastVisitDate}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-bold block mb-0.5">Ciclo habitual</span>
                  <span>Cada {currentClient.averageFrequencyDays} días</span>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnostic Risk Engine Block (Comprobaciones & Explanations) */}
          <div className="bg-white p-6 rounded-xl border border-muted shadow-sm text-left">
            <div className="flex items-center justify-between text-primary font-bold text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">analytics</span>
                <h4>Diagnóstico y Explicación de Riesgo</h4>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                currentClient.riskLevel === 'Crítico' 
                  ? 'bg-red-50 text-red-800 border-red-200 animate-pulse' 
                  : currentClient.riskLevel === 'Alto' 
                  ? 'bg-amber-50 text-amber-900 border-amber-200' 
                  : currentClient.riskLevel === 'Medio' 
                  ? 'bg-yellow-50 text-yellow-800 border-yellow-200' 
                  : 'bg-emerald-50 text-emerald-800 border-emerald-100'
              }`}>
                Riesgo {currentClient.riskLevel}
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed mb-4 font-medium">
              {currentClient.aiReason || 'Análisis de comportamiento comercial completado.'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-outline-variant/10 pt-4 bg-[#faf8f4]/60 p-3.5 rounded-xl border border-outline-variant/30">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-outline block mb-0.5">Visibilidad Temporal</span>
                <span className="text-xs font-bold text-primary block">{currentClient.lastVisitDate}</span>
                <span className="text-[10px] text-primary font-bold block mt-0.5">{currentClient.riskDays} días inactiva</span>
              </div>
              
              <div className="text-center sm:text-left border-y sm:border-y-0 sm:border-x border-outline-variant/15 py-2.5 sm:py-0 sm:px-4">
                <span className="text-[10px] uppercase font-bold text-outline block mb-0.5">Frecuencia Referencial</span>
                <span className="text-xs font-bold text-primary block">Cada {currentClient.averageFrequencyDays} días</span>
                <span className="text-[10px] text-outline block mt-0.5">Ciclo estimado</span>
              </div>

              <div className="text-center sm:text-left flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-outline block mb-1">Cálculo del Nivel</span>
                <span className="text-[11px] font-bold text-primary leading-tight">
                  {currentClient.riskDays < (currentClient.averageFrequencyDays || 30) ? (
                    <span className="text-emerald-700">{"🟢 Bajo (< 30 días sin visita)"}</span>
                  ) : currentClient.riskDays < (currentClient.averageFrequencyDays || 30) * 2 ? (
                    <span className="text-yellow-700">{"🟡 Medio (30 a 59 días ausente)"}</span>
                  ) : currentClient.riskDays < (currentClient.averageFrequencyDays || 30) * 3 ? (
                    <span className="text-amber-800">{"🟠 Alto (60 a 89 días ausente)"}</span>
                  ) : (
                    <span className="text-red-700">{"🔴 Crítico (≥ 90 días inactiva)"}</span>
                  )}
                </span>
                <span className="text-[8.5px] text-outline block mt-0.5 leading-none">Métricas basadas en ciclo del salón (30d)</span>
              </div>
            </div>
          </div>

          {/* Bento Block 2: Hospitality Preferences & Technical Formula notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Preferences Column with Edit additions */}
            <div className="bg-white p-6 rounded-xl border border-muted shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">
                  <span className="material-symbols-outlined text-lg">local_cafe</span>
                  <h4>Bebida & Preferencias</h4>
                </div>
                
                <ul className="space-y-2.5 text-xs text-on-surface-variant font-medium leading-relaxed mb-4">
                  {(currentClient.preferences || []).map((pref, idx) => (
                    <li key={idx} className="flex gap-2 items-start justify-between group">
                      <div className="flex gap-2.5 items-start text-left">
                        <span className="material-symbols-outlined text-secondary text-sm font-bold mt-0.5 shrink-0">done</span>
                        <span>{pref}</span>
                      </div>
                      <button 
                        onClick={() => handleRemovePreferenceIdx(idx)}
                        className="text-outline opacity-0 group-hover:opacity-100 hover:text-error transition-all focus:opacity-100 p-0.5 shrink-0 cursor-pointer"
                        title="Quitar preferencia"
                      >
                        <span className="material-symbols-outlined text-xs">delete</span>
                      </button>
                    </li>
                  ))}
                  {(currentClient.preferences || []).length === 0 && (
                    <li className="text-xs text-outline italic text-left">No se han guardado preferencias de atención para esta clienta.</li>
                  )}
                </ul>
              </div>

              {/* Add Custom Preference inline form */}
              <form onSubmit={handleAddPreferenceSubmit} className="border-t border-outline-variant/15 pt-3 flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={newPrefText}
                  onChange={(e) => setNewPrefText(e.target.value)}
                  placeholder="Agregar café o hábito..."
                  className="flex-1 min-w-0 px-3 py-1.5 bg-[#faf8f4] border border-outline-variant/30 rounded-lg text-xs outline-none focus:border-primary font-medium"
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary w-7 h-7 rounded-lg hover:opacity-90 flex items-center justify-center cursor-pointer shadow-sm shrink-0 font-bold"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                </button>
              </form>
            </div>

            {/* Technical Formulas notes (Editable) */}
            <div className="bg-white p-6 rounded-xl border border-muted shadow-sm text-left">
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-lg">science</span>
                <h4>Fórmula & Notas Técnicas</h4>
              </div>
              
              <textarea 
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Fórmulas técnicas del cabello, mezclas de coloración y notas específicas..."
                className="w-full h-32 p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-serif leading-relaxed text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none italic"
              />
              <span className="text-[9px] text-outline block mt-1">Haga clic fuera del recuadro para autoguardar la nota técnica.</span>
            </div>

          </div>

          {/* Bento Block 3: Treatment and appointment logs */}
          <div className="bg-white p-6 rounded-xl border border-muted shadow-sm space-y-6">
            
            {/* Active / Current Scheduled appointments in real-time */}
            <div>
              <div className="flex items-center justify-between text-primary font-bold text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">calendar_today</span>
                  <h4>Citas Programadas (Activas)</h4>
                </div>
                <button 
                  onClick={() => onNavigate('agenda')} 
                  className="text-[10px] text-primary hover:underline cursor-pointer font-bold tracking-wider uppercase bg-primary/5 px-2 py-1 rounded-md"
                >
                  Gestionar Agenda
                </button>
              </div>

              <div className="space-y-3">
                {activeClientAppts.length > 0 ? (
                  activeClientAppts.map((appt) => {
                    const statusColorMap = {
                      Reservado: 'bg-amber-50 text-amber-905 border-amber-300',
                      Pagado: 'bg-emerald-50 text-emerald-905 border-emerald-300',
                      Cancelado: 'bg-rose-50 text-rose-905 border-rose-300'
                    };
                    return (
                      <div 
                        key={appt.id} 
                        className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl flex justify-between items-center text-xs text-left"
                      >
                        <div>
                          <p className="font-bold text-primary flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px]">spa</span>
                            {appt.serviceName}
                          </p>
                          <p className="text-[10px] text-on-surface-variant mt-1">
                            Estilista: <strong className="text-primary font-semibold">{appt.staffName}</strong> • Hora: <strong className="text-primary font-bold">{appt.time}</strong>
                          </p>
                          <p className="text-[9px] text-outline mt-0.5">Fecha agendada: {appt.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-serif font-bold text-primary">{appt.price}€</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${statusColorMap[appt.status] || 'bg-surface border-outline'}`}>
                            {appt.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-outline italic py-2 text-left">No hay citas activas programadas en la agenda.</div>
                )}
              </div>
            </div>

            {/* Static History */}
            <div>
              <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/20 pb-2">
                <span className="material-symbols-outlined text-lg">history</span>
                <h4>Historial de Citas Pasadas</h4>
              </div>

              <div className="space-y-4">
                {currentClient.appointmentHistory && currentClient.appointmentHistory.length > 0 ? (
                  currentClient.appointmentHistory.map((history) => (
                    <div 
                      key={history.id} 
                      className="flex justify-between items-center text-xs border-b border-surface-container-high pb-3 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className="bg-surface-container-low p-2 rounded-xl text-center min-w-[54px] border border-surface-container/50 font-sans">
                          <p className="text-[10px] font-bold text-primary">{history.date}</p>
                          <p className="text-[8px] uppercase tracking-widest text-outline">{history.year}</p>
                        </div>
                        <div>
                          <p className="font-bold text-primary">{history.serviceName}</p>
                          <p className="text-[10px] text-outline mt-0.5">Atendido por: <strong className="font-semibold text-on-surface-variant">{history.attendedBy}</strong></p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-serif font-bold text-primary">{history.price}€</p>
                        <span className="text-[9px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {history.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-outline italic py-2 text-left">No se registran citas previas para esta clienta.</div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Right Bento - Live WhatsApp Communication logger */}
        <div className="lg:col-span-5 flex flex-col">
          
          <div className="bg-white rounded-xl border border-muted relative overflow-hidden flex flex-col flex-1 shadow-sm h-full min-h-[540px]">
            
            {/* Upper contact header panel */}
            <div className="bg-surface-container-low border-b border-outline-variant/30 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-full bg-primary/5 border border-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-xl">forum</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-primary leading-none">Intercambio en tiempo real</h4>
                  <span className="text-[10px] text-on-surface-variant mt-1 inline-block font-semibold">Mensajería en vivo de WhatsApp</span>
                </div>
              </div>

              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
            </div>

            {/* Interactive Live Chat Transcript room */}
            <div className="whatsapp-bg flex-1 p-5 overflow-y-auto space-y-4 max-h-[360px]">
              
              {!currentClient.whatsappLog || currentClient.whatsappLog.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-center text-xs text-outline italic bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-outline-variant/30 font-sans">
                    No hay conversaciones históricas recientes. Escribe un mensaje a continuación para iniciar comunicación.
                  </p>
                </div>
              ) : (
                currentClient.whatsappLog.map((message) => {
                  const isUser = message.sender === 'user' || message.sender === 'ai_auto';
                  const isDraft = message.status === 'borrador';
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isUser ? 'justify-end pr-3 pl-8' : 'justify-start pl-3 pr-8'}`}
                    >
                      <div className={`p-3 rounded-xl rounded-tr-none shadow-sm text-xs leading-relaxed max-w-full relative text-left ${
                        isUser 
                          ? isDraft
                            ? 'bg-[#FCF8F2] text-on-background border border-[#bfa982]/40'
                            : 'bg-[#EFFFDE] text-on-background border border-outline-variant/15' 
                          : 'bg-white text-on-background border border-outline-variant/10'
                      }`}>
                        
                        {/* Dynamic Author Label (Elena / Carmen) */}
                        <div className="flex items-baseline gap-2 mb-1 justify-between">
                          <span className={`font-bold text-[9px] uppercase tracking-wider opacity-80 ${isDraft ? 'text-[#8c6d7a]' : 'text-primary'}`}>
                            {message.sender === 'ai_auto' ? 'ELENA • AUTO' : 
                             message.sender === 'user' 
                               ? isDraft 
                                 ? 'COPILOTO • BORRADOR PENDIENTE'
                                 : 'ESTILO DE AUTOR' 
                               : currentClient.name}
                          </span>
                        </div>

                        <p className="font-sans text-on-surface whitespace-pre-wrap">{message.text}</p>
                        
                        <div className="flex items-center justify-end gap-1.5 mt-1.5 text-[8.5px] text-outline text-right">
                          <span>{message.timestamp}</span>
                          {isUser && (
                            isDraft ? (
                              <button
                                type="button"
                                onClick={() => {
                                  onNavigate('message-editor');
                                }}
                                className="px-2 py-0.5 bg-[#bfa982]/15 hover:bg-[#bfa982]/30 text-[#8c6d7a] font-extrabold rounded text-[8px] tracking-wide transition-all flex items-center gap-0.5 cursor-pointer ml-1"
                              >
                                <span className="material-symbols-outlined text-[8px] font-bold">edit</span>
                                <span>Completar / Enviar</span>
                              </button>
                            ) : (
                              <span className="material-symbols-outlined text-[11px] text-sky-600 font-bold">done_all</span>
                            )
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}

              <div ref={chatBottomRef}></div>
            </div>

            {/* Typing box */}
            <form onSubmit={handleSendLiveMessage} className="bg-surface-container-low border-t border-outline-variant/30 px-4 py-3 flex items-center gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Escribe un mensaje de WhatsApp..."
                className="w-full px-4 py-2.5 bg-white border border-outline-variant/30 rounded-full text-xs outline-none focus:border-primary transition-all font-medium"
              />
              <button 
                type="submit"
                className="w-9 h-9 min-w-[36px] items-center justify-center bg-primary text-on-primary rounded-full hover:opacity-95 shadow-sm flex cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm font-bold">send</span>
              </button>
            </form>

          </div>

        </div>

      </div>

    </div>
  );
}
