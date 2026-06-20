import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';
type CenterMode = 'chat' | 'campaign' | 'analyze' | 'settings';
type AbsenceReason = 'economia' | 'competencia' | 'autoservicio' | 'tiempo' | 'personal';

const ABSENCE: Record<AbsenceReason, { label: string; action: string; tone: string }> = {
  economia:     { label: 'Económico',         action: 'Lanzar oferta de reconexión',  tone: 'Oferta especial detectada' },
  competencia:  { label: 'Competencia',       action: 'Enviar propuesta de valor',    tone: 'Propuesta diferencial' },
  autoservicio: { label: 'Auto-servicio',     action: 'Destacar diferencial',         tone: 'Refuerzo de valor' },
  tiempo:       { label: 'Falta de tiempo',   action: 'Recordar en 2 semanas',        tone: 'Seguimiento suave' },
  personal:     { label: 'Personal',          action: 'Dar espacio · 30 días',        tone: 'Tono Empático' },
};

const RISK_STYLE: Record<string, string> = {
  'Crítico': 'bg-red-100 text-red-700',
  'Alto':    'bg-amber-100 text-amber-700',
  'Medio':   'bg-emerald-100 text-emerald-700',
  'Bajo':    'bg-sky-100 text-sky-700',
};

const STATUS_PRIORITY: Record<AgentCampaignStatus, number> = {
  respondido: 0, pendiente: 1, enviado: 2, sin_respuesta: 3, reservado: 4, rechazado: 5,
};

const STATUS_DOT: Record<AgentCampaignStatus, string> = {
  pendiente: 'bg-amber-400', enviado: 'bg-sky-400', respondido: 'bg-violet-500',
  reservado: 'bg-emerald-500', rechazado: 'bg-white/30', sin_respuesta: 'bg-red-400',
};

const STATUS_LABEL: Record<AgentCampaignStatus, string> = {
  pendiente: 'Pendiente', enviado: 'Enviado', respondido: 'Respondió',
  reservado: 'Reservado', rechazado: 'Descartado', sin_respuesta: 'Sin respuesta',
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: true, autoSend: false, scanIntervalHours: 24,
  minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10,
};

