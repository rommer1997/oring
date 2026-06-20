import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';
type CenterPanel = 'chat' | 'campaign' | 'analyze' | 'settings';
type AbsenceReason = 'economia' | 'competencia' | 'autoservicio' | 'tiempo' | 'personal' | null;

interface ExtCampaign extends AgentCampaign {
  absenceReason?: AbsenceReason;
  absenceDetail?: string;
}

const ABSENCE: Record<NonNullable<AbsenceReason>, { label: string; action: string }> = {
  economia:     { label: 'Economía',         action: 'Lanzar oferta de reconexión' },
  competencia:  { label: 'Competencia',      action: 'Enviar propuesta de valor' },
  autoservicio: { label: 'Auto-empleo',      action: 'Destacar diferencial' },
  tiempo:       { label: 'Sin tiempo',       action: 'Recordar en 2 semanas' },
  personal:     { label: 'Situación personal', action: 'Dar espacio · 30 días' },
};

const STATUS_LABEL: Record<AgentCampaignStatus, string> = {
  pendiente: 'Pendiente', enviado: 'Esperando', respondido: 'Respondió',
  reservado: 'Reservado', rechazado: 'Descartado', sin_respuesta: 'Sin respuesta',
};

const STATUS_DOT: Record<AgentCampaignStatus, string> = {
  pendiente: 'bg-amber-400', enviado: 'bg-sky-400', respondido: 'bg-violet-500',
  reservado: 'bg-emerald-500', rechazado: 'bg-[#062d32]/20', sin_respuesta: 'bg-red-400',
};

const STATUS_PRIORITY: Record<AgentCampaignStatus, number> = {
  respondido: 0, pendiente: 1, enviado: 2, sin_respuesta: 3, reservado: 4, rechazado: 5,
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false, autoSend: false, scanIntervalHours: 24,
  minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10,
};

