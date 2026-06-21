import React, { useState, useEffect, useRef } from 'react';
import { apiUrl } from '../lib/api';

interface ChatMessage {
  role: 'client' | 'agent';
  text: string;
  timestamp: string;
}

interface PublicChatViewProps {
  slug: string;
}

// Genera un sessionId persistente en localStorage
function getOrCreateSessionId(slug: string): string {
  const key = `elena-chat-${slug}`;
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(key, id);
  return id;
}

export default function PublicChatView({ slug }: PublicChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [clientName, setClientName] = useState('');
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [sending, setSending] = useState(false);
  const [tenantName, setTenantName] = useState('Elena Salon');
  const sessionId = useRef(getOrCreateSessionId(slug));
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Cargar historial y nombre del salón
  useEffect(() => {
    fetch(apiUrl(`/api/public-booking/${slug}`))
      .then(r => r.json())
      .then(d => { if (d.tenant?.name) setTenantName(d.tenant.name); })
      .catch(() => {});

    const saved = localStorage.getItem(`elena-chat-name-${slug}`);
    if (saved) { setClientName(saved); setNameConfirmed(true); }

    fetch(apiUrl(`/api/chat/${slug}/history?sessionId=${sessionId.current}`))
      .then(r => r.json())
      .then(d => { if (d.log?.length) setMessages(d.log); })
      .catch(() => {});
  }, [slug]);

  // SSE para respuestas del agente
  useEffect(() => {
    if (!nameConfirmed) return;
    const es = new EventSource(apiUrl(`/api/chat/${slug}/stream?sessionId=${sessionId.current}`));
    es.onmessage = (e) => {
      const msg: ChatMessage = JSON.parse(e.data);
      setMessages(prev => [...prev, msg]);
      setSending(false);
    };
    eventSourceRef.current = es;
    return () => es.close();
  }, [slug, nameConfirmed]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const confirmName = () => {
    if (!clientName.trim()) return;
    localStorage.setItem(`elena-chat-name-${slug}`, clientName.trim());
    setNameConfirmed(true);
    // Mensaje de bienvenida inicial del agente
    setMessages([{
      role: 'agent',
      text: `¡Hola ${clientName.trim()}! 👋 Soy el asistente de ${tenantName}. ¿En qué puedo ayudarte? Puedo informarte sobre servicios, precios o ayudarte a reservar una cita.`,
      timestamp: new Date().toISOString(),
    }]);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSending(true);

    const userMsg: ChatMessage = { role: 'client', text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    try {
      await fetch(apiUrl(`/api/chat/${slug}/message`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sessionId.current, clientName, text }),
      });
    } catch {
      setSending(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

  // ── Pantalla de nombre ─────────────────────────────────────────────────────
  if (!nameConfirmed) {
    return (
      <div className="min-h-screen bg-[#fbf9f5] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <h1 className="font-serif text-4xl font-bold text-[#062d32]">Elena</h1>
            <p className="text-[10px] font-sans uppercase tracking-[0.15em] text-[#062d32]/60 mt-1">
              {tenantName}
            </p>
          </div>

          <div className="bg-white border border-[#062d32]/10 p-8">
            <h2 className="font-serif text-xl font-semibold text-[#062d32] mb-2">¿Cómo te llamas?</h2>
            <p className="text-sm text-[#062d32]/60 mb-6 leading-relaxed">
              Dinos tu nombre para que podamos atenderte de forma personalizada.
            </p>
            <input
              type="text"
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmName()}
              placeholder="Tu nombre"
              autoFocus
              className="w-full border-b border-[#767676] bg-transparent text-[#062d32] text-sm py-2 mb-6 outline-none placeholder:text-[#062d32]/30 font-serif"
            />
            <button
              onClick={confirmName}
              disabled={!clientName.trim()}
              className="w-full border border-[#000] text-[#000] font-sans text-xs uppercase tracking-[0.042em] py-3 transition-all hover:bg-[#062d32] hover:text-white hover:border-[#062d32] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Empezar
            </button>
          </div>

          <p className="text-center text-[10px] text-[#062d32]/40 mt-6 font-sans uppercase tracking-wider">
            Powered by Rommer Volcanes
          </p>
        </div>
      </div>
    );
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fbf9f5] flex flex-col">
      {/* Header */}
      <header className="bg-[#062d32] px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-[#c9a9b5]/20 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#c9a9b5] text-base">spa</span>
        </div>
        <div>
          <h1 className="font-serif text-white font-semibold text-base leading-none">{tenantName}</h1>
          <p className="text-[10px] text-[#c9a9b5] font-sans uppercase tracking-wider mt-0.5">Asistente virtual · En línea</p>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 max-w-lg w-full mx-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'client' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'agent' && (
              <div className="w-7 h-7 rounded-full bg-[#062d32] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
                <span className="material-symbols-outlined text-[#c9a9b5] text-xs">spa</span>
              </div>
            )}
            <div className={`max-w-[78%] ${msg.role === 'client' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div className={`px-4 py-3 text-sm leading-relaxed font-serif ${
                msg.role === 'client'
                  ? 'bg-[#062d32] text-white'
                  : 'bg-white border border-[#062d32]/10 text-[#062d32]'
              }`}>
                {msg.text}
              </div>
              <span className="text-[10px] text-[#062d32]/40 font-sans px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-[#062d32] flex items-center justify-center flex-shrink-0 mt-1 mr-2">
              <span className="material-symbols-outlined text-[#c9a9b5] text-xs">spa</span>
            </div>
            <div className="bg-white border border-[#062d32]/10 px-4 py-3 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#062d32]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-[#062d32]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-[#062d32]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-[#062d32]/10 bg-white px-4 py-3 max-w-lg w-full mx-auto">
        <div className="flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escribe un mensaje…"
            rows={1}
            className="flex-1 border-b border-[#767676] bg-transparent text-[#062d32] text-sm py-2 outline-none resize-none placeholder:text-[#062d32]/30 font-serif leading-relaxed"
            style={{ maxHeight: '100px', overflowY: 'auto' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="border border-[#062d32] text-[#062d32] p-2 transition-all hover:bg-[#062d32] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <span className="material-symbols-outlined text-base">send</span>
          </button>
        </div>
        <p className="text-[9px] text-[#062d32]/30 font-sans uppercase tracking-wider mt-2 text-center">
          Powered by Rommer Volcanes · Elena Salon
        </p>
      </div>
    </div>
  );
}
