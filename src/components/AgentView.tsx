import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';
type Panel = 'chat' | 'campaign' | 'analyze' | 'settings';

// Categorías de ausencia detectadas por el agente
type AbsenceReason = 'economia' | 'competencia' | 'autoservicio' | 'tiempo' | 'personal' | null;

const ABSENCE_META: Record<NonNullable<AbsenceReason>, { label: string; action: string; color: string }> = {
  economia:     { label: 'Economía',     action: 'Lanzar oferta especial',    color: 'text-amber-700 border-amber-300' },
  competencia:  { label: 'Competencia',  action: 'Enviar propuesta de valor', color: 'text-violet-700 border-violet-300' },
  autoservicio: { label: 'Autoservicio', action: 'Destacar diferencial',      color: 'text-sky-700 border-sky-300' },
  tiempo:       { label: 'Sin tiempo',   action: 'Recordar en 2 semanas',     color: 'text-blue-700 border-blue-300' },
  personal:     { label: 'Situación personal', action: 'Dar espacio — seguimiento en 30d', color: 'text-[#062d32]/50 border-[#062d32]/15' },
};

const STATUS_LABEL: Record<AgentCampaignStatus, string> = {
  pendiente: 'Por enviar', enviado: 'Esperando', respondido: 'Respondió',
  reservado: 'Reservado', rechazado: 'Descartado', sin_respuesta: 'Sin respuesta',
};

// Prioridad para ordenar la lista
const STATUS_PRIORITY: Record<AgentCampaignStatus, number> = {
  respondido: 0, pendiente: 1, enviado: 2,
  sin_respuesta: 3, reservado: 4, rechazado: 5,
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false, autoSend: false, scanIntervalHours: 24,
  minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10,
};

interface DemoCampaign extends AgentCampaign { absenceReason?: AbsenceReason }