const DEMO: ExtCampaign[] = [
  {
    id: 'd1', tenantId: 'demo', clientId: 'maria-gonzalez',
    clientName: 'María González', clientPhone: '666 111 222',
    riskLevel: 'Crítico', riskDays: 155, suggestedService: 'Mechas Californianas',
    message: '¡Hola María! Te echamos de menos 💙 Han pasado más de 5 meses. ¿Te busco un hueco esta semana?',
    status: 'respondido', autoSend: false, absenceReason: null,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 90 * 60000).toISOString(),
    repliedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastReply: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?',
    conversationLog: [
      { role: 'agent', text: '¡Hola María! Te echamos de menos 💙 Han pasado más de 5 meses desde tus últimas mechas. ¿Te busco un hueco esta semana?', timestamp: new Date(Date.now() - 90 * 60000).toISOString() },
      { role: 'client', text: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
  },
  {
    id: 'd2', tenantId: 'demo', clientId: 'carla-ruiz',
    clientName: 'Carla Ruiz', clientPhone: '666 333 444',
    riskLevel: 'Alto', riskDays: 75, suggestedService: 'Keratina',
    message: 'Hola Carla, ¡qué tal! Llevas 75 días sin tu keratina ¿quieres que reservemos?',
    status: 'pendiente', autoSend: false, absenceReason: 'competencia',
    absenceDetail: 'Menciona que está probando otro salón cerca de casa.',
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    conversationLog: [
      { role: 'agent', text: 'Hola Carla, ¡qué tal! Llevas 75 días sin tu keratina ¿quieres que reservemos?', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
      { role: 'client', text: 'Hola, estoy probando un salón nuevo que abrió cerca... ya veré', timestamp: new Date(Date.now() - 5 * 60000).toISOString() },
    ],
  },
  {
    id: 'd3', tenantId: 'demo', clientId: 'ana-lopez',
    clientName: 'Ana López', clientPhone: '666 555 666',
    riskLevel: 'Crítico', riskDays: 200, suggestedService: 'Coloración',
    message: '¡Hola Ana! Hace ya bastante que no sabemos de ti. Esta semana tenemos hueco.',
    status: 'pendiente', autoSend: false, absenceReason: 'personal',
    absenceDetail: 'Situación familiar complicada, pide comprensión.',
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    conversationLog: [
      { role: 'agent', text: '¡Hola Ana! Hace ya bastante que no sabemos de ti. Esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
      { role: 'client', text: 'Hola, ahora mismo tengo una situación personal complicada, no puedo...', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
      { role: 'agent', text: 'Entendemos perfectamente Ana. Aquí estaremos cuando puedas, sin prisa. Ánimo 💙', timestamp: new Date(Date.now() - 2 * 3600000 + 30000).toISOString() },
    ],
  },
  {
    id: 'd4', tenantId: 'demo', clientId: 'lucia-gomez',
    clientName: 'Lucía Gómez', clientPhone: '666 777 888',
    riskLevel: 'Crítico', riskDays: 120, suggestedService: 'Coloración',
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

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function AgentView({
  onToastMessage, getAuthToken, isDemoMode = false, tenantSlug,
}: AgentViewProps) {
  const [campaigns, setCampaigns] = useState<ExtCampaign[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<ExtCampaign | null>(null);
  const [centerPanel, setCenterPanel] = useState<CenterPanel>('chat');
  const [waStatus, setWAStatus] = useState<WAStatus>('disconnected');
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waPhone, setWAPhone] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState('');
  const [campText, setCampText] = useState('');
  const [campRefined, setCampRefined] = useState('');
  const [campRefining, setCampRefining] = useState(false);
  const [riskSelected, setRiskSelected] = useState<Set<string>>(new Set());
  const [listTab, setListTab] = useState<'todos' | 'conversaciones'>('todos');

  const waSSERef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const authFetch = useCallback(async (url: string, opts: RequestInit = {}) => {
    const token = await getAuthToken();
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
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
      es.onmessage = e => {
        const d = JSON.parse(e.data);
        setWAStatus(d.status); setWAPhone(d.phone ?? null); setWAQR(d.qr ?? null);
      };
      waSSERef.current = es;
    };
    go();
    return () => waSSERef.current?.close();
  }, [isDemoMode, getAuthToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.conversationLog?.length]);

  const handleApprove = (c: ExtCampaign) => {
    if (isDemoMode) {
      const updated = { ...c, status: 'enviado' as AgentCampaignStatus, sentAt: new Date().toISOString() };
      setCampaigns(prev => prev.map(x => x.id === c.id ? updated : x));
      setSelected(updated);
      onToastMessage(`✓ Enviado a ${c.clientName}.`);
    }
  };

  const handleReject = (c: ExtCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rechazado' as AgentCampaignStatus } : x));
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
    await new Promise(r => setTimeout(r, 1200));
    setCampRefined(`${campText.trim()} Esta semana en el salón tenemos un hueco especial para ti. ¡Escríbenos y lo reservamos juntas!`);
    setCampRefining(false);
  };

  const handleWAConnect = async () => {
    if (isDemoMode) { onToastMessage('Demo: escanea el QR en tu móvil.'); return; }
    try { await authFetch('/api/agent/wa-connect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const handleWADisconnect = async () => {
    if (isDemoMode) { setWAStatus('disconnected'); setWAPhone(null); return; }
    try { await authFetch('/api/agent/wa-disconnect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const sorted = [...campaigns].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);
  const listed = listTab === 'conversaciones' ? sorted.filter(c => c.conversationLog.length > 1) : sorted;

  return (
    <div className="flex gap-4 min-h-0" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ── COLUMNA IZQUIERDA: Lista de prioridad ──────────────────────────── */}
      <div className="w-60 flex-shrink-0 flex flex-col gap-3 min-h-0">

        {/* Estado WA */}
        <div className="bg-white border border-[#062d32]/10 px-4 py-3 flex-shrink-0">
          {waStatus === 'connected' ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-[11px] font-sans text-[#062d32]/60 truncate">+{waPhone}</span>
              </div>
              <button onClick={handleWADisconnect}
                className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/30 hover:text-red-500 transition-colors ml-2 flex-shrink-0">
                Salir
              </button>
            </div>
          ) : waStatus === 'qr' && waQR ? (
            <div className="flex flex-col items-center gap-2">
              <img src={waQR} alt="QR" className="w-28 h-28 border border-[#062d32]/10" />
              <p className="text-[9px] text-center font-sans text-[#062d32]/40 leading-relaxed">
                WhatsApp → Dispositivos → Vincular
              </p>
            </div>
          ) : (
            <button onClick={handleWAConnect}
              className="w-full flex items-center justify-center gap-1.5 border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider py-2 hover:bg-[#062d32] hover:text-white transition-all">
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              {waStatus === 'connecting' ? 'Conectando…' : 'Conectar WhatsApp'}
            </button>
          )}
        </div>

        {/* Cabecera lista */}
        <div className="bg-white border border-[#062d32]/10 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#062d32]/8 flex-shrink-0">
            <p className="font-serif text-[#062d32] text-sm font-semibold mb-2">Lista de Prioridad</p>
            <div className="flex gap-1">
              {(['todos', 'conversaciones'] as const).map(t => (
                <button key={t} onClick={() => setListTab(t)}
                  className={`text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-1 transition-all ${
                    listTab === t ? 'bg-[#062d32] text-white' : 'text-[#062d32]/40 hover:text-[#062d32]'
                  }`}>
                  {t === 'todos' ? 'Todos' : 'Activas'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#062d32]/5">
            {loading && (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-[#062d32]/20">sync</span>
              </div>
            )}
            {!loading && listed.length === 0 && (
              <div className="py-10 text-center px-4">
                <p className="text-[10px] text-[#062d32]/25 font-sans">Sin conversaciones</p>
              </div>
            )}
            {listed.map(c => {
              const last = c.conversationLog[c.conversationLog.length - 1];
              const active = selected?.id === c.id;
              return (
                <button key={c.id} onClick={() => { setSelected(c); setCenterPanel('chat'); }}
                  className={`w-full text-left px-4 py-3.5 transition-colors ${active ? 'bg-[#062d32]/5' : 'hover:bg-[#062d32]/[0.02]'}`}>
                  <div className="flex items-start gap-2.5">
                    {/* Avatar */}
                    <div className="w-8 h-8 flex-shrink-0 rounded-full bg-[#c9a9b5]/30 flex items-center justify-center font-sans text-[#062d32] text-[10px] font-bold mt-0.5">
                      {initials(c.clientName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-1 mb-0.5">
                        <span className="font-serif text-[12px] font-semibold text-[#062d32] truncate">{c.clientName}</span>
                        <span className="text-[9px] text-[#062d32]/25 font-sans flex-shrink-0">{timeAgo(last?.timestamp || c.createdAt)}</span>
                      </div>
                      <p className="text-[10px] text-[#062d32]/40 truncate font-sans leading-snug mb-1.5">{last?.text}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[c.status]}`} />
                        <span className="text-[9px] font-sans text-[#062d32]/40">{STATUS_LABEL[c.status]}</span>
                        {c.absenceReason && (
                          <span className="text-[8px] font-sans font-bold text-[#c9a9b5] border border-[#c9a9b5]/40 px-1.5 py-0.5">
                            {ABSENCE[c.absenceReason].label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── COLUMNA CENTRAL ────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-0">

        {/* Tabs de acción */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {([
            { id: 'chat', icon: 'forum', label: 'Conversación' },
            { id: 'campaign', icon: 'campaign', label: 'Lanzar Campaña' },
            { id: 'analyze', icon: 'manage_search', label: 'Analizar Riesgo' },
            { id: 'settings', icon: 'tune', label: 'Ajustes del Asistente' },
          ] as { id: CenterPanel; icon: string; label: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setCenterPanel(tab.id)}
              className={`flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-2 border transition-all ${
                centerPanel === tab.id
                  ? 'bg-[#062d32] text-white border-[#062d32]'
                  : 'border-[#062d32]/15 text-[#062d32]/45 hover:border-[#062d32]/40 hover:text-[#062d32]'
              }`}>
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          {config.enabled && (
            <span className="ml-auto flex items-center gap-1.5 text-[9px] font-sans font-bold uppercase tracking-wider text-emerald-700 border border-emerald-300 px-2.5 py-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Modo autónomo activo
            </span>
          )}
        </div>

        {/* ── CHAT ─────────────────────────────────────────────────────────── */}
        {centerPanel === 'chat' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-3.5 border-b border-[#062d32]/8 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#c9a9b5]/30 flex items-center justify-center font-sans text-[#062d32] text-[10px] font-bold">
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

                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-[#fbf9f5]">
                  {selected.conversationLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[62%] flex flex-col gap-1 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 text-[13px] leading-relaxed font-serif ${
                          msg.role === 'agent'
                            ? 'bg-[#062d32] text-white'
                            : 'bg-white border border-[#062d32]/10 border-l-[3px] border-l-[#c9a9b5] text-[#062d32]'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[9px] text-[#062d32]/25 font-sans px-0.5">{formatHour(msg.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>

                {/* Input / acciones */}
                <div className="flex-shrink-0 border-t border-[#062d32]/8 bg-white px-5 py-4">
                  {selected.status === 'pendiente' && (
                    <div className="flex items-center gap-2 justify-between">
                      <p className="text-[10px] font-sans text-[#062d32]/40 italic flex-1">El agente ha redactado este mensaje — apruébalo para enviarlo</p>
                      <button onClick={() => handleReject(selected)}
                        className="border border-[#062d32]/15 text-[#062d32]/40 text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-2 hover:border-red-300 hover:text-red-500 transition-all">
                        Descartar
                      </button>
                      <button onClick={() => handleApprove(selected)}
                        className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-1.5 hover:opacity-85 transition-opacity">
                        <span className="material-symbols-outlined text-sm">send</span>
                        Enviar por WhatsApp
                      </button>
                    </div>
                  )}
                  {selected.status === 'enviado' && (
                    <div className="flex items-center gap-2 text-[#062d32]/30">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      <span className="text-[11px] font-sans">Esperando respuesta…</span>
                    </div>
                  )}
                  {(selected.status === 'respondido' || selected.status === 'reservado') && (
                    <div className="flex flex-col gap-3">
                      {selected.status === 'respondido' && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[#062d32]/30">
                            <span className="material-symbols-outlined text-sm">smart_toy</span>
                            <span className="text-[11px] font-sans">El agente gestiona la conversación</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40">Modo Autónomo</span>
                              <button onClick={() => saveConfig({ autoSend: !config.autoSend })}
                                className={`relative h-4 w-8 transition-colors ${config.autoSend ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
                                <span className={`absolute top-0.5 h-3 w-3 bg-white transition-all ${config.autoSend ? 'left-[17px]' : 'left-0.5'}`} />
                              </button>
                            </div>
                            <button onClick={() => onToastMessage('Intervención activada.')}
                              className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 hover:bg-[#062d32] hover:text-white transition-all">
                              Intervenir
                            </button>
                          </div>
                        </div>
                      )}
                      {selected.status === 'reservado' && (
                        <div className="flex items-center gap-2 text-emerald-700">
                          <span className="material-symbols-outlined text-sm">event_available</span>
                          <span className="text-[11px] font-sans font-semibold">Cita confirmada</span>
                        </div>
                      )}
                      <div className="flex items-end gap-2 border-t border-[#062d32]/6 pt-3">
                        <textarea value={replyDraft} onChange={e => setReplyDraft(e.target.value)}
                          placeholder="Escribe tu mensaje…" rows={1}
                          className="flex-1 border-b border-[#767676] bg-transparent text-[#062d32] text-[13px] font-serif py-1.5 outline-none resize-none placeholder:text-[#062d32]/20"
                          style={{ maxHeight: '72px', overflowY: 'auto' }} />
                        <button disabled={!replyDraft.trim()}
                          onClick={() => { onToastMessage('Mensaje enviado.'); setReplyDraft(''); }}
                          className="border border-[#062d32] text-[#062d32] p-1.5 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-20 flex-shrink-0">
                          <span className="material-symbols-outlined text-sm">send</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center bg-[#fbf9f5]">
                <div className="w-10 h-10 border border-[#062d32]/10 bg-white flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-lg text-[#062d32]/15">forum</span>
                </div>
                <p className="font-serif text-[#062d32]/25 text-base">Selecciona una conversación</p>
              </div>
            )}
          </div>
        )}

        {/* ── CAMPAÑA MASIVA ─────────────────────────────────────────────────── */}
        {centerPanel === 'campaign' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 overflow-y-auto px-7 py-7">
            <div className="max-w-lg">
              <h2 className="font-serif text-[#062d32] text-lg font-semibold mb-1">Lanzar Campaña Masiva</h2>
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-7 leading-relaxed">
                Escribe la promo o mensaje base — el agente lo adapta para cada cliente antes de enviarlo.
              </p>

              <div className="mb-5">
                <label className="block text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/40 mb-2">Mensaje o promoción</label>
                <textarea value={campText} onChange={e => setCampText(e.target.value)}
                  placeholder="Ej: Esta semana 20% de descuento en mechas para clientas que lleven más de 2 meses sin visitarnos…"
                  rows={4}
                  className="w-full border border-[#062d32]/12 bg-[#fbf9f5] text-[#062d32] text-[13px] font-serif px-4 py-3 outline-none resize-none placeholder:text-[#062d32]/20 focus:border-[#062d32]/30 transition-colors" />
              </div>

              <div className="mb-6">
                <label className="block text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/40 mb-2">Imagen adjunta (opcional)</label>
                <label className="flex items-center gap-3 border border-dashed border-[#062d32]/15 px-4 py-4 cursor-pointer hover:border-[#062d32]/30 transition-colors group">
                  <span className="material-symbols-outlined text-[#062d32]/20 group-hover:text-[#062d32]/40 transition-colors">image</span>
                  <span className="text-[11px] font-sans text-[#062d32]/30">Subir Imagen / Texto</span>
                  <input type="file" accept="image/*" className="hidden" />
                </label>
              </div>

              {!campRefined ? (
                <button onClick={refineCampaign} disabled={!campText.trim() || campRefining}
                  className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-30 mb-6">
                  <span className="material-symbols-outlined text-sm">{campRefining ? 'sync' : 'auto_awesome'}</span>
                  {campRefining ? 'El agente está refinando…' : 'Refinar con Agente IA'}
                </button>
              ) : (
                <div className="border-l-[3px] border-l-[#c9a9b5] bg-[#fbf9f5] px-5 py-4 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[12px] text-[#062d32]/35">smart_toy</span>
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35">Versión del agente</span>
                  </div>
                  <p className="font-serif text-[13px] text-[#062d32] leading-relaxed">{campRefined}</p>
                  <button onClick={() => setCampRefined('')}
                    className="mt-2 text-[9px] font-sans text-[#062d32]/30 hover:text-[#062d32] transition-colors underline underline-offset-2">
                    Volver a editar
                  </button>
                </div>
              )}

              <div className="border border-[#062d32]/10 px-5 py-3.5 mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[12px] font-sans text-[#062d32]">Destinatarios</p>
                  <p className="text-[10px] font-sans text-[#062d32]/35 mt-0.5">{campaigns.length} clientes contactables</p>
                </div>
                <span className="text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35 border border-[#062d32]/12 px-2 py-1">Todos</span>
              </div>

              <button disabled={!(campRefined || campText.trim())}
                onClick={() => { onToastMessage(`✓ Campaña enviada a ${campaigns.length} clientes.`); setCampText(''); setCampRefined(''); setCenterPanel('chat'); }}
                className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-6 py-3 flex items-center gap-2 hover:opacity-85 transition-opacity disabled:opacity-25">
                <span className="material-symbols-outlined text-sm">send</span>
                Enviar por WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* ── ANALIZAR RIESGO ─────────────────────────────────────────────────── */}
        {centerPanel === 'analyze' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[#062d32]/8 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="font-serif text-[#062d32] text-base font-semibold leading-none">Clientes en Riesgo</h2>
                <p className="text-[10px] font-sans text-[#062d32]/35 mt-1">{DEMO_RISK.length} detectadas · Selecciona para autorizar al agente</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRiskSelected(new Set(DEMO_RISK.map(r => r.id)))}
                  className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/35 border border-[#062d32]/12 px-3 py-1.5 hover:border-[#062d32]/30 hover:text-[#062d32] transition-all">
                  Seleccionar todo
                </button>
                <button disabled={riskSelected.size === 0}
                  onClick={() => { onToastMessage(`✓ Agente autorizado para ${riskSelected.size} clientes.`); setRiskSelected(new Set()); }}
                  className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-1.5 flex items-center gap-1.5 hover:opacity-85 transition-opacity disabled:opacity-25">
                  <span className="material-symbols-outlined text-sm">smart_toy</span>
                  Autorizar ({riskSelected.size})
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#062d32]/6">
                    {['', 'Cliente', 'Servicio', 'Riesgo', ''].map((h, i) => (
                      <th key={i} className={`${i === 0 ? 'w-10' : ''} px-5 py-3 text-left text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/30`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#062d32]/5">
                  {DEMO_RISK.map(r => (
                    <tr key={r.id}
                      className={`cursor-pointer transition-colors ${riskSelected.has(r.id) ? 'bg-[#062d32]/3' : 'hover:bg-[#fbf9f5]'}`}
                      onClick={() => setRiskSelected(prev => { const n = new Set(prev); n.has(r.id) ? n.delete(r.id) : n.add(r.id); return n; })}>
                      <td className="px-5 py-3.5">
                        <span className={`w-4 h-4 border flex items-center justify-center ${riskSelected.has(r.id) ? 'bg-[#062d32] border-[#062d32]' : 'border-[#062d32]/20'}`}>
                          {riskSelected.has(r.id) && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-[#062d32] text-[9px] font-bold">
                            {initials(r.name)}
                          </div>
                          <span className="font-serif text-[13px] text-[#062d32] font-semibold">{r.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[11px] font-sans text-[#062d32]/50">{r.service}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[9px] font-sans font-bold uppercase tracking-wider border px-2 py-0.5 ${
                          r.risk === 'Crítico' ? 'border-red-300 text-red-600' : r.risk === 'Alto' ? 'border-amber-300 text-amber-700' : 'border-sky-300 text-sky-700'
                        }`}>
                          {r.risk} · {r.days}d
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={e => { e.stopPropagation(); onToastMessage(`Agente autorizado para ${r.name}.`); }}
                          className="text-[9px] font-sans font-bold uppercase tracking-wider border border-[#062d32]/12 text-[#062d32]/40 px-3 py-1.5 hover:border-[#062d32] hover:text-[#062d32] transition-all">
                          Autorizar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── AJUSTES DEL ASISTENTE ─────────────────────────────────────────── */}
        {centerPanel === 'settings' && (
          <div className="flex-1 min-h-0 bg-white border border-[#062d32]/10 overflow-y-auto px-7 py-7">
            <div className="max-w-lg">
              <h2 className="font-serif text-[#062d32] text-lg font-semibold mb-1">Ajustes del Asistente</h2>
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-7 leading-relaxed">
                Define cómo actúa el agente, qué detecta y qué hace en cada situación.
              </p>

              <ConfigSection title="Comportamiento general">
                <ToggleRow label="Modo autónomo" desc="El agente detecta y contacta clientas en riesgo sin aprobación"
                  value={config.enabled} onChange={v => saveConfig({ enabled: v })} />
                <ToggleRow label="Envío sin revisión" desc="Omite la cola de aprobación manual"
                  value={config.autoSend} onChange={v => saveConfig({ autoSend: v })} />
                <SliderRow label="Días de espera entre contactos" value={config.cooldownDays} min={3} max={60} unit="d" onChange={v => saveConfig({ cooldownDays: v })} />
                <SliderRow label="Máx. mensajes por día" value={config.maxActivePerDay} min={1} max={50} unit="" onChange={v => saveConfig({ maxActivePerDay: v })} />
              </ConfigSection>

              <ConfigSection title="Respuestas automáticas por motivo detectado">
                <p className="text-[10px] font-sans text-[#062d32]/35 mb-4 leading-relaxed">
                  Cuando el agente detecte uno de estos motivos en la respuesta, tomará la acción configurada.
                </p>
                {(Object.entries(ABSENCE) as [NonNullable<AbsenceReason>, typeof ABSENCE[NonNullable<AbsenceReason>]][]).map(([key, meta]) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-[#062d32]/6 last:border-0">
                    <span className="text-[9px] font-sans font-bold uppercase tracking-wider border border-[#c9a9b5]/50 text-[#c9a9b5] px-2 py-0.5">{meta.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-sans text-[#062d32]/40">{meta.action}</span>
                      <button onClick={() => onToastMessage(`Configuración de "${meta.label}" — próximamente.`)}
                        className="text-[#062d32]/20 hover:text-[#062d32] transition-colors">
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </ConfigSection>

              {tenantSlug && (
                <ConfigSection title="Chat web para clientes">
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-[10px] font-sans text-[#062d32]/45 border border-[#062d32]/10 bg-[#fbf9f5] px-3 py-2 truncate">
                      {window.location.origin}/salon/{tenantSlug}/chat
                    </code>
                    <button onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/salon/${tenantSlug}/chat`).then(() => onToastMessage('✓ Enlace copiado.'))}
                      className="border border-[#062d32]/15 text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40 px-3 py-2 hover:border-[#062d32] hover:text-[#062d32] transition-all whitespace-nowrap">
                      Copiar
                    </button>
                  </div>
                </ConfigSection>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── COLUMNA DERECHA: Inteligencia del cliente ───────────────────────── */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-3 min-h-0">
        {selected ? (
          <>
            {/* Ficha del cliente */}
            <div className="bg-white border border-[#062d32]/10 px-5 py-5 flex-shrink-0">
              <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30 mb-4">Inteligencia del Cliente</p>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#c9a9b5]/25 flex items-center justify-center font-sans text-[#062d32] text-xs font-bold flex-shrink-0">
                  {initials(selected.clientName)}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-[#062d32] text-sm font-semibold leading-none truncate">{selected.clientName}</p>
                  <p className="text-[10px] font-sans text-[#062d32]/40 mt-0.5">{selected.clientPhone}</p>
                </div>
              </div>
              <div className="space-y-2 text-[11px]">
                <div className="flex justify-between">
                  <span className="font-sans text-[#062d32]/40">Sin visita</span>
                  <span className="font-sans font-semibold text-[#062d32]">{selected.riskDays} días</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#062d32]/40">Servicio</span>
                  <span className="font-sans font-semibold text-[#062d32] text-right text-[10px] max-w-[100px] truncate">{selected.suggestedService}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans text-[#062d32]/40">Riesgo</span>
                  <span className={`font-sans font-bold text-[10px] ${selected.riskLevel === 'Crítico' ? 'text-red-600' : 'text-amber-600'}`}>
                    {selected.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Motivo detectado */}
            {selected.absenceReason ? (
              <div className="bg-white border border-[#062d32]/10 px-5 py-5 flex-shrink-0">
                <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30 mb-3">Motivo Detectado</p>
                <span className="inline-block text-[9px] font-sans font-bold uppercase tracking-wider border border-[#c9a9b5]/50 text-[#c9a9b5] px-2 py-0.5 mb-3">
                  {ABSENCE[selected.absenceReason].label}
                </span>
                {selected.absenceDetail && (
                  <p className="text-[10px] font-sans text-[#062d32]/45 leading-relaxed mb-4">{selected.absenceDetail}</p>
                )}
                <button
                  onClick={() => onToastMessage(`Acción lanzada: ${ABSENCE[selected.absenceReason!].action}`)}
                  className="w-full bg-[#062d32] text-white text-[9px] font-sans font-bold uppercase tracking-wider py-2.5 hover:opacity-85 transition-opacity">
                  {ABSENCE[selected.absenceReason].action}
                </button>
              </div>
            ) : (
              <div className="bg-white border border-[#062d32]/10 px-5 py-5 flex-shrink-0">
                <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30 mb-2">Motivo Detectado</p>
                <p className="text-[10px] font-sans text-[#062d32]/25 leading-relaxed">El agente analizará la respuesta del cliente para detectar el motivo de ausencia.</p>
              </div>
            )}

            {/* Historia */}
            <div className="bg-white border border-[#062d32]/10 px-5 py-5 flex-1 overflow-y-auto">
              <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/30 mb-3">Historia</p>
              <div className="space-y-3">
                {selected.conversationLog.map((msg, i) => (
                  <div key={i} className="flex gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${msg.role === 'agent' ? 'bg-[#062d32]/30' : 'bg-[#c9a9b5]'}`} />
                    <p className="text-[10px] font-sans text-[#062d32]/50 leading-relaxed line-clamp-2">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white border border-[#062d32]/10 flex-1 flex flex-col items-center justify-center px-5 py-8">
            <p className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/20 text-center leading-relaxed">
              Selecciona un cliente para ver su inteligencia
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function ConfigSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-[9px] font-sans font-bold uppercase tracking-[0.1em] text-[#062d32]/35 mb-4 pb-2 border-b border-[#062d32]/8">{title}</h3>
      {children}
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
      <button onClick={() => onChange(!value)}
        className={`relative h-5 w-9 flex-shrink-0 ml-4 transition-colors ${value ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}>
        <span className={`absolute top-0.5 h-4 w-4 bg-white transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function SliderRow({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
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
