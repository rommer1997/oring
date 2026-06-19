import React, { useState, useEffect, useCallback } from 'react';
import { AgentCampaign, AgentCampaignStatus, AgentConfig } from '../types';

interface AgentViewProps {
  onToastMessage: (msg: string) => void;
  getAuthToken: () => Promise<string | null>;
  isDemoMode?: boolean;
}

const STATUS_LABEL: Record<AgentCampaignStatus, string> = {
  pendiente: 'Pendiente',
  enviado: 'Enviado',
  respondido: 'Respondió',
  reservado: 'Reservado ✓',
  rechazado: 'Descartado',
  sin_respuesta: 'Sin respuesta',
};

const STATUS_STYLE: Record<AgentCampaignStatus, string> = {
  pendiente: 'bg-amber-50 text-amber-800 border-amber-200',
  enviado: 'bg-blue-50 text-blue-800 border-blue-200',
  respondido: 'bg-violet-50 text-violet-800 border-violet-200',
  reservado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  rechazado: 'bg-gray-100 text-gray-500 border-gray-200',
  sin_respuesta: 'bg-red-50 text-red-700 border-red-200',
};

const DEFAULT_CONFIG: AgentConfig = {
  enabled: false,
  autoSend: false,
  scanIntervalHours: 24,
  minRiskLevel: 'Alto',
  cooldownDays: 7,
  maxActivePerDay: 10,
};