const DEMO_CAMPAIGNS: DemoCampaign[] = [
  {
    id: 'd1', tenantId: 'demo', clientId: 'carmen-ruiz',
    clientName: 'Carmen Ruiz', clientPhone: '666 111 222',
    riskLevel: 'Crítico', riskDays: 155, suggestedService: 'Mechas Californianas',
    message: '¡Hola Carmen! Te echamos de menos 💙 Han pasado 5 meses desde tus últimas mechas. ¿Te busco un hueco esta semana?',
    status: 'respondido', autoSend: false, absenceReason: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 90 * 60000).toISOString(),
    repliedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastReply: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?',
    conversationLog: [
      { role: 'agent', text: '¡Hola Carmen! Te echamos de menos 💙 Han pasado 5 meses desde tus últimas mechas. ¿Te busco un hueco esta semana?', timestamp: new Date(Date.now() - 90 * 60000).toISOString() },
      { role: 'client', text: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
  },
  {
    id: 'd2', tenantId: 'demo', clientId: 'sofia-martin',
    clientName: 'Sofía Martín', clientPhone: '666 333 444',
    riskLevel: 'Alto', riskDays: 75, suggestedService: 'Keratina Brasileña',
    message: 'Hola Sofía, ¡qué tal el verano! Llevas 75 días sin tu keratina ¿quieres que reservemos?',
    status: 'pendiente', autoSend: false, absenceReason: null,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    conversationLog: [
      { role: 'agent', text: 'Hola Sofía, ¡qué tal el verano! Llevas 75 días sin tu keratina ¿quieres que reservemos?', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
  },
  {
    id: 'd3', tenantId: 'demo', clientId: 'lucia-gomez',
    clientName: 'Lucía Gómez', clientPhone: '666 555 666',
    riskLevel: 'Crítico', riskDays: 200, suggestedService: 'Coloración',
    message: '¡Hola Lucía! Esta semana tenemos hueco. ¿Te cuento las novedades?',
    status: 'reservado', autoSend: true, absenceReason: null,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    repliedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    lastReply: 'El viernes a las 10 me va genial',
    conversationLog: [
      { role: 'agent', text: '¡Hola Lucía! Esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 23 * 3600000).toISOString() },
      { role: 'client', text: '¿Tenéis el viernes?', timestamp: new Date(Date.now() - 21 * 3600000).toISOString() },
      { role: 'agent', text: 'El viernes a las 10:00, 11:30 o 16:00. ¿Cuál te viene mejor?', timestamp: new Date(Date.now() - 21 * 3600000 + 60000).toISOString() },
      { role: 'client', text: 'El viernes a las 10 me va genial', timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
      { role: 'agent', text: '¡Anotado! Lucía, el viernes a las 10:00 para Coloración. Te esperamos 💙', timestamp: new Date(Date.now() - 20 * 3600000 + 30000).toISOString() },
    ],
  },
  {
    id: 'd4', tenantId: 'demo', clientId: 'marta-ig',
    clientName: 'Marta Iglesias', clientPhone: '666 777 888',
    riskLevel: 'Alto', riskDays: 45, suggestedService: 'Manicura Semipermanente',
    message: '¡Hola Marta! Ya va siendo hora de mimar esas manos 💅 ¿Te apetece esta semana?',
    status: 'enviado', autoSend: true, absenceReason: null,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    conversationLog: [
      { role: 'agent', text: '¡Hola Marta! Ya va siendo hora de mimar esas manos 💅 ¿Te apetece esta semana?', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
    ],
  },
  {
    id: 'd5', tenantId: 'demo', clientId: 'ana-torres',
    clientName: 'Ana Torres', clientPhone: '666 888 999',
    riskLevel: 'Crítico', riskDays: 120, suggestedService: 'Tinte',
    message: '¡Hola Ana! Hace 4 meses que no sabemos de ti. ¿Todo bien?',
    status: 'respondido', autoSend: false, absenceReason: 'economia',
    createdAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    repliedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    lastReply: 'Hola, sí, la verdad es que ahora mismo no puedo permitirme ir al salón...',
    conversationLog: [
      { role: 'agent', text: '¡Hola Ana! Hace 4 meses que no sabemos de ti. ¿Todo bien?', timestamp: new Date(Date.now() - 4 * 3600000).toISOString() },
      { role: 'client', text: 'Hola, sí, la verdad es que ahora mismo no puedo permitirme ir al salón...', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
      { role: 'agent', text: 'Entendemos perfectamente, Ana. No te preocupes — aquí estaremos cuando puedas. ¿Te puedo avisar si tenemos alguna promoción especial?', timestamp: new Date(Date.now() - 2 * 3600000 + 30000).toISOString() },
    ],
  },
];

// Clientes en riesgo para la vista de análisis
const DEMO_AT_RISK = [
  { id: 'r1', name: 'Patricia Vega', days: 95, service: 'Balayage', risk: 'Alto' },
  { id: 'r2', name: 'Cristina Mora', days: 180, service: 'Coloración', risk: 'Crítico' },
  { id: 'r3', name: 'Laura Blanco', days: 62, service: 'Corte', risk: 'Medio' },
  { id: 'r4', name: 'Elena Jiménez', days: 210, service: 'Keratina', risk: 'Crítico' },
  { id: 'r5', name: 'Rosa Cano', days: 88, service: 'Manicura', risk: 'Alto' },
];

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Dot de estado semántico
function StatusDot({ status }: { status: AgentCampaignStatus }) {
  const colors: Record<AgentCampaignStatus, string> = {
    pendiente: 'bg-amber-400', enviado: 'bg-sky-400', respondido: 'bg-violet-500',
    reservado: 'bg-emerald-500', rechazado: 'bg-[#062d32]/20', sin_respuesta: 'bg-red-400',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${colors[status]}`} />;
}

export default function AgentView({ onToastMessage, getAuthToken, isDemoMode = false, tenantSlug }: AgentViewProps) {
  const [campaigns, setCampaigns] = useState<DemoCampaign[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<DemoCampaign | null>(null);
  const [panel, setPanel] = useState<Panel>('chat');
  const [waStatus, setWAStatus] = useState<WAStatus>('disconnected');
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waPhone, setWAPhone] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');

  // Campaign panel state
  const [campText, setCampText] = useState('');
  const [campRefined, setCampRefined] = useState('');
  const [campRefining, setCampRefining] = useState(false);

  // Analyze panel state
  const [atRiskSelected, setAtRiskSelected] = useState<Set<string>>(new Set());

  const waSSERef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = await getAuthToken();
    return fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  }, [getAuthToken]);

  const loadData = useCallback(async () => {
    if (isDemoMode) { setCampaigns(DEMO_CAMPAIGNS); setConfig({ ...DEFAULT_CONFIG, enabled: true }); return; }
    setLoading(true);
    try {
      const [cr, cfr] = await Promise.all([authFetch('/api/agent/campaigns'), authFetch('/api/agent/config')]);
      if (cr.ok) setCampaigns(await cr.json());
      if (cfr.ok) setConfig(await cfr.json());
    } catch { onToastMessage('Error cargando datos.'); }
    finally { setLoading(false); }
  }, [isDemoMode, authFetch, onToastMessage]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (isDemoMode) { setWAStatus('connected'); setWAPhone('34666123456'); return; }
    const go = async () => {
      const token = await getAuthToken();
      if (!token) return;
      const es = new EventSource(`/api/agent/wa-status?token=${token}`);
      es.onmessage = e => { const d = JSON.parse(e.data); setWAStatus(d.status); setWAPhone(d.phone ?? null); setWAQR(d.qr ?? null); };
      waSSERef.current = es;
    };
    go();
    return () => waSSERef.current?.close();
  }, [isDemoMode, getAuthToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.conversationLog?.length]);

  const handleApprove = (c: DemoCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'enviado', sentAt: new Date().toISOString() } : x));
      setSelected(prev => prev?.id === c.id ? { ...prev, status: 'enviado' } : prev);
      onToastMessage(`✓ Mensaje enviado a ${c.clientName}.`);
    }
  };

  const handleReject = (c: DemoCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rechazado' } : x));
      setSelected(null);
    }
  };

  const saveConfig = async (patch: Partial<AgentConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (!isDemoMode) {
      try { await authFetch('/api/agent/config', { method: 'PUT', body: JSON.stringify(next) }); }
      catch { onToastMessage('Error guardando.'); }
    }
  };

  const refineCampaign = async () => {
    if (!campText.trim()) return;
    setCampRefining(true);
    // Demo: simula refinamiento con IA
    await new Promise(r => setTimeout(r, 1200));
    setCampRefined(`✨ ${campText.trim()} — Esta semana en el salón tenemos hueco especial para ti. ¡Escríbenos y lo reservamos!`);
    setCampRefining(false);
  };

  const sendCampaign = () => {
    onToastMessage(`✓ Campaña enviada a ${campaigns.length} clientes.`);
    setCampText(''); setCampRefined(''); setPanel('chat');
  };

  // Ordenar: respondido → pendiente → enviado → sin_respuesta → reservado → rechazado
  const sorted = [...campaigns].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);

  // Grupos para separadores en la lista
  const active = sorted.filter(c => ['respondido', 'pendiente'].includes(c.status));
  const waiting = sorted.filter(c => ['enviado', 'sin_respuesta'].includes(c.status));
  const closed = sorted.filter(c => ['reservado', 'rechazado'].includes(c.status));

  const handleWAConnect = async () => {
    if (isDemoMode) { onToastMessage('Demo: escanea el QR en tu móvil.'); return; }
    try { await authFetch('/api/agent/wa-connect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const handleWADisconnect = async () => {
    if (isDemoMode) { setWAStatus('disconnected'); setWAPhone(null); return; }
    try { await authFetch('/api/agent/wa-disconnect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  return (
    <div className="flex gap-5 min-h-0" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ── Columna izquierda: conexión + lista ─────────────────────────────── */}
      <div className="w-64 flex-shrink-0 flex flex-col gap-3 min-h-0">

        {/* Estado WA */}
        <div className="bg-white border border-[#062d32]/10 px-4 py-3 flex-shrink-0">
          {waStatus === 'connected' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-sans text-[#062d32]/60 leading-none">+{waPhone}</span>
              </div>
              <button onClick={handleWADisconnect}
                className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35 hover:text-red-500 transition-colors">
                Desconectar
              </button>
            </div>
          ) : waStatus === 'qr' && waQR ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <img src={waQR} alt="QR" className="w-28 h-28 border border-[#062d32]/10" />
              <p className="text-[9px] text-center font-sans text-[#062d32]/40 leading-relaxed">
                WhatsApp → Dispositivos vinculados → Vincular
              </p>
            </div>
          ) : (
            <button onClick={handleWAConnect}
              className="w-full flex items-center justify-center gap-2 border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider py-2 hover:bg-[#062d32] hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              {waStatus === 'connecting' ? 'Conectando…' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 bg-white border border-[#062d32]/10 overflow-y-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-[#062d32]/20">sync</span>
            </div>
          )}

          {/* Acción requerida */}
          {active.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1.5">
                <span className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30">Acción requerida</span>
              </div>
              {active.map(c => <ClientRow key={c.id} c={c} active={selected?.id === c.id} onClick={() => { setSelected(c); setPanel('chat'); }} />)}
            </>
          )}

          {/* Esperando */}
          {waiting.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1.5 border-t border-[#062d32]/6 mt-1">
                <span className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30">Esperando respuesta</span>
              </div>
              {waiting.map(c => <ClientRow key={c.id} c={c} active={selected?.id === c.id} onClick={() => { setSelected(c); setPanel('chat'); }} />)}
            </>
          )}

          {/* Cerradas */}
          {closed.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-1.5 border-t border-[#062d32]/6 mt-1">
                <span className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30">Cerradas</span>
              </div>
              {closed.map(c => <ClientRow key={c.id} c={c} active={selected?.id === c.id} onClick={() => { setSelected(c); setPanel('chat'); }} />)}
            </>
          )}

          {!loading && campaigns.length === 0 && (
            <div className="py-12 text-center px-5">
              <span className="material-symbols-outlined text-2xl text-[#062d32]/10 block mb-2">forum</span>
              <p className="text-[10px] text-[#062d32]/25 font-sans">Sin conversaciones aún</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Área principal ───────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-3">

        {/* Barra de acciones */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <ActionTab active={panel === 'chat'} icon="forum" label="Conversaciones"
            onClick={() => setPanel('chat')} />
          <ActionTab active={panel === 'campaign'} icon="campaign" label="Campaña masiva"
            onClick={() => setPanel('campaign')} />
          <ActionTab active={panel === 'analyze'} icon="manage_search" label="Analizar clientes"
            onClick={() => setPanel('analyze')} />
          <ActionTab active={panel === 'settings'} icon="tune" label="Ajustar asistente"
            onClick={() => setPanel('settings')} />
          {config.enabled && (
            <span className="ml-auto flex items-center gap-1.5 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-700 border border-emerald-300 px-2.5 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Agente activo
            </span>
          )}
        </div>

        {/* ── Panel: CONVERSACIONES ───────────────────────────────────────────── */}
        {panel === 'chat' && (
          <div className="flex-1 bg-white border border-[#062d32]/10 min-h-0 flex flex-col overflow-hidden">
            {selected ? (
              <>
                {/* Cabecera conversación */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#062d32]/8 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#c9a9b5]/20 flex items-center justify-center font-serif text-[#062d32] font-semibold text-sm flex-shrink-0">
                      {selected.clientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-serif text-[#062d32] text-base font-semibold leading-none">{selected.clientName}</p>
                      <p className="text-[10px] text-[#062d32]/40 font-sans mt-0.5">{selected.clientPhone} · {selected.suggestedService}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[9px] font-sans font-bold uppercase tracking-wider border px-2 py-1 ${
                      selected.riskLevel === 'Crítico' ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-700'
                    }`}>
                      {selected.riskLevel} · {selected.riskDays}d
                    </span>
                    <button onClick={() => setSelected(null)} className="text-[#062d32]/25 hover:text-[#062d32] transition-colors">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>

                {/* Alerta de razón de ausencia detectada */}
                {selected.absenceReason && (
                  <div className="flex items-center justify-between px-6 py-3 border-b border-[#062d32]/6 bg-[#fbf9f5] flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-[#062d32]/40">psychology</span>
                      <span className="text-[10px] font-sans text-[#062d32]/50">
                        Razón detectada: <span className={`font-bold border px-1.5 py-0.5 ml-1 ${ABSENCE_META[selected.absenceReason].color}`}>
                          {ABSENCE_META[selected.absenceReason].label}
                        </span>
                      </span>
                    </div>
                    <button
                      onClick={() => onToastMessage(`Acción lanzada: ${ABSENCE_META[selected.absenceReason!].action}`)}
                      className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-[#062d32] hover:text-white transition-all">
                      {ABSENCE_META[selected.absenceReason].action}
                    </button>
                  </div>
                )}

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto px-8 py-5 space-y-4 bg-[#fbf9f5]">
                  {selected.conversationLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[58%] flex flex-col gap-1 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-3 text-[13px] leading-relaxed font-serif ${
                          msg.role === 'agent'
                            ? 'bg-[#062d32] text-white'
                            : 'bg-white border border-[#062d32]/10 border-l-[3px] border-l-[#c9a9b5] text-[#062d32]'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#062d32]/25 font-sans px-0.5">
                          {msg.role === 'agent' ? 'Agente' : selected.clientName} · {formatHour(msg.timestamp)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Barra acciones */}
                <div className="flex-shrink-0 border-t border-[#062d32]/8 bg-white px-6 py-4">
                  {selected.status === 'pendiente' && (
                    <div className="flex items-center gap-3 justify-between">
                      <p className="text-[10px] font-sans text-[#062d32]/40 italic flex-1">
                        El agente ha redactado este mensaje — apruébalo para enviarlo
                      </p>
                      <button onClick={() => handleReject(selected)}
                        className="border border-[#062d32]/15 text-[#062d32]/40 text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:border-red-300 hover:text-red-500 transition-all">
                        Descartar
                      </button>
                      <button onClick={() => handleApprove(selected)}
                        className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2 flex items-center gap-1.5 hover:opacity-85 transition-opacity">
                        <span className="material-symbols-outlined text-sm">send</span>
                        Aprobar y enviar
                      </button>
                    </div>
                  )}
                  {selected.status === 'enviado' && (
                    <div className="flex items-center gap-2 text-[#062d32]/30">
                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                      <span className="text-[11px] font-sans">Esperando respuesta de {selected.clientName}…</span>
                    </div>
                  )}
                  {selected.status === 'respondido' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#062d32]/35">
                          <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                          <span className="text-[11px] font-sans">El agente gestiona la conversación</span>
                        </div>
                        <button
                          onClick={() => onToastMessage('Intervención activada.')}
                          className="border border-[#062d32]/20 text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-1.5 hover:bg-[#062d32] hover:text-white transition-all">
                          Intervenir
                        </button>
                      </div>
                      <div className="flex items-end gap-2 border-t border-[#062d32]/6 pt-3">
                        <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                          placeholder="Escribe tu mensaje…" rows={1}
                          className="flex-1 border-b border-[#767676] bg-transparent text-[#062d32] text-[13px] font-serif py-1.5 outline-none resize-none placeholder:text-[#062d32]/20"
                          style={{ maxHeight: '72px', overflowY: 'auto' }} />
                        <button disabled={!replyDraft.trim()}
                          onClick={() => { onToastMessage('Mensaje enviado.'); setReplyDraft(''); }}
                          className="border border-[#062d32] text-[#062d32] p-1.5 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-20">
                          <span className="material-symbols-outlined text-[15px]">send</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {selected.status === 'reservado' && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="material-symbols-outlined text-[15px]">event_available</span>
                      <span className="text-[11px] font-sans font-semibold">Cita confirmada por el agente</span>
                    </div>
                  )}
                  {(selected.status === 'rechazado' || selected.status === 'sin_respuesta') && (
                    <span className="text-[11px] font-sans text-[#062d32]/25">{STATUS_LABEL[selected.status]}</span>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#fbf9f5]">
                <div className="w-10 h-10 border border-[#062d32]/10 bg-white flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-lg text-[#062d32]/20">forum</span>
                </div>
                <p className="font-serif text-[#062d32]/25 text-base">Selecciona una conversación</p>
              </div>
            )}
          </div>
        )}

        {/* ── Panel: CAMPAÑA MASIVA ───────────────────────────────────────────── */}
        {panel === 'campaign' && (
          <div className="flex-1 bg-white border border-[#062d32]/10 overflow-y-auto min-h-0 px-8 py-8">
            <div className="max-w-xl">
              <h2 className="font-serif text-[#062d32] text-xl font-semibold mb-1">Campaña masiva</h2>
              <p className="text-[11px] font-sans text-[#062d32]/45 mb-8 leading-relaxed">
                Escribe la promo o mensaje base y el agente lo adaptará para cada cliente antes de enviarlo.
              </p>

              {/* Texto base */}
              <div className="mb-5">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/50 mb-2">
                  Mensaje o promoción
                </label>
                <textarea
                  value={campText}
                  onChange={e => setCampText(e.target.value)}
                  placeholder="Ej: Esta semana 20% de descuento en mechas para clientas que lleven más de 2 meses sin visitarnos…"
                  rows={4}
                  className="w-full border border-[#062d32]/15 bg-[#fbf9f5] text-[#062d32] text-[13px] font-serif px-4 py-3 outline-none resize-none placeholder:text-[#062d32]/20 focus:border-[#062d32]/40 transition-colors"
                />
              </div>

              {/* Imagen opcional */}
              <div className="mb-6">
                <label className="block text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/50 mb-2">
                  Imagen adjunta (opcional)
                </label>
                <label className="flex items-center gap-3 border border-dashed border-[#062d32]/20 px-4 py-4 cursor-pointer hover:border-[#062d32]/40 transition-colors group">
                  <span className="material-symbols-outlined text-[#062d32]/25 group-hover:text-[#062d32]/50 transition-colors">image</span>
                  <span className="text-[11px] font-sans text-[#062d32]/35">Arrastra o selecciona una imagen</span>
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>

              {/* Botón refinar */}
              {!campRefined && (
                <button
                  onClick={refineCampaign}
                  disabled={!campText.trim() || campRefining}
                  className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-30 mb-6">
                  <span className="material-symbols-outlined text-sm">{campRefining ? 'sync' : 'auto_awesome'}</span>
                  {campRefining ? 'El agente está refinando…' : 'Refinar con IA'}
                </button>
              )}

              {/* Mensaje refinado */}
              {campRefined && (
                <div className="border border-[#062d32]/15 bg-[#fbf9f5] px-5 py-4 mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[13px] text-[#062d32]/40">smart_toy</span>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40">Versión del agente</span>
                  </div>
                  <p className="font-serif text-[13px] text-[#062d32] leading-relaxed">{campRefined}</p>
                  <button onClick={() => setCampRefined('')}
                    className="mt-3 text-[9px] font-sans text-[#062d32]/35 hover:text-[#062d32] transition-colors underline underline-offset-2">
                    Volver a editar
                  </button>
                </div>
              )}

              {/* Destinatarios */}
              <div className="border border-[#062d32]/10 px-5 py-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-[#062d32]">Destinatarios</p>
                  <p className="text-[10px] font-sans text-[#062d32]/40 mt-0.5">{campaigns.length} clientes contactables</p>
                </div>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40 border border-[#062d32]/15 px-2 py-1">
                  Todos
                </span>
              </div>

              <button
                onClick={sendCampaign}
                disabled={!(campRefined || campText.trim())}
                className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-6 py-3 flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-30">
                <span className="material-symbols-outlined text-sm">send</span>
                Lanzar campaña
              </button>
            </div>
          </div>
        )}

        {/* ── Panel: ANALIZAR CLIENTES ────────────────────────────────────────── */}
        {panel === 'analyze' && (
          <div className="flex-1 bg-white border border-[#062d32]/10 overflow-y-auto min-h-0">
            <div className="px-6 py-5 border-b border-[#062d32]/8 flex items-center justify-between">
              <div>
                <h2 className="font-serif text-[#062d32] text-lg font-semibold leading-none">Clientes en riesgo</h2>
                <p className="text-[10px] font-sans text-[#062d32]/40 mt-1">{DEMO_AT_RISK.length} clientas detectadas · Selecciona para autorizar contacto</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAtRiskSelected(new Set(DEMO_AT_RISK.map(r => r.id)))}
                  className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40 hover:text-[#062d32] transition-colors border border-[#062d32]/15 px-3 py-1.5">
                  Seleccionar todo
                </button>
                <button
                  disabled={atRiskSelected.size === 0}
                  onClick={() => { onToastMessage(`✓ Agente autorizado para ${atRiskSelected.size} clientes.`); setAtRiskSelected(new Set()); }}
                  className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-1.5 flex items-center gap-1.5 hover:opacity-85 transition-opacity disabled:opacity-25">
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  Autorizar agente ({atRiskSelected.size})
                </button>
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="border-b border-[#062d32]/6">
                  <th className="w-10 px-5 py-3" />
                  <th className="text-left px-5 py-3 text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Cliente</th>
                  <th className="text-left px-4 py-3 text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Servicio</th>
                  <th className="text-left px-4 py-3 text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Riesgo</th>
                  <th className="text-left px-4 py-3 text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Ausencia</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#062d32]/5">
                {DEMO_AT_RISK.map(r => (
                  <tr key={r.id}
                    className={`transition-colors cursor-pointer ${atRiskSelected.has(r.id) ? 'bg-[#062d32]/3' : 'hover:bg-[#fbf9f5]'}`}
                    onClick={() => setAtRiskSelected(prev => {
                      const n = new Set(prev);
                      n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                      return n;
                    })}>
                    <td className="px-5 py-3.5">
                      <span className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 ${atRiskSelected.has(r.id) ? 'bg-[#062d32] border-[#062d32]' : 'border-[#062d32]/20'}`}>
                        {atRiskSelected.has(r.id) && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-[#c9a9b5]/20 flex items-center justify-center font-serif text-[#062d32] text-xs font-semibold">
                          {r.name.charAt(0)}
                        </div>
                        <span className="font-serif text-[13px] text-[#062d32] font-semibold">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[12px] font-sans text-[#062d32]/55">{r.service}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[9px] font-sans font-bold uppercase tracking-wider border px-2 py-0.5 ${
                        r.risk === 'Crítico' ? 'border-red-300 text-red-600' : r.risk === 'Alto' ? 'border-amber-300 text-amber-700' : 'border-sky-300 text-sky-700'
                      }`}>
                        {r.risk} · {r.days}d
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-[11px] font-sans text-[#062d32]/35">—</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={e => { e.stopPropagation(); onToastMessage(`Agente autorizado para ${r.name}.`); }}
                        className="text-[9px] font-sans font-bold uppercase tracking-wider border border-[#062d32]/15 text-[#062d32]/50 px-3 py-1.5 hover:border-[#062d32] hover:text-[#062d32] transition-all">
                        Autorizar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Panel: AJUSTAR ASISTENTE ────────────────────────────────────────── */}
        {panel === 'settings' && (
          <div className="flex-1 bg-white border border-[#062d32]/10 overflow-y-auto min-h-0 px-8 py-8">
            <div className="max-w-lg">
              <h2 className="font-serif text-[#062d32] text-xl font-semibold mb-1">Ajustar asistente</h2>
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-8 leading-relaxed">
                Configura cómo actúa el agente, qué situaciones detecta y qué hace en cada caso.
              </p>

              {/* Comportamiento general */}
              <Section title="Comportamiento general">
                {([
                  { label: 'Modo autónomo', key: 'enabled' as const, desc: 'El agente detecta y contacta clientas en riesgo sin aprobación' },
                  { label: 'Envío sin revisión', key: 'autoSend' as const, desc: 'Omite la cola de aprobación manual' },
                ] as const).map(({ label, key, desc }) => (
                  <ToggleRow key={key} label={label} desc={desc} value={config[key]}
                    onChange={v => saveConfig({ [key]: v })} />
                ))}
                <SliderRow label="Días de espera entre contactos" value={config.cooldownDays} min={3} max={60} unit="d"
                  onChange={v => saveConfig({ cooldownDays: v })} />
                <SliderRow label="Máx. mensajes por día" value={config.maxActivePerDay} min={1} max={50} unit=""
                  onChange={v => saveConfig({ maxActivePerDay: v })} />
              </Section>

              {/* Respuestas por categoría */}
              <Section title="Respuestas por situación detectada">
                <p className="text-[10px] font-sans text-[#062d32]/40 mb-4 leading-relaxed">
                  Cuando el agente detecte una de estas situaciones en la respuesta del cliente, tomará la acción configurada.
                </p>
                {(Object.entries(ABSENCE_META) as [AbsenceReason, typeof ABSENCE_META[NonNullable<AbsenceReason>]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-center justify-between py-3.5 border-b border-[#062d32]/6 last:border-0">
                    <div>
                      <span className={`text-[9px] font-sans font-bold uppercase tracking-wider border px-2 py-0.5 mr-2 ${meta.color}`}>{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-sans text-[#062d32]/40">{meta.action}</span>
                      <button
                        onClick={() => onToastMessage(`Configuración de "${meta.label}" — próximamente personalizable.`)}
                        className="text-[#062d32]/25 hover:text-[#062d32] transition-colors">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </Section>

              {/* Chat web */}
              {tenantSlug && (
                <Section title="Chat web para clientes">
                  <p className="text-[10px] font-sans text-[#062d32]/40 mb-3 leading-relaxed">
                    Enlace público para que clientes chatteen directamente con el asistente desde el navegador.
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-[10px] font-sans text-[#062d32]/50 border border-[#062d32]/10 bg-[#fbf9f5] px-3 py-2 truncate">
                      {window.location.origin}/salon/{tenantSlug}/chat
                    </code>
                    <button
                      onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/salon/${tenantSlug}/chat`).then(() => onToastMessage('✓ Enlace copiado.'))}
                      className="border border-[#062d32]/20 text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/50 px-3 py-2 hover:border-[#062d32] hover:text-[#062d32] transition-all whitespace-nowrap">
                      Copiar
                    </button>
                  </div>
                </Section>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-componentes de UI ─────────────────────────────────────────────────────

function ClientRow({ c, active, onClick }: { c: DemoCampaign; active: boolean; onClick: () => void }) {
  const last = c.conversationLog[c.conversationLog.length - 1];
  return (
    <button onClick={onClick}
      className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors ${active ? 'bg-[#062d32]/5' : 'hover:bg-[#062d32]/[0.02]'}`}>
      <div className="w-8 h-8 flex-shrink-0 bg-[#c9a9b5]/20 flex items-center justify-center font-serif text-[#062d32] text-xs font-semibold mt-0.5">
        {c.clientName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1 mb-0.5">
          <span className="font-serif text-[12px] font-semibold text-[#062d32] truncate">{c.clientName}</span>
          <span className="text-[9px] text-[#062d32]/25 font-sans flex-shrink-0">{timeAgo(last?.timestamp || c.createdAt)}</span>
        </div>
        <p className="text-[10px] text-[#062d32]/40 truncate font-sans leading-snug mb-1.5">{last?.text}</p>
        <div className="flex items-center gap-1.5">
          <StatusDot status={c.status} />
          <span className="text-[9px] font-sans text-[#062d32]/35">{STATUS_LABEL[c.status]}</span>
          {(c as DemoCampaign).absenceReason && (
            <span className={`text-[9px] font-sans font-bold border px-1.5 py-0 ${ABSENCE_META[(c as DemoCampaign).absenceReason!].color}`}>
              {ABSENCE_META[(c as DemoCampaign).absenceReason!].label}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function StatusDot({ status }: { status: AgentCampaignStatus }) {
  const c: Record<AgentCampaignStatus, string> = {
    pendiente: 'bg-amber-400', enviado: 'bg-sky-400', respondido: 'bg-violet-500',
    reservado: 'bg-emerald-500', rechazado: 'bg-[#062d32]/15', sin_respuesta: 'bg-red-400',
  };
  return <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c[status]}`} />;
}

function ActionTab({ active, icon, label, onClick }: { active: boolean; icon: string; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2.5 border transition-all ${
        active
          ? 'bg-[#062d32] text-white border-[#062d32]'
          : 'border-[#062d32]/15 text-[#062d32]/45 hover:border-[#062d32]/40 hover:text-[#062d32]'
      }`}>
      <span className="material-symbols-outlined text-sm">{icon}</span>
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-[10px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/40 mb-4 pb-2 border-b border-[#062d32]/8">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#062d32]/6 last:border-0">
      <div>
        <p className="text-[12px] font-sans text-[#062d32]">{label}</p>
        <p className="text-[10px] font-sans text-[#062d32]/40 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)}
        className={`relative h-5 w-9 flex-shrink-0 ml-4 transition-colors ${value ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
        <span className={`absolute top-0.5 h-4 w-4 bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <div className="py-3.5 border-b border-[#062d32]/6 last:border-0">
      <div className="flex justify-between mb-2">
        <span className="text-[12px] font-sans text-[#062d32]">{label}</span>
        <span className="text-[12px] font-sans font-bold text-[#062d32]">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#062d32] h-0.5" />
    </div>
  );
}
