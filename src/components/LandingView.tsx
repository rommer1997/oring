import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface LandingViewProps {
  onNavigate: (view: AppView) => void;
  onSignInWithGoogle: () => Promise<void>;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onCreateAccountWithEmail: (email: string, password: string) => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  onStartDemo: () => void;
  currentUser: unknown | null;
}

export default function LandingView({ onNavigate, onSignInWithGoogle, onSignInWithEmail, onCreateAccountWithEmail, onForgotPassword, onStartDemo, currentUser }: LandingViewProps) {
  const [inactiveClients, setInactiveClients] = useState<number>(30);
  const [averageTicket, setAverageTicket] = useState<number>(65);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up' | null>(null);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [forgotSent, setForgotSent] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | 'cookies' | null>(null);
  const [cookieConsent, setCookieConsent] = useState<'accepted' | 'rejected' | null>(() => {
    try { return localStorage.getItem('elena_cookie_consent') as 'accepted' | 'rejected' | null; } catch { return null; }
  });

  useEffect(() => {
    if (cookieConsent) localStorage.setItem('elena_cookie_consent', cookieConsent);
  }, [cookieConsent]);

  // Live calculator calculations
  const totalLoss = inactiveClients * averageTicket;
  const targetRecovered = Math.round(totalLoss * 0.40);

  const openAuth = (mode: 'sign-in' | 'sign-up') => {
    if (currentUser) {
      onNavigate('dashboard');
      return;
    }
    setAuthMode(mode);
    setForgotSent(false);
    setAuthError(null);
  };

  const handleGoogleClick = async () => {
    try {
      setIsSigningIn(true);
      await onSignInWithGoogle();
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    try {
      setIsSigningIn(true);
      if (authMode === 'sign-up') {
        await onCreateAccountWithEmail(email, password);
      } else {
        await onSignInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al autenticar';
      setAuthError(msg.replace(/\(auth\/[^)]+\)\s*/, ''));
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen Selection:bg-primary-fixed selection:text-primary">
      {/* Top Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-4 md:px-16 py-4 bg-surface/90 backdrop-blur-md shadow-sm">
        <div className="flex flex-col items-start gap-0.5">
          <span className="font-serif text-2xl font-bold text-primary tracking-tight leading-none">Elena</span>
          <span className="text-[6.5px] tracking-wider text-primary/70 font-sans uppercase">Powered by Rommer Volcanes</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8">
          <a className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors duration-300" href="#soluciones">Soluciones</a>
          <a className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors duration-300" href="#calculadora">Calculadora</a>
          <a className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors duration-300" href="#maravillas">Lo que Elena hace</a>
          <a className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors duration-300" href="#precios">Precios</a>
          <a className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors duration-300" href="#faq">Preguntas</a>
        </div>

        <button 
          id="btn-nav-auth"
          onClick={() => openAuth('sign-in')}
          className="inline-flex items-center justify-center bg-primary text-white text-sm font-bold px-6 py-2.5 rounded-full hover:bg-primary/90 transition-all duration-300 shadow-sm cursor-pointer"
        >
          {currentUser ? 'Entrar a mi salón' : isSigningIn ? 'Conectando...' : 'Iniciar sesión'}
        </button>
      </nav>

      {/* Main Container */}
      <main className="pt-28">
        
        {/* Hero Section */}
        <section id="soluciones" className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-8">
            <div className="lg:col-span-6 flex flex-col gap-8 lg:pr-12">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight tracking-tight">
                Recupera clientas antes de perderlas
              </h1>
              <p className="text-lg text-on-surface-variant max-w-lg leading-relaxed">
                Elena detecta qué clientas llevan demasiado tiempo sin venir, escribe el mensaje por ti y te avisa para que lo envíes con un toque. Sin complicaciones.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  id="btn-hero-start"
                  onClick={() => openAuth('sign-up')}
                  className="inline-flex items-center justify-center bg-primary text-white font-bold text-base px-8 py-4 rounded-full hover:bg-primary/90 transition-all duration-300 shadow-md cursor-pointer"
                >
                  {currentUser ? 'Entrar a mi salón' : isSigningIn ? 'Creando cuenta...' : 'Probar Elena 14 días gratis'}
                </button>
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="text-sm font-medium text-primary/70 hover:text-primary underline underline-offset-4 cursor-pointer transition-colors"
                >
                  ¿Prefieres verlo primero? Ver demo →
                </button>
                <span className="text-sm font-semibold text-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary font-bold text-lg">check_circle</span>
                  Sin tarjeta de crédito
                </span>
                <span className="text-sm font-semibold text-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary font-bold text-lg">shield</span>
                  Tus datos y los de tus clientas, protegidos
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 relative mt-12 lg:mt-0">
              <div className="aspect-[4/5] rounded-3xl overflow-hidden ambient-shadow relative border border-surface-container-high/40">
                <img 
                  alt="Elegant salon interior with light cream arches and soft pink couches" 
                  className="w-full h-full object-cover" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCxUVBqqDEwvHoMV8eurZEH3ThZc12RB_D0-Pi1H0gxdEYMmAuRjj8R1fe5vlJ1-KYdZzK32lLi1lzh8_cy5VIMJ6JSylfGOPUX5GAyLtT95a_ZfdeYM7HSzr923bqxwi7TdIjYvZnPdiIVZYve87NIUdgkq_7b_1XMmI9pPBhfFAqgk2DC5iZVSP68l4ERsMpbB_wVdisuSi24Zh1Ix-X_vr3VeRnGwqT_308eqz_s631I6tK7HFEoCy2Cu6pfOOG-Q7bFoQ0C4AM"
                  referrerPolicy="no-referrer"
                />
                
                {/* Floating IA Active Box */}
                <div className="absolute bottom-8 left-8 right-8 bg-surface/90 backdrop-blur-md rounded-2xl p-6 ambient-shadow border border-surface-container-high/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container">
                      <span className="material-symbols-outlined font-bold text-2xl">auto_awesome</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">Asistente activo</p>
                      <p className="text-base text-on-surface-variant font-medium">Elena acaba de escribirle a Carmen — lleva 87 días sin venir</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-y border-surface-container-high bg-surface-container-low/40 py-6 mb-24 md:mb-32">
          <div className="max-w-[1280px] mx-auto px-4 md:px-16 flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: 'storefront', text: 'Pensado para salones españoles' },
              { icon: 'gavel', text: 'Cumple la ley de protección de datos (RGPD)' },
              { icon: 'support_agent', text: 'Soporte real por email' },
              { icon: 'lock', text: 'Datos en la UE · Cifrados · Borrado RGPD en 1 clic' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
                <span className="text-sm font-semibold">{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Live Interactive Calculator Section */}
        <section id="calculadora" className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32">
          <div className="bg-surface-container-lowest rounded-3xl ambient-shadow p-6 md:p-14 text-center max-w-4xl mx-auto border border-surface-container/50">
            <h2 className="font-serif text-3xl md:text-4xl font-semibold text-primary mb-4">
              Calcula el dinero que estás dejando escapar
            </h2>
            <p className="text-lg text-on-surface-variant mb-12 max-w-2xl mx-auto">
              Descubre el impacto real de las clientas inactivas en tu facturación mensual y cómo Elena puede ayudarte a recuperarlo.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center text-left">
              <div className="flex flex-col gap-8">
                {/* Slider 1: Inactive Clients */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-on-surface-variant">Clientas inactivas al mes</label>
                    <span className="text-sm font-bold text-primary bg-primary-fixed/30 px-2.5 py-1 rounded-md">{inactiveClients} clientas</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={inactiveClients}
                    onChange={(e) => setInactiveClients(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary outline-none"
                  />
                  <div className="flex justify-between mt-2 text-xs text-outline font-medium">
                    <span>10</span>
                    <span>100</span>
                  </div>
                </div>

                {/* Slider 2: Average Ticket */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold text-on-surface-variant">Ticket medio por clienta (€)</label>
                    <span className="text-sm font-bold text-primary bg-primary-fixed/30 px-2.5 py-1 rounded-md">{averageTicket}€</span>
                  </div>
                  <input 
                    type="range" 
                    min="30" 
                    max="200" 
                    value={averageTicket}
                    onChange={(e) => setAverageTicket(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-primary outline-none"
                  />
                  <div className="flex justify-between mt-2 text-xs text-outline font-medium">
                    <span>30€</span>
                    <span>200€</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Results Box */}
              <div className="bg-primary shadow-lg rounded-2xl p-8 text-center text-on-primary relative overflow-hidden flex flex-col justify-between min-h-[300px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container rounded-bl-full opacity-30 -z-0"></div>
                
                <div className="relative z-10">
                  <p className="text-xs uppercase font-bold tracking-widest mb-2 text-primary-fixed-dim">Dinero que puedes recuperar</p>
                  <p className="font-serif text-5xl font-bold text-on-primary tracking-tight">
                    {totalLoss.toLocaleString('es-ES')}€
                    <span className="text-xl font-normal text-primary-fixed-dim">/mes</span>
                  </p>
                  <div className="h-px w-full bg-white/10 my-5"></div>
                  
                  <p className="text-sm leading-relaxed mb-6">
                    Si reactivas a tiempo a tus clientas ausentes, podrías recuperar hasta <strong className="text-tertiary-fixed font-bold">{targetRecovered.toLocaleString('es-ES')}€</strong> al mes. <span className="text-primary-fixed-dim">(Estimación sobre reactivar un 40% de ellas.)</span>
                  </p>
                </div>
                
                <button 
                  id="btn-calc-action"
                  onClick={() => openAuth('sign-up')}
                  className="w-full bg-surface text-primary font-bold text-sm py-3 px-6 rounded-full hover:bg-surface-bright transition-all duration-300 relative z-10 hover:shadow-md cursor-pointer"
                >
                  Probar Elena 14 días gratis
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Las Maravillas de ElenaOS Section */}
        <section id="maravillas" className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32 text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#bfa982] bg-primary/5 px-3 py-1 rounded-full border border-primary/10 select-none">
              🎁 UNA SUITE EXCLUSIVA DE AUTOR
            </span>
            <h2 className="font-serif text-3xl md:text-4.5xl font-bold text-primary">
              Lo que Elena hace por ti
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto font-medium">
              Todo lo que necesitas para tu salón, en un solo sitio. Diseñado para que recuperes clientas, gestiones tu agenda y cuides tu negocio sin complicaciones.
            </p>
          </div>

          {/* Card destacada: Asistente Autónomo */}
          <div className="mt-12 bg-primary text-on-primary rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-3xl font-bold text-[#fdf6ec]">smart_toy</span>
            </div>
            <div className="flex-1 relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] font-bold uppercase tracking-widest bg-[#fdf6ec]/15 text-[#fdf6ec] px-2.5 py-1 rounded-full border border-white/20">Lo más diferente de Elena</span>
              </div>
              <h3 className="font-serif text-2xl md:text-3xl font-bold text-on-primary mb-3">Tu asistente trabaja mientras tú atiendes</h3>
              <p className="text-sm text-primary-fixed-dim leading-relaxed max-w-2xl">
                Elena revisa sola quién lleva demasiado tiempo sin venir, detecta el motivo (precio, competencia, falta de tiempo...) y prepara el mensaje perfecto para cada clienta. Tú lo apruebas y ella lo envía por WhatsApp. Sin que tengas que acordarte de nadie.
              </p>
            </div>
            <button onClick={() => openAuth('sign-up')} className="shrink-0 bg-[#fdf6ec] text-primary font-bold text-sm px-6 py-3 rounded-full hover:bg-white transition-colors cursor-pointer whitespace-nowrap">
              Probar Elena 14 días gratis
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-8 text-left">
            {[
              { icon: 'insights', title: 'Aviso antes de perder a una clienta', desc: 'Elena te dice quién lleva demasiado tiempo sin venir y qué puedes hacer para que vuelva.' },
              { icon: 'magic_button', title: 'Mensajes escritos para ti', desc: 'Te prepara tres versiones del mensaje adaptadas a la última visita de tu clienta. Tú eliges cuál enviar.' },
              { icon: 'public', title: 'Reservas desde cualquier lugar', desc: 'Tus clientas pueden pedir cita desde su móvil en cualquier momento. La agenda se actualiza sola.' },
              { icon: 'calendar_month', title: 'Agenda sencilla y sin errores', desc: 'Gestiona las citas de todo tu equipo. Elena comprueba la disponibilidad y evita que dos citas se solapen.' },
              { icon: 'inventory_2', title: 'Siempre sabes lo que tienes en stock', desc: 'Controla tus productos de cabina y reventa. Te avisamos antes de que te quedes sin nada.' },
              { icon: 'receipt_long', title: 'Facturación sin papeleos', desc: 'Registra cobros, genera informes y ten todo en orden para cuando lo necesites.' },
              { icon: 'shield', title: 'Protección de datos de serie', desc: 'Los datos de tus clientas están protegidos por ley. Si alguien pide que lo borres, lo haces en un clic.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                    <span className="material-symbols-outlined text-2xl font-bold">{icon}</span>
                  </div>
                  <h3 className="font-serif text-xl font-bold text-primary mb-2.5">{title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-semibold font-sans">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA entre secciones */}
          <div className="mt-14 text-center">
            <button onClick={() => openAuth('sign-up')} className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-8 py-4 rounded-full hover:bg-primary/90 transition-all shadow-md cursor-pointer">
              <span>Probar Elena 14 días gratis</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
            <p className="text-xs text-outline mt-3">14 días de prueba · Cancela cuando quieras</p>
            <p className="text-xs text-primary/50 mt-1">
              <button type="button" onClick={onStartDemo} className="hover:text-primary underline underline-offset-2 cursor-pointer transition-colors">¿Prefieres verlo antes? Ver demo →</button>
            </p>
          </div>
        </section>

        {/* Pricing Plans */}
        <section id="precios" className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4">
              Inversión en tu negocio
            </h2>
            <p className="text-base text-on-surface-variant max-w-xl mx-auto">
              Un único plan Premium con todo incluido. Sin sorpresas, sin permanencia.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Launch offer banner */}
            <div className="bg-gradient-to-r from-[#4A2C40] to-[#7B3F5E] text-white rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#fdf6ec] font-bold">local_offer</span>
                <div>
                  <p className="font-bold text-sm text-[#fdf6ec] uppercase tracking-wider">Precio de Fundadora · Plazas limitadas</p>
                  <p className="text-[11px] text-primary-fixed-dim">Accede ahora a 35€/mes durante tu primer año. Después, 89€/mes sin permanencia.</p>
                </div>
              </div>
              <button
                onClick={() => openAuth('sign-up')}
                className="shrink-0 bg-[#fdf6ec] text-[#4A2C40] font-bold text-sm px-6 py-2.5 rounded-full hover:bg-white transition-colors cursor-pointer"
              >
                Activar precio fundadora
              </button>
            </div>

            {/* Plan cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Monthly */}
              <div className="bg-surface-container-lowest rounded-2xl p-10 border border-surface-variant ambient-shadow flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="font-serif text-2xl font-semibold text-primary">Mensual</h3>
                    <span className="text-[10px] bg-[#f5f1e9] text-primary font-bold uppercase px-2 py-1 rounded-full border border-[#bfa982]/30">Sin permanencia</span>
                  </div>
                  <div className="mb-2">
                    <span className="text-sm text-on-surface-variant line-through font-medium">89€/mes</span>
                  </div>
                  <div className="mb-8">
                    <span className="font-serif text-5xl font-bold text-primary">35€</span>
                    <span className="text-sm text-on-surface-variant font-medium">/mes · primer año</span>
                  </div>
                  <ul className="flex flex-col gap-3 mb-10 text-sm text-on-surface-variant font-medium">
                    {['Agenda y CRM completos','Generador de mensajes con IA','Motor de retención inteligente','Gestión de staff y servicios','Inventario básico','Soporte por email'].map(f => (
                      <li key={f} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-lg font-bold">check</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => openAuth('sign-up')} className="w-full py-4 rounded-full border border-primary text-primary font-bold text-sm hover:bg-surface-container-high transition-colors cursor-pointer">
                  Empezar 14 días gratis
                </button>
              </div>

              {/* Annual */}
              <div className="bg-primary text-on-primary rounded-2xl p-10 ambient-shadow relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-4 right-4">
                  <span className="bg-[#fdf6ec] text-[#4A2C40] text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full">
                    Ahorra 2 meses
                  </span>
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-semibold text-on-primary mb-4">Anual</h3>
                  <div className="mb-2">
                    <span className="text-sm text-primary-fixed-dim line-through font-medium">1.068€/año</span>
                  </div>
                  <div className="mb-2">
                    <span className="font-serif text-5xl font-bold text-on-primary">350€</span>
                    <span className="text-sm text-primary-fixed-dim font-medium">/año · pago único</span>
                  </div>
                  <p className="text-xs text-primary-fixed-dim mb-8">Equivale a <strong className="text-tertiary-fixed">29,17€/mes</strong> · 2 meses de regalo incluidos</p>
                  <ul className="flex flex-col gap-3 mb-10 text-sm font-medium">
                    {['Todo lo del plan Mensual','Prioridad en nuevas funcionalidades','Ayuda para empezar por videollamada','Acceso prioritario a nuevas funciones'].map(f => (
                      <li key={f} className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-tertiary-fixed text-lg font-bold">check</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <button onClick={() => openAuth('sign-up')} className="w-full py-4 rounded-full bg-on-primary text-primary font-bold text-sm hover:bg-surface-bright transition-colors cursor-pointer">
                  Contratar plan anual
                </button>
              </div>
            </div>

            <p className="text-center text-xs text-on-surface-variant mt-6">Todos los planes incluyen 14 días de prueba gratuita · Sin tarjeta de crédito para empezar</p>
            <p className="text-center text-xs text-primary/50 mt-2">
              <button type="button" onClick={onStartDemo} className="hover:text-primary underline underline-offset-2 cursor-pointer transition-colors">¿Prefieres verlo antes? Ver demo →</button>
            </p>

            {/* Features Comparison Table */}
            <div className="mt-20 border-t border-primary/5 pt-16 text-left">
              <h3 className="font-serif text-3xl font-bold text-center text-primary mb-4">¿Por qué ElenaOS es diferente?</h3>
              <p className="text-sm text-on-surface-variant text-center max-w-2xl mx-auto mb-10 font-medium font-sans">
                Frente a la agenda de papel o a apps de reservas como Booksy o Treatwell, Elena no solo guarda las citas: trabaja sola para que tus clientas vuelvan.
              </p>

              <div className="bg-white rounded-2xl border border-[#bfa982]/20 overflow-hidden shadow-sm max-w-4xl mx-auto font-sans">
                <table className="w-full text-left text-xs sm:text-sm font-medium border-collapse">
                  <thead>
                    <tr className="border-b border-[#bfa982]/20 bg-surface-container-low/40">
                      <th className="px-4 sm:px-6 py-4 text-primary font-bold">Lo que necesita tu salón</th>
                      <th className="px-3 sm:px-6 py-4 text-on-surface-variant font-bold text-center">Papel / Google Calendar</th>
                      <th className="px-3 sm:px-6 py-4 text-on-surface-variant font-bold text-center">Booksy / Treatwell</th>
                      <th className="px-3 sm:px-6 py-4 text-primary font-bold text-center bg-primary/5">Elena</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/50 text-on-surface-variant font-medium">
                    {[
                      { f: 'Asistente que actúa solo — detecta, escribe y avisa', a: false, b: false },
                      { f: 'Aviso cuando una clienta lleva tiempo sin venir', a: false, b: false },
                      { f: 'Mensajes de WhatsApp escritos por IA (3 estilos)', a: false, b: false },
                      { f: 'Reservas online para tus clientas', a: false, b: true },
                      { f: 'Agenda con control de disponibilidad del equipo', a: 'Manual', b: true },
                      { f: 'Informes de lo que ganas recuperando clientas', a: false, b: 'Básicos' },
                      { f: 'Protección de datos de clientas y borrado en 1 clic', a: false, b: 'Parcial' },
                    ].map(({ f, a, b }) => {
                      const cell = (v: boolean | string) =>
                        typeof v === 'string'
                          ? <span className="text-xs">{v}</span>
                          : <span className={`material-symbols-outlined font-extrabold text-base select-none ${v ? 'text-emerald-600' : 'text-red-500'}`}>{v ? 'check' : 'close'}</span>;
                      return (
                        <tr key={f} className="transition-colors hover:bg-surface-container-low/20">
                          <td className="px-4 sm:px-6 py-4 text-primary font-bold">{f}</td>
                          <td className="px-3 sm:px-6 py-4 text-center">{cell(a)}</td>
                          <td className="px-3 sm:px-6 py-4 text-center">{cell(b)}</td>
                          <td className="px-3 sm:px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* H03: prueba social honesta (sin clientes reales todavía — no inventar testimonios) */}
        <section className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32">
          <div className="bg-surface-container-lowest rounded-3xl border border-surface-container/50 p-8 md:p-12 text-center max-w-3xl mx-auto">
            <span className="material-symbols-outlined text-primary text-3xl mb-3">verified</span>
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary mb-3">
              En pruebas con salones de Madrid antes del lanzamiento
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant leading-relaxed max-w-xl mx-auto">
              Estamos afinando Elena junto a un grupo reducido de salones reales. ¿Quieres ser de las primeras y conseguir el precio de fundadora? Pruébala 14 días gratis y cuéntanos qué necesitas.
            </p>
          </div>
        </section>

        {/* H07: FAQ — <details> nativo, sin JS de acordeón */}
        <section id="faq" className="px-4 md:px-16 max-w-[1280px] mx-auto mb-24 md:mb-32">
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary text-center mb-12">Preguntas frecuentes</h2>
          <div className="max-w-3xl mx-auto divide-y divide-surface-container-high border-y border-surface-container-high">
            {[
              { q: '¿Mis clientas tienen que instalar una app?', a: 'No. Tus clientas reservan desde el navegador de su móvil, sin descargar nada. Reciben tus mensajes por WhatsApp, como siempre.' },
              { q: '¿Cómo funciona lo de WhatsApp? ¿Tiene coste extra?', a: 'Elena prepara el mensaje, tú lo apruebas y se envía por WhatsApp. Los mensajes están incluidos en tu cuota: no pagas nada aparte por enviarlos.' },
              { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. No hay permanencia. Cancelas desde tu panel en cualquier momento, sin penalización. No se reembolsan periodos ya facturados.' },
              { q: '¿Necesito tarjeta para empezar la prueba?', a: 'No. Los 14 días de prueba no piden tarjeta de crédito. Solo pones tus datos de pago si decides seguir.' },
              { q: '¿Están seguros los datos de mis clientas?', a: 'Sí. Los datos se alojan cifrados en servidores de la Unión Europea (Google Cloud) y cumplimos el RGPD. Si una clienta pide que borres sus datos, lo haces en un clic.' },
              { q: '¿Necesito conocimientos técnicos para usar Elena?', a: 'No. El alta tarda unos 2 minutos y te guiamos paso a paso. Si te atascas, escríbenos por email y te ayudamos.' },
            ].map(({ q, a }) => (
              <details key={q} className="group py-5">
                <summary className="flex items-center justify-between cursor-pointer list-none font-serif text-lg font-bold text-primary">
                  {q}
                  <span className="material-symbols-outlined text-primary transition-transform group-open:rotate-180">expand_more</span>
                </summary>
                <p className="mt-3 text-sm text-on-surface-variant leading-relaxed font-sans">{a}</p>
              </details>
            ))}
          </div>
          <div className="text-center mt-10">
            <button onClick={() => openAuth('sign-up')} className="inline-flex items-center gap-2 bg-primary text-white font-bold text-sm px-8 py-4 rounded-full hover:bg-primary/90 transition-all shadow-md cursor-pointer">
              Probar Elena 14 días gratis
            </button>
          </div>
        </section>

      </main>

      {authMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => { setAuthMode(null); setForgotSent(false); setAuthError(null); }}
            className="absolute inset-0 bg-primary/35 backdrop-blur-sm cursor-pointer"
          />
          <form onSubmit={handleEmailSubmit} className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl border border-primary/15">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary">
                  {authMode === 'sign-up' ? 'Crear cuenta' : 'Iniciar sesión'}
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  {authMode === 'sign-up' ? 'Crea tu salón privado con email o Google.' : 'Entra con tu email o continúa con Google.'}
                </p>
              </div>
              <button type="button" onClick={() => { setAuthMode(null); setForgotSent(false); setAuthError(null); }} className="text-primary hover:text-primary/70 cursor-pointer">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="tu@email.com"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">Contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
                  className="mt-1 w-full rounded-xl border border-primary/20 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
                  placeholder="Contraseña"
                />
                {authMode === 'sign-up' && <p className="mt-1 text-[11px] text-primary/50">Mínimo 6 caracteres</p>}
              </label>
              {authMode === 'sign-in' && (
                <div className="text-right">
                  <button
                    type="button"
                    disabled={forgotSent}
                    onClick={async () => {
                      await onForgotPassword(email);
                      setForgotSent(true);
                    }}
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                  >
                    {forgotSent ? '✓ Correo enviado' : '¿Olvidaste tu contraseña?'}
                  </button>
                </div>
              )}
            </div>

            {authError && (
              <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{authError}</p>
            )}

            <button
              type="submit"
              disabled={isSigningIn}
              className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isSigningIn ? 'Conectando...' : authMode === 'sign-up' ? 'Crear cuenta con email' : 'Entrar con email'}
            </button>

            {authMode === 'sign-up' && (
              <p className="mt-2 text-center text-[11px] text-on-surface-variant">
                Tardarás 2 minutos en preparar tu salón. Te guiamos paso a paso.
              </p>
            )}

            <button
              type="button"
              disabled={isSigningIn}
              onClick={handleGoogleClick}
              className="mt-3 w-full rounded-full border border-primary/20 bg-white px-6 py-3 text-sm font-bold text-primary transition hover:bg-primary/5 disabled:opacity-60"
            >
              Continuar con Google
            </button>

            <button
              type="button"
              onClick={() => setAuthMode(authMode === 'sign-up' ? 'sign-in' : 'sign-up')}
              className="mt-4 w-full text-center text-xs font-bold text-primary underline"
            >
              {authMode === 'sign-up' ? 'Ya tengo cuenta' : 'Crear cuenta nueva'}
            </button>
          </form>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-surface-container-low w-full px-4 md:px-16 py-12 border-t border-surface-container-high mt-16">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-1">
            <div className="font-serif text-2xl font-bold text-primary leading-none">Elena</div>
            <div className="text-[7px] tracking-wider text-primary/70 font-sans uppercase">Powered by Rommer Volcanes</div>
          </div>
          
          <div className="text-center md:text-left text-sm text-on-surface-variant font-medium">
            © 2026 Elena. Gestión moderna para tu salón.
          </div>
          
          <div className="flex flex-wrap justify-center gap-6">
            <button className="text-xs font-bold text-on-surface-variant hover:underline decoration-outline-variant underline-offset-4" onClick={() => setLegalView('terms')}>Aviso Legal</button>
            <button className="text-xs font-bold text-on-surface-variant hover:underline decoration-outline-variant underline-offset-4" onClick={() => setLegalView('privacy')}>Privacidad</button>
            <button className="text-xs font-bold text-on-surface-variant hover:underline decoration-outline-variant underline-offset-4" onClick={() => setLegalView('cookies')}>Cookies</button>
            <a className="text-xs font-bold text-on-surface-variant hover:underline decoration-outline-variant underline-offset-4" href="mailto:hola@elena-os.com">Contacto</a>
          </div>
        </div>
      </footer>

      {legalView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-primary/45 backdrop-blur-sm" onClick={() => setLegalView(null)}></div>
          <div className="relative bg-white max-w-2xl w-full rounded-2xl p-6 md:p-8 border border-outline-variant/20 shadow-xl text-left">
            <button className="absolute right-4 top-4 text-outline hover:text-primary" onClick={() => setLegalView(null)}>
              <span className="material-symbols-outlined">close</span>
            </button>
            <h3 className="font-serif text-2xl font-bold text-primary mb-3">
              {legalView === 'privacy' ? 'Privacidad' : legalView === 'terms' ? 'Aviso legal y términos' : 'Política de cookies'}
            </h3>
            <div className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
              {legalView === 'privacy' && (
                <>
                  <p><strong>Responsable del tratamiento:</strong> ElenaOS, software de gestión para centros de estética. Contacto: soporte@elenaos.app</p>
                  <p><strong>Finalidad:</strong> Gestión de agenda, CRM de clientas, seguimiento de retención y comunicaciones comerciales autorizadas por el salón.</p>
                  <p><strong>Base legal:</strong> Ejecución de contrato (Art. 6.1.b RGPD) para datos del salón; consentimiento explícito (Art. 6.1.a RGPD) para comunicaciones de marketing a clientas finales.</p>
                  <p><strong>Destinatarios:</strong> Firebase (Google Cloud, UE), Gemini AI (Google). No se ceden datos a terceros con fines comerciales.</p>
                  <p><strong>Conservación:</strong> Los datos de clientas se conservan mientras el salón mantenga su cuenta activa. El salón puede solicitar la eliminación total de datos en cualquier momento.</p>
                  <p><strong>Derechos:</strong> Las clientas del salón pueden ejercer sus derechos de acceso, rectificación, supresión, portabilidad y oposición solicitándolo al salón o directamente a soporte@elenaos.app. También pueden presentar reclamación ante la AEPD (www.aepd.es).</p>
                  <p><strong>Transferencias internacionales:</strong> Los datos se almacenan en servidores de Google Cloud dentro de la UE. Las transferencias cumplen con las garantías del RGPD (Decisiones de adecuación y Cláusulas Contractuales Tipo).</p>
                </>
              )}
              {legalView === 'terms' && (
                <>
                  <p><strong>Descripción del servicio:</strong> ElenaOS es un software SaaS de gestión para salones y centros de estética que incluye agenda, CRM, motor de retención de clientas y generación de mensajes asistida por IA.</p>
                  <p><strong>Responsabilidad del usuario:</strong> El salón es responsable de obtener el consentimiento de sus clientas para recibir comunicaciones comerciales (Art. 21 LSSI-CE y RGPD). Las sugerencias de mensajes generadas por IA son borradores que requieren revisión y aprobación humana antes de cualquier envío.</p>
                  <p><strong>Suspensión del servicio:</strong> ElenaOS se reserva el derecho de suspender cuentas que incumplan la normativa de protección de datos o usen el servicio para enviar comunicaciones no solicitadas.</p>
                  <p><strong>Facturación:</strong> Las suscripciones se renuevan automáticamente. El usuario puede cancelar en cualquier momento desde su panel sin penalización. No se realizan reembolsos de períodos ya facturados salvo error del proveedor.</p>
                  <p><strong>Legislación aplicable:</strong> Los presentes términos se rigen por la legislación española. Para cualquier controversia, las partes se someten a los tribunales de la ciudad del responsable del servicio.</p>
                </>
              )}
              {legalView === 'cookies' && (
                <>
                  <p><strong>Cookies técnicas (necesarias):</strong> ElenaOS utiliza cookies de sesión de Firebase Authentication y almacenamiento local (localStorage) para mantener la sesión activa y el funcionamiento correcto de la aplicación. Estas cookies no pueden desactivarse.</p>
                  <p><strong>Cookies analíticas:</strong> Actualmente ElenaOS no utiliza cookies analíticas de terceros. En caso de incorporarse en el futuro, se solicitará consentimiento previo mediante un banner conforme al RGPD.</p>
                  <p><strong>Cookies publicitarias:</strong> ElenaOS no utiliza cookies publicitarias ni comparte datos de navegación con redes publicitarias.</p>
                  <p><strong>Gestión:</strong> Puedes eliminar las cookies técnicas limpiando el almacenamiento de tu navegador, lo que cerrará tu sesión activa.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LEG-01: Cookie consent banner */}
      {!cookieConsent && (
        <div className="fixed bottom-0 left-0 right-0 z-[80] bg-white border-t border-outline-variant/30 shadow-lg px-4 py-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <p className="flex-1 text-xs text-on-surface-variant">
              Usamos cookies técnicas necesarias para el funcionamiento de la app (sesión de Firebase). No usamos cookies de seguimiento ni publicidad.{' '}
              <button className="underline hover:text-primary" onClick={() => setLegalView('cookies')}>Más info</button>
            </p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setCookieConsent('rejected')}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider border border-outline-variant text-on-surface-variant hover:bg-surface-container-low"
              >Rechazar</button>
              <button
                onClick={() => setCookieConsent('accepted')}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-primary/90"
              >Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
