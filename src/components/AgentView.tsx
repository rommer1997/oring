import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

const STATUS_BADGE: Record<AgentCampaignStatus, { label: string; dot: string }> = {
  pendiente:    { label: 'Pendiente',   dot: 'bg-amber-400' },
  enviado:      { label: 'Enviado',     dot: 'bg-blue-400' },
  respondido:   { label: 'Respondió',   dot: 'bg-violet-400' },
  reservado:    { label: 'Reservado',   dot: 'bg-emerald-500' },
  rechazado:    { label: 'Descartado',  dot: 'bg-gray-300' },
  sin_respuesta:{ label: 'Sin respuesta', dot: 'bg-red-400' },
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

  // SSE estado WhatsApp
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

  // ── Layout WhatsApp-style ──────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden -mx-4 -my-0" style={{ height: 'calc(100vh - 64px)' }}>

      {/* ── Panel izquierdo ─────────────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-[#062d32]/10 bg-white">

        {/* Header izquierdo */}
        <div className="bg-[#062d32] px-4 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-serif text-white text-lg font-semibold leading-none">WhatsApp</h2>
            <p className="text-[10px] font-sans uppercase tracking-[0.1em] text-[#c9a9b5] mt-0.5">
              {waStatus === 'connected' ? `+${waPhone}` : 'Sin conexión'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleScan}
              disabled={scanning || !config.enabled}
              title="Escanear clientas en riesgo"
              className="text-[#c9a9b5] hover:text-white transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-xl">{scanning ? 'sync' : 'radar'}</span>
            </button>
            <button onClick={() => setShowConfig(v => !v)} title="Configuración" className="text-[#c9a9b5] hover:text-white transition-colors">
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
        </div>

        {/* Estado de conexión */}
        {waStatus !== 'connected' && (
          <div className="px-4 py-3 border-b border-[#062d32]/8 bg-[#fbf9f5]">
            {waStatus === 'qr' && waQR ? (
              <div className="flex flex-col items-center gap-2">
                <img src={waQR} alt="QR" className="w-40 h-40 border border-[#062d32]/10 p-1.5 bg-white" />
                <p className="text-[10px] text-[#062d32]/60 text-center font-sans leading-relaxed">
                  WhatsApp → Dispositivos vinculados → Vincular dispositivo
                </p>
              </div>
            ) : (
              <button
                onClick={handleWAConnect}
                className="w-full border border-[#062d32] text-[#062d32] text-[11px] font-sans font-bold uppercase tracking-wider py-2.5 flex items-center justify-center gap-2 hover:bg-[#062d32] hover:text-white transition-all"
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                {waStatus === 'connecting' ? 'Conectando…' : 'Conectar WhatsApp'}
              </button>
            )}
          </div>
        )}

        {/* Filtros rápidos */}
        <div className="flex overflow-x-auto gap-1 px-3 py-2.5 border-b border-[#062d32]/8 scrollbar-hide">
          {(['todas', 'pendiente', 'enviado', 'respondido', 'reservado'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-shrink-0 text-[10px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 transition-all ${
                filter === f
                  ? 'bg-[#062d32] text-white'
                  : 'text-[#062d32]/50 hover:text-[#062d32] border border-transparent hover:border-[#062d32]/20'
              }`}
            >
              {f === 'todas' ? 'Todas' : STATUS_BADGE[f]?.label}
            </button>
          ))}
        </div>

        {/* Lista de conversaciones */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined animate-spin text-[#062d32]/30 text-2xl">sync</span>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-6 py-12 text-center">
              <span className="material-symbols-outlined text-3xl text-[#062d32]/20 block mb-2">chat_bubble_outline</span>
              <p className="text-xs text-[#062d32]/40 font-sans">Sin conversaciones</p>
            </div>
          )}
          {filtered.map(c => {
            const last = c.conversationLog[c.conversationLog.length - 1];
            const isActive = selected?.id === c.id;
            const badge = STATUS_BADGE[c.status];
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3.5 border-b border-[#062d32]/6 flex items-start gap-3 transition-colors ${
                  isActive ? 'bg-[#062d32]/6' : 'hover:bg-[#062d32]/3'
                }`}
              >
                {/* Avatar inicial */}
                <div className="w-10 h-10 flex-shrink-0 bg-[#c9a9b5]/30 flex items-center justify-center text-[#062d32] font-serif font-semibold text-sm">
                  {c.clientName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-sans font-semibold text-[13px] text-[#062d32] truncate">{c.clientName}</span>
                    <span className="text-[10px] text-[#062d32]/40 font-sans flex-shrink-0 ml-2">{timeAgo(last?.timestamp || c.createdAt)}</span>
                  </div>
                  <p className="text-[12px] text-[#062d32]/55 truncate font-sans leading-snug">{last?.text}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                    <span className="text-[10px] text-[#062d32]/40 font-sans">{badge.label}</span>
                    <span className="text-[10px] text-[#062d32]/30 font-sans">·</span>
                    <span className={`text-[10px] font-sans font-bold ${c.riskLevel === 'Crítico' ? 'text-red-500' : 'text-orange-500'}`}>
                      {c.riskLevel} {c.riskDays}d
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Chat web link */}
        {chatUrl && (
          <div className="px-3 py-3 border-t border-[#062d32]/8">
            <button
              onClick={() => navigator.clipboard?.writeText(chatUrl).then(() => onToastMessage('✓ Enlace del chat copiado.'))}
              className="w-full text-[10px] font-sans font-bold uppercase tracking-wider text-[#062d32]/50 hover:text-[#062d32] flex items-center justify-center gap-1.5 py-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              Copiar enlace chat web
            </button>
          </div>
        )}
      </div>

      {/* ── Panel derecho: chat ─────────────────────────────────────────────── */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 bg-[#f0ece4]" style={{ backgroundImage: 'radial-gradient(circle, rgba(6,45,50,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>

          {/* Header chat */}
          <div className="bg-[#062d32] px-5 py-3.5 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#c9a9b5]/20 flex items-center justify-center text-[#c9a9b5] font-serif font-semibold text-sm">
                {selected.clientName.charAt(0)}
              </div>
              <div>
                <p className="font-sans font-semibold text-white text-sm leading-none">{selected.clientName}</p>
                <p className="text-[10px] text-[#c9a9b5] font-sans mt-0.5">{selected.clientPhone} · {selected.suggestedService}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {waStatus === 'connected' && (
                <button onClick={handleWADisconnect} title="Desconectar" className="text-[#c9a9b5]/60 hover:text-[#c9a9b5] transition-colors">
                  <span className="material-symbols-outlined text-base">phone_disabled</span>
                </button>
              )}
              <button onClick={() => setSelected(null)} className="text-[#c9a9b5]/60 hover:text-[#c9a9b5] transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
            {/* Badge de riesgo */}
            <div className="flex justify-center mb-4">
              <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1 ${
                selected.riskLevel === 'Crítico' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
              }`}>
                {selected.riskLevel} · {selected.riskDays} días sin visita · {selected.suggestedService}
              </span>
            </div>

            {selected.conversationLog.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[65%] flex flex-col gap-0.5 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                  <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed font-sans shadow-sm ${
                    msg.role === 'agent'
                      ? 'bg-[#062d32] text-white'
                      : 'bg-white text-[#062d32] border-l-2 border-[#c9a9b5]'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-[#062d32]/35 font-sans px-0.5">{formatHour(msg.timestamp)}</span>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Barra inferior de acciones */}
          <div className="bg-white border-t border-[#062d32]/10 px-5 py-4 flex-shrink-0">
            {selected.status === 'pendiente' && (
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-[#fbf9f5] border border-[#062d32]/10 px-4 py-2.5 text-[12px] text-[#062d32]/40 font-sans italic">
                  El agente redactó este mensaje para ti
                </div>
                <button
                  onClick={() => handleReject(selected)}
                  className="border border-[#062d32]/20 text-[#062d32]/50 text-[11px] font-sans font-bold uppercase tracking-wider px-4 py-2.5 hover:border-red-300 hover:text-red-600 transition-all"
                >
                  Descartar
                </button>
                <button
                  onClick={() => handleApprove(selected)}
                  className="bg-[#062d32] text-white text-[11px] font-sans font-bold uppercase tracking-wider px-5 py-2.5 flex items-center gap-2 hover:bg-[#062d32]/85 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  Enviar
                </button>
              </div>
            )}
            {selected.status === 'enviado' && (
              <div className="flex items-center gap-3 text-[#062d32]/50">
                <span className="material-symbols-outlined text-base">schedule</span>
                <span className="text-[12px] font-sans">Esperando respuesta de {selected.clientName}…</span>
              </div>
            )}
            {selected.status === 'respondido' && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#062d32]/50">
                  <span className="material-symbols-outlined text-base text-violet-500">smart_toy</span>
                  <span className="text-[12px] font-sans">El agente gestiona la conversación</span>
                </div>
                <button
                  onClick={() => onToastMessage('Intervención activada — el agente pausará esta conversación.')}
                  className="border border-[#062d32]/20 text-[#062d32] text-[11px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#062d32] hover:text-white transition-all"
                >
                  Intervenir
                </button>
              </div>
            )}
            {selected.status === 'reservado' && (
              <div className="flex items-center gap-2 text-emerald-700">
                <span className="material-symbols-outlined text-base">event_available</span>
                <span className="text-[12px] font-sans font-semibold">Cita confirmada por el agente</span>
              </div>
            )}
            {selected.status === 'rechazado' && (
              <div className="flex items-center gap-2 text-[#062d32]/30">
                <span className="material-symbols-outlined text-base">block</span>
                <span className="text-[12px] font-sans">Mensaje descartado</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Estado vacío */
        <div className="flex-1 flex flex-col items-center justify-center bg-[#f0ece4]" style={{ backgroundImage: 'radial-gradient(circle, rgba(6,45,50,0.03) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {showConfig ? (
            /* Panel de configuración inline */
            <div className="w-full max-w-md px-8 py-10">
              <h3 className="font-serif text-2xl text-[#062d32] font-semibold mb-6">Configuración del agente</h3>
              <div className="space-y-5">
                {[
                  { label: 'Agente activo', key: 'enabled' as const, desc: `Escanea cada ${config.scanIntervalHours}h y genera mensajes` },
                  { label: 'Envío automático', key: 'autoSend' as const, desc: 'Sin aprobación manual — envía directo' },
                ].map(({ label, key, desc }) => (
                  <div key={key} className="flex items-center justify-between py-4 border-b border-[#062d32]/8">
                    <div>
                      <p className="text-sm font-sans font-semibold text-[#062d32]">{label}</p>
                      <p className="text-[11px] text-[#062d32]/50 font-sans mt-0.5">{desc}</p>
                    </div>
                    <button
                      onClick={() => saveConfig({ [key]: !config[key] })}
                      className={`relative h-6 w-11 transition-colors ${config[key] ? 'bg-[#062d32]' : 'bg-[#062d32]/20'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white shadow transition-all ${config[key] ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                ))}
                {[
                  { label: 'Días entre contactos', key: 'cooldownDays' as const, min: 1, max: 60, unit: 'días' },
                  { label: 'Máximo por día', key: 'maxActivePerDay' as const, min: 1, max: 50, unit: '' },
                ].map(({ label, key, min, max, unit }) => (
                  <div key={key} className="py-3 border-b border-[#062d32]/8">
                    <div className="flex justify-between mb-2">
                      <span className="text-[12px] font-sans text-[#062d32]">{label}</span>
                      <span className="text-[12px] font-sans font-bold text-[#062d32]">{config[key]} {unit}</span>
                    </div>
                    <input type="range" min={min} max={max} value={config[key]}
                      onChange={e => saveConfig({ [key]: Number(e.target.value) })}
                      className="w-full accent-[#062d32] h-1" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center px-8">
              <div className="w-16 h-16 bg-[#062d32]/8 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-[#062d32]/30">chat_bubble_outline</span>
              </div>
              <p className="font-serif text-xl text-[#062d32]/40 mb-1">Selecciona una conversación</p>
              <p className="text-[12px] text-[#062d32]/30 font-sans">o pulsa el radar para detectar clientas en riesgo</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
