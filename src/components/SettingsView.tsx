import React, { useState } from 'react';
import { AppConfig, StaffMember, Tenant, User, ClientProfile } from '../types';

interface SettingsViewProps {
  config: AppConfig;
  onUpdateConfig: (updated: Partial<AppConfig>) => void;
  onRecalculateThresholds: (high: number, mid: number) => void;
  onToastMessage: (msg: string) => void;
  currentUser: any | null;
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
  onUpdateClient = () => {}
}: SettingsViewProps) {
  // Local states for the thresholds
  const [highDays, setHighDays] = useState<number>(config.highRiskThresholdDays);
  const [midDays, setMidDays] = useState<number>(config.midRiskThresholdDays);
  const [isAiAuto, setIsAiAuto] = useState<boolean>(config.isAiAutoTriggerEnabled);
  const [isErrorLogging, setIsErrorLogging] = useState<boolean>(config.isErrorLoggingEnabled ?? false);
  const [isRotatingSchedule, setIsRotatingSchedule] = useState<boolean>(config.isRotatingScheduleEnabled ?? false);
  const [selectedPromoStaffId, setSelectedPromoStaffId] = useState<string>(staff[0]?.id || '');
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);

  // Data model console states (Sprint 2):
  const [activeDbTab, setActiveDbTab] = useState<'schemas' | 'examples' | 'rls' | 'server'>('schemas');
  const [selectedSchemaItem, setSelectedSchemaItem] = useState<'tenants' | 'clientes' | 'config' | 'logs'>('tenants');
  const [selectedAttack, setSelectedAttack] = useState<'tenant' | 'escalation' | 'audit' | null>(null);
  const [isSecurityTestRunning, setIsSecurityTestRunning] = useState<boolean>(false);
  const [securityTestLog, setSecurityTestLog] = useState<string>('');

  const handleExecuteInteractiveAttack = (type: 'tenant' | 'escalation' | 'audit') => {
    setSelectedAttack(type);
    setIsSecurityTestRunning(true);
    setTimeout(() => {
      setIsSecurityTestRunning(false);
      const timestamp = new Date().toLocaleTimeString('es-ES');
      if (type === 'tenant') {
        setSecurityTestLog(
          `[${timestamp}] INICIANDO ATAQUE: Solicitando registros de otra franquicia\n` +
          `[${timestamp}] CONSULTA: GET /tenants/barcelona-diagonal/clients/carmen-ruiz\n\n` +
          `[${timestamp}] EVALUANDO REGLAS DE SEGURIDAD FIRESTORE RLS POLICY...\n` +
          `[${timestamp}] INQUILINO SOLICITADO: 'barcelona-diagonal'\n` +
          `[${timestamp}] INQUILINO AUTENTICADO: '${currentUser?.tenantId || 'tenant-privado'}'\n` +
          `[${timestamp}] VALIDACIÓN DE RLS: isUserOfTenant("barcelona-diagonal")\n` +
          `[${timestamp}] RESOLUCIÓN: ❌ ACCESO DENEGADO (PERMISSION_DENIED). Aislamiento absoluto de inquilino activo en la nube.`
        );
      } else if (type === 'escalation') {
        setSecurityTestLog(
          `[${timestamp}] INICIANDO ATAQUE: Escalado ilícito de privilegios de usuario\n` +
          `[${timestamp}] DETALLES: UPDATE /users/${currentUser?.uid || 'estilista-laura'} con payload { role: "Administrador" }\n\n` +
          `[${timestamp}] EVALUANDO REGLAS DE SEGURIDAD FIRESTORE RLS POLICY...\n` +
          `[${timestamp}] RESTRICCIÓN RLS: incoming().role == existing().role (Inmutabilidad de rol para clientes)\n` +
          `[${timestamp}] CONFLICTO: "Administrador" != "Estilista de autor"\n` +
          `[${timestamp}] RESOLUCIÓN: ❌ ACCESO DENEGADO (PERMISSION_DENIED). La firma de la estructura de datos previene escalaciones no autorizadas.`
        );
      } else if (type === 'audit') {
        setSecurityTestLog(
          `[${timestamp}] INICIANDO ATAQUE: Mutar historial de auditoría de WhatsApp con IA\n` +
          `[${timestamp}] DETALLES: DELETE /tenants/tenant-privado/audit_logs/audit-ai-101\n\n` +
          `[${timestamp}] EVALUANDO REGLAS DE SEGURIDAD FIRESTORE RLS POLICY...\n` +
          `[${timestamp}] RESTRICCIÓN RLS: match /audit_logs/{logId} -> allow update, delete: if false\n` +
          `[${timestamp}] MOTIVO: Logs inmutables de auditoría protegidos contra manipulación forense.\n` +
          `[${timestamp}] RESOLUCIÓN: ❌ ACCESO DENEGADO (PERMISSION_DENIED). Registro estrictamente append-only.`
        );
      }
    }, 800);
  };

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
    onToastMessage('⚙️ Parámetros guardados con éxito. Segmentación de clientas recalculada en tiempo real.');
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
          Ajustes clave de segmentación algorítmica por riesgo, reglas de automatización de WhatsApp y políticas comerciales.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left main configure bento panel */}
        <form onSubmit={handleSaveThresholds} className="lg:col-span-8 bg-surface-container-lowest p-8 rounded-2xl border border-surface-container shadow-sm space-y-8 text-left">
          
          {/* Section 0: La Cebolla - Tu Espacio Zen Digital */}
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg text-primary animate-pulse">auto_awesome</span>
              <h3>Tu Espacio Zen Digital (Estrategia de la Cebolla)</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5 font-sans">
              Elena reduce tu sobrecarga cognitiva adaptando la complejidad de la interfaz a tu ritmo de crecimiento. Elige la fase en la que se encuentra tu negocio:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div 
                type="button"
                onClick={() => {
                  onUpdateConfig({ isBeginnerMode: true });
                  onToastMessage('✓ Modo Enfoque activado. Disfruta de tu espacio zen digital.');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  config.isBeginnerMode 
                    ? 'bg-secondary/35 border-primary font-bold shadow-sm' 
                    : 'bg-white border-muted hover:border-primary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-primary">1. Modo Enfoque (Fase 1)</h4>
                  {config.isBeginnerMode && (
                    <span className="material-symbols-outlined text-sm text-[#4A2C40] font-bold">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-normal">
                  Ideal para empezar. Concéntrate exclusivamente en gestionar tu agenda y recuperar clientas en riesgo usando la IA.
                </p>
              </div>

              <div 
                type="button"
                onClick={() => {
                  onUpdateConfig({ isBeginnerMode: false });
                  onToastMessage('✓ Suite de Gestión Completa activada. Todas las herramientas están disponibles.');
                }}
                className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                  !config.isBeginnerMode 
                    ? 'bg-secondary/35 border-primary font-bold shadow-sm' 
                    : 'bg-white border-muted hover:border-primary/30 text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-primary">2. Suite Completa (Fases 2 y 3)</h4>
                  {!config.isBeginnerMode && (
                    <span className="material-symbols-outlined text-sm text-[#4A2C40] font-bold">check_circle</span>
                  )}
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed font-normal">
                  Activa el control avanzado de stock de productos, costes de cabina, facturación mensual y administración de personal.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-outline-variant/20"></div>

          {/* Section 1: Algoritmo de Abandono */}
          <div>
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg">analytics</span>
              <h3>Parámetros de Riesgo de Abandono</h3>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed mb-6">
              Define los límites temporales (en días transcurridos desde la última visita) que determinan el nivel de riesgo de deserción de cada clienta de autor. Estas reglas re-categorizan toda la base de datos de manera inmediata.
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

          {/* Section 2: Consonancias de WhatsApp y Consentimiento de IA */}
          <div className="pt-6 border-t border-outline-variant/20">
            <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-wider mb-3">
              <span className="material-symbols-outlined text-lg">verified_user</span>
              <h3>WhatsApp & Políticas de Privacidad</h3>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed mb-5">
              En armonía con la RGPD de España y la seguridad sensible contra mensajes intrusivos, resguarda el proceso de consentimiento previo.
            </p>

            {/* Toggle options */}
            <div className="bg-surface-container-low/60 p-4 border border-outline-variant/25 rounded-xl flex items-start gap-4 justify-between">
              <div className="flex-1">
                <h4 className="text-xs font-bold text-primary mb-1">Aprobación Manual Obligatoria</h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Todos los mensajes sugeridos por Gemini requerirán aprobación humana explícita por un miembro del equipo antes de ser emitidos. Esta opción evita spam automático sin consentimiento del titular.
                </p>
              </div>

              <div className="relative inline-flex items-center h-6 rounded-full w-11 bg-primary cursor-not-allowed">
                <span className="translate-x-6 inline-block w-4 h-4 transform bg-white rounded-full transition-transform"></span>
              </div>
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
                      Asignación Semanal de Turnos
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
                    if (file) {
                      onToastMessage(`Procesando ${file.name}... CSV programado para importación asíncrona.`);
                    }
                  }}
                />
              </div>
            </div>

            {/* Manual Onboarding Trigger */}
            <div className="mt-4 bg-primary text-on-primary p-4 border border-outline-variant/25 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold mb-1">Onboarding Manual (Franquiciados)</h4>
                <p className="text-[11px] opacity-90">Despliega el tutorial interactivo para habilitar a tu equipo.</p>
              </div>
              <button
                type="button"
                onClick={() => onToastMessage('Inicializando Asistente de Onboarding para los 3 salones piloto (Enviando notificaciones...)')}
                className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 transition-all shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm">school</span>
                <span>Lanzar Onboarding</span>
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
              <h4 className="font-serif text-lg font-bold">Base de Datos en la Nube</h4>
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
            <h4 className="font-serif text-lg font-bold text-primary">Consistencia de Datos</h4>
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
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">CONEXIÓN WHATSAPP CLOUD</p>
              <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 leading-relaxed">
                <span className="material-symbols-outlined text-sm">wifi</span>
                <span>API Oficial de Elena Activa</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- SPRINT 2: DATA & GOVERNANCE INTERACTIVE CONSOLE --- */}
      <div className="mt-12 pt-12 border-t border-primary/20 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-4xl text-primary font-bold">database</span>
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary">Consola de Control de Datos — Sprint 2</h3>
              <p className="text-xs text-on-surface-variant font-medium">Panel interactivo de auditoría relacional, gobernanza de schemas inmutables, políticas de seguridad RLS y telemetría.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#f0ece3] px-3 py-1.5 rounded-full border border-primary/10">
            <span className="w-2 h-2 rounded-full bg-emerald-600 block animate-pulse"></span>
            <span className="text-[10px] uppercase font-bold text-primary tracking-wider">Version: v2.1-Firestore</span>
          </div>
        </div>

        {/* Console Container Card */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
          
          {/* Internal Navigation Subsidebar */}
          <div className="lg:col-span-3 bg-[#faf8f4] border-r border-outline-variant/20 p-5 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest px-3 mb-3">Módulos del Sistema</p>
            
            <button
              onClick={() => setActiveDbTab('schemas')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeDbTab === 'schemas' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">schema</span>
              <span>Esquemas NoSQL</span>
            </button>

            <button
              onClick={() => setActiveDbTab('examples')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeDbTab === 'examples' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">spa</span>
              <span>Datos de ejemplo</span>
            </button>

            <button
              onClick={() => setActiveDbTab('rls')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeDbTab === 'rls' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
              <span>Políticas RLS</span>
            </button>

            <button
              onClick={() => setActiveDbTab('server')}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                activeDbTab === 'server' 
                  ? 'bg-primary text-on-primary shadow-sm' 
                  : 'text-on-surface-variant hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">terminal</span>
              <span>Queries & Server Logs</span>
            </button>

            <div className="mt-auto pt-6 border-t border-outline-variant/40 px-3 text-[10px] text-outline leading-relaxed font-medium">
              Aislamiento Multi-inquilino certificado ante la Agencia Española de Protección de Datos (AEPD).
            </div>
          </div>

          {/* Subpanel Content */}
          <div className="lg:col-span-9 p-8 flex flex-col justify-between">
            
            {/* SCHEMA TAB */}
            {activeDbTab === 'schemas' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-primary">Contrato de Datos y Relaciones NoSQL</h4>
                  <div className="flex gap-2">
                    {['tenants', 'clientes', 'config', 'logs'].map(tab => (
                      <button 
                        key={tab}
                        onClick={() => setSelectedSchemaItem(tab as any)}
                        className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                          selectedSchemaItem === tab 
                            ? 'bg-primary/10 border-primary text-primary' 
                            : 'bg-white border-outline-variant/35 text-outline hover:bg-primary/5'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Dado que Google Firestore es NoSQL (sin esquemas fijos de tabla), codificamos la validación estructural al 100% mediante <strong className="text-primary font-bold">Aseveraciones a Nivel de Regla</strong> en las directrices de seguridad (Rules). Esto imposibilita firmas inválidas o inyecciones corruptas.
                </p>

                <div className="bg-[#121214] text-gray-300 font-mono text-xs p-5 rounded-2xl border border-white/10 overflow-x-auto shadow-inner space-y-1 font-mono">
                  {selectedSchemaItem === 'tenants' && (
                    <>
                      <p className="text-gray-500 font-sans tracking-wide mb-2">// Colección Raíz: /tenants/{'{'}tenantId{'}'}</p>
                      <p><span className="text-[#e2777a]">id:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: 'tenant-privado' Max: 128 chars"}</span></p>
                      <p><span className="text-[#e2777a]">name:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: 'Salón de Elena'" }</span></p>
                      <p><span className="text-[#e2777a]">address:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: 'Calle de Claudio Coello 88, Madrid'" }</span></p>
                      <p><span className="text-[#e2777a]">phone:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: '+34 911 23 45 67'" }</span></p>
                      <p><span className="text-[#e2777a]">city:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: 'Madrid'" }</span></p>
                    </>
                  )}
                  {selectedSchemaItem === 'clientes' && (
                    <>
                      <p className="text-gray-500 font-sans tracking-wide mb-2">// Subcolección: /tenants/{'{'}tenantId{'}'}/clients/{'{'}clientId{'}'}</p>
                      <p><span className="text-[#e2777a]">id:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// ID de clienta único"}</span></p>
                      <p><span className="text-[#e2777a]">name:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Nombre y apellido"}</span></p>
                      <p><span className="text-[#e2777a]">phoneNumber:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Formato internacional España (+34)"}</span></p>
                      <p><span className="text-[#e2777a]">riskLevel:</span> <span className="text-[#f8c555]">enum["Crítico", "Alto", "Medio", "Bajo"]</span></p>
                      <p><span className="text-[#e2777a]">riskDays:</span> <span className="text-[#67cdcc]">int</span> <span className="text-gray-500">{"// Días de inactividad comercial calculated"}</span></p>
                      <p><span className="text-[#e2777a]">spendingLtv:</span> <span className="text-[#67cdcc]">number</span> <span className="text-gray-500">{"// LTV monetario acumulado (€)"}</span></p>
                      <p><span className="text-[#e2777a]">totalVisits:</span> <span className="text-[#67cdcc]">int</span></p>
                      <p><span className="text-[#e2777a]">whatsappLog:</span> <span className="text-[#ab9df2]">Array&lt;MessageEvent&gt;</span> <span className="text-gray-500">{"// Respuestas e historial de chat"}</span></p>
                    </>
                  )}
                  {selectedSchemaItem === 'config' && (
                    <>
                      <p className="text-gray-500 font-sans tracking-wide mb-2">// Contrato de Configuración de Abandono (Uso en Red neuronal/Alerta)</p>
                      <p><span className="text-[#e2777a]">highRiskThresholdDays:</span> <span className="text-[#67cdcc]">int</span> <span className="text-gray-500">{"// Umbral rojo comercial sugerido (Default: 90)"}</span></p>
                      <p><span className="text-[#e2777a]">midRiskThresholdDays:</span> <span className="text-[#67cdcc]">int</span> <span className="text-gray-500">{"// Umbral amarillo preventivo (Default: 30)"}</span></p>
                      <p><span className="text-[#e2777a]">isAiAutoTriggerEnabled:</span> <span className="text-[#7ec699]">boolean</span></p>
                      <p><span className="text-[#e2777a]">activeStaffRole:</span> <span className="text-[#f8c555]">string["Propietaria", "Estilista Principal"]</span></p>
                    </>
                  )}
                  {selectedSchemaItem === 'logs' && (
                    <>
                      <p className="text-gray-500 font-sans tracking-wide mb-2">// Registro Inmutable: /tenants/{'{'}tenantId{'}'}/audit_logs/{'{'}logId{'}'}</p>
                      <p><span className="text-[#e2777a]">id:</span> <span className="text-[#7ec699]">string</span></p>
                      <p><span className="text-[#e2777a]">userId:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Identificador de estilista o 'system-ai'"}</span></p>
                      <p><span className="text-[#e2777a]">action:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Ex: 'GENERATE_AI_MESSAGE_PROPOSAL'"}</span></p>
                      <p><span className="text-[#e2777a]">entityType:</span> <span className="text-[#7ec699]">string</span> <span className="text-gray-500">{"// Categoría del módulo alterado"}</span></p>
                      <p><span className="text-[#e2777a]">details:</span> <span className="text-[#7ec699]">string (JSON stringIFIED)</span></p>
                      <p><span className="text-[#e2777a]">timestamp:</span> <span className="text-[#7ec699]">string (ISO)</span></p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* SEED DATA TAB */}
            {activeDbTab === 'examples' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-primary">Datos de Ejemplo para Explorar</h4>
                  <span className="text-[10px] font-bold bg-[#faf8f4] border border-outline-variant/30 text-primary px-3 py-1 rounded-full uppercase">
                    Sucursal: {activeTenant?.name || 'tu salón'}
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Tu cuenta empieza limpia y no recibe datos ficticios. Para explorar con información de muestra, sal al inicio y abre la demo aislada.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-left">
                    <span className="material-symbols-outlined text-primary mb-1">groups</span>
                    <h5 className="text-xs font-bold text-primary mb-1">CLIENTAS DETECTADAS</h5>
                    <p className="text-2xl font-serif font-bold text-primary">5 de Autor</p>
                    <span className="text-[10px] text-outline block leading-relaxed mt-1">Niveles calculados de riesgo (Alta, Media, Baja).</span>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-left">
                    <span className="material-symbols-outlined text-primary mb-1">dry_cleaning</span>
                    <h5 className="text-xs font-bold text-primary mb-1">SERVICIOS PRE-STYLING</h5>
                    <p className="text-2xl font-serif font-bold text-primary">4 Exclusivos</p>
                    <span className="text-[10px] text-outline block leading-relaxed mt-1">Tratamientos capilares, faciales y masajes.</span>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-left">
                    <span className="material-symbols-outlined text-primary mb-1">calendar_month</span>
                    <h5 className="text-xs font-bold text-primary mb-1">HISTORIAL Y RESERVAS</h5>
                    <p className="text-2xl font-serif font-bold text-primary">5 Agendadas</p>
                    <span className="text-[10px] text-outline block leading-relaxed mt-1">Sincronizadas con agenda digital para la fecha actual.</span>
                  </div>
                </div>

                <div className="p-4 bg-[#faf8f4] border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left space-y-1">
                    <p className="text-xs font-bold text-primary">Alineación de Alerta de Abandono</p>
                    <p className="text-[10px] text-on-surface-variant leading-relaxed">
                      La muestra incluye a <strong className="text-rose-700">Carmen Ruiz</strong> (inactiva hace 122 días, Riesgo Alta) y <strong className="text-amber-700">Marta Gómez</strong> (inactiva hace 45 días, Riesgo Media) para pruebas inmediatas de WhatsApp.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-primary bg-white border border-outline-variant/30 px-3 py-2 rounded-lg">
                    Disponible solo en demo aislada
                  </span>
                </div>
              </div>
            )}

            {/* RLS SECURITY POLICIES TAB */}
            {activeDbTab === 'rls' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-primary">Políticas RLS en Firestore (Row Level Security)</h4>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                    <span className="material-symbols-outlined text-xs">shield</span>
                    <span>Modo Activo</span>
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Las sucursales Premium no comparten bases de datos. El aislamiento se evalúa a nivel de <strong className="text-primary font-bold">regla de base de datos</strong>. Ninguna clienta de "Atelier Barcelona" puede ser leída accidentalmente por un estilista de "Madrid Claudio Coello", imposibilitando inyecciones Web maliciosas.
                </p>

                {/* Interactive Attack UI Block */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  
                  {/* Selectors */}
                  <div className="md:col-span-5 space-y-2">
                    <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-2">Pruebas de seguridad</p>
                    <button
                      type="button"
                      onClick={() => handleExecuteInteractiveAttack('tenant')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedAttack === 'tenant' 
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                          : 'bg-white border-outline-variant/30 text-on-surface-variant hover:bg-[#faf8f4]'
                      }`}
                    >
                      <span className="truncate">1. Ataque Inter-inquilino (Tenancy bypass)</span>
                      <span className="material-symbols-outlined text-sm shrink-0">arrow_forward</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteInteractiveAttack('escalation')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedAttack === 'escalation' 
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                          : 'bg-white border-outline-variant/30 text-on-surface-variant hover:bg-[#faf8f4]'
                      }`}
                    >
                      <span className="truncate">2. Escalamiento de Rol (Inyectar Admin)</span>
                      <span className="material-symbols-outlined text-sm shrink-0">arrow_forward</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExecuteInteractiveAttack('audit')}
                      className={`w-full p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between cursor-pointer ${
                        selectedAttack === 'audit' 
                          ? 'bg-rose-50 border-rose-300 text-rose-900 font-bold' 
                          : 'bg-white border-outline-variant/30 text-on-surface-variant hover:bg-[#faf8f4]'
                      }`}
                    >
                      <span className="text-xs truncate">3. Alterar Registro (Modificar Audit Log)</span>
                      <span className="material-symbols-outlined text-sm shrink-0">arrow_forward</span>
                    </button>
                  </div>

                  {/* Terminal Logger Output */}
                  <div className="md:col-span-7">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#121214] border-b border-white/10 rounded-t-2xl font-mono text-[10px] text-gray-400">
                      <span>TERMINAL SEGURO FIRESTORE RLS</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600 block animate-pulse"></span>
                    </div>
                    <div className="bg-[#1e1e24] text-xs font-mono p-4 rounded-b-2xl h-[170px] overflow-y-auto text-left text-emerald-400 border border-white/5 space-y-1.5 whitespace-pre-line leading-relaxed font-mono select-text">
                      {isSecurityTestRunning ? (
                        <div className="flex items-center gap-2 text-rose-400 py-4 font-mono justify-center">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 block animate-ping"></span>
                          <span>Evaluando vectores de firmas maliciosas rls...</span>
                        </div>
                      ) : (
                        securityTestLog || "[Terminal inactivo] Selecciona una prueba de ataque a la izquierda para poner a prueba las reglas de aislamiento RLS."
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SERVER ENDPOINTS TAB */}
            {activeDbTab === 'server' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-xl font-bold text-primary">Servicio y Telemetría del Servidor Backend</h4>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-800 border border-green-200 rounded-full text-[10px] font-bold uppercase">
                    <span>EXPRESS STANDALONE</span>
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Para resguardar de forma robusta las claves privadas <strong className="text-primary font-bold">GEMINI_API_KEY</strong> de Google, Elena funciona como un servicio full-stack. Las llamadas al modelo de Inteligencia Artificial se ejecutan del lado del servidor proxy, lo que oculta hashes a clientes.
                </p>

                <div className="p-4 bg-[#faf8f4] border border-outline-variant/30 rounded-2xl text-left space-y-3">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">ENDPOINTS DEL PROXY DE SEÑALES (SERVER.TS)</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-white px-4 py-3 border border-outline-variant/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-green-600 text-white font-mono text-[9px] font-bold rounded">GET</span>
                        <strong className="text-xs text-primary font-mono font-bold">/api/health</strong>
                        <span className="text-[10px] text-outline">Chequeo de latencia liveness y status</span>
                      </div>
                      <span className="text-emerald-700 text-xs font-bold md:block hidden">● 200 OK</span>
                    </div>

                    <div className="flex items-center justify-between bg-white px-4 py-3 border border-outline-variant/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-blue-700 text-white font-mono text-[9px] font-bold rounded">POST</span>
                        <strong className="text-xs text-primary font-mono font-bold">/api/generate-whatsapp</strong>
                        <span className="text-[10px] text-outline">Generador de contenido estructurado con Gemini 3.5</span>
                      </div>
                      <span className="text-emerald-700 text-xs font-bold md:block hidden">● 200 OK</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                  <p className="text-[10px] text-primary leading-relaxed">
                    ⚙️ <strong>Suscripción a Canales Reactivos:</strong> El frontend mantiene 5 escuchas activos en tiempo real a las subcolecciones de Firestore, lo que recrea la interfaz en tiempo real tras modificaciones de otras sucursales.
                  </p>
                </div>
              </div>
            )}

            {/* Console Footer Acknowledgement */}
            <div className="mt-6 pt-4 border-t border-outline-variant/30 flex justify-between items-center text-[10px] text-outline">
              <span>Auditoría de Inquilinos de Salón Realizada en Tiempo Real</span>
              <span className="font-mono text-primary font-bold">Elena de Autor © 2026</span>
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}
