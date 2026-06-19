import React from 'react';
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

  const baseItems = [
    { id: 'dashboard' as AppView, label: 'Panel', icon: 'dashboard' },
    { id: 'retention' as AppView, label: 'Clientas en Riesgo', icon: 'group' },
    { id: 'agente' as AppView, label: 'Agente WhatsApp', icon: 'smart_toy' },
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
              <span className="text-[7.5px] tracking-wider block text-primary/75 mt-0.5 font-sans uppercase">Powered by Rommer Volcanes</span>
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
                  className={`flex items-center rounded-xl transition-all duration-200 cursor-pointer ${
                    isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3.5 px-3.5 py-3 w-full text-left'
                  } ${
                    isSelected
                      ? `bg-secondary text-primary font-bold ${isCollapsed ? '' : 'border-r-4 border-primary'}`
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

          {/* ponytail: teaser "Explorar Suite Elena" oculto (era un paywall sin función real). */}
        </div>

        {/* Bottom items: Settings, Feedbacks, and Logout */}
        <div className="pt-6 border-t border-border flex flex-col gap-1.5 font-sans">
          
          {/* Feedback */}
          <button
            onClick={() => onToastMessage('Canal de feedback abierto: Hemos enviado un formulario a tu correo para sugerencias semanales.')}
            title={isCollapsed ? "Buzón de Feedback" : undefined}
            className={`flex items-center rounded-xl hover:bg-emerald-50 hover:text-emerald-700 text-muted-foreground transition-all cursor-pointer ${isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3.5 px-3.5 py-3 text-left w-full'}`}
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
            className={`flex items-center rounded-xl transition-all cursor-pointer ${isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3.5 px-3.5 py-3 text-left w-full'} ${
              currentView === 'settings'
                ? `bg-secondary text-primary font-bold ${isCollapsed ? '' : 'border-r-4 border-primary'}`
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
            className={`flex items-center rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer ${isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3.5 px-3.5 py-3 text-left w-full'}`}
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
                    {item.id === 'retention' ? 'Alertas' : item.label}
                  </span>
                </button>
              );
            })}
            {/* ponytail: botón "Suite ✦" eliminado. La activación vive en Configuración → "Todas las herramientas". */}
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
                  {item.id === 'retention' ? 'Alertas' : item.id === 'staff-tenant' ? 'Equipo' : item.label}
                </span>
              </button>
            );
          })
        )}
      </nav>
    </>
  );
}

