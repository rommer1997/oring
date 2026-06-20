import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
  tenantSlug?: string;
}

type WAStatus = 'disconnected' | 'qr' | 'connecting' | 'connected';

const STATUS_LABEL: Record<AgentCampaignStatus, string> = {
  pendiente: 'Pendiente', enviado: 'Enviado', respondido: 'Respondió',
  reservado: 'Reservado', rechazado: 'Descartado', sin_respuesta: 'Sin respuesta',
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false, autoSend: false, scanIntervalHours: 24,
  minRiskLevel: 'Alto', cooldownDays: 7, maxActivePerDay: 10,
};

const DEMO_CAMPAIGNS: AgentCampaign[] = [
  {
    id: 'demo-1', tenantId: 'demo', clientId: 'carmen-ruiz',
    clientName: 'Carmen Ruiz', clientPhone: '666 111 222',
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
    clientName: 'Sofía Martín', clientPhone: '666 333 444',
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
    clientName: 'Lucía Gómez', clientPhone: '666 555 666',
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
    clientName: 'Marta Iglesias', clientPhone: '666 777 888',
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
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatHour(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// Pill de estado con colores semánticos sutiles
function StatusPill({ status }: { status: AgentCampaignStatus }) {
  const map: Record<AgentCampaignStatus, string> = {
    pendiente:     'border-amber-300 text-amber-700',
    enviado:       'border-sky-300 text-sky-700',
    respondido:    'border-violet-300 text-violet-700',
    reservado:     'border-emerald-300 text-emerald-700',
    rechazado:     'border-[#062d32]/15 text-[#062d32]/40',
    sin_respuesta: 'border-red-300 text-red-600',
  };
  return (
    <span className={`inline-block border text-[9px] font-sans font-bold uppercase tracking-[0.07em] px-2 py-0.5 ${map[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function RiskPill({ level, days }: { level: string; days: number }) {
  const color = level === 'Crítico' ? 'border-red-300 text-red-600' : 'border-amber-300 text-amber-700';
  return (
    <span className={`inline-block border text-[9px] font-sans font-bold uppercase tracking-[0.07em] px-2 py-0.5 ${color}`}>
      {level} · {days}d
    </span>
  );
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
  const [replyDraft, setReplyDraft] = useState('');
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
      es.onmessage = e => { const d = JSON.parse(e.data); setWAStatus(d.status); setWAPhone(d.phone || null); setWAQR(d.qr || null); };
      waSSERef.current = es;
    };
    go();
    return () => waSSERef.current?.close();
  }, [isDemoMode, getAuthToken]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.conversationLog?.length]);

  const handleApprove = async (c: AgentCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'enviado', sentAt: new Date().toISOString() } : x));
      setSelected(prev => prev?.id === c.id ? { ...prev, status: 'enviado' } : prev);
      onToastMessage(`✓ Mensaje enviado a ${c.clientName}.`); return;
    }
    await authFetch(`/api/agent/campaigns/${c.id}/approve`, { method: 'POST' });
    onToastMessage(`✓ Enviado a ${c.clientName}.`); loadData();
  };

  const handleReject = async (c: AgentCampaign) => {
    if (isDemoMode) { setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'rechazado' } : x)); setSelected(null); return; }
    await authFetch(`/api/agent/campaigns/${c.id}/reject`, { method: 'POST' });
    loadData(); setSelected(null);
  };

  const handleWAConnect = async () => {
    if (isDemoMode) { onToastMessage('Demo: escanea el QR en tu móvil.'); return; }
    try { await authFetch('/api/agent/wa-connect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const handleWADisconnect = async () => {
    if (isDemoMode) { setWAStatus('disconnected'); setWAPhone(null); return; }
    try { await authFetch('/api/agent/wa-disconnect', { method: 'POST' }); } catch { onToastMessage('Error.'); }
  };

  const saveConfig = async (patch: Partial<AgentConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (!isDemoMode) {
      try { await authFetch('/api/agent/config', { method: 'PUT', body: JSON.stringify(next) }); }
      catch { onToastMessage('Error guardando config.'); }
    }
  };

  const handleScan = async () => {
    if (isDemoMode) { onToastMessage('Demo: agente escaneó 4 clientas en riesgo.'); return; }
    setScanning(true);
    try {
      const res = await authFetch('/api/agent/scan', { method: 'POST' });
      const d = await res.json();
      if (res.ok) { onToastMessage(`✓ ${d.queued} mensajes generados.`); loadData(); }
    } catch { onToastMessage('Error al escanear.'); }
    finally { setScanning(false); }
  };

  const filtered = filter === 'todas' ? campaigns : campaigns.filter(c => c.status === filter);
  const chatUrl = tenantSlug ? `${window.location.origin}/salon/${tenantSlug}/chat` : null;

  return (
    <div className="flex flex-col gap-0" style={{ height: 'calc(100vh - 112px)' }}>

      {/* ── Barra superior ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-serif text-[#062d32] text-2xl font-semibold">Agente de Recuperación</h1>
          {config.enabled && (
            <span className="flex items-center gap-1.5 text-[10px] font-sans font-bold uppercase tracking-wider text-emerald-700 border border-emerald-300 px-2.5 py-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              Agente activo
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScan}
            disabled={scanning || !config.enabled}
            className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-2 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-sm">{scanning ? 'sync' : 'radar'}</span>
            {scanning ? 'Escaneando…' : 'Escanear ahora'}
          </button>
          <button
            onClick={() => setShowConfig(v => !v)}
            className={`border text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 flex items-center gap-2 transition-all ${showConfig ? 'bg-[#062d32] text-white border-[#062d32]' : 'border-[#062d32]/20 text-[#062d32]/50 hover:border-[#062d32] hover:text-[#062d32]'}`}
          >
            <span className="material-symbols-outlined text-sm">settings</span>
          </button>
        </div>
      </div>

      {/* ── Estado WhatsApp ──────────────────────────────────────────────────── */}
      {waStatus === 'connected' ? (
        <div className="flex items-center justify-between bg-white border border-[#062d32]/10 px-5 py-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-emerald-500 rounded-full" />
            <span className="text-[12px] font-sans text-[#062d32]">WhatsApp conectado · <span className="font-semibold">+{waPhone}</span></span>
          </div>
          <button
            onClick={handleWADisconnect}
            className="border border-[#062d32]/20 text-[#062d32]/60 text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 hover:border-red-300 hover:text-red-600 transition-all"
          >
            Desconectar
          </button>
        </div>
      ) : waStatus === 'qr' && waQR ? (
        <div className="flex items-center gap-6 bg-white border border-[#062d32]/10 px-5 py-4 mb-4 flex-shrink-0">
          <img src={waQR} alt="QR WhatsApp" className="w-24 h-24 border border-[#062d32]/10" />
          <div>
            <p className="font-serif text-[#062d32] text-base font-semibold mb-1">Escanea con tu móvil</p>
            <p className="text-[11px] text-[#062d32]/50 font-sans leading-relaxed">
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-white border border-[#062d32]/10 px-5 py-3 mb-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-[#062d32]/20 rounded-full" />
            <span className="text-[12px] font-sans text-[#062d32]/50">
              {waStatus === 'connecting' ? 'Conectando…' : 'WhatsApp no conectado'}
            </span>
          </div>
          <button
            onClick={handleWAConnect}
            className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5 hover:bg-[#062d32] hover:text-white transition-all"
          >
            <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
            Conectar
          </button>
        </div>
      )}

      {/* ── Cuerpo principal (config o lista+chat) ──────────────────────────── */}
      {showConfig ? (
        <div className="flex-1 bg-white border border-[#062d32]/10 px-8 py-8 overflow-y-auto">
          <h3 className="font-serif text-[#062d32] text-xl font-semibold mb-6">Configuración del agente</h3>
          <div className="max-w-sm divide-y divide-[#062d32]/8">
            {([
              { label: 'Agente activo', key: 'enabled' as const, desc: `Escanea cada ${config.scanIntervalHours}h y genera mensajes` },
              { label: 'Envío automático', key: 'autoSend' as const, desc: 'Envía sin aprobación manual' },
            ] as const).map(({ label, key, desc }) => (
              <div key={key} className="flex items-center justify-between py-4">
                <div>
                  <p className="text-sm font-sans text-[#062d32]">{label}</p>
                  <p className="text-[10px] text-[#062d32]/40 font-sans mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => saveConfig({ [key]: !config[key] })}
                  className={`relative h-5 w-9 flex-shrink-0 transition-colors ${config[key] ? 'bg-[#062d32]' : 'bg-[#062d32]/15'}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 bg-white transition-all ${config[key] ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
            {([
              { label: 'Días entre contactos', key: 'cooldownDays' as const, min: 1, max: 60, unit: 'd' },
              { label: 'Máximo por día', key: 'maxActivePerDay' as const, min: 1, max: 50, unit: '' },
            ] as const).map(({ label, key, min, max, unit }) => (
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
          {chatUrl && (
            <div className="mt-8 pt-6 border-t border-[#062d32]/8">
              <p className="text-[11px] font-sans text-[#062d32]/40 mb-2 uppercase tracking-wider font-bold">Chat web para clientes</p>
              <div className="flex items-center gap-3">
                <code className="flex-1 text-[11px] font-sans text-[#062d32]/60 border border-[#062d32]/10 px-3 py-2 bg-[#fbf9f5] truncate">{chatUrl}</code>
                <button
                  onClick={() => navigator.clipboard?.writeText(chatUrl).then(() => onToastMessage('✓ Enlace copiado.'))}
                  className="border border-[#062d32]/20 text-[#062d32]/60 text-[10px] font-sans font-bold uppercase tracking-wider px-3 py-2 hover:border-[#062d32] hover:text-[#062d32] transition-all whitespace-nowrap"
                >
                  Copiar enlace
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex gap-4 min-h-0">

          {/* ── Lista de conversaciones ────────────────────────────────────────── */}
          <div className="w-72 flex-shrink-0 flex flex-col bg-white border border-[#062d32]/10 overflow-hidden">
            {/* Filtros */}
            <div className="flex gap-1 px-3 py-2.5 border-b border-[#062d32]/8 overflow-x-auto">
              {(['todas', 'pendiente', 'respondido', 'reservado'] as const).map(f => (
                <button key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 text-[9px] font-sans font-bold uppercase tracking-wider px-2.5 py-1 border transition-all ${
                    filter === f
                      ? 'bg-[#062d32] text-white border-[#062d32]'
                      : 'border-[#062d32]/12 text-[#062d32]/40 hover:border-[#062d32]/30 hover:text-[#062d32]'
                  }`}
                >
                  {f === 'todas' ? 'Todas' : STATUS_LABEL[f]}
                </button>
              ))}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#062d32]/6">
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <span className="material-symbols-outlined animate-spin text-[#062d32]/20">sync</span>
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="py-12 text-center px-6">
                  <span className="material-symbols-outlined text-2xl text-[#062d32]/15 block mb-2">chat_bubble_outline</span>
                  <p className="text-[11px] text-[#062d32]/30 font-sans">Sin conversaciones</p>
                </div>
              )}
              {filtered.map(c => {
                const last = c.conversationLog[c.conversationLog.length - 1];
                const active = selected?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setSelected(c)}
                    className={`w-full text-left px-4 py-4 flex gap-3 transition-colors ${active ? 'bg-[#062d32]/5' : 'hover:bg-[#062d32]/[0.025]'}`}
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 flex-shrink-0 bg-[#c9a9b5]/20 flex items-center justify-center font-serif font-semibold text-[#062d32] text-sm">
                      {c.clientName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-serif text-[13px] font-semibold text-[#062d32] truncate">{c.clientName}</span>
                        <span className="text-[9px] text-[#062d32]/30 font-sans flex-shrink-0">{timeAgo(last?.timestamp || c.createdAt)}</span>
                      </div>
                      <p className="text-[11px] text-[#062d32]/40 truncate font-sans mb-2 leading-snug">{last?.text}</p>
                      <div className="flex flex-wrap gap-1">
                        <StatusPill status={c.status} />
                        <RiskPill level={c.riskLevel} days={c.riskDays} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Panel de conversación ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col bg-white border border-[#062d32]/10 overflow-hidden">
            {selected ? (
              <>
                {/* Cabecera */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#062d32]/8 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#c9a9b5]/20 flex items-center justify-center font-serif font-semibold text-[#062d32] text-sm">
                      {selected.clientName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-serif text-[#062d32] text-base font-semibold leading-none">{selected.clientName}</p>
                      <p className="text-[10px] text-[#062d32]/40 font-sans mt-0.5">{selected.clientPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={selected.status} />
                    <button onClick={() => setSelected(null)} className="w-7 h-7 flex items-center justify-center text-[#062d32]/30 hover:text-[#062d32] transition-colors ml-1">
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                </div>

                {/* Contexto de riesgo */}
                <div className="flex items-center gap-3 px-6 py-2.5 border-b border-[#062d32]/6 bg-[#fbf9f5] flex-shrink-0">
                  <span className="material-symbols-outlined text-[14px] text-[#062d32]/30">info</span>
                  <span className="text-[10px] font-sans text-[#062d32]/50">
                    Servicio sugerido: <strong>{selected.suggestedService}</strong> · <RiskPill level={selected.riskLevel} days={selected.riskDays} />
                  </span>
                </div>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3 bg-[#fbf9f5]">
                  {selected.conversationLog.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[60%] flex flex-col gap-1 ${msg.role === 'agent' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-4 py-2.5 text-[13px] leading-relaxed font-serif ${
                          msg.role === 'agent'
                            ? 'bg-[#062d32] text-white'
                            : 'bg-white border border-[#062d32]/10 text-[#062d32] border-l-[3px] border-l-[#c9a9b5]'
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

                {/* Barra inferior */}
                <div className="flex-shrink-0 border-t border-[#062d32]/8 bg-white px-6 py-4">
                  {selected.status === 'pendiente' && (
                    <div className="flex flex-col gap-3">
                      <p className="text-[10px] font-sans text-[#062d32]/40 italic">
                        El agente ha redactado este mensaje — revísalo antes de enviarlo
                      </p>
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => handleReject(selected)}
                          className="border border-[#062d32]/15 text-[#062d32]/50 text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:border-red-300 hover:text-red-500 transition-all">
                          Descartar
                        </button>
                        <button onClick={() => handleApprove(selected)}
                          className="bg-[#062d32] text-white text-[10px] font-sans font-bold uppercase tracking-wider px-5 py-2 flex items-center gap-2 hover:opacity-85 transition-opacity">
                          <span className="material-symbols-outlined text-sm">send</span>
                          Aprobar y enviar
                        </button>
                      </div>
                    </div>
                  )}
                  {selected.status === 'enviado' && (
                    <div className="flex items-center gap-2 text-[#062d32]/35">
                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                      <span className="text-[11px] font-sans">Esperando respuesta de {selected.clientName}…</span>
                    </div>
                  )}
                  {selected.status === 'respondido' && (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#062d32]/35">
                          <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                          <span className="text-[11px] font-sans">El agente continúa la conversación automáticamente</span>
                        </div>
                        <button
                          onClick={() => onToastMessage('Intervención activada — el agente pausará esta conversación.')}
                          className="border border-[#062d32] text-[#062d32] text-[10px] font-sans font-bold uppercase tracking-wider px-4 py-2 hover:bg-[#062d32] hover:text-white transition-all">
                          Intervenir manualmente
                        </button>
                      </div>
                      <div className="flex items-end gap-2 border-t border-[#062d32]/6 pt-3">
                        <textarea
                          value={replyDraft}
                          onChange={e => setReplyDraft(e.target.value)}
                          placeholder="Escribe tu mensaje aquí…"
                          rows={1}
                          className="flex-1 border-b border-[#767676] bg-transparent text-[#062d32] text-[13px] font-serif py-1.5 outline-none resize-none placeholder:text-[#062d32]/25"
                          style={{ maxHeight: '80px', overflowY: 'auto' }}
                        />
                        <button
                          disabled={!replyDraft.trim()}
                          onClick={() => { onToastMessage('Mensaje enviado.'); setReplyDraft(''); }}
                          className="border border-[#062d32] text-[#062d32] p-1.5 hover:bg-[#062d32] hover:text-white transition-all disabled:opacity-25"
                        >
                          <span className="material-symbols-outlined text-[15px]">send</span>
                        </button>
                      </div>
                    </div>
                  )}
                  {selected.status === 'reservado' && (
                    <div className="flex items-center gap-2 text-emerald-700">
                      <span className="material-symbols-outlined text-[15px]">event_available</span>
                      <span className="text-[11px] font-sans font-semibold">Cita confirmada — el agente cerró la reserva</span>
                    </div>
                  )}
                  {(selected.status === 'rechazado' || selected.status === 'sin_respuesta') && (
                    <div className="flex items-center gap-2 text-[#062d32]/25">
                      <span className="material-symbols-outlined text-[15px]">block</span>
                      <span className="text-[11px] font-sans">{STATUS_LABEL[selected.status]}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Estado vacío */
              <div className="flex-1 flex flex-col items-center justify-center bg-[#fbf9f5]">
                <div className="w-12 h-12 border border-[#062d32]/10 bg-white flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-xl text-[#062d32]/20">forum</span>
                </div>
                <p className="font-serif text-[#062d32]/30 text-lg">Selecciona una conversación</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
