import React, { useState } from 'react';
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
  const [legalView, setLegalView] = useState<'privacy' | 'terms' | 'cookies' | null>(null);

  // Live calculator calculations
  const totalLoss = inactiveClients * averageTicket;
  const targetRecovered = Math.round(totalLoss * 0.40);

  const openAuth = (mode: 'sign-in' | 'sign-up') => {
    if (currentUser) {
      onNavigate('dashboard');
      return;
    }
    setAuthMode(mode);
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
    try {
      setIsSigningIn(true);
      if (authMode === 'sign-up') {
        await onCreateAccountWithEmail(email, password);
      } else {
        await onSignInWithEmail(email, password);
      }
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
                La herramienta que cuida tu salón y tus clientas. Genera mensajes personalizados con IA y envíalos tú misma con un clic para rescatar visitas en riesgo.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <button 
                  id="btn-hero-start"
                  onClick={() => openAuth('sign-up')}
                  className="inline-flex items-center justify-center bg-primary text-white font-bold text-base px-8 py-4 rounded-full hover:bg-primary/90 transition-all duration-300 shadow-md cursor-pointer"
                >
                  {currentUser ? 'Entrar a mi salón' : isSigningIn ? 'Creando cuenta...' : 'Crear cuenta gratis'}
                </button>
                <button
                  type="button"
                  onClick={onStartDemo}
                  className="inline-flex items-center justify-center border border-primary/25 text-primary font-bold text-sm px-6 py-3 rounded-full hover:bg-primary/5 transition-all duration-300 cursor-pointer"
                >
                  Ver demo aislada
                </button>
                <span className="text-sm font-semibold text-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary font-bold text-lg">check_circle</span>
                  Cuenta individual sin tarjeta
                </span>
                <span className="text-sm font-semibold text-outline-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary font-bold text-lg">shield</span>
                  Cumple el RGPD — tus datos y los de tus clientas, protegidos
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
                      <p className="text-xs font-bold text-primary uppercase tracking-wider mb-1">IA ACTIVA</p>
                      <p className="text-base text-on-surface-variant font-medium">3 clientas recuperadas esta semana</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
                  Crear mi cuenta
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 mt-12 text-left">
            {/* Feature 1: riskEngine */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">insights</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">Alertas de clientas ausentes</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold font-sans">
                  Identifica a tus clientas que te echan de menos y prepara mensajes para que vuelvan a tu salón.
                </p>
              </div>
            </div>

            {/* Feature 2: Gemini 3.5 */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">magic_button</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">Asistente para escribir mensajes</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                  Redacta borradores de WhatsApp hiper-personalizados adaptados al último servicio recibido en 3 tonos estéticos (Cercano, Profesional, Elegante) gracias al modelo Gemini 3.5.
                </p>
              </div>
            </div>

            {/* Feature 3: Public Booking */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">public</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">Reservas Online</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                  Tu propio enlace público (/salon/tu-slug) interactivo y sofisticado para que tus clientas agenden online. Sincronización atómica y cálculo de slots inteligente.
                </p>
              </div>
            </div>

            {/* Feature 4: Scheduler Express */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">calendar_month</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">Agenda & Scheduler Express</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                  Una agenda digital interactiva y veloz que valida en tiempo real la disponibilidad de estilistas y respeta sus turnos continuos o partidos de manera automática.
                </p>
              </div>
            </div>

            {/* Feature 5: Inventory */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">inventory_2</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">Control de Stock Estético</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                  Gestiona existencias de productos de cabina y reventa, calcula costes reales del stock del salón y recibe alertas inmediatas cuando un producto baja del mínimo.
                </p>
              </div>
            </div>

            {/* Feature 6: RGPD Compliant */}
            <div className="bg-white border border-border/70 p-6 md:p-8 rounded-3xl hover:border-primary/20 hover:shadow-lg hover:shadow-primary/2 transition-all duration-300 flex flex-col justify-between group">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-primary border border-primary/5 flex items-center justify-center mb-6 group-hover:bg-[#4A2C40] group-hover:text-white transition-all duration-300 shadow-inner">
                  <span className="material-symbols-outlined text-2xl font-bold">shield</span>
                </div>
                <h3 className="font-serif text-xl font-bold text-primary mb-2.5">RGPD y Derecho al Olvido</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed font-semibold">
                  Los datos de tus clientas protegidos según la ley. Exporta todo en CSV y borra datos personales en un solo clic si alguien te lo pide.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Automated Step-by-Step Flow */}
        <section className="bg-surface-container-low py-20 px-4 md:px-16 mb-24 md:mb-32">
          <div className="max-w-[1280px] mx-auto">
            <div className="text-center mb-16">
              <h2 className="font-serif text-3xl md:text-4xl font-bold text-primary mb-4 text-center">
                Recuperar clientas, en un clic
              </h2>
              <p className="text-base text-on-surface-variant max-w-2xl mx-auto font-sans">
                Elena detecta quién está a punto de irse y te prepara el mensaje. Tú solo lo revisas y lo envías por WhatsApp con un clic.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1: Agenda Siempre al Día */}
              <div className="bg-[#fdf6ec] rounded-3xl p-8 shadow-sm border border-[#bfa982]/20 flex flex-col justify-between min-h-[380px] text-left">
                <div>
                  <div className="w-12 h-12 rounded-full bg-secondary/80 text-primary flex items-center justify-center font-serif text-xl font-bold mb-6">
                    1
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-primary mb-3">Agenda Siempre al Día</h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed font-sans">
                    Integración fluida de tus reservas del día. Una vista limpia y aireada para un control operativo sin esfuerzo.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-muted shadow-inner space-y-3 font-sans">
                  <div className="flex items-center justify-between border-b border-light-divider pb-2.5">
                    <span className="text-[10px] font-bold text-primary">HOY · CITAS DESTACADAS</span>
                    <span className="text-[9px] bg-secondary text-primary font-bold px-2 py-0.5 rounded">Sincronizado</span>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#faf6f0] rounded-xl border border-[#bfa982]/10">
                    <span className="text-xs font-bold text-primary font-mono shrink-0">10:30</span>
                    <div className="text-left flex-1">
                      <p className="text-[11px] font-bold text-primary leading-none">Marta Gómez</p>
                      <p className="text-[9.5px] text-muted-foreground mt-0.5">Corte de Autor + Color</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 bg-[#faf6f0] rounded-xl border border-[#bfa982]/10">
                    <span className="text-xs font-bold text-primary font-mono shrink-0">12:15</span>
                    <div className="text-left flex-1">
                      <p className="text-[11px] font-bold text-primary leading-none">Lucía Pérez</p>
                      <p className="text-[9.5px] text-muted-foreground mt-0.5">Tratamiento Hidratación Profunda</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Monitor de Mimo en Acción */}
              <div className="bg-[#fdf6ec] rounded-3xl p-8 shadow-sm border border-[#bfa982]/20 flex flex-col justify-between min-h-[380px] text-left md:translate-y-4">
                <div>
                  <div className="w-12 h-12 rounded-full bg-secondary/80 text-primary flex items-center justify-center font-serif text-xl font-bold mb-6">
                    2
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-primary mb-3">Monitor de Mimo</h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed font-sans">
                    Nuestra IA analiza de forma silenciosa el ciclo ideal del salón e identifica al instante clientas que te echan de menos.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-4 border border-muted shadow-inner space-y-3 font-sans">
                  <div className="flex items-center gap-3 border-b border-light-divider pb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#faf6f0] border border-[#bfa982]/30 flex items-center justify-center text-xs font-bold text-primary shrink-0 select-none">
                      CR
                    </div>
                    <div className="text-left flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] font-bold text-primary">Carmen Ruiz</p>
                        <span className="text-[7.5px] font-bold uppercase bg-red-50 text-red-700 px-1 rounded border border-red-200">Crítico</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Inactiva hace 103 días</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="w-full bg-[#4A2C40] hover:bg-[#2E1927] text-[#fdf6ec] text-[9.5px] font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-default"
                  >
                    <span className="material-symbols-outlined text-xs font-bold">auto_awesome</span>
                    <span>Mimar a Carmen con IA</span>
                  </button>
                </div>
              </div>

              {/* Step 3: Cita Recuperada con Éxito */}
              <div className="bg-[#fdf6ec] rounded-3xl p-8 shadow-sm border border-[#bfa982]/20 flex flex-col justify-between min-h-[380px] text-left md:translate-y-8 font-sans">
                <div>
                  <div className="w-12 h-12 rounded-full bg-secondary/80 text-primary flex items-center justify-center font-serif text-xl font-bold mb-6">
                    3
                  </div>
                  <h3 className="font-serif text-2xl font-bold text-primary mb-3">Reencuentro Exitoso</h3>
                  <p className="text-xs text-on-surface-variant mb-6 leading-relaxed font-sans">
                    Envía el mensaje personalizado por WhatsApp con un solo clic. La clienta responde y confirma su cita de retorno.
                  </p>
                </div>
                <div className="rounded-2xl bg-white p-3 border border-muted shadow-inner space-y-2 text-[10.5px]">
                  {/* Sent WhatsApp suggested message */}
                  <div className="bg-[#E2F7CB] text-on-surface p-2.5 rounded-2xl rounded-tr-none max-w-[85%] ml-auto border border-[#cbe4b2]">
                    <span className="block font-bold text-primary text-[7.5px] uppercase tracking-wider mb-0.5 select-none">Propuesta Enviada</span>
                    "Hola Carmen, te echamos de menos en el salón. Queremos obsequiarte un Masaje de Ojos de autor en tu próxima visita..."
                  </div>
                  {/* Client response */}
                  <div className="bg-[#F0F0F0] text-on-surface p-2.5 rounded-2xl rounded-tl-none max-w-[85%] mr-auto border border-[#e0e0e0]">
                    "¡Hola! Qué ilusión recibir tu mensaje. Justo pensaba en reservar. ¿Me guardas hueco para el jueves por la tarde?"
                  </div>
                </div>
              </div>
            </div>
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

            {/* Features Comparison Table */}
            <div className="mt-20 border-t border-primary/5 pt-16 text-left">
              <h3 className="font-serif text-3xl font-bold text-center text-primary mb-4">¿Por qué ElenaOS es diferente?</h3>
              <p className="text-sm text-on-surface-variant text-center max-w-2xl mx-auto mb-10 font-medium font-sans">
                Compara nuestra suite activa de rescate frente a las agendas y CRM de reservas tradicionales.
              </p>
              
              <div className="bg-white rounded-2xl border border-[#bfa982]/20 overflow-hidden shadow-sm max-w-4xl mx-auto font-sans">
                <table className="w-full text-left text-xs sm:text-sm font-medium border-collapse">
                  <thead>
                    <tr className="border-b border-[#bfa982]/20 bg-surface-container-low/40">
                      <th className="px-6 py-4 text-primary font-bold">Funcionalidad de Autor</th>
                      <th className="px-6 py-4 text-primary font-bold text-center bg-primary/5">ElenaOS Premium</th>
                      <th className="px-6 py-4 text-on-surface-variant font-bold text-center">CRM Tradicional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/50 text-on-surface-variant font-medium">
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Sistema de alertas de clientas</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-red-500 font-extrabold text-base select-none">close</span></td>
                    </tr>
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Generación de mensajes WhatsApp por IA (3 tonos)</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-red-500 font-extrabold text-base select-none">close</span></td>
                    </tr>
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Agenda & Scheduler interactivos express</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center text-xs">Agenda estática simple</td>
                    </tr>
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Métricas reales de Facturación y recuperación estimada</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center text-xs">Solo informes contables básicos</td>
                    </tr>
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Control de stock e inventario con alertas bajas</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center text-xs">Requiere add-on de pago adicional</td>
                    </tr>
                    <tr className="transition-colors hover:bg-surface-container-low/20">
                      <td className="px-6 py-4 text-primary font-bold">Cumplimiento RGPD y anonimización en 1 clic</td>
                      <td className="px-6 py-4 text-center bg-primary/5"><span className="material-symbols-outlined text-emerald-600 font-extrabold text-base select-none">check</span></td>
                      <td className="px-6 py-4 text-center"><span className="material-symbols-outlined text-red-500 font-extrabold text-base select-none">close</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

      </main>

      {authMode && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setAuthMode(null)}
            className="absolute inset-0 bg-primary/35 backdrop-blur-sm cursor-default"
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
              <button type="button" onClick={() => setAuthMode(null)} className="text-primary hover:text-primary/70 cursor-pointer">
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
                  placeholder="Mínimo 6 caracteres"
                />
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

            <button
              type="submit"
              disabled={isSigningIn}
              className="mt-5 w-full rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-primary/90 disabled:opacity-60"
            >
              {isSigningIn ? 'Conectando...' : authMode === 'sign-up' ? 'Crear cuenta con email' : 'Entrar con email'}
            </button>

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
            <a className="text-xs font-bold text-on-surface-variant hover:underline decoration-outline-variant underline-offset-4" href="#soluciones">Contacto</a>
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
    </div>
  );
}