const DEMO: AgentCampaign[] = [
  {
    id: 'd1', tenantId: 'demo', clientId: 'maria-gonzalez',
    clientName: 'María González', clientPhone: '666 111 222',
    riskLevel: 'Alto', riskDays: 155, suggestedService: 'Mechas Californianas',
    message: '¡Hola María! Te echamos de menos 💙 Han pasado 5 meses. ¿Te busco un hueco esta semana?',
    status: 'respondido', autoSend: false, absenceReason: 'economia',
    absenceDetail: 'Menciona dificultades económicas para venir al salón.',
    absenceDetectedText: 'IA: Detectado motivo económico → Oferta de reconexión disponible',
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 90 * 60000).toISOString(),
    repliedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastReply: 'Ay sí me apetece pero ahora mismo estoy un poco justa de dinero...',
    conversationLog: [
      { role: 'agent', text: '¡Hola María! Te echamos de menos 💙 Han pasado 5 meses desde tus últimas mechas. ¿Te busco un hueco esta semana?', timestamp: new Date(Date.now() - 90 * 60000).toISOString() },
      { role: 'client', text: 'Ay sí me apetece pero ahora mismo estoy un poco justa de dinero...', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
      { role: 'agent', text: 'Entendemos perfectamente María. Esta semana tenemos una promoción especial que podría venir bien. ¿Te cuento?', timestamp: new Date(Date.now() - 25 * 60000).toISOString() },
    ],
  },
  {
    id: 'd2', tenantId: 'demo', clientId: 'carla-ruiz',
    clientName: 'Carla Ruiz', clientPhone: '666 333 444',
    riskLevel: 'Alto', riskDays: 75, suggestedService: 'Keratina',
    message: 'Hola Carla, ¡qué tal! Llevas 75 días sin tu keratina ¿quieres que reservemos?',
    status: 'pendiente', autoSend: false, absenceReason: 'competencia',
    absenceDetail: 'Probando salón de la competencia cerca de su casa.',
    absenceDetectedText: 'IA: Detectada competencia → Propuesta de valor sugerida',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    conversationLog: [
      { role: 'agent', text: 'Hola Carla, ¡qué tal! Llevas 75 días sin tu keratina ¿quieres que reservemos?', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { role: 'client', text: 'Hola, estoy probando un salón que abrió cerca de casa...', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
  },
  {
    id: 'd3', tenantId: 'demo', clientId: 'ana-lopez',
    clientName: 'Ana López', clientPhone: '666 555 666',
    riskLevel: 'Alto', riskDays: 45, suggestedService: 'Coloración',
    message: '¡Hola Ana! Esta semana tenemos hueco. ¿Te cuento las novedades?',
    status: 'pendiente', autoSend: false, absenceReason: 'personal',
    absenceDetail: 'Situación familiar complicada, pide comprensión.',
    absenceDetectedText: 'IA: Detectada imposibilidad personal → Tono Empático',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    conversationLog: [
      { role: 'agent', text: '¡Hola Ana! Esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
      { role: 'client', text: 'Hola, ahora mismo tengo una situación personal complicada, no puedo...', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
      { role: 'agent', text: 'Entendemos perfectamente Ana. Aquí estaremos cuando puedas, sin prisa. Ánimo 💙', timestamp: new Date(Date.now() - 110 * 60000).toISOString() },
    ],
  },
  {
    id: 'd4', tenantId: 'demo', clientId: 'lucia-gomez',
    clientName: 'Lucía Gómez', clientPhone: '666 777 888',
    riskLevel: 'Crítico', riskDays: 200, suggestedService: 'Coloración',
    message: '¡Hola Lucía! Te echamos de menos. Esta semana tenemos hueco.',
    status: 'reservado', autoSend: true, absenceReason: null,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    repliedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    lastReply: 'Perfecto, el viernes a las 10',
    conversationLog: [
      { role: 'agent', text: '¡Hola Lucía! Esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 23 * 3600000).toISOString() },
      { role: 'client', text: '¿Tenéis el viernes?', timestamp: new Date(Date.now() - 21 * 3600000).toISOString() },
      { role: 'agent', text: 'Sí, el viernes a las 10:00, 11:30 o 16:00. ¿Cuál te viene?', timestamp: new Date(Date.now() - 21 * 3600000 + 60000).toISOString() },
      { role: 'client', text: 'Perfecto, el viernes a las 10', timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
      { role: 'agent', text: '¡Anotado! Lucía, viernes a las 10:00 para Coloración. Te esperamos 💙', timestamp: new Date(Date.now() - 20 * 3600000 + 30000).toISOString() },
    ],
  },
];

const DEMO_RISK = [
  { id: 'r1', name: 'Patricia Vega', days: 95, service: 'Balayage', risk: 'Alto' },
  { id: 'r2', name: 'Cristina Mora', days: 180, service: 'Coloración', risk: 'Crítico' },
  { id: 'r3', name: 'Laura Blanco', days: 62, service: 'Corte', risk: 'Medio' },
  { id: 'r4', name: 'Elena Jiménez', days: 210, service: 'Keratina', risk: 'Crítico' },
  { id: 'r5', name: 'Rosa Cano', days: 88, service: 'Manicura', risk: 'Alto' },
];

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function AgentView({ onToastMessage, getAuthToken, isDemoMode = false, tenantSlug }: AgentViewProps) {
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<AgentCampaign | null>(null);
  const [mode, setMode] = useState<CenterMode>('chat');
  const [waStatus, setWAStatus] = useState<WAStatus>('disconnected');
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waPhone, setWAPhone] = useState<string | null>(null);
  const [listTab, setListTab] = useState<'prioridad' | 'contactados'>('prioridad');
  const [replyDraft, setReplyDraft] = useState('');
  const [campText, setCampText] = useState('');
  const [campRefined, setCampRefined] = useState('');
  const [campRefining, setCampRefining] = useState(false);
  const [campImage, setCampImage] = useState<File | null>(null);
  const [riskSel, setRiskSel] = useState<Set<string>>(new Set());
  const waSSERef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLInputElement>(null);

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = await getAuthToken();
    return fetch(url, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  }, [getAuthToken]);

  const loadData = useCallback(async () => {
    if (isDemoMode) { setCampaigns(DEMO); setConfig({ ...DEFAULT_CONFIG, enabled: true }); return; }
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

  const handleApprove = async (c: AgentCampaign) => {
    const optimistic = { ...c, status: 'enviado' as AgentCampaignStatus, sentAt: new Date().toISOString() };
    setCampaigns(prev => prev.map(x => x.id === c.id ? optimistic : x));
    setSelected(optimistic);
    if (!isDemoMode) {
      try {
        const r = await authFetch(`/api/agent/campaigns/${c.id}/approve`, { method: 'POST' });
        if (!r.ok) throw new Error();
        onToastMessage(`✓ Enviado a ${c.clientName}.`);
      } catch {
        setCampaigns(prev => prev.map(x => x.id === c.id ? c : x));
        setSelected(c);
        onToastMessage('Error al enviar. Inténtalo de nuevo.');
      }
    } else {
      onToastMessage(`✓ Enviado a ${c.clientName}.`);
    }
  };
  const handleReject = async (c: AgentCampaign) => {
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rechazado' as AgentCampaignStatus } : x));
    setSelected(null);
    if (!isDemoMode) {
      try { await authFetch(`/api/agent/campaigns/${c.id}/reject`, { method: 'POST' }); }
      catch { onToastMessage('Error al descartar.'); }
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
    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        setCampRefined(`${campText.trim()} Esta semana tenemos un hueco especial para ti. ¡Escríbenos y lo reservamos juntas! 💙`);
      } else {
        const r = await authFetch('/api/agent/refine', { method: 'POST', body: JSON.stringify({ text: campText }) });
        const data = await r.json();
        setCampRefined(data.refined || campText);
      }
    } catch {
      onToastMessage('Error refinando con IA.');
    } finally {
      setCampRefining(false);
    }
  };
  const handleSendReply = async () => {
    if (!selected || !replyDraft.trim()) return;
    const text = replyDraft.trim();
    setReplyDraft('');
    const entry = { role: 'agent' as const, text, timestamp: new Date().toISOString() };
    const updated = { ...selected, conversationLog: [...selected.conversationLog, entry], status: 'enviado' as AgentCampaignStatus };
    setSelected(updated);
    setCampaigns(prev => prev.map(x => x.id === selected.id ? updated : x));
    if (!isDemoMode) {
      try {
        const r = await authFetch(`/api/agent/campaigns/${selected.id}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
        if (!r.ok) throw new Error();
        onToastMessage('Mensaje enviado por WhatsApp.');
      } catch {
        onToastMessage('Error enviando mensaje.');
      }
    } else {
      onToastMessage('Mensaje enviado.');
    }
  };

  const handleScan = async () => {
    if (isDemoMode) { onToastMessage('Demo: agente autorizado para clientes seleccionados.'); setRiskSel(new Set()); return; }
    try {
      const r = await authFetch('/api/agent/scan', { method: 'POST' });
      const data = await r.json();
      onToastMessage(`✓ Agente escaneó ${data.scanned} clientes, ${data.queued} en cola.`);
      setRiskSel(new Set());
      loadData();
    } catch {
      onToastMessage('Error al lanzar el agente.');
    }
  };

  const handleWAConnect = async () => {
    if (isDemoMode) { onToastMessage('Demo: escanea el QR con tu móvil.'); return; }
    try { await authFetch('/api/agent/wa-connect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };
  const handleWADisconnect = async () => {
    if (isDemoMode) { setWAStatus('disconnected'); setWAPhone(null); return; }
    try { await authFetch('/api/agent/wa-disconnect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const sorted = [...campaigns].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
  const priorityList = sorted.filter(c => ['respondido', 'pendiente'].includes(c.status));
  const contactadosList = sorted.filter(c => ['enviado', 'reservado', 'sin_respuesta', 'rechazado'].includes(c.status));
  const listedClients = listTab === 'prioridad' ? priorityList : contactadosList;

  return (
    <div className="flex gap-2 min-h-0" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ══ COLUMNA IZQUIERDA — oscura ══════════════════════════════════════════ */}
      <div className="w-64 flex-shrink-0 flex flex-col bg-[#1c4a4e] rounded-xl overflow-hidden min-h-0">

        {/* WA status */}
        <div className="px-4 py-3 border-b border-white/8 flex-shrink-0">
          {waStatus === 'connected' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                <span className="text-[11px] font-sans text-white/60 truncate">+{waPhone}</span>
              </div>
              <button onClick={handleWADisconnect} className="text-[9px] font-sans font-bold uppercase tracking-wider text-white/30 hover:text-red-400 transition-colors">Salir</button>
            </div>
          ) : waStatus === 'qr' && waQR ? (
            <div className="flex flex-col items-center gap-2 py-1">
              <img src={waQR} alt="QR" className="w-28 h-28 bg-white p-1" />
              <p className="text-[9px] text-center font-sans text-white/40 leading-relaxed">WhatsApp → Dispositivos → Vincular</p>
            </div>
          ) : (
            <button onClick={handleWAConnect}
              className="w-full flex items-center justify-center gap-2 border border-white/20 text-white text-[10px] font-sans font-bold uppercase tracking-wider py-2 hover:bg-white/10 transition-all">
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              {waStatus === 'connecting' ? 'Conectando…' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>

        {/* Header lista */}
        <div className="px-4 pt-4 pb-1 flex-shrink-0">
          <p className="font-serif text-white text-base font-semibold mb-3">Lista de Prioridad</p>
          <div className="flex border-b border-white/10">
            {(['prioridad', 'contactados'] as const).map(t => (
              <button key={t} onClick={() => setListTab(t)}
                className={`flex-1 text-[10px] font-sans font-bold uppercase tracking-wider pb-2 transition-all ${
                  listTab === t ? 'text-[#c9a9b5] border-b-2 border-[#c9a9b5]' : 'text-white/35 hover:text-white/60'
                }`}>
                {t === 'prioridad' ? 'Prioridad' : 'Contactados'}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
          {loading && <div className="flex justify-center py-8"><span className="material-symbols-outlined animate-spin text-white/20">sync</span></div>}
          {!loading && listedClients.length === 0 && (
            <div className="py-10 text-center"><p className="text-[10px] text-white/20 font-sans">Sin conversaciones</p></div>
          )}
          {listedClients.map(c => {
            const active = selected?.id === c.id;
            const last = c.conversationLog[c.conversationLog.length - 1];
            return (
              <button key={c.id} onClick={() => { setSelected(c); setMode('chat'); }}
                className={`w-full text-left p-3 rounded-lg transition-all ${active ? 'bg-white/15' : 'bg-white/5 hover:bg-white/10'}`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full bg-[#c9a9b5]/30 flex items-center justify-center font-sans text-white text-[11px] font-bold flex-shrink-0">
                    {initials(c.clientName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="font-serif text-white text-[13px] font-semibold truncate">{c.clientName}</span>
                      <span className="text-[9px] text-white/30 font-sans flex-shrink-0">{timeAgo(last?.timestamp || c.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-full ${RISK_STYLE[c.riskLevel] || 'bg-white/10 text-white/60'}`}>
                    {c.riskDays}d
                  </span>
                </div>
                {c.absenceReason && (
                  <div className="bg-white/8 rounded px-2 py-1">
                    <p className="text-[9px] font-sans text-white/50">Motivo: <span className="text-white/80 font-semibold">{ABSENCE[c.absenceReason].label}</span></p>
                  </div>
                )}
                {!c.absenceReason && (
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                    <span className="text-[9px] text-white/40 font-sans">{STATUS_LABEL[c.status]}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ COLUMNA CENTRAL ═════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">

        {/* Tarjetas de acción superiores */}
        <div className="flex gap-2 flex-shrink-0">
          {([
            { id: 'campaign', icon: 'campaign',       label: 'Lanzar Campaña Masiva', sub: 'Subir Imagen/Texto' },
            { id: 'analyze',  icon: 'manage_search',  label: 'Analizar Riesgo',       sub: 'Ver clientes en riesgo' },
            { id: 'settings', icon: 'tune',           label: 'Ajustes del Asistente', sub: 'Configurar agente' },
          ] as { id: CenterMode; icon: string; label: string; sub: string }[]).map(card => (
            <button key={card.id} onClick={() => setMode(mode === card.id ? 'chat' : card.id)}
              className={`flex-1 border rounded-xl px-4 py-4 text-left transition-all ${
                mode === card.id
                  ? 'bg-[#062d32] border-[#062d32] text-white'
                  : 'bg-white border-[#062d32]/10 hover:border-[#062d32]/30 text-[#062d32]'
              }`}>
              <span className={`material-symbols-outlined text-2xl mb-2 block ${mode === card.id ? 'text-[#c9a9b5]' : 'text-[#062d32]/40'}`}>{card.icon}</span>
              <p className={`text-[12px] font-serif font-semibold leading-tight mb-2 ${mode === card.id ? 'text-white' : 'text-[#062d32]'}`}>{card.label}</p>
              <span className={`inline-block text-[9px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 ${
                mode === card.id ? 'bg-white/15 text-white' : 'border border-[#062d32]/20 text-[#062d32]/50'
              }`}>
                {card.sub}
              </span>
            </button>
          ))}
        </div>

        {/* ── CHAT ─────────────────────────────────────────────────────────── */}
        {mode === 'chat' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 rounded-xl flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-3.5 border-b border-[#062d32]/8 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-[#062d32] text-[10px] font-bold">
                      {initials(selected.clientName)}
                    </div>
                    <div>
                      <p className="font-serif text-[#062d32] text-sm font-semibold leading-none">Conversación con {selected.clientName}</p>
                      <p className="text-[10px] text-[#062d32]/35 font-sans mt-0.5">{selected.suggestedService} · {selected.riskDays}d sin visita</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-[#062d32]/25 hover:text-[#062d32] transition-colors">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>

                {/* Barra de detección IA */}
                {selected.absenceDetectedText && (
                  <div className="flex items-center gap-2 px-5 py-2.5 bg-[#062d32]/5 border-b border-[#062d32]/8 flex-shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-[#062d32]/50">psychology</span>
                    <p className="text-[10px] font-sans text-[#062d32]/60">{selected.absenceDetectedText}</p>
                  </div>
                )}

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-[#fbf9f5]">
                  {selected.conversationLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      {msg.role === 'client' && (
                        <div className="w-7 h-7 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-[#062d32] text-[9px] font-bold mr-2 flex-shrink-0 mt-1">
                          {initials(selected.clientName)}
                        </div>
                      )}
                      <div className={`max-w-[60%] flex flex-col gap-1 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 text-[13px] leading-relaxed font-serif rounded-xl ${
                          msg.role === 'agent'
                            ? 'bg-[#062d32] text-white rounded-br-sm'
                            : 'bg-white border border-[#062d32]/10 text-[#062d32] rounded-bl-sm'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#062d32]/25 font-sans px-1">{formatHour(msg.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Barra inferior */}
                <div className="flex-shrink-0 border-t border-[#062d32]/8 bg-white px-5 py-4">
                  {selected.status === 'pendiente' && (
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-sans text-[#062d32]/40 italic flex-1">El agente ha redactado este mensaje — apruébalo</p>
                      <button onClick={() => handleReject(selected)}
                        className="text-[10px] font-sans font-bold uppercase tracking-wider border border-[#062d32]/15 text-[#062d32]/40 px-3 py-2 hover:border-red-300 hover:text-red-500 transition-all">
                        Descartar
                      </button>
                      <button onClick={() => handleApprove(selected)}
                        className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 hover:opacity-85 transition-opacity">
                        <span className="material-symbols-outlined text-sm">send</span>
                        Enviar por WhatsApp
                      </button>
                    </div>
                  )}
                  {(selected.status === 'respondido' || selected.status === 'reservado' || selected.status === 'enviado') && (
                    <div className="space-y-3">
                      {selected.status === 'enviado' && (
                        <div className="flex items-center gap-2 text-[#062d32]/30">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                          <span className="text-[11px] font-sans">Esperando respuesta…</span>
                        </div>
                      )}
                      {selected.status === 'reservado' && (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <span className="material-symbols-outlined text-sm">event_available</span>
                          <span className="text-[11px] font-sans font-semibold">Cita confirmada</span>
                        </div>
                      )}
                      {selected.status === 'respondido' && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#062d32]/30">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            <span className="text-[11px] font-sans">El agente gestiona la conversación</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40">Modo Automático</span>
                              <button onClick={() => saveConfig({ autoSend: !config.autoSend })}
                                className={`relative h-5 w-9 rounded-full transition-colors ${config.autoSend ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${config.autoSend ? 'left-[18px]' : 'left-0.5'}`} />
                              </button>
                            </label>
                            <button onClick={() => setTimeout(() => replyInputRef.current?.focus(), 50)}
                              className="text-[10px] font-sans font-bold uppercase tracking-wider border border-[#062d32] text-[#062d32] px-3 py-1.5 hover:bg-[#062d32] hover:text-white transition-all">
                              Intervenir
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="flex items-end gap-2 border-t border-[#062d32]/6 pt-3">
                        <input ref={replyInputRef} value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                          placeholder="Enviar un mensaje…"
                          className="flex-1 border border-[#062d32]/12 bg-[#fbf9f5] rounded-lg text-[#062d32] text-[13px] font-serif px-4 py-2.5 outline-none placeholder:text-[#062d32]/20 focus:border-[#062d32]/30 transition-colors" />
                        <button disabled={!replyDraft.trim()}
                          onClick={handleSendReply}
                          className="bg-[#062d32] text-white p-2.5 rounded-lg hover:opacity-85 transition-opacity disabled:opacity-20 flex-shrink-0">
                          <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#fbf9f5]">
                <div className="w-12 h-12 rounded-xl bg-[#062d32]/5 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-xl text-[#062d32]/20">forum</span>
                </div>
                <p className="font-serif text-[#062d32]/25 text-base">Selecciona una conversación</p>
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAÑA MASIVA ─────────────────────────────────────────────────── */}
        {mode === 'campaign' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 rounded-xl overflow-y-auto px-7 py-7">
            <div className="max-w-lg">
              <h2 className="font-serif text-[#062d32] text-lg font-semibold mb-1">Lanzar Campaña Masiva</h2>
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-7 leading-relaxed">Escribe la promo — el agente la adapta para cada cliente.</p>
              <label className="block text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/40 mb-2">Mensaje o promoción</label>
              <textarea value={campText} onChange={e => setCampText(e.target.value)}
                placeholder="Ej: Esta semana 20% de descuento en mechas para clientas que lleven más de 2 meses…"
                rows={4} className="w-full border border-[#062d32]/12 bg-[#fbf9f5] rounded-lg text-[#062d32] text-[13px] font-serif px-4 py-3 outline-none resize-none placeholder:text-[#062d32]/20 mb-4" />
              <label className="flex items-center gap-3 border border-dashed border-[#062d32]/15 rounded-lg px-4 py-4 cursor-pointer hover:border-[#062d32]/30 transition-colors mb-5 group">
                <span className="material-symbols-outlined text-[#062d32]/25 group-hover:text-[#062d32]/45">image</span>
                <span className="text-[11px] font-sans text-[#062d32]/30">
                  {campImage ? campImage.name : 'Subir imagen adjunta (opcional)'}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setCampImage(e.target.files?.[0] ?? null)} />
              </label>
              {!campRefined ? (
                <button onClick={refineCampaign} disabled={!campText.trim() || campRefining}
                  className="flex items-center gap-2 border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-30 mb-6">
                  <span className="material-symbols-outlined text-sm">{campRefining ? 'sync' : 'auto_awesome'}</span>
                  {campRefining ? 'Refinando…' : 'Refinar con Agente IA'}
                </button>
              ) : (
                <div className="border-l-[3px] border-l-[#c9a9b5] bg-[#fbf9f5] rounded-r-lg px-5 py-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[12px] text-[#062d32]/35">smart_toy</span>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Versión del agente</span>
                  </div>
                  <p className="font-serif text-[13px] text-[#062d32] leading-relaxed">{campRefined}</p>
                  <button onClick={() => setCampRefined('')} className="mt-2 text-[9px] font-sans text-[#062d32]/30 hover:text-[#062d32] underline underline-offset-2 transition-colors">Volver a editar</button>
                </div>
              )}
              <div className="border border-[#062d32]/10 rounded-lg px-5 py-3.5 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-[#062d32]">Destinatarios</p>
                  <p className="text-[10px] font-sans text-[#062d32]/35 mt-0.5">{campaigns.length} clientes contactables</p>
                </div>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35 border border-[#062d32]/12 rounded px-2 py-1">Todos</span>
              </div>
              <button disabled={!(campRefined || campText.trim())}
                onClick={async () => {
                  const msg = campRefined || campText.trim();
                  if (isDemoMode) {
                    onToastMessage(`✓ Campaña enviada a ${campaigns.length} clientes.`);
                    setCampText(''); setCampRefined(''); setMode('chat');
                    return;
                  }
                  try {
                    const r = await authFetch('/api/agent/broadcast', { method: 'POST', body: JSON.stringify({ message: msg }) });
                    const data = await r.json();
                    onToastMessage(`✓ Enviado a ${data.sent}/${data.total} clientes.`);
                    setCampText(''); setCampRefined(''); setMode('chat');
                    loadData();
                  } catch { onToastMessage('Error enviando campaña.'); }
                }}
                className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-25">
                <span className="material-symbols-outlined text-sm">send</span>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* ── ANALIZAR RIESGO ─────────────────────────────────────────────────── */}
        {mode === 'analyze' && (() => {
          const riskRows = isDemoMode
            ? DEMO_RISK
            : campaigns.filter(c => c.status === 'pendiente').map(c => ({ id: c.id, name: c.clientName, days: c.riskDays, service: c.suggestedService, risk: c.riskLevel }));
          return (
            <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 rounded-xl overflow-hidden flex flex-col">
              <div className="px-6 py-4 border-b border-[#062d32]/8 flex items-center justify-between flex-shrink-0">
                <div>
                  <h2 className="font-serif text-[#062d32] text-base font-semibold leading-none">Clientes en Riesgo</h2>
                  <p className="text-[10px] font-sans text-[#062d32]/35 mt-1">{riskRows.length} detectadas · Selecciona para autorizar al agente</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRiskSel(new Set(riskRows.map(r => r.id)))}
                    className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35 border border-[#062d32]/12 rounded px-3 py-1.5 hover:border-[#062d32]/30 hover:text-[#062d32] transition-all">
                    Seleccionar todo
                  </button>
                  <button disabled={riskSel.size === 0}
                    onClick={handleScan}
                    className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-1.5 rounded flex items-center gap-1.5 hover:opacity-85 transition-opacity disabled:opacity-25">
                    <span className="material-symbols-outlined text-sm">smart_toy</span>
                    Autorizar ({riskSel.size})
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {riskRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <span className="material-symbols-outlined text-3xl text-[#062d32]/10">check_circle</span>
                    <p className="text-[11px] font-sans text-[#062d32]/25">Sin clientes pendientes de autorización</p>
                    <button onClick={handleScan} className="text-[10px] font-sans font-bold uppercase tracking-wider border border-[#062d32]/20 text-[#062d32]/40 rounded px-4 py-2 hover:border-[#062d32] hover:text-[#062d32] transition-all flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">manage_search</span>
                      Escanear ahora
                    </button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-[#062d32]/6">
                      {['', 'Cliente', 'Servicio', 'Riesgo', ''].map((h, i) => (
                        <th key={i} className="px-5 py-3 text-left text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/30">{h}</th>
                      ))}
                    </tr></thead>
                    <tbody className="divide-y divide-[#062d32]/5">
                      {riskRows.map(r => (
                        <tr key={r.id} className={`cursor-pointer transition-colors ${riskSel.has(r.id) ? 'bg-[#062d32]/3' : 'hover:bg-[#fbf9f5]'}`}
                          onClick={() => setRiskSel(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                          <td className="px-5 py-3.5">
                            <span className={`w-4 h-4 border flex items-center justify-center ${riskSel.has(r.id) ? 'bg-[#062d32] border-[#062d32]' : 'border-[#062d32]/20'}`}>
                              {riskSel.has(r.id) && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-[#062d32] text-[9px] font-bold">{initials(r.name)}</div>
                              <span className="font-serif text-[13px] text-[#062d32] font-semibold">{r.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-[11px] font-sans text-[#062d32]/50">{r.service}</td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[9px] font-sans font-bold px-2 py-0.5 rounded-full ${RISK_STYLE[r.risk] || ''}`}>{r.days}d</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <button onClick={e => { e.stopPropagation(); setRiskSel(new Set([r.id])); handleScan(); }}
                              className="text-[9px] font-sans font-bold uppercase tracking-wider border border-[#062d32]/12 text-[#062d32]/40 rounded px-3 py-1.5 hover:border-[#062d32] hover:text-[#062d32] transition-all">
                              Autorizar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── AJUSTES ─────────────────────────────────────────────────────────── */}
        {mode === 'settings' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 rounded-xl overflow-y-auto px-7 py-7">
            <div className="max-w-lg">
              <h2 className="font-serif text-[#062d32] text-lg font-semibold mb-1">Ajustes del Asistente</h2>
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-7 leading-relaxed">Define cómo actúa el agente y qué hace en cada situación.</p>
              <div className="mb-8">
                <h3 className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/35 mb-4 pb-2 border-b border-[#062d32]/8">Comportamiento general</h3>
                <ToggleRow label="Modo autónomo" desc="El agente detecta y contacta clientas en riesgo sin aprobación" value={config.enabled} onChange={v => saveConfig({ enabled: v })} />
                <ToggleRow label="Envío sin revisión" desc="Omite la cola de aprobación manual" value={config.autoSend} onChange={v => saveConfig({ autoSend: v })} />
                <SliderRow label="Días de espera entre contactos" value={config.cooldownDays} min={3} max={60} unit="d" onChange={v => saveConfig({ cooldownDays: v })} />
                <SliderRow label="Máx. mensajes por día" value={config.maxActivePerDay} min={1} max={50} unit="" onChange={v => saveConfig({ maxActivePerDay: v })} />
              </div>
              <div className="mb-8">
                <h3 className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/35 mb-4 pb-2 border-b border-[#062d32]/8">Respuestas por motivo detectado</h3>
                {(Object.entries(ABSENCE) as [AbsenceReason, typeof ABSENCE[AbsenceReason]][]).map(([key, meta]) => {
                  const override = config.absenceActions?.[key];
                  const enabled = override?.enabled !== false;
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-[#062d32]/6 last:border-0">
                      <span className="text-[9px] font-sans font-bold uppercase tracking-wider border border-[#c9a9b5]/50 text-[#c9a9b5] px-2 py-0.5 rounded">{meta.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-sans text-[#062d32]/40">{override?.customAction || meta.action}</span>
                        <button onClick={() => saveConfig({
                          absenceActions: { ...(config.absenceActions || {}), [key]: { ...(override || {}), enabled: !enabled } }
                        })} className={`relative h-4 w-7 rounded-full flex-shrink-0 transition-colors ${enabled ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
                          <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-all ${enabled ? 'left-[14px]' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {tenantSlug && (
                <div>
                  <h3 className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/35 mb-4 pb-2 border-b border-[#062d32]/8">Chat web para clientes</h3>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-[10px] font-sans text-[#062d32]/45 border border-[#062d32]/10 bg-[#fbf9f5] rounded px-3 py-2 truncate">{window.location.origin}/salon/{tenantSlug}/chat</code>
                    <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/salon/${tenantSlug}/chat`).then(() => onToastMessage('✓ Enlace copiado.'))}
                      className="border border-[#062d32]/15 text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40 px-3 py-2 rounded hover:border-[#062d32] hover:text-[#062d32] transition-all whitespace-nowrap">
                      Copiar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ COLUMNA DERECHA — oscura ═════════════════════════════════════════════ */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2 min-h-0">
        {selected ? (
          <>
            {/* Ficha */}
            <div className="bg-[#1c4a4e] rounded-xl px-5 py-5 flex-shrink-0">
              <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-white/30 mb-4">Inteligencia del Cliente</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-white text-xs font-bold flex-shrink-0">
                  {initials(selected.clientName)}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-white text-sm font-semibold leading-none truncate">{selected.clientName}</p>
                  <p className="text-[10px] font-sans text-white/40 mt-0.5">{selected.clientPhone}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="font-sans text-white/40">Sin visita</span>
                  <span className="font-sans font-semibold text-white">{selected.riskDays} días</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="font-sans text-white/40">Riesgo</span>
                  <span className={`font-sans font-bold text-[10px] px-1.5 py-0.5 rounded-full ${RISK_STYLE[selected.riskLevel]}`}>{selected.riskDays}d</span>
                </div>
              </div>
            </div>

            {/* Motivo + acción */}
            {selected.absenceReason && (
              <div className="bg-[#1c4a4e] rounded-xl px-5 py-5 flex-shrink-0">
                <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-white/30 mb-3">Motivo Detectado</p>
                <span className="inline-block text-[9px] font-sans font-bold uppercase tracking-wider border border-[#c9a9b5]/50 text-[#c9a9b5] rounded px-2 py-0.5 mb-2">
                  {ABSENCE[selected.absenceReason].label}
                </span>
                {selected.absenceDetail && (
                  <p className="text-[10px] font-sans text-white/40 leading-relaxed mb-4">{selected.absenceDetail}</p>
                )}
                <button onClick={async () => {
                    if (isDemoMode) { onToastMessage(`Demo: lanzando "${ABSENCE[selected.absenceReason as AbsenceReason]?.action}"`); return; }
                    try {
                      const r = await authFetch(`/api/agent/campaigns/${selected.id}/absence-action`, { method: 'POST' });
                      const data = await r.json();
                      onToastMessage('✓ Mensaje de reconexión generado y en cola para tu aprobación.');
                      loadData();
                    } catch { onToastMessage('Error generando acción.'); }
                  }}
                  className="w-full bg-[#c9a9b5] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider py-2.5 rounded-lg hover:opacity-90 transition-opacity">
                  {ABSENCE[selected.absenceReason as AbsenceReason]?.action ?? 'Lanzar acción'}
                </button>
              </div>
            )}

            {/* Historia */}
            <div className="bg-[#1c4a4e] rounded-xl px-5 py-5 flex-1 overflow-y-auto min-h-0">
              <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-white/30 mb-3">Historia</p>
              <div className="space-y-2.5">
                {selected.conversationLog.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${msg.role === 'agent' ? 'bg-white/25' : 'bg-[#c9a9b5]/70'}`} />
                    <p className="text-[10px] font-sans text-white/45 leading-relaxed line-clamp-2">{msg.text}</p>
                  </div>
                ))}
              </div>

              {/* Categorías */}
              {selected.absenceReason && (
                <div className="mt-4 pt-3 border-t border-white/8">
                  <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-white/25 mb-2">Categorías</p>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[8px] font-sans text-white/50 border border-white/15 rounded-full px-2 py-0.5">{selected.clientName.split(' ')[0]}</span>
                    <span className="text-[8px] font-sans text-white/50 border border-white/15 rounded-full px-2 py-0.5">{ABSENCE[selected.absenceReason].label}</span>
                    <span className="text-[8px] font-sans text-white/50 border border-white/15 rounded-full px-2 py-0.5">Categoría de Reconexión</span>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-[#1c4a4e] rounded-xl flex-1 flex flex-col items-center justify-center px-5 py-8">
            <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-white/20 text-center leading-relaxed">
              Selecciona un cliente para ver su inteligencia
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-[#062d32]/6 last:border-0">
      <div>
        <p className="text-[12px] font-sans text-[#062d32]">{label}</p>
        <p className="text-[10px] font-sans text-[#062d32]/35 mt-0.5">{desc}</p>
      </div>
      <button onClick={() => onChange(!value)} className={`relative h-5 w-9 rounded-full flex-shrink-0 ml-4 transition-colors ${value ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
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
      <input type="range" min={min} max={max} value={value} onChange={e => onChange(Number(e.target.value))} className="w-full accent-[#062d32] h-0.5" />
    </div>
  );
}
