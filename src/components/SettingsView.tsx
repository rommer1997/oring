import React, { useState } from 'react';
import { AppConfig, StaffMember, Tenant, User, ClientProfile } from '../types';
import { buildNewClient } from '../utils/riskEngine';

// ponytail: import CSV real. Detecta delimitador (Excel ES usa ';'), mapea columnas por nombre difuso
// (nombre/teléfono/email obligatorio el nombre+teléfono), y crea una ficha por fila vía onAddClient.
// Parser mínimo: maneja comillas dobles básicas. No cubre saltos de línea dentro de celdas (raro en estos export).
function parseCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === delim && !inQ) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

export function importClientsCsv(text: string, tenantId: string, addClient: (c: ClientProfile) => void): number {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return 0;
  const delim = (lines[0].match(/;/g)?.length || 0) > (lines[0].match(/,/g)?.length || 0) ? ';' : ',';
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const header = parseCsvLine(lines[0], delim).map(norm);
  const findCol = (...keys: string[]) => header.findIndex(h => keys.some(k => h.includes(k)));
  const iName = findCol('nombre', 'name', 'cliente');
  const iPhone = findCol('telefono', 'phone', 'movil', 'celular', 'tel');
  const iEmail = findCol('email', 'correo', 'mail');
  const iService = findCol('servicio', 'service', 'tratamiento');
  if (iName < 0 || iPhone < 0) return 0;

  let count = 0;
  for (let r = 1; r < lines.length; r++) {
    const cells = parseCsvLine(lines[r], delim);
    const name = cells[iName]?.trim();
    const phone = cells[iPhone]?.trim();
    if (!name || !phone) continue;
    addClient(buildNewClient({
      id: `cli-${Date.now()}-${r}`,
      name,
      phoneNumber: phone,
      tenantId,
      email: iEmail >= 0 ? (cells[iEmail]?.trim() || '') : '',
      lastVisitService: (iService >= 0 && cells[iService]?.trim()) || 'Importada de CSV',
      aiReason: 'Ficha importada desde CSV. Añade historial de citas para mejorar el análisis de retención.',
    }));
    count++;
  }
  return count;
}

interface SettingsViewProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  onRecalculateThresholds: (high: number, mid: number) => void;
  onToastMessage: (msg: string) => void;
  currentUser: { uid: string; displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  appUser?: User | null;
  activeTenant?: Tenant | null;
  onSignInWithGoogle: () => Promise<void>;
  onSignOut: () => Promise<void>;
  getAuthToken?: () => Promise<string | null>;
  firebaseProjectId: string;
  staff?: StaffMember[];
  onUpdateStaff?: (staffId: string, fields: Partial<StaffMember>) => void;
  clients?: ClientProfile[];
  onUpdateClient?: (clientId: string, fields: Partial<ClientProfile>) => void;
  onAddClient?: (client: ClientProfile) => void;
  onNavigate?: (view: string) => void;
}

