import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

const STATUS_BADGE: Record<AgentCampaignStatus, { label: string; color: string }> = {
  pendiente:     { label: 'Pendiente',      color: 'text-amber-700 bg-amber-50 border-amber-200' },
  enviado:       { label: 'Enviado',        color: 'text-blue-700 bg-blue-50 border-blue-200' },
  respondido:    { label: 'Respondió',      color: 'text-violet-700 bg-violet-50 border-violet-200' },
  reservado:     { label: 'Reservado',      color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  rechazado:     { label: 'Descartado',     color: 'text-[#062d32]/40 bg-[#062d32]/5 border-[#062d32]/10' },
  sin_respuesta: { label: 'Sin respuesta',  color: 'text-red-700 bg-red-50 border-red-200' },
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false, autoSend: false, scanIntervalHours: 24,
  minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10,
};

const DEMO_CAMPAIGNS: AgentCampaign[] = [
  {
    id: 'demo-1', tenantId: 'demo', clientId: 'carmen-ruiz',
    clientName: 'Carmen Ruiz', clientPhone: '666111222',
    riskLevel: 'Crítico', riskDays: 155, suggestedService: 'Mechas Californianas',
    message: '¡Hola Carmen! Te echamos de menos por el salón 💙 Han pasado más de 5 meses desde tus últimas mechas. ¿Te apetece que te busquemos un hueco esta semana?',
    status: 'respondido', autoSend: false,
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 90 * 60000).toISOString(),
    repliedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    lastReply: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?',
    conversationLog: [
      { role: 'agent', text: '¡Hola Carmen! Te echamos de menos por el salón 💙 Han pasado más de 5 meses desde tus últimas mechas. ¿Te apetece que te busquemos un hueco esta semana?', timestamp: new Date(Date.now() - 90 * 60000).toISOString() },
      { role: 'client', text: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?', timestamp: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
  },
  {
    id: 'demo-2', tenantId: 'demo', clientId: 'sofia-martin',
    clientName: 'Sofía Martín', clientPhone: '666333444',
    riskLevel: 'Alto', riskDays: 75, suggestedService: 'Keratina Brasileña',
    message: 'Hola Sofía, ¡qué tal llevas el verano! Ya han pasado 75 días desde tu keratina. ¿Quieres que te reservemos?',
    status: 'pendiente', autoSend: false,
    createdAt: new Date(Date.now() - 10 * 60000).toISOString(),
    conversationLog: [
      { role: 'agent', text: 'Hola Sofía, ¡qué tal llevas el verano! Ya han pasado 75 días desde tu keratina. ¿Quieres que te reservemos?', timestamp: new Date(Date.now() - 10 * 60000).toISOString() },
    ],
  },
  {
    id: 'demo-3', tenantId: 'demo', clientId: 'lucia-gomez',
    clientName: 'Lucía Gómez', clientPhone: '666555666',
    riskLevel: 'Crítico', riskDays: 200, suggestedService: 'Coloración',
    message: '¡Hola Lucía! Hace ya bastante que no sabemos de ti. Esta semana tenemos hueco. ¿Te cuento las novedades?',
    status: 'reservado', autoSend: true,
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 23 * 3600000).toISOString(),
    repliedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
    lastReply: 'Perfecto, el viernes a las 10 me va genial',
    conversationLog: [
      { role: 'agent', text: '¡Hola Lucía! Hace ya bastante que no sabemos de ti. Esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 23 * 3600000).toISOString() },
      { role: 'client', text: 'Hola! Sí me gustaría volver, ¿tenéis el viernes?', timestamp: new Date(Date.now() - 21 * 3600000).toISOString() },
      { role: 'agent', text: '¡Perfecto! El viernes tenemos a las 10:00, 11:30 o 16:00. ¿Cuál te viene mejor?', timestamp: new Date(Date.now() - 21 * 3600000 + 60000).toISOString() },
      { role: 'client', text: 'Perfecto, el viernes a las 10 me va genial', timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
      { role: 'agent', text: '¡Anotado! Lucía, el viernes a las 10:00 para Coloración. Te esperamos 💙', timestamp: new Date(Date.now() - 20 * 3600000 + 30000).toISOString() },
    ],
  },
  {
    id: 'demo-4', tenantId: 'demo', clientId: 'marta-ig',
    clientName: 'Marta Iglesias', clientPhone: '666777888',
    riskLevel: 'Alto', riskDays: 45, suggestedService: 'Manicura Semipermanente',
    message: '¡Hola Marta! ¿Qué tal? Ya va siendo hora de mimar esas manos 💅 ¿Te apetece venir esta semana?',
    status: 'enviado', autoSend: true,
    createdAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    sentAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    conversationLog: [
      { role: 'agent', text: '¡Hola Marta! ¿Qué tal? Ya va siendo hora de mimar esas manos 💅 ¿Te apetece venir esta semana?', timestamp: new Date(Date.now() - 3 * 3600000).toISOString() },
    ],
  },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

export default function AgentView({ onToastMessage, getAuthToken, isDemoMode = false, tenantSlug }: AgentViewProps) {
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<AgentCampaign | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [waStatus, setWAStatus] = useState<WAStatus>('disconnected');
  const [waQR, setWAQR] = useState<string | null>(null);
  const [waPhone, setWAPhone] = useState<string | null>(null);
  const [filter, setFilter] = useState<AgentCampaignStatus | 'todas'>('todas');
  const waSSERef = useRef<EventSource | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getAuthToken();
    return fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
  }, [getAuthToken]);

  const loadData = useCallback(async () => {
    if (isDemoMode) {
      setCampaigns(DEMO_CAMPAIGNS);
      setConfig({ ...DEFAULT_CONFIG, enabled: true, autoSend: false });
      return;
    }
    setLoading(true);
    try {
      const [campRes, cfgRes] = await Promise.all([
        authFetch('/api/agent/campaigns'),
        authFetch('/api/agent/config'),
      ]);
      if (campRes.ok) setCampaigns(await campRes.json());
      if (cfgRes.ok) setConfig(await cfgRes.json());
    } catch { onToastMessage('Error cargando datos.'); }
    finally { setLoading(false); }
  }, [isDemoMode, authFetch, onToastMessage]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (isDemoMode) { setWAStatus('connected'); setWAPhone('34666123456'); return; }
    const connectSSE = async () => {
      const token = await getAuthToken();
      if (!token) return;
      const es = new EventSource(`/api/agent/wa-status?token=${token}`);
      es.onmessage = (e) => {
        const d = JSON.parse(e.data);
        setWAStatus(d.status); setWAPhone(d.phone || null); setWAQR(d.qr || null);
      };
      waSSERef.current = es;
    };
    connectSSE();
    return () => waSSERef.current?.close();
  }, [isDemoMode, getAuthToken]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.conversationLog?.length]);

  const handleWAConnect = async () => {
    if (isDemoMode) { onToastMessage('Demo: escanea el QR con tu móvil para conectar.'); return; }
    try { await authFetch('/api/agent/wa-connect', { method: 'POST' }); } catch { onToastMessage('Error de red.'); }
  };

  const handleWADisconnect = async () => {
    if (isDemoMode) { setWAStatus('disconnected'); setWAPhone(null); return; }
    try { await authFetch('/api/agent/wa-disconnect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const handleScan = async () => {
    if (isDemoMode) { onToastMessage('Demo: agente escaneó 4 clientas en riesgo.'); return; }
    setScanning(true);
    try {
      const res = await authFetch('/api/agent/scan', { method: 'POST' });
      const d = await res.json();
      if (res.ok) { onToastMessage(`✓ ${d.queued} mensajes generados de ${d.scanned} clientas escaneadas.`); loadData(); }
    } catch { onToastMessage('Error al escanear.'); }
    finally { setScanning(false); }
  };

  const handleApprove = async (c: AgentCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'enviado', sentAt: new Date().toISOString() } : x));
      setSelected(prev => prev?.id === c.id ? { ...prev, status: 'enviado' } : prev);
      onToastMessage(`✓ Mensaje enviado a ${c.clientName}.`);
      return;
    }
    await authFetch(`/api/agent/campaigns/${c.id}/approve`, { method: 'POST' });
    onToastMessage(`✓ Enviado a ${c.clientName}.`);
    loadData();
  };

  const handleReject = async (c: AgentCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rechazado' } : x));
      setSelected(null);
      return;
    }
    await authFetch(`/api/agent/campaigns/${c.id}/reject`, { method: 'POST' });
    loadData(); setSelected(null);
  };

  const saveConfig = async (patch: Partial<AgentConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (!isDemoMode) {
      try { await authFetch('/api/agent/config', { method: 'PUT', body: JSON.stringify(next) }); }
      catch { onToastMessage('Error guardando config.'); }
    }
  };

  const filtered = filter === 'todas' ? campaigns : campaigns.filter(c => c.status === filter);
  const chatUrl = tenantSlug ? `${window.location.origin}/salon/${tenantSlug}/chat` : null;

  return (
    <div className="flex gap-6 h-[calc(100vh-112px)] min-h-0">

      {/* ── Lista de conversaciones ──────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col bg-white border border-[#062d32]/10 overflow-hidden">

        {/* Cabecera */}
        <div className="px-5 py-4 border-b border-[#062d32]/10 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-[#062d32] text-lg font-semibold leading-none">WhatsApp</h2>
            <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-[#062d32]/40 mt-1">
              {waStatus === 'connected'
                ? <span className="text-emerald-600">● Conectado · +{waPhone}</span>
                : <span className="text-[#062d32]/40">Sin conexión</span>
              }
            </p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <button
              onClick={handleScan}
              disabled={scanning || !config.enabled}
              title="Detectar clientas en riesgo"
              className="w-7 h-7 flex items-center justify-center text-[#062d32]/40 hover:text-[#062d32] transition-colors disabled:opacity-30"
            >
              <span className="material-symbols-outlined text-[18px]">{scanning ? 'sync' : 'radar'}</span>
            </button>
            <button
              onClick={() => setShowConfig(v => !v)}
              title="Configuración"
              className={`w-7 h-7 flex items-center justify-center transition-colors ${showConfig ? 'text-[#062d32]' : 'text-[#062d32]/40 hover:text-[#062d32]'}`}
            >
              <span className="material-symbols-outlined text-[18px]">settings</span>
            </button>
          </div>
        </div>

        {/* Conexión WhatsApp */}
        {waStatus !== 'connected' && (
          <div className="px-4 py-3 border-b border-[#062d32]/10 bg-[#fbf9f5]">
            {waStatus === 'qr' && waQR ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <img src={waQR} alt="QR" className="w-36 h-36 border border-[#062d32]/10 p-1 bg-white" />
                <p className="text-[10px] text-[#062d32]/50 text-center font-sans leading-relaxed">
                  WhatsApp → Dispositivos vinculados → Vincular
                </p>
              </div>
            ) : (
              <button
                onClick={handleWAConnect}
                className="w-full border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-[0.08em] py-2.5 flex items-center justify-center gap-2 hover:bg-[#062d32] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                {waStatus === 'connecting' ? 'Conectando…' : 'Conectar WhatsApp'}
              </button>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-[#062d32]/10">
          {(['todas', 'pendiente', 'respondido', 'reservado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-[9px] font-sans font-bold uppercase tracking-wider px-2 py-1 border transition-all ${
                filter === f
                  ? 'bg-[#062d32] text-white border-[#062d32]'
                  : 'text-[#062d32]/50 border-[#062d32]/15 hover:border-[#062d32]/30 hover:text-[#062d32]'
              }`}
            >
              {f === 'todas' ? 'Todas' : STATUS_BADGE[f]?.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-[#062d32]/6">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <span className="material-symbols-outlined animate-spin text-[#062d32]/20 text-xl">sync</span>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-5 py-10 text-center">
              <span className="material-symbols-outlined text-2xl text-[#062d32]/15 block mb-2">chat_bubble_outline</span>
              <p className="text-[11px] text-[#062d32]/30 font-sans">Sin conversaciones</p>
            </div>
          )}
          {filtered.map(c => {
            const last = c.conversationLog[c.conversationLog.length - 1];
            const isActive = selected?.id === c.id;
            const badge = STATUS_BADGE[c.status];
            return (
              <button
                key={c.id}
                onClick={() => { setSelected(c); setShowConfig(false); }}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors ${
                  isActive ? 'bg-[#062d32]/5' : 'hover:bg-[#062d32]/[0.02]'
                }`}
              >
                {/* Inicial */}
                <div className="w-9 h-9 flex-shrink-0 bg-[#c9a9b5]/25 flex items-center justify-center text-[#062d32] font-serif font-semibold text-sm">
                  {c.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-0.5 gap-1">
                    <span className="font-serif text-[13px] text-[#062d32] font-semibold truncate">{c.clientName}</span>
                    <span className="text-[9px] text-[#062d32]/35 font-sans flex-shrink-0">{timeAgo(last?.timestamp || c.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#062d32]/45 truncate font-sans leading-snug mb-1.5">{last?.text}</p>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-sans font-bold uppercase tracking-wide px-1.5 py-0.5 border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className={`text-[9px] font-sans font-bold ${c.riskLevel === 'Crítico' ? 'text-red-500' : 'text-amber-600'}`}>
                      {c.riskLevel} {c.riskDays}d
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Enlace chat web */}
        {chatUrl && (
          <div className="px-4 py-3 border-t border-[#062d32]/10">
            <button
              onClick={() => navigator.clipboard?.writeText(chatUrl).then(() => onToastMessage('✓ Enlace del chat copiado.'))}
              className="w-full text-[9px] font-sans font-bold uppercase tracking-wider text-[#062d32]/40 hover:text-[#062d32] flex items-center justify-center gap-1.5 py-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">link</span>
              Copiar enlace chat web
            </button>
          </div>
        )}
      </div>

      {/* ── Panel derecho ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col bg-white border border-[#062d32]/10 overflow-hidden">

        {selected ? (
          <>
            {/* Cabecera conversación */}
            <div className="px-6 py-4 border-b border-[#062d32]/10 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-[#c9a9b5]/25 flex items-center justify-center text-[#062d32] font-serif font-semibold text-sm">
                  {selected.clientName.charAt(0)}
                </div>
                <div>
                  <p className="font-serif text-[#062d32] text-base font-semibold leading-none">{selected.clientName}</p>
                  <p className="text-[10px] text-[#062d32]/40 font-sans mt-0.5 uppercase tracking-wide">
                    {selected.clientPhone} · {selected.suggestedService}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-sans font-bold uppercase tracking-wide px-2 py-1 border ${STATUS_BADGE[selected.status].color}`}>
                  {STATUS_BADGE[selected.status].label}
                </span>
                {waStatus === 'connected' && (
                  <button
                    onClick={handleWADisconnect}
                    title="Desconectar WhatsApp"
                    className="w-7 h-7 flex items-center justify-center text-[#062d32]/30 hover:text-[#062d32] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">phone_disabled</span>
                  </button>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="w-7 h-7 flex items-center justify-center text-[#062d32]/30 hover:text-[#062d32] transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            </div>

            {/* Hilo de mensajes */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 bg-[#fbf9f5]">
              {/* Contexto de riesgo */}
              <div className="flex justify-center mb-2">
                <span className={`text-[9px] font-sans font-bold uppercase tracking-wider px-3 py-1 border ${
                  selected.riskLevel === 'Crítico' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                }`}>
                  {selected.riskLevel} · {selected.riskDays} días sin visita · {selected.suggestedService}
                </span>
              </div>

              {selected.conversationLog.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[60%] flex flex-col gap-1 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                    <div className={`px-4 py-3 text-[13px] leading-relaxed font-serif ${
                      msg.role === 'agent'
                        ? 'bg-[#062d32] text-white'
                        : 'bg-white border border-[#062d32]/12 text-[#062d32] border-l-2 border-l-[#c9a9b5]'
                    }`}>
                      {msg.text}
                    </div>
                    <span className="text-[9px] text-[#062d32]/30 font-sans px-0.5">
                      {msg.role === 'agent' ? 'Agente' : selected.clientName} · {formatHour(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Barra de acciones */}
            <div className="flex-shrink-0 border-t border-[#062d32]/10 bg-white px-6 py-4">
              {selected.status === 'pendiente' && (
                <div className="flex items-center gap-3">
                  <p className="flex-1 text-[11px] font-sans text-[#062d32]/50 italic">
                    El agente redactó este mensaje — revísalo antes de enviar
                  </p>
                  <button
                    onClick={() => handleReject(selected)}
                    className="border border-[#062d32]/20 text-[#062d32]/50 text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:border-red-300 hover:text-red-600 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => handleApprove(selected)}
                    className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2 flex items-center gap-2 hover:opacity-85 transition-opacity"
                  >
                    <span className="material-symbols-outlined text-[13px]">send</span>
                    Enviar
                  </button>
                </div>
              )}
              {selected.status === 'enviado' && (
                <div className="flex items-center gap-2 text-[#062d32]/40">
                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                  <span className="text-[11px] font-sans">Esperando respuesta de {selected.clientName}…</span>
                </div>
              )}
              {selected.status === 'respondido' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#062d32]/40">
                    <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                    <span className="text-[11px] font-sans">El agente gestiona esta conversación</span>
                  </div>
                  <button
                    onClick={() => onToastMessage('Intervención activada — el agente pausará esta conversación.')}
                    className="border border-[#062d32]/20 text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#062d32] hover:text-white transition-all"
                  >
                    Intervenir
                  </button>
                </div>
              )}
              {selected.status === 'reservado' && (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-emerald-600">event_available</span>
                  <span className="text-[11px] font-sans font-semibold text-emerald-700">Cita confirmada por el agente</span>
                </div>
              )}
              {selected.status === 'rechazado' && (
                <div className="flex items-center gap-2 text-[#062d32]/25">
                  <span className="material-symbols-outlined text-[15px]">block</span>
                  <span className="text-[11px] font-sans">Mensaje descartado</span>
                </div>
              )}
            </div>
          </>
        ) : showConfig ? (
          /* Configuración */
          <div className="flex-1 overflow-y-auto px-8 py-8">
            <h3 className="font-serif text-[#062d32] text-xl font-semibold mb-6">Configuración del agente</h3>
            <div className="max-w-sm space-y-0 divide-y divide-[#062d32]/8">
              {[
                { label: 'Agente activo', key: 'enabled' as const, desc: `Escanea cada ${config.scanIntervalHours}h y genera mensajes` },
                { label: 'Envío automático', key: 'autoSend' as const, desc: 'Envía sin aprobación manual' },
              ].map(({ label, key, desc }) => (
                <div key={key} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-sm font-sans text-[#062d32]">{label}</p>
                    <p className="text-[10px] text-[#062d32]/40 font-sans mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => saveConfig({ [key]: !config[key] })}
                    className={`relative h-5 w-9 flex-shrink-0 transition-colors ${config[key] ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white transition-all ${config[key] ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
              {[
                { label: 'Días entre contactos', key: 'cooldownDays' as const, min: 1, max: 60, unit: 'd' },
                { label: 'Máximo por día', key: 'maxActivePerDay' as const, min: 1, max: 50, unit: '' },
              ].map(({ label, key, min, max, unit }) => (
                <div key={key} className="py-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-[12px] font-sans text-[#062d32]">{label}</span>
                    <span className="text-[12px] font-sans font-bold text-[#062d32]">{config[key]}{unit}</span>
                  </div>
                  <input type="range" min={min} max={max} value={config[key]}
                    onChange={e => saveConfig({ [key]: Number(e.target.value) })}
                    className="w-full accent-[#062d32] h-0.5" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center bg-[#fbf9f5]">
            <div className="w-12 h-12 border border-[#062d32]/10 flex items-center justify-center mb-4 bg-white">
              <span className="material-symbols-outlined text-xl text-[#062d32]/25">forum</span>
            </div>
            <p className="font-serif text-[#062d32]/35 text-lg mb-1">Selecciona una conversación</p>
            <p className="text-[11px] text-[#062d32]/25 font-sans">
              o pulsa <span className="font-bold">radar</span> para detectar clientas en riesgo
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
