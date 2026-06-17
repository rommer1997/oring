import React, { useState } from 'react';
import { AppView, AppConfig } from '../types';

interface SidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onNewAppointmentClick: () => void;
  onToastMessage: (msg: string) => void;
  onSignOut: () => void;
  isDemoMode?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  trialDaysLeft?: number;
  subscriptionStatus?: string;
  userRole?: string;
  isBeginnerMode?: boolean;
  onUpdateConfig?: (updated: Partial<AppConfig>) => void;
}

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  onNewAppointmentClick,
  onToastMessage,
  onSignOut,
  isDemoMode = false,
  isCollapsed = false,
  onToggleCollapse,
  trialDaysLeft = 0,
  subscriptionStatus = '',
  userRole = '',
  isBeginnerMode = true,
  onUpdateConfig
}: SidebarProps) {
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const baseItems = [
    { id: 'dashboard' as AppView, label: 'Panel', icon: 'dashboard' },
    { id: 'retention' as AppView, label: 'Monitor de Mimo', icon: 'group' },
    { id: 'agenda' as AppView, label: 'Agenda Siempre al Día', icon: 'calendar_month' },
  ];

  const secondaryItems = [
    { id: 'servicios' as AppView, label: 'Catálogo Servicios', icon: 'spa' },
    { id: 'inventario' as AppView, label: 'Inventario', icon: 'inventory_2' },
    { id: 'facturacion' as AppView, label: 'Facturación', icon: 'euro' },
    { id: 'staff-tenant' as AppView, label: 'Consola & Equipo', icon: 'admin_panel_settings' },
  ];

  if (userRole === 'Administrador') {
    secondaryItems.push({ id: 'admin' as AppView, label: 'Administración', icon: 'shield_person' });
  }

  // Active primary menu items in the main list
  const primaryMenuItems = isBeginnerMode ? baseItems : [...baseItems, ...secondaryItems];

  const handleMenuClick = (id: AppView) => {
    onNavigate(id);
  };

  return (
    <>
      {/* desktop Collapsible Sidebar */}
      <aside 
        className={`hidden md:flex flex-col justify-between py-8 px-5 fixed left-0 top-0 z-40 bg-white border-r border-border h-full transition-all duration-300 shadow-[rgba(74,44,64,0.02)_8px_0px_24px] ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div>
          {/* Brand Banner / Header */}
          <div className="flex items-center justify-between mb-8 relative">
            <div 
              className={`cursor-pointer transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-95 pointer-events-none w-0 h-0 overflow-hidden' : 'opacity-100 scale-100'}`}
              onClick={() => onNavigate('landing')}
            >
              <h1 className="font-display text-2.5xl font-bold text-primary tracking-tight">Elena</h1>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{isDemoMode ? 'Demo aislada' : 'Gestión del salón'}</p>
              <span className="text-[7.5px] tracking-wider block text-primary/75 mt-0.5" style={{ fontFamily: '"Arial Black", "Arial Bold", sans-serif', fontWeight: 900 }}>POWERED BY ROMMER VOLCANES</span>
              {!isDemoMode && subscriptionStatus === 'trialing' && (
                <div className="mt-3 bg-amber-50 border border-amber-200/50 rounded-lg px-2.5 py-1 text-[9.5px] font-bold text-amber-800 flex items-center gap-1 animate-pulse select-none self-start">
                  <span className="material-symbols-outlined text-[10px] font-bold">hourglass_empty</span>
                  <span>Quedan {trialDaysLeft} {trialDaysLeft === 1 ? 'día' : 'días'} de prueba</span>
                </div>
              )}
            </div>
            
            {/* Miniature logo when collapsed */}
            {isCollapsed && (
              <div 
                className="mx-auto cursor-pointer animate-fade-in text-center relative"
                onClick={() => onNavigate('landing')}
                title={!isDemoMode && subscriptionStatus === 'trialing' ? `Elena - Quedan ${trialDaysLeft} días de prueba` : "Elena - Volver a inicio"}
              >
                <span className="font-display text-2.5xl font-extrabold text-primary block">E.</span>
                <span className="text-[6px] block text-primary font-bold" style={{ fontFamily: '"Arial Black", sans-serif' }}>R.V</span>
                {!isDemoMode && subscriptionStatus === 'trialing' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-white animate-pulse" />
                )}
              </div>
            )}

            {/* Collapse toggle button */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className={`absolute ${isCollapsed ? 'left-1/2 -translate-x-1/2 top-11' : 'right-0 top-1'} p-1.5 rounded-full bg-secondary/80 text-primary hover:bg-secondary border border-primary/10 transition-all cursor-pointer shadow-sm flex items-center justify-center`}
                title={isCollapsed ? "Expandir menú" : "Contraer menú"}
              >
                <span className="material-symbols-outlined text-sm font-bold">
                  {isCollapsed ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
            )}
          </div>

          {/* Primary CTA Appointment Button */}
          <div className={`mb-6 transition-all duration-300 ${isCollapsed ? 'mt-12' : 'mt-0'}`}>
            {isCollapsed ? (
              <button
                type="button"
                onClick={onNewAppointmentClick}
                className="h-11 w-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm flex items-center justify-center mx-auto cursor-pointer"
                title="Programar nueva cita express"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            ) : (
              <button
                id="btn-sidebar-new" 
                onClick={onNewAppointmentClick}
                className="w-full h-11 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-sans shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add</span>
                <span>Programar Cita</span>
              </button>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5 font-sans">
            {primaryMenuItems.map((item) => {
              const isSelected = currentView === item.id || 
                (item.id === 'retention' && (currentView === 'client-profile' || currentView === 'message-editor'));
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all w-full text-left duration-200 cursor-pointer ${
                    isSelected 
                      ? 'bg-secondary text-primary font-bold border-r-4 border-primary' 
                      : 'text-muted-foreground hover:bg-secondary/30 hover:text-primary'
                  }`}
                >
                  <span className={`material-symbols-outlined text-xl transition-all ${isSelected ? 'font-bold' : ''}`}>
                    {item.icon}
                  </span>
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Secondary Locked Items in Beginner Mode */}
          {isBeginnerMode && (
            <div className="mt-6 pt-4 border-t border-border/60">
              {!isCollapsed && (
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest px-3.5 mb-2 flex items-center gap-1">
                  <span>Explorar Suite Elena</span>
                  <span className="material-symbols-outlined text-xs text-primary animate-pulse">auto_awesome</span>
                </p>
              )}
              <div className="flex flex-col gap-1.5 font-sans">
                {secondaryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setShowUnlockModal(true)}
                    title={isCollapsed ? `${item.label} (Suite Completa)` : undefined}
                    className="flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-muted-foreground/50 hover:bg-secondary/20 hover:text-primary transition-all w-full text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-xl relative">
                      {item.icon}
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary/20 rounded-full flex items-center justify-center border border-white" style={{ fontSize: '6px' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '6px', fontWeight: 'bold' }}>lock</span>
                      </span>
                    </span>
                    {!isCollapsed && (
                      <span className="text-xs font-semibold flex items-center justify-between flex-1">
                        <span>{item.label}</span>
                        <span className="text-[8px] uppercase tracking-wider font-bold bg-primary/5 text-primary/70 px-1.5 py-0.5 rounded border border-primary/10">Suite</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom items: Settings, Feedbacks, and Logout */}
        <div className="pt-6 border-t border-border flex flex-col gap-1.5 font-sans">
          
          {/* Feedback */}
          <button
            onClick={() => onToastMessage('Canal de feedback abierto: Hemos enviado un formulario a tu correo para sugerencias semanales.')}
            title={isCollapsed ? "Buzón de Feedback" : undefined}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl hover:bg-emerald-50 hover:text-emerald-700 text-muted-foreground transition-all text-left w-full cursor-pointer`}
          >
            <span className="material-symbols-outlined text-xl">record_voice_over</span>
            {!isCollapsed && (
              <span className="text-sm font-medium">Buzón de Feedback</span>
            )}
          </button>

          {/* Settings */}
          <button
            onClick={() => onNavigate('settings')}
            title={isCollapsed ? "Configuración" : undefined}
            className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all text-left w-full cursor-pointer ${
              currentView === 'settings' 
                ? 'bg-secondary text-primary font-bold border-r-4 border-primary' 
                : 'text-muted-foreground hover:bg-secondary/30 hover:text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-xl">settings</span>
            {!isCollapsed && (
              <span className="text-sm font-medium">Configuración</span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={onSignOut}
            title={isCollapsed ? "Cerrar Sesión" : undefined}
            className="flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-all text-left w-full cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            {!isCollapsed && (
              <span className="text-sm font-medium text-secondary hover:text-red-600">{isDemoMode ? 'Salir de demo' : 'Cerrar sesión'}</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="flex md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border/80 h-16 py-2 px-3 shadow-[0_-5px_25px_rgba(74,44,64,0.05)] justify-around items-center">
        {isBeginnerMode ? (
          <>
            {baseItems.map((item) => {
              const isSelected = currentView === item.id || 
                (item.id === 'retention' && (currentView === 'client-profile' || currentView === 'message-editor'));
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`flex flex-col items-center justify-center p-1 w-14 rounded-xl transition-all duration-200 cursor-pointer ${
                    isSelected 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-primary/70'
                  }`}
                  style={{ minHeight: '44px' }}
                >
                  <span className={`material-symbols-outlined text-2xl ${isSelected ? 'font-bold' : ''}`}>
                    {item.icon}
                  </span>
                  <span className={`text-[10px] mt-0.5 font-sans truncate max-w-full ${isSelected ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                    {item.id === 'retention' ? 'Mimos' : item.label}
                  </span>
                </button>
              );
            })}
            <button
              onClick={() => setShowUnlockModal(true)}
              className="flex flex-col items-center justify-center p-1 w-14 rounded-xl text-muted-foreground hover:text-primary transition-all duration-200 cursor-pointer"
              style={{ minHeight: '44px' }}
            >
              <span className="material-symbols-outlined text-2xl text-primary animate-pulse">auto_awesome</span>
              <span className="text-[10px] mt-0.5 font-sans font-semibold text-primary truncate max-w-full">
                Suite ✦
              </span>
            </button>
          </>
        ) : (
          [...baseItems, ...secondaryItems].map((item) => {
            const isSelected = currentView === item.id || 
              (item.id === 'retention' && (currentView === 'client-profile' || currentView === 'message-editor'));
              
            return (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`flex flex-col items-center justify-center p-1 w-14 rounded-xl transition-all duration-200 cursor-pointer ${
                  isSelected 
                    ? 'text-primary' 
                    : 'text-muted-foreground hover:text-primary/70'
                }`}
                style={{ minHeight: '44px' }}
              >
                <span className={`material-symbols-outlined text-2xl ${isSelected ? 'font-bold' : ''}`}>
                  {item.icon}
                </span>
                <span className={`text-[10px] mt-0.5 font-sans truncate max-w-full ${isSelected ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                  {item.id === 'retention' ? 'Mimos' : item.id === 'staff-tenant' ? 'Equipo' : item.label}
                </span>
              </button>
            );
          })
        )}
      </nav>

      {/* Premium Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in text-left">
          <div className="absolute inset-0 bg-[#4A2C40]/40 backdrop-blur-sm shadow-inner" onClick={() => setShowUnlockModal(false)}></div>
          <div className="bg-[#fdf6ec] max-w-lg w-full rounded-3xl p-8 relative z-10 shadow-2xl border border-[#bfa982]/32 font-sans">
            <button 
              className="absolute top-5 right-5 text-[#4A2C40] hover:scale-110 transition-all cursor-pointer"
              onClick={() => setShowUnlockModal(false)}
            >
              <span className="material-symbols-outlined text-2xl font-bold">close</span>
            </button>

            <div className="flex items-center gap-3.5 mb-6 text-[#4A2C40]">
              <div className="w-12 h-12 rounded-2xl bg-secondary/80 flex items-center justify-center text-primary shadow-inner border border-primary/5">
                <span className="material-symbols-outlined font-bold text-2xl">auto_awesome</span>
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold">Activar la Suite Completa</h3>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">Estrategia de crecimiento gradual</p>
              </div>
            </div>
            
            <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
              Elena te acompaña a tu propio ritmo. La estrategia de <strong>La Cebolla</strong> te permite desplegar herramientas avanzadas a medida que las necesitas, evitando distracciones y reduciendo tu carga cognitiva.
            </p>

            <div className="space-y-4 mb-8">
              <div className="p-4 bg-white rounded-2xl border border-muted flex items-start gap-3.5 shadow-sm">
                <span className="material-symbols-outlined text-emerald-600 bg-emerald-50 p-1.5 rounded-xl text-base font-bold shrink-0">check_circle</span>
                <div>
                  <h4 className="text-xs font-bold text-primary">Fase 1: Tu Espacio Zen Digital (Activa)</h4>
                  <p className="text-[11.5px] text-on-surface-variant leading-normal mt-0.5">Gestión de la agenda de citas y Monitor de Mimo para recuperar clientas con IA.</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-muted flex items-start gap-3.5 shadow-sm">
                <span className="material-symbols-outlined text-primary bg-secondary/30 p-1.5 rounded-xl text-base font-bold shrink-0">inventory_2</span>
                <div>
                  <h4 className="text-xs font-bold text-primary">Fase 2: Activación Progresiva (Disponible)</h4>
                  <p className="text-[11.5px] text-on-surface-variant leading-normal mt-0.5">Habilita el control de stock, consumos técnicos de cabina y facturación mensual del salón.</p>
                </div>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-muted flex items-start gap-3.5 shadow-sm">
                <span className="material-symbols-outlined text-primary bg-secondary/30 p-1.5 rounded-xl text-base font-bold shrink-0">query_stats</span>
                <div>
                  <h4 className="text-xs font-bold text-primary">Fase 3: Madurez y Optimización (Disponible)</h4>
                  <p className="text-[11.5px] text-on-surface-variant leading-normal mt-0.5">Analíticas de rendimiento avanzadas, consola de equipo y Privacidad Elegante (RGPD).</p>
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <button
                className="px-5 py-2.5 text-xs font-bold text-[#4A2C40] hover:underline cursor-pointer"
                onClick={() => setShowUnlockModal(false)}
              >
                Mantener Modo Enfoque
              </button>
              <button
                className="px-6 py-3 bg-[#4A2C40] text-[#fdf6ec] text-xs font-bold rounded-xl hover:bg-[#2E1927] transition-all cursor-pointer shadow-md"
                onClick={() => {
                  if (onUpdateConfig) {
                    onUpdateConfig({ isBeginnerMode: false });
                  }
                  setShowUnlockModal(false);
                  onToastMessage('✓ ¡Felicidades! Has activado la Suite Completa de Elena. Todas las herramientas están disponibles.');
                }}
              >
                Activar Suite Completa ✨
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

