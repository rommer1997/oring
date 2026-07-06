import React, { useState, useEffect } from 'react';
import { AppView, ClientProfile, MessageDraft, WhatsAppMessage } from '../types';
import { buildFallbackTemplates } from '../data';
import { apiUrl } from '../lib/api';

interface MessageEditorViewProps {
  clients: ClientProfile[];
  selectedClientId: string;
  onNavigate: (view: AppView) => void;
  onUpdateClientLog: (clientId: string, newMessage: WhatsAppMessage) => void;
  onSaveMessageDraft?: (draft: MessageDraft) => void;
  getAuthToken?: () => Promise<string | null>;
  onToastMessage: (msg: string) => void;
}

interface LocalVersion {
  id: string;
  tag: string;
  message: string;
  recommendation: string;
}

export default function MessageEditorView({
  clients,
  selectedClientId,
  onNavigate,
  onUpdateClientLog,
  onSaveMessageDraft,
  getAuthToken,
  onToastMessage
}: MessageEditorViewProps) {
  const currentClient = clients.find(c => c.id === selectedClientId) || clients[0];
  
  const [tone, setTone] = useState<'Cercano' | 'Profesional' | 'Elegante'>('Cercano');
  const [draftText, setDraftText] = useState<string>('');
  const [offerValue, setOfferValue] = useState<string>(currentClient?.suggestedOfferTitle || 'Tratamiento Hidratación de Regalo');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>('');
  
  // Versions state loaded dynamically
  const [versions, setVersions] = useState<LocalVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('v1');

  // Load fallback versions upon setup to ensure there's always 3 robust options instantly
  useEffect(() => {
    if (currentClient) {
      const docOffer = offerValue || currentClient.suggestedOfferTitle || 'un detalle de autor';
      const defaultTemplates = buildFallbackTemplates(currentClient.name, currentClient.lastVisitService, currentClient.riskDays, docOffer);

      // Build 3 highly personalized default local text options
      const localVersions: LocalVersion[] = [
        {
          id: 'v1',
          tag: 'Cercana / Empática',
          message: defaultTemplates.Cercano,
          recommendation: '📅 Recomendación Local: Martes o miércoles por la mañana (10:00 - 12:30) durante el tiempo de descanso.'
        },
        {
          id: 'v2',
          tag: 'Profesional / Tendencia',
          message: defaultTemplates.Profesional,
          recommendation: '📅 Recomendación Local: Jueves por la tarde (15:00 - 17:30) para planificar citas previas al fin de semana.'
        },
        {
          id: 'v3',
          tag: 'Exclusiva / VIP Experience',
          message: defaultTemplates.Elegante,
          recommendation: '📅 Recomendación Local: Viernes tarde o Sábado mañana para un trato exclusivo de salón premium.'
        }
      ];

      setVersions(localVersions);
      setSelectedVersionId('v1');
      setDraftText(localVersions[0].message);
      setAiRecommendation(localVersions[0].recommendation);
    }
  }, [selectedClientId, currentClient]);

  // Adjust recommendation/active text on selecting a version slot
  const handleSelectVersion = (id: string) => {
    setSelectedVersionId(id);
    const target = versions.find(v => v.id === id);
    if (target) {
      setDraftText(target.message);
      setAiRecommendation(target.recommendation);
    }
  };

  // Keep version items in sync when typing so switching tabs keeps edited draft text!
  const handleDraftTextChange = (text: string) => {
    setDraftText(text);
    setVersions(prev => prev.map(v => v.id === selectedVersionId ? { ...v, message: text } : v));
  };

  if (!currentClient) {
    return (
      <div className="flex-1 pb-16">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-primary mb-3">forum</span>
          <h2 className="font-serif text-2xl font-bold text-primary mb-2">Primero necesitas una clienta</h2>
          <p className="text-sm text-on-surface-variant mb-5">El editor de mensajes se activa cuando existe un perfil individual con teléfono e historial.</p>
          <button
            type="button"
            onClick={() => onNavigate('retention')}
            className="px-5 py-3 bg-primary text-on-primary rounded-xl text-xs font-bold"
          >
            Crear clienta
          </button>
        </div>
      </div>
    );
  }

  // Real-time server-side Gemini 3.5 calling function returning 3 versions
  const generateAiMessage = async () => {
    if (currentClient.marketingOptOut || currentClient.contactConsent === false) {
      onToastMessage('Esta clienta no tiene consentimiento activo para comunicaciones comerciales.');
      return;
    }
    setIsGenerating(true);
    onToastMessage('Conectando con el especialista de comunicación IA...');
    try {
      const token = getAuthToken ? await getAuthToken() : null;
      const response = await fetch(apiUrl('/api/generate-whatsapp'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          clientName: currentClient.name,
          lastService: currentClient.lastVisitService,
          riskDays: currentClient.riskDays,
          riskLevel: currentClient.riskLevel,
          isVip: currentClient.isVip,
          suggestedOffer: offerValue,
          preferences: currentClient.preferences,
          tone: tone,
          clientId: currentClient.id,
          tenantId: currentClient.tenantId,
        }),
      });

      if (!response.ok) {
        throw new Error('La conexión al backend falló o tu API Key de Gemini no se configuró aún.');
      }

      const data = await response.json();
      if (data.versions && Array.isArray(data.versions) && data.versions.length > 0) {
        // Map versions to ensure they have an id string
        const mappedVersions = data.versions.map((v: any, index: number) => ({
          id: v.id || `v${index + 1}`,
          tag: v.tag || `Opción ${index + 1}`,
          message: v.message || '',
          recommendation: v.recommendation || 'Mejor momento de ocio de la tarde.'
        }));

        setVersions(mappedVersions);
        setSelectedVersionId(mappedVersions[0].id);
        setDraftText(mappedVersions[0].message);
        setAiRecommendation(mappedVersions[0].recommendation);
        onToastMessage('¡3 versiones exclusivas redactadas por el especialista IA con éxito! ✨');
      } else {
        throw new Error('No se recibieron versiones de mensajes formateadas por la IA.');
      }
    } catch (err: any) {
      console.warn('Fallo en generate-whatsapp, recurriendo a las plantillas inteligentes locales:', err);
      onToastMessage('Utilizando plantilla local de autor (Configura tu GEMINI_API_KEY en Settings para activar la IA).');
      
      // Fallback update inside local templates applying the adjusted offer
      const defaultTemplates = buildFallbackTemplates(currentClient.name, currentClient.lastVisitService, currentClient.riskDays, offerValue || currentClient?.suggestedOfferTitle || '');
      
      const localVersions: LocalVersion[] = [
        {
          id: 'v1',
          tag: 'Cercana / Empática',
          message: defaultTemplates.Cercano + (offerValue && offerValue !== currentClient?.suggestedOfferTitle ? `\n\nDetalle especial: Te guardaré un *${offerValue}* para tu cita.` : ''),
          recommendation: '📅 Recomendación Local: Martes o miércoles por la mañana (10:00 - 12:30).'
        },
        {
          id: 'v2',
          tag: 'Profesional / Tendencia',
          message: defaultTemplates.Profesional + (offerValue && offerValue !== currentClient?.suggestedOfferTitle ? `\n\nIncluido de obsequio: Un *${offerValue}* con tu visita.` : ''),
          recommendation: '📅 Recomendación Local: Jueves por la tarde (15:00 - 17:30).'
        },
        {
          id: 'v3',
          tag: 'Exclusiva / VIP Experience',
          message: defaultTemplates.Elegante + (offerValue && offerValue !== currentClient?.suggestedOfferTitle ? `\n\nCortesía: Nos complacerá asignarte un *${offerValue}* en tu sesión.` : ''),
          recommendation: '📅 Recomendación Local: Viernes tarde o Sábado mañana.'
        }
      ];

      setVersions(localVersions);
      setSelectedVersionId('v1');
      setDraftText(localVersions[0].message);
      setAiRecommendation(localVersions[0].recommendation);
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to save Draft inside client message log
  const handleSaveDraft = () => {
    if (!draftText.trim()) return;

    const now = new Date();
    const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    const newDraft: WhatsAppMessage = {
      id: `draft-${Date.now()}`,
      sender: 'user',
      text: draftText,
      timestamp: time,
      date: now.toISOString().slice(0, 10),
      dateLabel: 'Hoy',
      status: 'borrador'
    };

    onUpdateClientLog(currentClient.id, newDraft);
    if (onSaveMessageDraft) {
      onSaveMessageDraft({
        id: newDraft.id,
        clientId: currentClient.id,
        tenantId: currentClient.tenantId,
        content: draftText,
        versions,
        tone,
        suggestedOfferTitle: offerValue || '',
        status: 'pendiente',
        createdBy: 'user',
        createdAt: new Date().toISOString()
      });
    }
    onToastMessage('¡Mensaje guardado como borrador pendiente con éxito! 💾');
    onNavigate('client-profile');
  };

  // Function to lock and send message (registers and triggers WhatsApp manual window)
  const handleSendMessage = async () => {
    if (!draftText.trim()) return;
    if (currentClient.marketingOptOut || currentClient.contactConsent === false) {
      onToastMessage('No se puede enviar: la clienta no tiene consentimiento activo.');
      return;
    }

    // 1º: envío real por el canal del salón (Baileys/Meta) si está conectado
    let sentViaChannel = false;
    if (getAuthToken) {
      try {
        const token = await getAuthToken();
        if (token) {
          const r = await fetch(apiUrl('/api/send-whatsapp'), {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: currentClient.phoneNumber, text: draftText, clientId: currentClient.id }),
          });
          sentViaChannel = r.ok && (await r.json()).sent === true;
        }
      } catch { /* cae al flujo manual */ }
    }

    const time = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const newLogItem: WhatsAppMessage = {
      id: `sent-${Date.now()}`,
      sender: 'user',
      text: draftText,
      timestamp: time,
      dateLabel: 'Hoy',
      status: 'enviado'
    };

    if (sentViaChannel) {
      onToastMessage(`✓ Enviado a ${currentClient.name} por WhatsApp.`);
      onNavigate('client-profile');
      return; // el servidor ya registró el mensaje en el log de la clienta
    }

    // 2º: flujo manual wa.me — la dueña debe pulsar enviar en WhatsApp
    onUpdateClientLog(currentClient.id, newLogItem);

    // Normalizar teléfono para wa.me: solo dígitos, prefijo 34 si es número ES de 9 dígitos
    let phoneClean = currentClient.phoneNumber.replace(/\D/g, '');
    if (phoneClean.startsWith('0034')) phoneClean = phoneClean.slice(4);
    else if (phoneClean.startsWith('34') && phoneClean.length === 11) phoneClean = phoneClean.slice(2);
    if (phoneClean.length === 9 && (phoneClean.startsWith('6') || phoneClean.startsWith('7') || phoneClean.startsWith('9'))) {
      phoneClean = '34' + phoneClean;
    }

    const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent(draftText)}`;
    window.open(whatsappUrl, '_blank');

    onToastMessage(`Abriendo WhatsApp para ${currentClient.name} — recuerda pulsar Enviar allí. 📲`);
    onNavigate('client-profile');
  };

  // Safe Whatsapp HTML markup helper for asterisks bold text
  const formatWhatsappMessageHtml = (text: string) => {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Convert *bold* to <strong>bold</strong>
    escaped = escaped.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    
    // Convert newlines to breaks
    return escaped.split('\n').map((line, idx) => (
      <span key={idx} className="block min-h-[1em]">{line}</span>
    ));
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* Back button and profile heading */}
      <div className="mb-8 flex items-center gap-4">
        <button 
          onClick={() => onNavigate('retention')}
          className="w-10 h-10 rounded-full border border-primary/15 bg-surface-container-low hover:bg-surface-container-high text-primary flex items-center justify-center transition-all cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-sm font-bold">arrow_back</span>
        </button>
        <div className="text-left">
          <h2 className="font-serif text-3xl font-semibold text-primary">Redactor Copiloto & Mensajería IA</h2>
          <p className="text-xs text-on-surface-variant font-medium">Genera 3 variantes de recate, guarda borradores o abre WhatsApp directo para contactar a {currentClient.name}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2 font-sans">
        
        {/* Left column: Message and Tone Configurator */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-6 md:p-8 rounded-3xl border border-surface-container flex flex-col justify-between shadow-sm">
          <div className="space-y-6 text-left">
            
            {/* Tone picker section */}
            <div>
              <label className="text-xs uppercase font-bold text-on-surface-variant tracking-wider block mb-3">Estilo Estético de Referencia</label>
              <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-1.5 rounded-xl border border-surface-container border-outline-variant/20">
                {(['Cercano', 'Profesional', 'Elegante'] as const).map((t) => {
                  const isActive = tone === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTone(t);
                        onToastMessage(`Sintonización cambiada a: ${t}`);
                      }}
                      className={`py-2 px-3 text-xs font-bold rounded-lg transition-all cursor-pointer text-center ${
                        isActive 
                          ? 'bg-primary text-on-primary shadow-sm' 
                          : 'text-on-surface-variant/70 hover:text-primary'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Offer adjustments */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Beneficio o Detalle sugerido</label>
                <span className="text-[10px] bg-tertiary-container text-on-tertiary-container font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Mimo del Mes</span>
              </div>
              <input 
                type="text" 
                value={offerValue}
                onChange={(e) => setOfferValue(e.target.value)}
                placeholder="Ej. Hidratación de autor, Peinado express..."
                className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-medium"
              />
            </div>

            {/* Real-time IA Generator Tool Banner */}
            <div className="bg-gradient-to-r from-[#F7F2EC] to-[#F1ECE5] p-4.5 rounded-2xl border border-primary/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-inner">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-primary mb-1">
                  <span className="material-symbols-outlined text-sm font-bold text-[#bfa982] animate-pulse">auto_awesome</span>
                  <span>Especialista de Comunicación Gemini</span>
                </div>
                <p className="text-[10.5px] text-on-surface-variant leading-relaxed">Genera de forma síncrona 3 variantes personalizadas de autor basadas en las preferencias y el mimo elegido.</p>
              </div>
              <button
                type="button"
                onClick={generateAiMessage}
                disabled={isGenerating || !!currentClient.marketingOptOut || currentClient.contactConsent === false}
                className={`py-2.5 px-4.5 shadow-sm text-[11px] font-bold rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 whitespace-nowrap self-center ${
                  isGenerating 
                    ? 'bg-primary/20 text-primary animate-pulse' 
                    : 'bg-primary text-on-primary hover:bg-[#4a2c40]/90 hover:shadow-md'
                }`}
              >
                {isGenerating ? (
                  <>
                    <span className="material-symbols-outlined text-xs animate-spin font-bold">sync</span>
                    <span>Generando 3 versiones...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xs font-bold">magic_button</span>
                    <span>Generar con IA</span>
                  </>
                )}
              </button>
            </div>

            {/* Versions Selector Tab bar */}
            <div>
              <label className="text-xs uppercase font-bold text-muted-foreground tracking-wider block mb-2.5">Variantes de Mensaje Disponibles (Elige una)</label>
              
              {isGenerating ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="p-3 rounded-xl border border-muted bg-white h-[110px] flex flex-col justify-between animate-pulse"
                      >
                        <div className="h-3 w-1/2 bg-muted rounded"></div>
                        <div className="space-y-2 flex-1 mt-3">
                          <div className="h-2 w-full bg-muted/80 rounded"></div>
                          <div className="h-2 w-5/6 bg-muted/80 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="text-center py-2 text-xs text-primary/70 font-semibold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>
                    <span>Preparando borradores personalizados de autor con IA...</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {versions.map((ver) => {
                    const isActiveVersion = selectedVersionId === ver.id;
                    return (
                      <button
                        key={ver.id}
                        type="button"
                        onClick={() => handleSelectVersion(ver.id)}
                        className={`p-3 rounded-xl border text-left transition-all h-[110px] flex flex-col justify-between cursor-pointer ${
                          isActiveVersion
                            ? 'bg-secondary/10 border-primary text-primary shadow-sm font-semibold'
                            : 'bg-white border-border hover:bg-muted/30 text-foreground'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[9.5px] font-bold uppercase tracking-wider text-primary truncate">
                            {ver.tag}
                          </span>
                          {isActiveVersion && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-3 leading-snug mt-1 flex-1 font-serif italic">
                          "{ver.message}"
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Editable Draft Content Area */}
            <div className="flex flex-col flex-1">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs uppercase font-bold text-on-surface-variant tracking-wider">Redacción del Mensaje seleccionado</label>
                <span className="text-[10px] text-muted-foreground font-semibold">100% Editable</span>
              </div>
              
              {isGenerating ? (
                <div className="w-full min-h-[160px] p-4 bg-white border border-border rounded-xl flex items-center justify-center animate-pulse">
                  <div className="text-center space-y-2">
                    <div className="h-3 w-40 bg-muted rounded mx-auto"></div>
                    <div className="h-2.5 w-60 bg-muted/80 rounded mx-auto"></div>
                  </div>
                </div>
              ) : (
                <textarea 
                  value={draftText}
                  onChange={(e) => handleDraftTextChange(e.target.value)}
                  placeholder="Escribe o personaliza el mensaje aquí..."
                  className="w-full min-h-[160px] p-4 bg-white border border-border rounded-xl text-xs font-serif leading-relaxed text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none shadow-sm"
                />
              )}
            </div>

            {/* AI Recommendation planner footer strip */}
            {aiRecommendation && (
              <div className="bg-[#f0ece5]/45 border border-primary/10 rounded-xl p-3.5 text-[11px] text-on-surface-variant leading-relaxed flex items-start gap-2.5 shadow-sm">
                <span className="material-symbols-outlined text-sm font-bold text-primary select-none mt-0.5">calendar_today</span>
                <div>
                  <span className="font-bold text-primary block text-[9.5px] uppercase tracking-wider mb-0.5">Ventana de Envío idónea</span>
                  {aiRecommendation}
                </div>
              </div>
            )}

          </div>

          {/* Action buttons list */}
          <div className="pt-6 border-t border-outline-variant/25 mt-8 flex flex-col sm:flex-row gap-3">
            <button 
              type="button"
              onClick={() => onNavigate('retention')}
              className="flex-1 py-3.5 border border-outline text-primary text-xs font-bold rounded-xl hover:bg-surface-container-low transition-all cursor-pointer text-center"
            >
              Cancelar
            </button>
            
            <button 
              id="btn-composer-draft"
              type="button"
              onClick={handleSaveDraft}
              className="flex-1 bg-[#f4ece1] border border-primary/10 text-primary py-3.5 px-4 rounded-xl text-xs font-bold hover:bg-[#ebdcc9] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span className="material-symbols-outlined text-sm font-bold">save</span>
              <span>Guardar Borrador</span>
            </button>

            <button 
              id="btn-composer-send"
              type="button"
              onClick={handleSendMessage}
              className="flex-[2] bg-primary hover:bg-[#4a2c40] text-on-primary py-3.5 px-6 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span className="material-symbols-outlined text-sm font-bold">share</span>
              <span>Abrir WhatsApp y Registrar</span>
            </button>
          </div>
        </div>

        {/* Right column: Beautiful phone-style WhatsApp Chat Interface */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="w-full rounded-3xl border border-surface-container relative overflow-hidden flex flex-col flex-1 shadow-md h-full min-h-[500px]">
            
            {/* WhatsApp Header bar */}
            <div className="bg-[#075E54] text-white px-5 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <img 
                  alt={currentClient.name} 
                  className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-sm" 
                  src={currentClient.avatar}
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <h4 className="text-xs font-bold leading-none">{currentClient.name}</h4>
                  <span className="text-[9px] opacity-75 mt-1 inline-block">en línea • Vista Previa</span>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-85 select-none text-white">
                <span className="material-symbols-outlined text-lg">videocam</span>
                <span className="material-symbols-outlined text-lg">phone</span>
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </div>
            </div>

            {/* Chat Room Frame */}
            <div className="whatsapp-bg flex-1 p-5 overflow-y-auto space-y-4">
              
              <div className="flex justify-center select-none">
                <span className="bg-white/90 backdrop-blur-sm text-on-surface-variant text-[9px] font-bold px-2.5 py-1 rounded-md shadow-sm border border-outline-variant/10 uppercase tracking-widest">
                  Hoy
                </span>
              </div>

              {/* Chat Bubble coming from Salón */}
              <div className="flex justify-end pr-2 pl-8">
                <div className="bg-[#EFFFDE] text-on-background p-3.5 rounded-2xl rounded-tr-none shadow-sm border border-outline-variant/10 text-[11px] leading-relaxed max-w-full relative">
                  
                  {/* WhatsApp Body Text with custom format */}
                  <div className="text-on-surface whitespace-pre-wrap select-text text-left">
                    {formatWhatsappMessageHtml(draftText)}
                  </div>
                  
                  {/* Message Meta ticks */}
                  <div className="flex items-center justify-end gap-1 mt-2 mb-[-2px]">
                    <span className="text-[8px] text-on-surface-variant/75 font-semibold select-none">
                      {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="material-symbols-outlined text-xs text-sky-600 font-extrabold select-none">done_all</span>
                  </div>

                </div>
              </div>

              <p className="text-center text-[9px] text-outline font-semibold select-none py-1 italic">
                🔓 Este mensaje se cargará automáticamente en el WhatsApp del destinatario.
              </p>

            </div>

            {/* Interactive Keyboard Footer Bar */}
            <div className="bg-[#F4F4F4] border-t border-outline-variant/30 px-4 py-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant/75 text-xl select-none">add</span>
              <div className="flex-1 bg-white rounded-full border border-outline-variant/20 px-4 py-2 text-[10px] text-on-surface-variant/70 text-left select-none truncate">
                {draftText ? draftText.substring(0, 40) + "..." : "Mensaje listo..."}
              </div>
              <button 
                type="button"
                onClick={handleSendMessage}
                className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center cursor-pointer hover:opacity-90 shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm font-bold">send</span>
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