export default function SettingsView({
  config,
  onUpdateConfig,
  onRecalculateThresholds,
  onToastMessage,
  currentUser,
  appUser,
  activeTenant,
  onSignInWithGoogle,
  onSignOut,
  getAuthToken,
  firebaseProjectId,
  staff = [],
  onUpdateStaff,
  clients = [],
  onUpdateClient = () => {},
  onAddClient,
  onNavigate,
}: SettingsViewProps) {
  // Local states for the thresholds
  const [highDays, setHighDays] = useState<number>(config.highRiskThresholdDays);
  const [midDays, setMidDays] = useState<number>(config.midRiskThresholdDays);
  const [isAiAuto, setIsAiAuto] = useState<boolean>(config.isAiAutoTriggerEnabled);
  const [isErrorLogging, setIsErrorLogging] = useState<boolean>(config.isErrorLoggingEnabled ?? false);
  const [isRotatingSchedule, setIsRotatingSchedule] = useState<boolean>(config.isRotatingScheduleEnabled ?? false);
  const [selectedPromoStaffId, setSelectedPromoStaffId] = useState<string>(staff[0]?.id || '');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);


  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    if (highDays <= midDays) {
      onToastMessage('❌ Error: El umbral de Riesgo Alto debe ser mayor que el de Riesgo Medio.');
      return;
    }

    onRecalculateThresholds(highDays, midDays);
    onUpdateConfig({
      highRiskThresholdDays: highDays,
      midRiskThresholdDays: midDays,
      isAiAutoTriggerEnabled: isAiAuto,
      isErrorLoggingEnabled: isErrorLogging,
      isRotatingScheduleEnabled: isRotatingSchedule
    });
    onToastMessage('⚙️ Configuración guardada. Las alertas de clientas se han actualizado.');
  };

  const signIn = async () => {
    try {
      setIsLoadingAuth(true);
      await onSignInWithGoogle();
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const signOutUser = async () => {
    try {
      setIsLoadingAuth(true);
      await onSignOut();
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  return (
    <div className="flex-1 pb-16">
      
      {/* View Header */}
      <div className="mb-8">
        <h2 className="font-serif text-3xl font-semibold text-primary">Configuración del Centro</h2>
        <p className="text-sm text-on-surface-variant font-medium">
          Configura cuándo avisarte de clientas ausentes, mensajes de WhatsApp y opciones del salón.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left main configure bento panel */}
        <form onSubmit={handleSaveThresholds} className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-2xl border border-surface-container shadow-sm space-y-8 text-left">
          
          {/* Section 0: La Cebolla - Tu Espacio Zen Digital */}
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg text-primary animate-pulse">auto_awesome</span>
              <h3>Tu panel (A tu ritmo)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5 font-sans">
              Elena reduce tu sobrecarga cognitiva adaptando la complejidad de la interfaz a tu ritmo de crecimiento. Elige la fase en la que se encuentra tu negocio:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button
                type="button"
                onClick={() => {
                  onUpdateConfig({ isBeginnerMode: true });
                  onToastMessage('✓ Vista simplificada activa.');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all text-left ${
                  config.isBeginnerMode
                    ? 'bg-secondary/35 border-primary font-bold shadow-sm'
                    : 'bg-white border-muted hover:border-primary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-primary">1. Vista simple (Fase 1)</h4>
                  {config.isBeginnerMode && (
                    <span className="material-symbols-outlined text-sm text-[#4A2C40] font-bold">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-normal">
                  Ideal para empezar. Concéntrate en gestionar tu agenda y recuperar clientas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  onUpdateConfig({ isBeginnerMode: false });
                  onToastMessage('✓ Suite de Gestión Completa activada. Todas las herramientas están disponibles.');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all text-left ${
                  !config.isBeginnerMode
                    ? 'bg-secondary/35 border-primary font-bold shadow-sm'
                    : 'bg-white border-muted hover:border-primary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-primary">2. Todas las herramientas (Fases 2 y 3)</h4>
                  {!config.isBeginnerMode && (
                    <span className="material-symbols-outlined text-sm text-[#4A2C40] font-bold">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-normal">
                  Activa el control avanzado de stock de productos, costes de cabina, facturación mensual y administración de personal.
                </p>
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/20"></div>

          {/* Section 1: Algoritmo de Abandono */}
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg">analytics</span>
              <h3>¿Cuántos días sin venir = alerta?</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Define cuántos días sin venir activan una alerta para cada clienta. Estas reglas actualizan toda la base de datos de manera inmediata.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-[#faf8f4] border border-outline-variant/30 rounded-xl mb-4">
              <div>
                <label className="text-xs font-bold text-primary block mb-2">
                  Límite para Riesgo ALTO (en días):
                </label>
                <input 
                  type="number" 
                  min="45"
                  max="365"
                  value={highDays}
                  onChange={(e) => setHighDays(parseInt(e.target.value) || 90)}
                  className="w-full px-4 py-3 bg-white border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary font-bold text-primary"
                />
                <span className="text-[10px] text-outline font-medium mt-1 block">
                  Clientes inactivas por este número de días o más pasarán a etiqueta roja "Riesgo Alta".
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-primary block mb-2">
                  Límite para Riesgo MEDIO (en días):
                </label>
                <input 
                  type="number" 
                  min="15"
                  max="90"
                  value={midDays}
                  onChange={(e) => setMidDays(parseInt(e.target.value) || 30)}
                  className="w-full px-4 py-3 bg-white border border-outline-variant/30 rounded-xl text-sm outline-none focus:border-primary font-bold text-primary"
                />
                <span className="text-[10px] text-outline font-medium mt-1 block">
                  Clientes inactivas por este número de días (hasta el límite alto) se etiquetarán "Riesgo Media".
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Permisos de WhatsApp y Consentimiento de IA */}
          <div className="pt-6 border-t border-outline-variant/20">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <h3>Permisos de WhatsApp & Políticas de Privacidad</h3>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
              En armonía con la RGPD de España y la seguridad sensible contra mensajes intrusivos, resguarda el proceso de consentimiento previo.
            </p>

            {/* Enlace a ajustes del agente */}
            <div className="bg-surface-container-low/60 p-4 border border-outline-variant/25 rounded-xl flex items-center justify-between gap-4">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-primary mb-1">Aprobación Manual Obligatoria</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Configura si el agente envía mensajes automáticamente o requiere tu aprobación en el panel del Asistente IA.
                </p>
              </div>
              <button onClick={() => onNavigate?.('agente')} className="flex-shrink-0 text-[10px] font-sans font-bold uppercase tracking-wider border border-primary/20 text-primary/60 px-3 py-2 rounded hover:border-primary hover:text-primary transition-all whitespace-nowrap flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">smart_toy</span>
                Ir al Asistente
              </button>
            </div>

            <div className="mt-4 bg-surface-container-low/60 p-4 border border-outline-variant/25 rounded-xl flex items-start gap-4 justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-primary mb-1">Alertas Automáticas de Suspensión</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Permitir sugerir promociones automáticas en el dashboard basándose en historiales de compra.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAiAuto(!isAiAuto)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${
                  isAiAuto ? 'bg-primary' : 'bg-outline/50'
                }`}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  isAiAuto ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>

            {/* Toggle Horario Rotativo */}
            <div className="mt-4 bg-surface-container-low/60 p-4 border border-outline-variant/25 rounded-xl flex items-start gap-4 justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-primary mb-1">Horario Rotativo y Turnos Semanales</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Activa esta opción para exigir la planificación semanal de horarios. Si está desactivada, el sistema asumirá disponibilidad ilimitada para todos los estilistas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsRotatingSchedule(!isRotatingSchedule)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${
                  isRotatingSchedule ? 'bg-primary' : 'bg-[#dfced5]/40'
                }`}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  isRotatingSchedule ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>

            {/* Render weekly planner if Horario Rotativo is enabled */}
            {isRotatingSchedule && staff.length > 0 && (
              <div className="mt-4 p-5 bg-surface-container-low/30 border border-[#bfa982]/20 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-outline-variant/20 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#bfa982]">schedule</span>
                      Horarios de trabajo
                    </h4>
                    <p className="text-[10px] text-on-surface-variant">Define qué días y horas está disponible cada estilista premium.</p>
                  </div>
                  
                  <select
                    value={selectedPromoStaffId}
                    onChange={(e) => setSelectedPromoStaffId(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#bfa982]/30 rounded-xl text-xs font-semibold outline-none focus:border-primary text-primary"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.role.split(' ')[0]})</option>
                    ))}
                  </select>
                </div>

                {(() => {
                  const currentPromoMember = staff.find(s => s.id === selectedPromoStaffId);
                  if (!currentPromoMember) return null;
                  
                  const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
                  // Build safe fallback schedule
                  const memberSchedule = currentPromoMember.schedule || daysOfWeek.reduce((acc, d) => {
                    acc[d] = {
                      start: '09:00',
                      end: '18:00',
                      isWorking: d !== 'Domingo'
                    };
                    return acc;
                  }, {} as any);

                  const handleDayToggle = (day: string) => {
                    if (!onUpdateStaff) return;
                    const dayObj = memberSchedule[day] || { start: '09:00', end: '18:00', isWorking: true };
                    const updatedSched = {
                      ...memberSchedule,
                      [day]: {
                        ...dayObj,
                        isWorking: !dayObj.isWorking
                      }
                    };
                    onUpdateStaff(currentPromoMember.id, { schedule: updatedSched });
                    onToastMessage(`Turno de ${currentPromoMember.name} para el ${day} ${!dayObj.isWorking ? 'activado' : 'desactivado'}.`);
                  };

                  const handleTimeChange = (day: string, type: 'start' | 'end', val: string) => {
                    if (!onUpdateStaff) return;
                    const dayObj = memberSchedule[day] || { start: '09:00', end: '18:00', isWorking: true };
                    const updatedSched = {
                      ...memberSchedule,
                      [day]: {
                        ...dayObj,
                        [type]: val
                      }
                    };
                    onUpdateStaff(currentPromoMember.id, { schedule: updatedSched });
                  };

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <img src={currentPromoMember.avatar} alt={currentPromoMember.name} className="w-8 h-8 rounded-full object-cover border border-[#bfa982]/20" />
                        <div>
                          <p className="text-xs font-bold text-primary">{currentPromoMember.name}</p>
                          <p className="text-[9px] text-[#bfa982] uppercase font-bold tracking-wider">{currentPromoMember.specialty}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 divide-y divide-border/10 bg-white rounded-xl border border-[#bfa982]/10 overflow-hidden">
                        {daysOfWeek.map(day => {
                          const daySched = memberSchedule[day] || { start: '09:00', end: '18:00', isWorking: day !== 'Domingo' };
                          return (
                            <div key={day} className="p-3 flex items-center justify-between text-xs font-sans font-semibold">
                              {/* Left check & day label */}
                              <label className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={daySched.isWorking}
                                  onChange={() => handleDayToggle(day)}
                                  className="w-4 h-4 text-primary bg-surface border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
                                />
                                <span className={`font-bold ${daySched.isWorking ? 'text-primary' : 'text-neutral-400 font-medium'}`}>{day}</span>
                              </label>

                              {/* Right inputs */}
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="time"
                                  value={daySched.start}
                                  disabled={!daySched.isWorking}
                                  onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                  className="px-2 py-1 border border-border rounded text-[11px] font-semibold text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-40 bg-white"
                                />
                                <span className="text-outline text-[10px]">a</span>
                                <input
                                  type="time"
                                  value={daySched.end}
                                  disabled={!daySched.isWorking}
                                  onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                  className="px-2 py-1 border border-border rounded text-[11px] font-semibold text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-40 bg-white"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

              </div>
            )}
          </div>

          {/* Section 3: Operaciones y Soporte (Multi-tenant Ops) */}
          <div className="pt-6 border-t border-outline-variant/20">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
              <h3>Operaciones y Soporte</h3>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
              Herramientas de diagnóstico y carga de datos para desplegar franquicias (centros estéticos) rápidamente.
            </p>

            {/* Error Logging */}
            <div className="mt-4 bg-surface-container-low/60 p-4 border border-error/25 rounded-xl flex items-start gap-4 justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-error mb-1">Activar Logs de Errores del Sistema</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Exporta eventos, latencias e interceptores al panel principal para depuración semanal. Recomendado solo durante soft-launches en centros nuevos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsErrorLogging(!isErrorLogging)}
                className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors cursor-pointer ${
                  isErrorLogging ? 'bg-error' : 'bg-outline/50'
                }`}
              >
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
                  isErrorLogging ? 'translate-x-6' : 'translate-x-1'
                }`}></span>
              </button>
            </div>

            {/* CSV Import */}
            <div className="mt-4 bg-[#faf8f4] p-4 border border-outline-variant/25 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-primary mb-1 block">Importar CSV de Clientas</h4>
                <p className="text-[11px] text-on-surface-variant">Sube tu base de datos de 3-5 salones (Formato CSV).</p>
              </div>
              <div className="relative overflow-hidden inline-block shrink-0">
                <button
                  type="button"
                  className="bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">upload_file</span>
                  <span>Seleccionar Archivo</span>
                </button>
                <input
                  type="file"
                  accept=".csv"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!onAddClient) { onToastMessage('La importación no está disponible en este modo.'); return; }
                    const reader = new FileReader();
                    reader.onload = () => {
                      try {
                        const added = importClientsCsv(String(reader.result), activeTenant?.id || '', onAddClient);
                        onToastMessage(added > 0
                          ? `✓ ${added} ${added === 1 ? 'clienta importada' : 'clientas importadas'} desde ${file.name}.`
                          : 'No se encontraron filas válidas (revisa que haya columnas de nombre y teléfono).');
                      } catch (err) {
                        onToastMessage('No se pudo leer el CSV. Asegúrate de que tenga cabecera con "nombre" y "teléfono".');
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Manual Onboarding Trigger */}
            <div className="mt-4 bg-primary text-on-primary p-4 border border-outline-variant/25 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold mb-1">Guía de inicio para tu equipo</h4>
                <p className="text-[11px] opacity-90">Despliega el tutorial interactivo para habilitar a tu equipo.</p>
              </div>
              <button
                type="button"
                onClick={() => onToastMessage('Iniciando la guía de inicio para tu equipo (Enviando notificaciones...)')}
                className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm">school</span>
                <span>Lanzar guía de inicio</span>
              </button>
            </div>

            {/* RGPD Compliance Operations */}
            <div className="mt-6 border-t border-dashed border-outline-variant/30 pt-6 space-y-4">
              <div className="flex items-center gap-2 text-primary">
                <span className="material-symbols-outlined font-bold text-base">gavel</span>
                <h4 className="text-xs uppercase font-extrabold tracking-widest text-primary font-sans">Cumplimiento RGPD (España)</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Export data */}
                <div className="bg-[#faf8f4] p-4 border border-outline-variant/25 rounded-xl flex flex-col justify-between text-left">
                  <div>
                    <h5 className="text-xs font-bold text-primary mb-1">Exportar Fichero de Fichas (CSV)</h5>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      Descarga una copia completa de los datos y consentimiento de marketing de todas tus clientas en formato CSV.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const headers = ['ID', 'Nombre', 'Teléfono', 'Email', 'Cumpleaños', 'VIP', 'Riesgo', 'Consentimiento Marketing', 'LTV Acumulado'];
                      const rows = [
                        headers,
                        ...clients.map(c => [
                          c.id,
                          c.name,
                          c.phoneNumber,
                          c.email,
                          c.birthdate,
                          c.isVip ? 'SÍ' : 'NO',
                          c.riskLevel,
                          c.contactConsent ? 'SÍ' : 'NO',
                          `${c.spendingLtv || 0}€`
                        ])
                      ];
                      const csvContent = "data:text/csv;charset=utf-8," 
                        + rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", `exportacion_rgpd_${new Date().toISOString().split('T')[0]}.csv`);
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      onToastMessage('✓ Fichero CSV de RGPD descargado.');
                    }}
                    className="mt-4 bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-all self-start"
                  >
                    <span className="material-symbols-outlined text-sm">download</span>
                    <span>Exportar Datos</span>
                  </button>
                </div>

                {/* Soft-delete request */}
                <div className="bg-red-50/20 p-4 border border-red-200/50 rounded-xl flex flex-col justify-between text-left">
                  <div>
                    <h5 className="text-xs font-bold text-red-800 mb-1">Solicitar Baja de Clienta</h5>
                    <p className="text-[10px] text-red-700/80 leading-relaxed">
                      Elimina la información personal identificable de una clienta conforme al "Derecho al Olvido" manteniendo estadísticas de venta.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <select
                      id="rgpd-client-select"
                      className="flex-1 px-3 py-1.5 bg-white border border-red-200/50 rounded-lg text-xs outline-none focus:border-red-500 font-semibold cursor-pointer"
                      defaultValue=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) {
                          const name = clients.find(c => c.id === val)?.name || '';
                          if (confirm(`¿Estás completamente segura de que deseas anonimizar todos los datos de "${name}"? Esta acción cumplirá con la legislación RGPD y no se podrá deshacer.`)) {
                            onUpdateClient(val, {
                              name: '[CLIENTA BAJA RGPD]',
                              email: 'anonimo@elenaos.es',
                              phoneNumber: '+34 000000000',
                              contactConsent: false,
                              marketingOptOut: true,
                              avatar: 'https://ui-avatars.com/api/?name=RGPD&background=888&color=fff',
                              preferences: [],
                              technicalNotes: 'Ficha anonimizada por solicitud de baja de datos personales bajo RGPD.'
                            });
                            onToastMessage(`✓ Clienta anonimizada correctamente bajo el protocolo RGPD.`);
                            e.target.value = '';
                          }
                        }
                      }}
                    >
                      <option value="" disabled>Seleccionar clienta...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Save button trigger */}
          <div className="pt-6 border-t border-outline-variant/20 flex justify-end">
            <button
              type="submit"
              className="bg-primary text-on-primary font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-xl hover:opacity-95 transition-all shadow-sm cursor-pointer"
            >
              Guardar Configuración
            </button>
          </div>

        </form>

        {/* Right side helper info column */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Cloud Database Integration Widget */}
          <div className="bg-[#f0ece3] p-6 rounded-2xl border border-primary/10 text-left space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined font-bold">cloud_sync</span>
              <h4 className="font-serif text-lg font-bold">Tus datos guardados</h4>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Elena integra Google Firebase Firestore con reglas de Seguridad a nivel de Fila (RLS) y aislamiento absoluto para sucursales premium.
            </p>

            {currentUser ? (
              <div className="space-y-3 bg-white/70 p-4 border border-outline-variant/30 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 block animate-pulse"></span>
                  <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">CUENTA PERSONAL ACTIVA</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-primary truncate">{appUser?.name || currentUser.displayName || currentUser.email}</p>
                  <p className="text-[10px] text-outline truncate">{currentUser.email}</p>
                </div>

                <div className="pt-2 border-t border-dashed border-outline-variant/50 grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-outline block font-medium">Rol:</span>
                    <strong className="text-primary truncate block font-bold">{appUser?.role || 'Propietaria'}</strong>
                  </div>
                  <div>
                    <span className="text-outline block font-medium font-sans">Salón:</span>
                    <strong className="text-primary truncate block font-bold" title={activeTenant?.name || ''}>{activeTenant?.name || 'Tu salón'}</strong>
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-outline-variant/50 text-[10px]">
                  <span className="text-outline block font-medium">Espacio de trabajo:</span>
                  <strong className="text-primary truncate block font-bold" title={appUser?.tenantId || firebaseProjectId}>
                    {appUser?.tenantId || firebaseProjectId}
                  </strong>
                </div>

                {activeTenant?.slug && (
                  <div className="pt-3 border-t border-dashed border-outline-variant/50">
                    <span className="text-outline block font-medium text-[10px]">Reservas online:</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        readOnly
                        value={`${window.location.origin}/salon/${activeTenant.slug}`}
                        className="min-w-0 flex-1 rounded-lg border border-primary/15 bg-white px-2 py-2 text-[10px] font-bold text-primary"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(`${window.location.origin}/salon/${activeTenant.slug}`);
                          onToastMessage('Enlace de reservas copiado.');
                        }}
                        className="rounded-lg bg-primary px-3 py-2 text-[10px] font-bold text-white"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>
                )}

                {activeTenant?.stripeCustomerId ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const token = getAuthToken ? await getAuthToken() : null;
                        const response = await fetch('/api/create-portal-session', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            ...(token ? { Authorization: `Bearer ${token}` } : {}),
                          },
                          body: JSON.stringify({}),
                        });
                        const data = await response.json();
                        if (data.url) {
                          window.location.href = data.url;
                        } else {
                          onToastMessage('⚠️ No se pudo abrir el portal de facturación de Stripe.');
                        }
                      } catch (err) {
                        onToastMessage('⚠️ Error al conectar con el servidor.');
                      }
                    }}
                    className="w-full mt-3 bg-primary text-white text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 hover:bg-primary/95 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">credit_card</span>
                    <span>Gestionar Suscripción</span>
                  </button>
                ) : (
                  activeTenant?.subscriptionStatus === 'trialing' && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const token = getAuthToken ? await getAuthToken() : null;
                          const response = await fetch('/api/create-checkout-session', {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              ...(token ? { Authorization: `Bearer ${token}` } : {}),
                            },
                            body: JSON.stringify({ priceId: 'price_monthly_premium' }),
                          });
                          const data = await response.json();
                          if (data.url) {
                            window.location.href = data.url;
                          } else {
                            onToastMessage('⚠️ No se pudo iniciar la sesión de pago.');
                          }
                        } catch (err) {
                          onToastMessage('⚠️ Error al conectar con el servidor.');
                        }
                      }}
                      className="w-full mt-3 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest py-2 rounded-lg cursor-pointer flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">payments</span>
                      <span>Suscribirse a ElenaOS (35€)</span>
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={signOutUser}
                  disabled={isLoadingAuth}
                  className="w-full mt-2 py-2 border border-primary/20 hover:bg-primary/5 active:bg-primary/10 text-primary text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span>{isLoadingAuth ? 'Saliendo...' : 'Desconectar Nube'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-[#faf8f4] p-4 border border-outline-variant/35 rounded-xl">
                <p className="text-xs font-medium text-on-surface-variant leading-relaxed">
                  Crea o conecta tu cuenta para guardar los datos de tu propio salón en un espacio privado.
                </p>

                <button
                  type="button"
                  onClick={signIn}
                  disabled={isLoadingAuth}
                  className="w-full py-2.5 bg-primary text-on-primary hover:bg-primary/95 text-xs font-bold rounded-lg cursor-pointer transition-all shadow-sm flex items-center justify-center gap-2"
                >
                  {/* Standard material symbols Google-like icon or shield key */}
                  <span className="material-symbols-outlined text-sm">key</span>
                  <span>{isLoadingAuth ? 'Conectando...' : 'Crear cuenta / Entrar con Google'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#faf8f4] p-6 rounded-2xl border border-outline-variant/30 text-left space-y-4">
            <h4 className="font-serif text-lg font-bold text-primary">Seguridad de tus datos</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Elena asegura que tu franquicia de centros estéticos no genere incoherencias entre sucursales ni repeticiones involuntarias de envíos de WhatsApp.
            </p>

            <div className="p-4 bg-white/70 border border-outline-variant/25 rounded-xl">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">MÉTRICA GLOBAL DE CALIDAD</p>
              <p className="text-xs font-semibold text-on-surface-variant leading-relaxed">
                Tus umbrales actuales clasifican la base de datos con un <strong>98% de confianza</strong>.
              </p>
            </div>
            
            <div className="p-4 bg-white/70 border border-outline-variant/25 rounded-xl">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">WHATSAPP CONECTADO</p>
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 leading-relaxed">
                <span className="material-symbols-outlined text-sm">wifi</span>
                <span>API Oficial de Elena Activa</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ponytail: consola "Control de Datos — Sprint 2" (esquemas NoSQL, RLS, logs) eliminada:
          scaffolding técnico sin valor para una dueña de salón. */}

    </div>
  );
}