// ─── Demo data ────────────────────────────────────────────────────────────────
const DEMO_CAMPAIGNS: AgentCampaign[] = [
  {
    id: 'demo-1',
    tenantId: 'demo',
    clientId: 'carmen-ruiz',
    clientName: 'Carmen Ruiz',
    clientPhone: '666111222',
    riskLevel: 'Crítico',
    riskDays: 155,
    suggestedService: 'Mechas Californianas',
    message: '¡Hola Carmen! Te echamos de menos por el salón 💙 Han pasado más de 5 meses desde tus últimas mechas. ¿Te apetece que te busquemos un hueco esta semana para mimarte un poco?',
    status: 'respondido',
    autoSend: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    sentAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    repliedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    lastReply: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?',
    conversationLog: [
      { role: 'agent', text: '¡Hola Carmen! Te echamos de menos por el salón 💙 Han pasado más de 5 meses desde tus últimas mechas. ¿Te apetece que te busquemos un hueco esta semana para mimarte un poco?', timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString() },
      { role: 'client', text: 'Ay sí, me apetece mucho! ¿Tienes el jueves por la tarde?', timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'demo-2',
    tenantId: 'demo',
    clientId: 'sofia-martin',
    clientName: 'Sofía Martín',
    clientPhone: '666333444',
    riskLevel: 'Alto',
    riskDays: 75,
    suggestedService: 'Keratina Brasileña',
    message: 'Hola Sofía, ¡qué tal llevas el verano! Ya han pasado 75 días desde tu keratina. ¿Quieres que te reservemos para mantener ese liso tan bonito?',
    status: 'pendiente',
    autoSend: false,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    conversationLog: [
      { role: 'agent', text: 'Hola Sofía, ¡qué tal llevas el verano! Ya han pasado 75 días desde tu keratina. ¿Quieres que te reservemos para mantener ese liso tan bonito?', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
    ],
  },
  {
    id: 'demo-3',
    tenantId: 'demo',
    clientId: 'lucia-gomez',
    clientName: 'Lucía Gómez',
    clientPhone: '666555666',
    riskLevel: 'Crítico',
    riskDays: 200,
    suggestedService: 'Coloración',
    message: '¡Hola Lucía! Hace ya bastante que no sabemos de ti. Si quieres volver a ponerte en manos del equipo, esta semana tenemos hueco. ¿Te cuento las novedades?',
    status: 'reservado',
    autoSend: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    sentAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(),
    repliedAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
    lastReply: 'Perfecto, el viernes a las 10 me va genial',
    conversationLog: [
      { role: 'agent', text: '¡Hola Lucía! Hace ya bastante que no sabemos de ti. Si quieres volver a ponerte en manos del equipo, esta semana tenemos hueco. ¿Te cuento las novedades?', timestamp: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() },
      { role: 'client', text: 'Hola! Sí me gustaría volver, ¿tenéis el viernes?', timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000).toISOString() },
      { role: 'agent', text: '¡Perfecto! El viernes tenemos a las 10:00, 11:30 o 16:00. ¿Cuál te viene mejor?', timestamp: new Date(Date.now() - 21 * 60 * 60 * 1000 + 60000).toISOString() },
      { role: 'client', text: 'Perfecto, el viernes a las 10 me va genial', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString() },
      { role: 'agent', text: '¡Anotado! Lucía, el viernes a las 10:00 para Coloración. Te esperamos 💙 Te mandamos confirmación por aquí.', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000 + 30000).toISOString() },
    ],
  },
];

export default function AgentView({ onToastMessage, getAuthToken, isDemoMode = false }: AgentViewProps) {
  const [campaigns, setCampaigns] = useState<AgentCampaign[]>([]);
  const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<AgentCampaign | null>(null);
  const [activeTab, setActiveTab] = useState<'campañas' | 'configuracion'>('campañas');
  const [savingConfig, setSavingConfig] = useState(false);

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
    } catch {
      onToastMessage('Error cargando datos del agente.');
    } finally {
      setLoading(false);
    }
  }, [isDemoMode, authFetch, onToastMessage]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleScan = async () => {
    if (isDemoMode) {
      onToastMessage('Demo: el agente escaneó 3 clientas en riesgo y generó 2 mensajes pendientes.');
      return;
    }
    setScanning(true);
    try {
      const res = await authFetch('/api/agent/scan', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        onToastMessage(`✓ Escaneadas ${data.scanned} clientas. ${data.queued} mensajes ${data.autoSend ? 'enviados automáticamente' : 'en cola para aprobar'}.`);
        loadData();
      } else {
        onToastMessage(`Error: ${data.error}`);
      }
    } catch {
      onToastMessage('Error al lanzar el escaneo.');
    } finally {
      setScanning(false);
    }
  };

  const handleApprove = async (campaign: AgentCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'enviado', sentAt: new Date().toISOString() } : c));
      onToastMessage(`✓ Mensaje enviado a ${campaign.clientName} por WhatsApp.`);
      setSelectedCampaign(null);
      return;
    }
    try {
      const res = await authFetch(`/api/agent/campaigns/${campaign.id}/approve`, { method: 'POST' });
      if (res.ok) {
        onToastMessage(`✓ Mensaje enviado a ${campaign.clientName}.`);
        loadData();
        setSelectedCampaign(null);
      }
    } catch {
      onToastMessage('Error al enviar.');
    }
  };

  const handleReject = async (campaign: AgentCampaign) => {
    if (isDemoMode) {
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'rechazado' } : c));
      setSelectedCampaign(null);
      return;
    }
    try {
      await authFetch(`/api/agent/campaigns/${campaign.id}/reject`, { method: 'POST' });
      loadData();
      setSelectedCampaign(null);
    } catch {
      onToastMessage('Error al descartar.');
    }
  };

  const saveConfig = async (patch: Partial<AgentConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    if (isDemoMode) { onToastMessage('✓ Configuración guardada (demo).'); return; }
    setSavingConfig(true);
    try {
      await authFetch('/api/agent/config', { method: 'PUT', body: JSON.stringify(next) });
      onToastMessage('✓ Configuración del agente guardada.');
    } catch {
      onToastMessage('Error guardando configuración.');
    } finally {
      setSavingConfig(false);
    }
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total: campaigns.length,
    pendientes: campaigns.filter(c => c.status === 'pendiente').length,
    enviados: campaigns.filter(c => c.status === 'enviado').length,
    respondidos: campaigns.filter(c => c.status === 'respondido').length,
    reservados: campaigns.filter(c => c.status === 'reservado').length,
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-3xl font-semibold text-primary">Agente de Recuperación</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Elena detecta clientas en riesgo y las contacta por WhatsApp de forma autónoma.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold font-sans uppercase tracking-wide ${config.enabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {config.enabled ? 'Agente activo' : 'Agente inactivo'}
          </div>
          <button
            onClick={handleScan}
            disabled={scanning || !config.enabled}
            className="bg-primary text-white font-bold text-xs uppercase tracking-wider px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">{scanning ? 'sync' : 'radar'}</span>
            <span>{scanning ? 'Escaneando…' : 'Escanear ahora'}</span>
          </button>
        </div>
      </div>

      {isDemoMode && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">info</span>
          <span>Modo demo — los mensajes <strong>no</strong> se envían por WhatsApp. Conecta tu cuenta Meta para activarlo en producción.</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Total', value: stats.total, icon: 'campaign' },
          { label: 'Pendientes', value: stats.pendientes, icon: 'hourglass_empty' },
          { label: 'Enviados', value: stats.enviados, icon: 'send' },
          { label: 'Respondieron', value: stats.respondidos, icon: 'mark_chat_read' },
          { label: 'Reservaron', value: stats.reservados, icon: 'event_available' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-outline-variant/20 rounded-2xl p-4 flex flex-col gap-1">
            <span className="material-symbols-outlined text-primary/60 text-base">{s.icon}</span>
            <span className="font-serif text-2xl font-bold text-primary">{s.value}</span>
            <span className="text-[10px] font-sans uppercase tracking-wider text-on-surface-variant">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low p-1 rounded-2xl mb-6 max-w-xs border border-outline-variant/10">
        {(['campañas', 'configuracion'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold font-sans uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white shadow-sm text-primary border border-outline-variant/20' : 'text-on-surface-variant hover:text-primary'}`}
          >
            {tab === 'campañas' ? 'Campañas' : 'Configuración'}
          </button>
        ))}
      </div>

      {/* ── Tab: Campañas ── */}
      {activeTab === 'campañas' && (
        <div className="flex gap-4">
          {/* Lista */}
          <div className="flex-1 space-y-3 min-w-0">
            {loading && <p className="text-sm text-on-surface-variant">Cargando campañas…</p>}
            {!loading && campaigns.length === 0 && (
              <div className="bg-white border border-outline-variant/20 rounded-2xl p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-primary/30 block mb-3">radar</span>
                <p className="text-sm text-on-surface-variant">Sin campañas todavía.</p>
                <p className="text-xs text-on-surface-variant mt-1">Activa el agente y pulsa «Escanear ahora» para detectar clientas en riesgo.</p>
              </div>
            )}
            {campaigns.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedCampaign(c)}
                className={`w-full text-left bg-white border rounded-2xl p-4 flex items-start gap-3 hover:shadow-sm transition-all ${selectedCampaign?.id === c.id ? 'border-primary/40 shadow-sm' : 'border-outline-variant/20'}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-sm text-primary">{c.clientName}</span>
                    <span className={`text-[10px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_STYLE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                    <span className={`text-[10px] font-bold font-sans uppercase tracking-wider px-2 py-0.5 rounded-full border ${c.riskLevel === 'Crítico' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                      {c.riskLevel} · {c.riskDays}d
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant line-clamp-2">{c.message}</p>
                  {c.lastReply && (
                    <p className="text-xs text-violet-700 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">reply</span>
                      {c.lastReply.substring(0, 60)}{c.lastReply.length > 60 ? '…' : ''}
                    </p>
                  )}
                </div>
                <span className="material-symbols-outlined text-sm text-on-surface-variant/50 flex-shrink-0 mt-0.5">chevron_right</span>
              </button>
            ))}
          </div>

          {/* Panel de conversación */}
          {selectedCampaign && (
            <div className="w-80 flex-shrink-0 bg-white border border-outline-variant/20 rounded-2xl flex flex-col overflow-hidden">
              <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm text-primary">{selectedCampaign.clientName}</p>
                  <p className="text-[10px] text-on-surface-variant">{selectedCampaign.clientPhone}</p>
                </div>
                <button onClick={() => setSelectedCampaign(null)} className="material-symbols-outlined text-sm text-on-surface-variant hover:text-primary transition-colors">close</button>
              </div>

              {/* Chat log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80">
                {selectedCampaign.conversationLog.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.role === 'agent' ? 'bg-primary text-white rounded-tr-sm' : 'bg-surface-container-low text-primary rounded-tl-sm border border-outline-variant/20'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              {selectedCampaign.status === 'pendiente' && (
                <div className="p-4 border-t border-outline-variant/15 flex gap-2">
                  <button
                    onClick={() => handleReject(selectedCampaign)}
                    className="flex-1 border border-outline-variant/30 text-on-surface-variant text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl hover:border-red-300 hover:text-red-600 transition-all"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={() => handleApprove(selectedCampaign)}
                    className="flex-1 bg-primary text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-xs">send</span>
                    Enviar
                  </button>
                </div>
              )}
              {selectedCampaign.status === 'respondido' && (
                <div className="p-4 border-t border-outline-variant/15">
                  <p className="text-[10px] text-on-surface-variant text-center mb-2">El agente continúa la conversación automáticamente</p>
                  <button
                    onClick={() => { onToastMessage('Intervención manual activada — el agente pausará esta conversación.'); }}
                    className="w-full border border-primary text-primary text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl hover:bg-primary/5 transition-all"
                  >
                    Intervenir manualmente
                  </button>
                </div>
              )}
              {selectedCampaign.status === 'reservado' && (
                <div className="p-4 border-t border-outline-variant/15 bg-emerald-50/50">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <span className="material-symbols-outlined text-base">event_available</span>
                    <p className="text-xs font-bold">Cita confirmada por el agente</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Configuración ── */}
      {activeTab === 'configuracion' && (
        <div className="max-w-lg space-y-6">

          {/* On/Off */}
          <div className="bg-white border border-outline-variant/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-primary mb-1">Activar Agente</h4>
              <p className="text-xs text-on-surface-variant">Elena escaneará clientas en riesgo cada {config.scanIntervalHours}h y preparará mensajes.</p>
            </div>
            <button
              onClick={() => saveConfig({ enabled: !config.enabled })}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${config.enabled ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform mt-1 ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Auto-send */}
          <div className="bg-white border border-outline-variant/20 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-primary mb-1">Envío Automático</h4>
              <p className="text-xs text-on-surface-variant">Si está desactivado, los mensajes quedan en cola para que los apruebes antes de enviar.</p>
            </div>
            <button
              onClick={() => saveConfig({ autoSend: !config.autoSend })}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none ${config.autoSend ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <span className={`inline-block w-4 h-4 transform rounded-full bg-white shadow transition-transform mt-1 ${config.autoSend ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Nivel de riesgo mínimo */}
          <div className="bg-white border border-outline-variant/20 rounded-2xl p-5">
            <h4 className="text-sm font-bold text-primary mb-3">Nivel mínimo de riesgo para contactar</h4>
            <div className="flex gap-2">
              {(['Alto', 'Crítico'] as const).map(level => (
                <button
                  key={level}
                  onClick={() => saveConfig({ minRiskLevel: level })}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold font-sans uppercase tracking-wider border transition-all ${config.minRiskLevel === level ? 'bg-primary text-white border-primary' : 'bg-white text-on-surface-variant border-outline-variant/30 hover:border-primary/30'}`}
                >
                  {level === 'Alto' ? 'Alto y Crítico' : 'Solo Crítico'}
                </button>
              ))}
            </div>
          </div>

          {/* Parámetros numéricos */}
          <div className="bg-white border border-outline-variant/20 rounded-2xl p-5 space-y-5">
            <h4 className="text-sm font-bold text-primary">Parámetros</h4>

            {[
              { label: 'Días de espera entre contactos', key: 'cooldownDays' as const, min: 1, max: 60, unit: 'días' },
              { label: 'Máximo mensajes por día', key: 'maxActivePerDay' as const, min: 1, max: 50, unit: '' },
              { label: 'Frecuencia de escaneo', key: 'scanIntervalHours' as const, min: 1, max: 168, unit: 'horas' },
            ].map(({ label, key, min, max, unit }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs text-on-surface-variant">{label}</label>
                  <span className="text-xs font-bold text-primary">{config[key]} {unit}</span>
                </div>
                <input
                  type="range"
                  min={min}
                  max={max}
                  value={config[key]}
                  onChange={e => saveConfig({ [key]: Number(e.target.value) })}
                  className="w-full accent-primary h-1.5 rounded-full"
                />
              </div>
            ))}
          </div>

          {/* WhatsApp API status */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">warning</span>
              <div>
                <h4 className="text-sm font-bold text-amber-800 mb-1">WhatsApp Business API no conectada</h4>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Los mensajes se simulan en modo stub. Para envío real:
                </p>
                <ol className="text-xs text-amber-700 mt-2 space-y-1 list-decimal pl-4">
                  <li>Crea una app en <strong>developers.facebook.com</strong></li>
                  <li>Añade el producto «WhatsApp Business»</li>
                  <li>Copia el <strong>Access Token</strong> y el <strong>Phone Number ID</strong></li>
                  <li>Añádelos como secrets: <code className="bg-amber-100 px-1 rounded">META_WA_TOKEN</code> y <code className="bg-amber-100 px-1 rounded">META_PHONE_NUMBER_ID</code></li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
