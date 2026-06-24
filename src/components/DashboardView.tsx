import React, { useState, useMemo, useRef } from 'react';
import { AppView, ClientProfile, Appointment, AppConfig } from '../types';
import { getTodayISO } from '../utils/riskEngine';

interface DashboardViewProps {
  clients: ClientProfile[];
  appointments: Appointment[];
  onNavigate: (view: AppView) => void;
  onSelectClient: (clientId: string) => void;
  onToastMessage: (msg: string) => void;
  onSearchNavigate?: (term: string) => void;
  isBeginnerMode?: boolean;
  onUpdateConfig?: (updated: Partial<AppConfig>) => void;
}

export default function DashboardView({ 
  clients, 
  appointments,
  onNavigate, 
  onSelectClient,
  onToastMessage,
  onSearchNavigate,
  isBeginnerMode = true,
  onUpdateConfig
}: DashboardViewProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearch = (term: string) => {
    if (onSearchNavigate) {
      onSearchNavigate(term);
    } else {
      onNavigate('retention');
      onToastMessage(`Buscando clienta: ${term}`);
    }
  };

  const handleExportWeekly = () => {
    const headers = ['Tipo de Dato', 'Detalle/Nombre', 'Estado/Valor', 'Métricas'];
    const rows = [
      ['Ticket Medio Real', '', `${avgTicket.toFixed(2)}€`, 'Basado en citas pagadas'],
      ['Clientas que te echan de menos', '', `${riskClientsCount} clientas`, 'Riesgo Alto/Crítico/Medio'],
      ['Mensajes Enviados', '', `${totalSentMessages} mensajes`, 'Canal WhatsApp'],
      ['Respuestas Recibidas', '', `${totalResponses} respuestas`, `Tasa respuesta: ${responseRate}%`],
      ['Citas Recuperadas', '', `${totalRecoveredCitas} citas`, `Conversión: ${conversionRate}%`],
      ['Dinero que puedes recuperar', '', `${estimatedROI}€`, 'Ingresos por recuperación'],
      [],
      ['LISTA DE CLIENTAS EN RIESGO CRÍTICO'],
      ['Nombre', 'Teléfono', 'Email', 'Días inactiva'],
      ...clients.filter(c => c.riskLevel === 'Crítico').map(c => [c.name, c.phoneNumber, c.email, `${c.riskDays} días`])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `informe_semanal_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    onToastMessage('✓ Informe semanal exportado correctamente en formato CSV.');
  };

  const handleCampaignAction = () => {
    onNavigate('retention');
  };

  // ─── Dynamic calculations ─────────────────────────────────────────────────
  const today = getTodayISO();

  // Ticket medio real desde citas pagadas
  const paidAppts = useMemo(() => appointments.filter(a => a.status === 'Pagado'), [appointments]);
  const avgTicket = useMemo(() => {
    if (paidAppts.length === 0) return 85;
    return paidAppts.reduce((s, a) => s + (a.price || 0), 0) / paidAppts.length;
  }, [paidAppts]);

  // 1. Risk
  const riskClientsList = clients.filter(c => c.riskLevel === 'Medio' || c.riskLevel === 'Alto' || c.riskLevel === 'Crítico');
  const riskClientsCount = riskClientsList.length;

  // 2. Mensajes
  const manualSentCount = clients.reduce((accum, c) => accum + (c.whatsappLog || []).filter(m => m.sender === 'user' && m.status === 'enviado').length, 0);
  const totalSentMessages = manualSentCount;
  const manualResponsesCount = clients.reduce((accum, c) => accum + (c.whatsappLog || []).filter(m => m.sender === 'client').length, 0);
  const totalResponses = manualResponsesCount;
  // "Recuperada" = se le envió un mensaje (con fecha ISO) Y tiene cita Pagada posterior
  const totalRecoveredCitas = clients.filter(c => {
    const sentMsgs = (c.whatsappLog || []).filter(m => m.sender === 'user' && m.status === 'enviado' && m.date);
    if (sentMsgs.length === 0) return false;
    const lastSentDate = sentMsgs.map(m => m.date!).sort().at(-1)!;
    return appointments.some(a => a.clientId === c.id && a.status === 'Pagado' && a.date >= lastSentDate);
  }).length;

  const responseRate = totalSentMessages > 0 ? Math.round((totalResponses / totalSentMessages) * 100) : 0;
  const conversionRate = totalSentMessages > 0 ? Math.round((totalRecoveredCitas / totalSentMessages) * 100) : 0;

  // ROI con ticket medio real
  const estimatedROI = Math.round(totalRecoveredCitas * avgTicket);

  // ─── Notificaciones dinámicas ─────────────────────────────────────────────
  const todaysAppts = useMemo(() => appointments.filter(a => a.date === today).sort((a, b) => a.time.localeCompare(b.time)), [appointments, today]);
  const criticalClients = useMemo(() => clients.filter(c => c.riskLevel === 'Crítico'), [clients]);
  const pendingDrafts = useMemo(() => clients.filter(c => (c.whatsappLog || []).some(m => m.status === 'borrador')), [clients]);

  const notifications = useMemo(() => {
    const notifs: { icon: string; text: string; color: string; view: AppView }[] = [];
    if (todaysAppts.length > 0) notifs.push({ icon: 'calendar_today', text: `${todaysAppts.length} cita${todaysAppts.length > 1 ? 's' : ''} programada${todaysAppts.length > 1 ? 's' : ''} para hoy`, color: 'text-primary', view: 'agenda' });
    if (criticalClients.length > 0) notifs.push({ icon: 'crisis_alert', text: `${criticalClients.length} clienta${criticalClients.length > 1 ? 's' : ''} que te echa${criticalClients.length > 1 ? 'n' : 's'} de menos en nivel crítico`, color: 'text-red-600', view: 'retention' });
    if (pendingDrafts.length > 0) notifs.push({ icon: 'mark_email_unread', text: `${pendingDrafts.length} borrador${pendingDrafts.length > 1 ? 'es' : ''} pendiente${pendingDrafts.length > 1 ? 's' : ''} de envío`, color: 'text-amber-600', view: 'retention' });
    if (notifs.length === 0) notifs.push({ icon: 'check_circle', text: 'Todo al día. Sin alertas activas.', color: 'text-emerald-600', view: 'dashboard' });
    return notifs;
  }, [todaysAppts, criticalClients, pendingDrafts]);

  const recommendedActions = useMemo(() => {
    const actions: {id:string;type:'draft'|'reactivate'|'general';priority:'Crítica'|'Alta'|'Media';title:string;desc:string;buttonText:string;icon:string;onClick:()=>void}[] = [];

    const clientsWithDrafts = clients.filter(c =>
      (c.whatsappLog || []).some(m => m.status === 'borrador')
    );
    clientsWithDrafts.forEach(c => {
      actions.push({
        id: `draft-${c.id}`,
        type: 'draft',
        priority: 'Alta',
        title: `Aprobar borrador de ${c.name}`,
        desc: `Tienes una propuesta guardada lista para enviar por WhatsApp para rescatar sus visitas.`,
        buttonText: 'Completar / Enviar',
        icon: 'mark_email_unread',
        onClick: () => { onSelectClient(c.id); onNavigate('client-profile'); }
      });
    });

    [...clients]
      .filter(c => c.riskLevel === 'Crítico' || c.riskLevel === 'Alto')
      .filter(c => !clientsWithDrafts.some(d => d.id === c.id))
      .slice(0, 2)
      .forEach(c => {
        actions.push({
          id: `reactivate-${c.id}`,
          type: 'reactivate',
          priority: c.riskLevel === 'Crítico' ? 'Crítica' : 'Alta',
          title: `Reactivar a ${c.name}`,
          desc: `Lleva ${c.riskDays} días inactiva. Nuestro sistema sugiere obsequiarle un "${c.suggestedOfferTitle || 'un detalle especial'}".`,
          buttonText: 'Ayuda para escribir el mensaje',
          icon: 'magic_button',
          onClick: () => { onSelectClient(c.id); onNavigate('message-editor'); }
        });
      });

    if (actions.length < 3) {
      actions.push({
        id: 'review-thresholds',
        type: 'general',
        priority: 'Media',
        title: 'Revisar configuración de alertas',
        desc: 'Revisa cuántos días sin venir activan una alerta en tu Configuración.',
        buttonText: 'Ir a Configuración',
        icon: 'settings',
        onClick: () => onNavigate('settings')
      });
    }
    return actions;
  // ponytail: onSelectClient/onNavigate are stable refs from App; clients is the only volatile dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  // Activity Timeline — 100% dinámico, sin hardcoding
  const recentActivities = useMemo(() => {
    const acts: { id: string; title: string; time: string; dateLabel: string; desc: string; icon: string; badge: string; badgeStyle: string; sortKey: string }[] = [];
    // WhatsApp log events
    clients.forEach(c => {
      (c.whatsappLog || []).forEach(e => {
        acts.push({
          id: e.id,
          title: e.status === 'borrador' ? `Borrador guardado para ${c.name}` : `Mensaje enviado a ${c.name}`,
          time: e.timestamp ? new Date(e.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '',
          dateLabel: e.dateLabel || 'Reciente',
          desc: `"${e.text.substring(0, 80)}${e.text.length > 80 ? '...' : ''}"`,
          icon: e.status === 'borrador' ? 'save' : 'outgoing_mail',
          badge: e.status === 'borrador' ? 'Borrador' : 'Enviado',
          badgeStyle: e.status === 'borrador' ? 'bg-[#FCF8F2] text-[#8c6d7a] border-[#bfa982]/20' : 'bg-emerald-50 text-emerald-800 border-emerald-100',
          // ponytail: timestamp is HH:MM display only; date+timestamp gives a sortable YYYY-MM-DDTHH:MM key
          sortKey: (e.date || '') + 'T' + (e.timestamp || '')
        });
      });
    });
    // Paid appointments today
    appointments.filter(a => a.date === today && a.status === 'Pagado').forEach(a => {
      acts.push({
        id: `paid-${a.id}`,
        title: `Cita completada · ${a.clientName}`,
        time: a.time,
        dateLabel: 'Hoy',
        desc: `${a.serviceName} con ${a.staffName} · ${a.price ? `${a.price}€` : ''}`,
        icon: 'check_circle',
        badge: 'Pago Registrado',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-100',
        sortKey: today + 'T' + a.time
      });
    });
    // New critical risk clients
    clients.filter(c => c.riskLevel === 'Crítico').slice(0, 2).forEach(c => {
      acts.push({
        id: `risk-${c.id}`,
        title: `Alerta: ${c.name} superó ciclo de retención`,
        time: '',
        dateLabel: 'Hoy',
        desc: `${c.riskDays} días sin visita. Nivel de riesgo de mimo escalado a Crítico automáticamente.`,
        icon: 'warning',
        badge: 'Fuga Potencial',
        badgeStyle: 'bg-red-50 text-red-800 border-red-100',
        sortKey: ''
      });
    });
    return acts.sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 5);
  }, [clients, appointments, today]);

  // Campaña contextual basada en datos reales
  const campaignContext = useMemo(() => {
    const highRiskCount = clients.filter(c => c.riskLevel === 'Alto' || c.riskLevel === 'Crítico').length;
    const topService = (() => {
      const map: Record<string, number> = {};
      appointments.forEach(a => { map[a.serviceName] = (map[a.serviceName] || 0) + 1; });
      return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || 'tratamientos exclusivos';
    })();
    const monthName = new Date().toLocaleString('es-ES', { month: 'long' });
    const estimatedGain = Math.round(highRiskCount * avgTicket * 0.35);
    return { highRiskCount, topService, monthName, estimatedGain };
  }, [clients, appointments, avgTicket]);

  const fullTimeline = recentActivities;

  return (
    <div className="flex-1 pb-16">
      
      {/* Search and Top Bar */}
      <div className="flex justify-between items-center h-20 mb-8 border-b border-primary/5">
        <div className="flex-1 max-w-md text-left">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60">search</span>
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar clientas, teléfono..."
              value={searchValue}
              onChange={e => setSearchValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && searchValue.trim()) {
                  handleSearch(searchValue.trim());
                  setSearchValue('');
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-border rounded-full text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all duration-300 shadow-sm text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 text-on-surface-variant">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(p => !p)}
              className="hover:text-primary transition-colors relative cursor-pointer"
            >
              <span className="material-symbols-outlined text-2xl">notifications</span>
              {notifications.some(n => n.color !== 'text-emerald-600') && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-error rounded-full ring-2 ring-background" />
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-10 w-72 bg-white border border-border rounded-2xl shadow-xl z-50 p-3 space-y-1 animate-scale-up">
                <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant px-2 mb-2">Notificaciones</p>
                {notifications.map((n, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowNotifications(false); onNavigate(n.view); }}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-surface-container-low text-left cursor-pointer transition-colors"
                  >
                    <span className={`material-symbols-outlined text-base mt-0.5 ${n.color}`}>{n.icon}</span>
                    <span className="text-xs font-medium text-on-surface">{n.text}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('retention')}
            className="hover:text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">mail</span>
          </button>
        </div>
      </div>

      {/* Greeting block */}
      <div className="mb-10 text-left flex justify-between items-end">
        <div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-1">
            {isBeginnerMode ? "Tu panel" : "Panel del salón"}
          </h2>
          <p className="text-base text-muted-foreground font-medium font-sans">
            {isBeginnerMode
              ? "Vista simplificada activa. Sigue tu agenda y cuida a tus clientas."
              : "Sigue la actividad real de tu agenda, clientas y mensajes."}
          </p>
        </div>
      </div>

      {/* ─── NIVEL 1: EL CORAZÓN DE LA RETENCIÓN (MIMO URGENTE) ─── */}
      {(() => {
        const sortedClients = [...clients].sort((a, b) => {
          const riskOrder = { 'Crítico': 4, 'Alto': 3, 'Medio': 2, 'Bajo': 1 };
          const aRisk = riskOrder[a.riskLevel] || 0;
          const bRisk = riskOrder[b.riskLevel] || 0;
          if (bRisk !== aRisk) return bRisk - aRisk;
          return (b.riskDays || 0) - (a.riskDays || 0);
        });
        const urgentClient = sortedClients[0];

        if (!urgentClient) return null;

        return (
          <div className="mb-10 bg-gradient-to-br from-[#faf6f0] to-[#fcfaf7] border border-[#bfa982]/32 rounded-3xl p-8 shadow-[rgba(74,44,64,0.01)_0px_8px_24px] flex flex-col md:flex-row items-center gap-8 text-left transition-all duration-300 hover:shadow-[rgba(74,44,64,0.03)_0px_12px_32px]">
            {/* Client picture / avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-2 border-[#bfa982]/40 shadow-inner bg-white flex items-center justify-center">
                {urgentClient.avatar ? (
                  <img src={urgentClient.avatar} alt={urgentClient.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-4xl text-muted-foreground/40">person</span>
                )}
              </div>
              <span className="absolute -bottom-1 -right-1 w-7 h-7 bg-red-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow" title="Alerta Crítica">
                <span className="material-symbols-outlined text-xs font-bold">crisis_alert</span>
              </span>
            </div>

            {/* Main Content */}
            <div className="flex-1 space-y-4 font-sans">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#8c6d7a] bg-[#ebdcc9]/40 border border-[#bfa982]/30 px-3 py-1 rounded-full tracking-wider inline-block mb-2 select-none">
                  Atención Urgente ✦
                </span>
                <h3 className="font-serif text-3xl font-bold text-primary mb-1">¡Elena te susurra un secreto!</h3>
                <p className="text-sm text-on-surface-variant font-medium leading-relaxed font-serif italic max-w-2xl">
                  <strong className="text-primary text-base not-italic font-sans">{urgentClient.name}</strong> lleva{' '}
                  <strong className="text-red-700 font-sans">{urgentClient.riskDays} días</strong> sin visitarte. Su tratamiento favorito fue{' '}
                  <strong className="text-primary not-italic font-sans">
                    {urgentClient.favoriteServices?.[0]?.name || urgentClient.lastVisitService || 'Servicio de Autor'}
                  </strong>.{' '}
                  ¿La mimamos con un mensaje especial desde el asistente?
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    onSelectClient(urgentClient.id);
                    onNavigate('message-editor');
                  }}
                  className="bg-[#4A2C40] hover:bg-[#2E1927] text-[#fdf6ec] py-3.5 px-7 text-xs font-bold rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">auto_awesome</span>
                  <span>Escribir mensaje para {urgentClient.name} ✨</span>
                </button>
                <span className="text-xs font-semibold text-[#8c6d7a] bg-[#faf6f0] border border-[#bfa982]/20 px-3 py-2.5 rounded-xl font-mono select-none">
                  Dinero que puedes recuperar: +{Math.round(urgentClient.spendingLtv / (urgentClient.totalVisits || 1) || avgTicket)}€ esta semana
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─── NIVEL 2: EL PULSO DEL NEGOCIO (ROI & AGENDA PRÓXIMA) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10 items-stretch">
        
        {/* ROI Widget ("Dinero que Elena te ha ayudado a recuperar") */}
        <div className="lg:col-span-5 bg-white p-8 rounded-3xl border border-muted shadow-sm flex flex-col justify-between text-left">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-primary">Dinero que has recuperado</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 font-sans">Dinero de clientas recuperadas</p>
              </div>
              <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-2 rounded-xl font-bold text-lg select-none">trending_up</span>
            </div>

            <div className="mb-6 flex items-baseline gap-2.5 font-sans">
              <span className="font-serif text-5xl font-extrabold text-primary">{estimatedROI.toLocaleString('es-ES')}€</span>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Dinero recuperado
              </span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed font-sans">
              Calculado en base a <strong>{totalRecoveredCitas} citas recuperadas</strong> con un ticket medio de <strong>{avgTicket.toFixed(0)}€</strong> en tu salón.
            </p>

            {/* Dynamic SVG Sparkline */}
            <div className="mt-6 h-12 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                <path
                  d="M0,18 C15,18 20,8 35,11 C50,14 60,3 75,5 C90,7 95,2 100,1 L100,20 L0,20 Z"
                  fill="url(#sparkline-grad)"
                  opacity="0.12"
                />
                <path
                  d="M0,18 C15,18 20,8 35,11 C50,14 60,3 75,5 C90,7 95,2 100,1"
                  fill="none"
                  stroke="#4A2C40"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4A2C40" />
                    <stop offset="100%" stopColor="#FAF6F0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-light-divider flex justify-between items-center text-[10px] text-muted-foreground font-semibold font-sans">
            <span>Tasa de respuesta: {conversionRate}%</span>
            <span>{totalRecoveredCitas} clientas rescatadas</span>
          </div>
        </div>

        {/* Embudo de recuperación */}
        <div className="lg:col-span-7 bg-white p-8 rounded-3xl border border-muted shadow-sm flex flex-col justify-between text-left">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-serif text-xl font-bold text-primary">Embudo de Recuperación</h3>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1 font-sans">De mensaje a cita pagada</p>
              </div>
              <button onClick={handleExportWeekly} className="text-[10px] font-sans font-bold uppercase tracking-wider text-primary/40 border border-primary/15 px-3 py-1.5 rounded-lg hover:border-primary/40 hover:text-primary transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">summarize</span>
                CSV
              </button>
            </div>
            <div className="flex items-end gap-0 mt-2">
              {[
                { label: 'Mensajes enviados', value: totalSentMessages, color: 'bg-primary', pct: 100 },
                { label: 'Respuestas recibidas', value: totalResponses, color: 'bg-[#c9a9b5]', pct: totalSentMessages > 0 ? Math.round((totalResponses / totalSentMessages) * 100) : 0 },
                { label: 'Citas recuperadas', value: totalRecoveredCitas, color: 'bg-emerald-500', pct: totalSentMessages > 0 ? Math.round((totalRecoveredCitas / totalSentMessages) * 100) : 0 },
              ].map((step, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 font-sans relative">
                  {i > 0 && <div className="absolute left-0 top-1/2 -translate-y-8 w-px h-8 bg-muted" />}
                  <span className="font-serif text-3xl font-bold text-primary">{step.value}</span>
                  <div className="w-full px-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${step.pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground text-center px-1">{step.label}</span>
                  {i > 0 && <span className="text-[9px] font-bold text-primary/50">{step.pct}%</span>}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-light-divider flex justify-between items-center font-sans">
            <span className="text-[10px] text-outline font-medium">Ticket medio: {avgTicket.toFixed(0)}€ · ROI estimado: {estimatedROI.toLocaleString('es-ES')}€</span>
            <button onClick={() => onNavigate('retention')} className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
              Ver clientas <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>

      </div>

      {/* ─── NIVEL 3: EL BACKSTAGE (SOPORTE Y ACTIVACIÓN CEBOLLA) ─── */}
      {isBeginnerMode ? (
        <div className="space-y-8 font-sans">
          
          {/* Métricas de Mimo (Soporte Operativo) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            <div className="bg-white p-5 rounded-2xl border border-muted shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-2">Mensajes de Reencuentro</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-primary">{totalSentMessages}</span>
                <span className="text-[10px] bg-green-50 text-green-800 px-2 py-0.5 rounded font-bold border border-green-100">Enviados</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-muted shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-2">Respuestas de Clientas</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-primary">{totalResponses}</span>
                <span className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-100">{responseRate}% respuesta</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-muted shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-2">Citas de Retorno</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-primary">{totalRecoveredCitas}</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold border border-emerald-100">{conversionRate}% efectividad</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-muted shadow-sm flex flex-col justify-between">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block mb-2">Clientas que te echan de menos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-red-600">{riskClientsCount}</span>
                <span className="text-[10px] bg-red-50 text-red-800 px-2 py-0.5 rounded font-bold border border-red-100">Atención</span>
              </div>
            </div>
          </div>

          {/* QW-8: herramientas avanzadas colapsadas al final — no compite con la acción primaria */}
          <details className="group mb-6">
            <summary className="flex items-center justify-between cursor-pointer list-none bg-gradient-to-r from-[#faf8f4] to-[#f5f1e9] border border-[#bfa982]/32 px-5 py-3.5 rounded-2xl text-sm font-bold text-primary select-none">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Activar herramientas avanzadas
              </span>
              <span className="material-symbols-outlined text-base transition-transform group-open:rotate-180">expand_more</span>
            </summary>
            <div className="mt-2 bg-[#faf8f4] border border-[#bfa982]/20 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <p className="text-xs text-on-surface-variant max-w-2xl leading-relaxed font-sans">
                Cuando estés lista, activa las herramientas avanzadas de Inventario, Facturación mensual y Gestión de equipo.
              </p>
              <button
                onClick={() => {
                  if (onUpdateConfig) onUpdateConfig({ isBeginnerMode: false });
                  onToastMessage('✓ ¡Felicidades! Has activado todas las herramientas de Elena.');
                }}
                className="bg-primary hover:bg-[#4a2c40] text-on-primary py-2.5 px-5 text-xs font-bold rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
              >
                <span>Activar ahora</span>
                <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
              </button>
            </div>
          </details>
        </div>
      ) : (
        /* Full Suite Advanced Views and Widgets (Fases 2 y 3) */
        <div className="space-y-12 font-sans">
          {/* Metrics Matrix 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Card 1: Risk Clients */}
            <div 
              onClick={() => onNavigate('retention')}
              className="bg-white p-6 rounded-xl border border-muted flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 font-sans">Clientas en Riesgo</span>
                  <h4 className="font-serif text-xl font-bold text-primary">Clientas que te echan de menos</h4>
                </div>
                <span className="p-2.5 rounded-lg bg-red-100 text-red-800 font-extrabold text-xs">
                  {riskClientsCount}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm font-bold text-red-600 animate-pulse">crisis_alert</span>
                <span className="text-[11.5px] font-bold text-muted-foreground leading-none">
                  {clients.filter(c => c.riskLevel === 'Crítico').length} en nivel Crítico
                </span>
              </div>
            </div>

            {/* Card 2: Messages Copilot */}
            <div 
              onClick={() => onNavigate('retention')}
              className="bg-white p-6 rounded-xl border border-muted flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 font-sans">Asistente de mensajes</span>
                  <h4 className="font-serif text-xl font-bold text-primary">Mensajes Enviados</h4>
                </div>
                <span className="p-2.5 rounded-lg bg-secondary text-primary font-extrabold text-xs">
                  {totalSentMessages}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11.5px] font-bold text-muted-foreground">
                <span>Tasa de respuesta</span>
                <span className="text-[10px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded border border-green-200">{responseRate}% contestaron</span>
              </div>
            </div>

            {/* Card 3: Responses count */}
            <div 
              onClick={() => onNavigate('retention')}
              className="bg-white p-6 rounded-xl border border-muted flex flex-col justify-between transition-all duration-200 hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1 font-sans">Interacción Digital</span>
                  <h4 className="font-serif text-xl font-bold text-primary">Respuestas de Clienta</h4>
                </div>
                <span className="p-2.5 rounded-lg bg-orange-100 text-orange-900 font-extrabold text-xs">
                  {totalResponses}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm font-bold text-green-700">reviews</span>
                <span className="text-[11.5px] font-bold text-muted-foreground leading-none">
                  Tasa de respuesta de <strong>{responseRate}%</strong>
                </span>
              </div>
            </div>

            {/* Card 4: Action CTR */}
            <div 
              onClick={() => onNavigate('retention')}
              className="bg-[#fcfaf7] p-6 rounded-xl border border-muted flex flex-col justify-between transition-all duration-200 hover:bg-[#ebdcc9]/20 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#bfa982] block mb-1 font-sans">Eficiencia de Retorno</span>
                  <h4 className="font-serif text-xl font-bold text-primary">Citas de Retorno</h4>
                </div>
                <span className="p-2.5 rounded-lg bg-[#ebdcc9] text-primary font-extrabold text-xs">
                  {totalRecoveredCitas}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-primary">
                <span>Convertir fuga en facturación</span>
                <span className="material-symbols-outlined text-xs font-bold">arrow_forward</span>
              </div>
            </div>
          </div>

          {/* Main Core Viewport Elements: 2 columns layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Recommended Actions Today block */}
            <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-xl border border-muted shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-primary leading-none">Acciones Recomendadas Hoy</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">Lo más importante que puedes hacer hoy en tu salón.</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#8c6d7a] bg-secondary/15 border border-[#bfa982]/30 px-3 py-1 rounded-full shrink-0 select-none font-sans">
                    Monitor Alerta
                  </span>
                </div>

                <div className="space-y-4">
                  {recommendedActions.map((action) => {
                    const priorityBadgeStyle = 
                      action.priority === 'Crítica'
                        ? 'bg-red-100 text-red-800 border-red-200'
                        : action.priority === 'Alta'
                        ? 'bg-orange-100 text-orange-900 border-orange-200'
                        : 'bg-[#bfa982]/10 text-primary border-[#bfa982]/20';

                    return (
                      <div 
                        key={action.id} 
                        className="p-4 bg-[#fcfaf7] hover:bg-[#ebdcc9]/10 border border-muted rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start gap-3.5 flex-1">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary shrink-0 select-none border border-primary/10">
                            <span className="material-symbols-outlined text-lg font-bold">{action.icon}</span>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-bold text-primary">{action.title}</h4>
                              <span className={`text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${priorityBadgeStyle}`}>
                                {action.priority}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-on-surface-variant leading-relaxed">
                              {action.desc}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={action.onClick}
                          className="py-2 px-4 shadow-sm border border-primary text-primary hover:bg-primary hover:text-on-primary text-[11px] font-bold rounded-xl transition-all self-end sm:self-center whitespace-nowrap cursor-pointer"
                        >
                          {action.buttonText}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-outline-variant/15 flex flex-col sm:flex-row justify-between items-center gap-3">
                <span className="text-[10px] text-outline font-semibold">El asistente de mensajes actualiza las alertas cada 24 horas</span>
                <button
                  onClick={() => onNavigate('retention')}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver todas las clientas en riesgo</span>
                  <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Agenda de hoy */}
            <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-xl border border-muted shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-2xl font-bold text-primary font-sans">Agenda de Hoy</h3>
                        <p className="text-xs text-muted-foreground mt-1.5 font-medium">Tratamientos asignados para hoy en el salón.</p>
                  </div>
                  <a 
                    href="#agenda" 
                    onClick={(e) => { e.preventDefault(); onNavigate('agenda'); }}
                    className="text-[11px] font-bold text-primary hover:underline underline-offset-4 cursor-pointer"
                  >
                    Ver toda
                  </a>
                </div>

                <div className="space-y-1">
                  {(() => {
                    const today = getTodayISO();
                    const todaysAppts = (appointments || [])
                      .filter(item => item.date === today)
                      .sort((a, b) => a.time.localeCompare(b.time));

                    if (todaysAppts.length === 0) {
                      return (
                        <div className="p-8 text-center bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/30 font-sans my-4">
                          <span className="material-symbols-outlined text-outline text-2xl mb-1 mt-1">calendar_today</span>
                          <p className="text-xs font-bold text-primary mb-0.5">Sin citas para hoy</p>
                          <p className="text-[10px] text-outline">No hay tratamientos agendados para este día.</p>
                        </div>
                      );
                    }

                    return todaysAppts.map((item) => {
                      const dotColor = item.status === 'Pagado' ? 'bg-emerald-600' : item.status === 'Cancelado' ? 'bg-rose-500' : 'bg-amber-500';
                      return (
                        <div 
                          key={item.id} 
                          className="py-3 border-b border-light-divider flex items-start gap-4 hover:bg-[#faf8f4] cursor-pointer"
                          onClick={() => onNavigate('agenda')}
                        >
                          <div className="flex flex-col items-center min-w-[50px] pt-1">
                            <span className="text-xs font-bold text-on-surface-variant font-mono">{item.time}</span>
                            <span className={`w-1.5 h-1.5 rounded-full ${dotColor} mt-1.5`}></span>
                          </div>
                          <div className="flex-1 text-left">
                            <h4 className="text-xs font-bold text-primary leading-none">{item.clientName}</h4>
                            <p className="text-[11px] text-on-surface-variant mt-1">{item.serviceName}</p>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <p className="text-xs text-outline font-medium italic text-center mt-6">Tus citas siempre al día.</p>
            </div>

          </div>

          {/* Recommended Campaigns Banner */}
          <div className="bg-gradient-to-r from-[#faf8f4] to-[#f5f1e9] border border-[#bfa982]/32 p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-6 text-left shadow-sm">
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary font-bold">crisis_alert</span>
                <h4 className="font-serif text-lg font-bold text-primary">Atención Temprana de Fuga de Clientes</h4>
              </div>
              <p className="text-[11.5px] text-on-surface-variant max-w-2xl leading-relaxed">
                Tienes <strong className="text-primary">{riskClientsCount} clientas</strong> que llevan demasiado tiempo sin venir. Cada día que pasa es más difícil recuperarlas.
              </p>
            </div>
            
            <button
              onClick={() => onNavigate('retention')}
              className="bg-primary hover:bg-[#4a2c40] text-on-primary py-3 px-6 text-xs font-bold rounded-xl transition-all shadow shrink-0 whitespace-nowrap cursor-pointer flex items-center gap-1.5"
            >
              <span>Revisar Clientas & Lanzar Rescate</span>
              <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
            </button>
          </div>

          {/* Bottom section: Recent Activity Timeline & Campaigns recommendation */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            
            {/* Timeline (left column) */}
            <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-xl border border-muted shadow-sm text-left flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-xl font-bold text-primary">Historial de Actividad Reciente</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 font-medium">Registro de operaciones comerciales y auditorías de comunicación.</p>
                  </div>
                  <span className="material-symbols-outlined text-outline select-none">timeline</span>
                </div>

                <div className="relative border-l border-outline-variant/30 ml-4.5 space-y-6 pt-2 pb-2">
                  {fullTimeline.map((item, index) => (
                    <div key={item.id || index} className="relative pl-7 group">
                      {/* Visual marker dot */}
                      <div className="absolute left-[-6px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-primary group-hover:bg-primary transition-all z-10 shadow-sm"></div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-primary leading-tight">{item.title}</h4>
                          <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border leading-none ${item.badgeStyle}`}>
                            {item.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-outline font-semibold xl:text-right shrink-0 font-mono">
                          {item.time} ({item.dateLabel})
                        </span>
                      </div>

                      <p className="text-[11.5px] text-on-surface-variant mt-1.5 leading-relaxed font-serif italic text-left">
                        {item.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-outline-variant/10 pt-4 mt-6 text-center">
                <span className="text-[9.5px] text-outline text-left block">Actividad sincronizada con tu cuenta</span>
              </div>
            </div>

            {/* AI Purple Campaign banner */}
            <div className="lg:col-span-5 bg-primary text-on-primary p-6 md:p-8 rounded-3xl ambient-shadow relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="absolute top-0 right-0 w-44 h-44 bg-primary-fixed rounded-full opacity-10 blur-2xl" />
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-[#fdf6ec] font-bold text-xl select-none">auto_awesome</span>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#fdf6ec] opacity-85">Asistente de mensajes</h3>
                </div>
                <h4 className="font-serif text-2xl font-semibold leading-tight mb-3">
                  Recupera a tus {campaignContext.highRiskCount} clientas de alto riesgo en {campaignContext.monthName}
                </h4>
                <p className="text-[11.5px] text-[#f5ebd7]/90 leading-relaxed max-w-md font-sans">
                  Nuestro sistema detecta {campaignContext.highRiskCount} clientas que llevan tiempo sin venir. Si las contactas esta semana con una propuesta de
                  {' '}<strong>{campaignContext.topService}</strong>, el dinero que puedes recuperar ronda los{' '}
                  <strong>{campaignContext.estimatedGain.toLocaleString('es-ES')}€</strong>.
                </p>
              </div>
              <div className="mt-6 text-left">
                <button
                  id="btn-campaign-view"
                  onClick={handleCampaignAction}
                  className="bg-[#fdf6ec] text-[#4A2C40] px-5 py-3 rounded-xl font-bold text-xs hover:bg-surface-container-low transition-all cursor-pointer inline-flex items-center gap-2 shadow-sm"
                >
                  <span>Revisar clientas que te echan de menos</span>
                  <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
